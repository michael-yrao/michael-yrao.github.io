import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent, BreadcrumbEntry } from '../../../shared/components/page-header/page-header.component';
import {
  BisectInstance,
  Range,
  applyProbe,
  buildRoundDeck,
  parFor,
} from './bisect-it.rounds';

const BREADCRUMB: BreadcrumbEntry[] = [
  { label: 'Home', link: '/' },
  { label: 'Games', link: '/games' },
  { label: 'Bisect It' },
];

const BEST_STREAK_KEY = 'po-bisect-it-best';
// A number line renders as clickable cells up to this width; wider ranges (Ship's
// capacity range especially) fall back to a range-input slider.
const CELL_RANGE_MAX = 40;
const SOLVER_STEP_MS = 600;

type Mode = 'playing' | 'revealed' | 'finished';

interface Probe {
  readonly value: number;
  readonly feasible: boolean;
}

@Component({
  selector: 'app-bisect-it',
  templateUrl: './bisect-it.component.html',
  styleUrls: ['./bisect-it.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeaderComponent],
})
export class BisectItComponent implements OnDestroy {
  readonly breadcrumb = BREADCRUMB;

  deck: BisectInstance[] = [];
  roundIndex = 0;
  current: BisectInstance | null = null;

  aliveRange: Range = { lo: 0, hi: 0 };
  probes: Probe[] = [];
  probedValues = new Set<number>();
  selectedValue: number | null = null;
  submittedValue: number | null = null;
  mode: Mode = 'playing';

  roundsExact = 0;
  totalProbes = 0;
  totalPar = 0;
  currentStreak = 0;
  bestStreak = 0;

  solverRunning = false;
  solverStepIdx = 0;
  solverRange: Range = { lo: 0, hi: 0 };
  solverMid: number | null = null;
  solverFeasible: boolean | null = null;

  private solverTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private cdr: ChangeDetectorRef) {
    this.bestStreak = this.readBestStreak();
    this.startRun();
  }

  ngOnDestroy(): void {
    this.clearSolverTimer();
  }

  // ── Derived view state ────────────────────────────────────────────────────────

  get progressLabel(): string {
    return `${this.roundIndex + 1} / ${this.deck.length}`;
  }

  get par(): number {
    return this.current ? parFor(this.current.lo, this.current.hi) : 0;
  }

  get isCellMode(): boolean {
    if (!this.current) return true;
    return this.current.hi - this.current.lo + 1 <= CELL_RANGE_MAX;
  }

  get cellValues(): number[] {
    if (!this.current) return [];
    const count = this.current.hi - this.current.lo + 1;
    return Array.from({ length: count }, (_, i) => this.current!.lo + i);
  }

  /** The range to render: the reference solver's l/r while it plays back, otherwise the player's. */
  get displayRange(): Range {
    return this.solverRunning ? this.solverRange : this.aliveRange;
  }

  /** Position of a value along the round's fixed [lo, hi] track, as a 0–100 percent. */
  percentFor(value: number): number {
    if (!this.current) return 0;
    const span = this.current.hi - this.current.lo;
    if (span <= 0) return 0;
    return ((value - this.current.lo) / span) * 100;
  }

  get canProbe(): boolean {
    return (
      this.mode === 'playing' &&
      !this.solverRunning &&
      this.selectedValue !== null &&
      !this.probedValues.has(this.selectedValue)
    );
  }

  get canSubmit(): boolean {
    return this.mode === 'playing' && !this.solverRunning && this.selectedValue !== null;
  }

  get isExact(): boolean {
    return this.mode === 'revealed' && this.submittedValue === this.current?.answer;
  }

  get offByOne(): boolean {
    if (this.mode !== 'revealed' || this.isExact || this.submittedValue === null || !this.current) return false;
    return Math.abs(this.submittedValue - this.current.answer) === 1;
  }

  // ── Run / round lifecycle ────────────────────────────────────────────────────

  startRun(): void {
    this.clearSolverTimer();
    this.deck = buildRoundDeck();
    this.roundIndex = 0;
    this.roundsExact = 0;
    this.totalProbes = 0;
    this.totalPar = 0;
    this.currentStreak = 0;
    this.loadRound(this.deck[0] ?? null);
  }

  next(): void {
    if (this.mode !== 'revealed') return;
    this.clearSolverTimer();
    if (this.roundIndex + 1 >= this.deck.length) {
      this.mode = 'finished';
      this.current = null;
      return;
    }
    this.roundIndex++;
    this.loadRound(this.deck[this.roundIndex]);
  }

  private loadRound(instance: BisectInstance | null): void {
    this.current = instance;
    this.aliveRange = instance ? { lo: instance.lo, hi: instance.hi } : { lo: 0, hi: 0 };
    this.probes = [];
    this.probedValues = new Set();
    this.selectedValue = instance ? Math.floor((instance.lo + instance.hi) / 2) : null;
    this.submittedValue = null;
    this.mode = 'playing';
    this.solverRunning = false;
    this.solverStepIdx = 0;
    this.solverRange = this.aliveRange;
    this.solverMid = null;
    this.solverFeasible = null;
    this.cdr.markForCheck();
  }

  // ── Player moves ─────────────────────────────────────────────────────────────

  selectValue(value: number): void {
    if (this.mode !== 'playing' || this.solverRunning) return;
    if (value < this.aliveRange.lo || value > this.aliveRange.hi) return;
    this.selectedValue = value;
  }

  onSliderInput(event: Event): void {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    if (Number.isFinite(value)) this.selectValue(Math.round(value));
  }

  probe(): void {
    if (!this.canProbe || !this.current || this.selectedValue === null) return;
    const value = this.selectedValue;
    const feasible = this.current.predicate(value);
    this.probes = [...this.probes, { value, feasible }];
    this.probedValues = new Set([...this.probedValues, value]);
    this.aliveRange = applyProbe(this.aliveRange, value, feasible, this.current.direction);
    this.selectedValue = this.clampToAlive(value);
    this.cdr.markForCheck();
  }

  submit(): void {
    if (!this.canSubmit || !this.current || this.selectedValue === null) return;
    this.submittedValue = this.selectedValue;
    this.mode = 'revealed';
    this.totalProbes += this.probes.length;
    this.totalPar += this.par;

    if (this.isExact) {
      this.roundsExact++;
      this.currentStreak++;
      this.updateBestStreak();
    } else {
      this.currentStreak = 0;
    }
    this.cdr.markForCheck();
  }

  private clampToAlive(value: number): number {
    return Math.min(Math.max(value, this.aliveRange.lo), this.aliveRange.hi);
  }

  // ── Watch solver ─────────────────────────────────────────────────────────────

  watchSolver(): void {
    if (!this.current || this.solverRunning || this.mode !== 'revealed') return;
    this.solverRunning = true;
    this.solverStepIdx = 0;
    this.solverRange = { lo: this.current.lo, hi: this.current.hi };
    this.solverMid = null;
    this.solverFeasible = null;
    this.cdr.markForCheck();
    this.solverTimer = setTimeout(() => this.stepSolver(), SOLVER_STEP_MS);
  }

  stopSolver(): void {
    this.clearSolverTimer();
    this.solverRunning = false;
    this.cdr.markForCheck();
  }

  private stepSolver(): void {
    if (!this.current || !this.solverRunning) return;
    const trace = this.current.trace;

    if (this.solverStepIdx >= trace.length) {
      this.solverRunning = false;
      this.solverRange = { lo: this.current.answer, hi: this.current.answer };
      this.cdr.markForCheck();
      return;
    }

    const step = trace[this.solverStepIdx];
    this.solverRange = { lo: step.l, hi: step.r };
    this.solverMid = step.mid;
    this.solverFeasible = step.feasible;
    this.solverStepIdx++;
    this.cdr.markForCheck();
    this.solverTimer = setTimeout(() => this.stepSolver(), SOLVER_STEP_MS);
  }

  private clearSolverTimer(): void {
    if (this.solverTimer === null) return;
    clearTimeout(this.solverTimer);
    this.solverTimer = null;
  }

  // ── Best streak (localStorage) ───────────────────────────────────────────────

  private readBestStreak(): number {
    try {
      const raw = localStorage.getItem(BEST_STREAK_KEY);
      const value = Number(raw);
      return Number.isFinite(value) && value >= 0 ? value : 0;
    } catch {
      return 0;
    }
  }

  private updateBestStreak(): void {
    if (this.currentStreak <= this.bestStreak) return;
    this.bestStreak = this.currentStreak;
    try {
      localStorage.setItem(BEST_STREAK_KEY, String(this.bestStreak));
    } catch {
      // localStorage unavailable (private mode, blocked) — best streak stays in-memory only.
    }
  }
}
