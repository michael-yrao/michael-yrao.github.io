import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent, BreadcrumbEntry } from '../../../shared/components/page-header/page-header.component';
import { vizRouteFor } from '../../../core/data/viz-route';
import { leetCodeUrlFor } from '../../../core/data/lc-url';
import {
  OneStrokeBoard,
  OneStrokeEdge,
  EulerDiagnosis,
  HierholzerResult,
  availableMoves,
  diagnoseEuler,
  generateOneStrokeBoard,
  solveOneStroke,
} from './one-stroke.solver';
import { computeEdgeRenderInfo, EdgeRenderInfo, NODE_RADIUS } from './one-stroke.geometry';

const BREADCRUMB: BreadcrumbEntry[] = [
  { label: 'Home', link: '/' },
  { label: 'Games', link: '/games' },
  { label: 'One-Stroke Tour' },
];

// LC 332 (Reconstruct Itinerary) is the directed-Eulerian-path sibling of this
// board game — same stack-Hierholzer shape, fixed start node instead of a
// degree-rule-picked one.
const LC_NUMBER = 332;
const BEST_STREAK_KEY = 'po-one-stroke-best';

const SOLVER_START_DELAY_MS = 300;
const SOLVER_STACK_STEP_MS = 420;
const SOLVER_TOUR_STEP_MS = 500;

const VIEWBOX_PADDING = 18;

const INVALID_START_MESSAGE =
  "That start breaks the degree rule — you'll paint yourself into a corner before every edge is used.";

type OneStrokePhase = 'choosing-start' | 'playing' | 'won' | 'lost';
type SolverPlaybackPhase = 'stack' | 'tour';

interface MoveSnapshot {
  readonly currentNodeId: number | null;
  readonly usedEdgeIds: ReadonlySet<number>;
  readonly path: readonly number[];
  readonly movesCount: number;
  readonly phase: OneStrokePhase;
}

@Component({
  selector: 'app-one-stroke',
  templateUrl: './one-stroke.component.html',
  styleUrls: ['./one-stroke.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeaderComponent],
})
export class OneStrokeComponent implements OnInit, OnDestroy {
  readonly breadcrumb = BREADCRUMB;
  readonly vizRoute = vizRouteFor(LC_NUMBER);
  readonly leetCodeUrl = leetCodeUrlFor(null, LC_NUMBER);
  readonly nodeRadius = NODE_RADIUS;

  board!: OneStrokeBoard;
  diagnosis!: EulerDiagnosis;
  edgeRenderInfo: EdgeRenderInfo[] = [];

  phase: OneStrokePhase = 'choosing-start';
  currentNodeId: number | null = null;
  usedEdgeIds: ReadonlySet<number> = new Set();
  path: number[] = [];
  movesCount = 0;
  bestStreak = 0;
  winStreak = 0;
  showExplain = false;
  invalidStartMessage: string | null = null;

  solverRunning = false;
  solverFinished = false;
  solverPhase: SolverPlaybackPhase = 'stack';
  solverStack: number[] = [];
  solverPopped: number[] = [];
  solverTourNodeIds: readonly number[] = [];
  solverLitEdgeIds: ReadonlySet<number> = new Set();

  private history: MoveSnapshot[] = [];
  private solverSnapshot: MoveSnapshot | null = null;
  private solverResult: HierholzerResult | null = null;
  private solverStepIdx = 0;
  private solverTourIdx = 0;
  private solverTimer: ReturnType<typeof setTimeout> | null = null;
  /** A board is credited to the streak at most once, and never when the solver was watched. */
  private boardScored = false;
  private solverWatchedThisBoard = false;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.bestStreak = this.readBestStreak();
    this.initGame();
  }

  ngOnDestroy(): void {
    this.clearSolverTimer();
  }

  get viewBox(): string {
    const xs = this.board.nodes.map((n) => n.x);
    const ys = this.board.nodes.map((n) => n.y);
    const pad = NODE_RADIUS + VIEWBOX_PADDING;
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad;
    const width = Math.max(...xs) - minX + pad;
    const height = Math.max(...ys) - minY + pad;
    return `${minX} ${minY} ${width} ${height}`;
  }

  get totalEdges(): number {
    return this.board.edges.length;
  }

  get canUndo(): boolean {
    return this.history.length > 0;
  }

  /** True while the solver is animating OR paused on its finished result, awaiting dismissal. */
  get solverActive(): boolean {
    return this.solverRunning || this.solverFinished;
  }

  get solverTourWalkedCount(): number {
    return this.solverTourIdx;
  }

  // ── Board lifecycle ─────────────────────────────────────────────────────

  newBoard(): void {
    this.initGame();
  }

  resetBoard(): void {
    this.stopSolver();
    this.loadPlayState();
    this.cdr.markForCheck();
  }

  private initGame(): void {
    this.stopSolver();
    this.board = generateOneStrokeBoard();
    this.diagnosis = diagnoseEuler(this.board);
    this.edgeRenderInfo = computeEdgeRenderInfo(this.board);
    this.boardScored = false;
    this.solverWatchedThisBoard = false;
    this.loadPlayState();
    this.cdr.markForCheck();
  }

  private loadPlayState(): void {
    this.phase = 'choosing-start';
    this.currentNodeId = null;
    this.usedEdgeIds = new Set();
    this.path = [];
    this.movesCount = 0;
    this.history = [];
    this.showExplain = false;
    this.invalidStartMessage = null;
  }

  // ── Player moves ────────────────────────────────────────────────────────

  selectNode(nodeId: number): void {
    if (this.solverActive) return;
    if (this.phase === 'choosing-start') {
      this.startAt(nodeId);
      return;
    }
    if (this.phase !== 'playing') return;
    this.applyMove(nodeId);
  }

  undo(): void {
    if (this.solverActive || this.history.length === 0) return;
    const snapshot = this.history[this.history.length - 1];
    this.history = this.history.slice(0, -1);
    this.restoreSnapshot(snapshot);
    this.showExplain = false;
    this.cdr.markForCheck();
  }

  toggleExplain(): void {
    this.showExplain = !this.showExplain;
    this.cdr.markForCheck();
  }

  private startAt(nodeId: number): void {
    this.pushHistory();
    this.currentNodeId = nodeId;
    this.path = [nodeId];
    this.movesCount = 0;
    this.phase = 'playing';
    this.invalidStartMessage = this.diagnosis.validStartIds.includes(nodeId) ? null : INVALID_START_MESSAGE;
    this.cdr.markForCheck();
  }

  private applyMove(nodeId: number): void {
    const move = availableMoves(this.board, this.currentNodeId as number, this.usedEdgeIds).find(
      (candidate) => candidate.other === nodeId,
    );
    if (!move) return;

    this.pushHistory();
    this.usedEdgeIds = new Set(this.usedEdgeIds).add(move.edgeId);
    this.path = [...this.path, nodeId];
    this.movesCount++;
    this.currentNodeId = nodeId;
    this.evaluateProgress();
    this.cdr.markForCheck();
  }

  private evaluateProgress(): void {
    if (this.usedEdgeIds.size === this.totalEdges) {
      this.phase = 'won';
      this.creditWinIfEligible();
      return;
    }

    const remaining = availableMoves(this.board, this.currentNodeId as number, this.usedEdgeIds);
    if (remaining.length === 0) {
      this.phase = 'lost';
      this.showExplain = true;
      this.creditLossIfEligible();
    }
  }

  // A board is credited at most once (undo → redo must not re-count it), and a
  // win never counts if the solver was watched on this board first — the
  // player already saw the answer.
  private creditWinIfEligible(): void {
    if (this.boardScored) return;
    this.boardScored = true;
    if (this.solverWatchedThisBoard) return;

    this.winStreak++;
    if (this.winStreak > this.bestStreak) {
      this.bestStreak = this.winStreak;
      this.writeBestStreak(this.bestStreak);
    }
  }

  private creditLossIfEligible(): void {
    if (this.boardScored) return;
    this.boardScored = true;
    this.winStreak = 0;
  }

  private pushHistory(): void {
    this.history = [...this.history, this.captureSnapshot()];
  }

  private captureSnapshot(): MoveSnapshot {
    return {
      currentNodeId: this.currentNodeId,
      usedEdgeIds: new Set(this.usedEdgeIds),
      path: [...this.path],
      movesCount: this.movesCount,
      phase: this.phase,
    };
  }

  private restoreSnapshot(snapshot: MoveSnapshot): void {
    this.currentNodeId = snapshot.currentNodeId;
    this.usedEdgeIds = snapshot.usedEdgeIds;
    this.path = [...snapshot.path];
    this.movesCount = snapshot.movesCount;
    this.phase = snapshot.phase;
  }

  // ── Solver playback ──────────────────────────────────────────────────────

  watchSolver(): void {
    this.stopSolver();
    this.solverSnapshot = this.captureSnapshot();
    this.solverWatchedThisBoard = true;

    const startId = this.diagnosis.validStartIds[0];
    this.solverResult = solveOneStroke(this.board, startId);
    this.solverRunning = true;
    this.solverPhase = 'stack';
    this.solverStepIdx = 0;
    this.solverTourIdx = 0;
    this.solverStack = [];
    this.solverPopped = [];
    this.solverTourNodeIds = [];
    this.solverLitEdgeIds = new Set();
    this.cdr.markForCheck();
    this.solverTimer = setTimeout(() => this.stepSolverStack(), SOLVER_START_DELAY_MS);
  }

  /** "Back to my board" — the only way (besides New Board / Reset) to leave the solver view. */
  stopSolver(): void {
    this.clearSolverTimer();
    this.solverRunning = false;
    this.solverFinished = false;
    this.solverPhase = 'stack';
    this.solverStepIdx = 0;
    this.solverTourIdx = 0;
    this.solverStack = [];
    this.solverPopped = [];
    this.solverTourNodeIds = [];
    this.solverLitEdgeIds = new Set();
    if (this.solverSnapshot) {
      this.restoreSnapshot(this.solverSnapshot);
      this.solverSnapshot = null;
    }
    this.cdr.markForCheck();
  }

  private stepSolverStack(): void {
    if (!this.solverRunning || !this.solverResult) return;

    if (this.solverStepIdx >= this.solverResult.steps.length) {
      this.solverPhase = 'tour';
      this.solverTourNodeIds = this.solverResult.tourNodeIds;
      this.cdr.markForCheck();
      this.solverTimer = setTimeout(() => this.stepSolverTour(), SOLVER_START_DELAY_MS);
      return;
    }

    const step = this.solverResult.steps[this.solverStepIdx];
    this.solverStepIdx++;
    this.solverStack = [...step.stack];
    if (step.type === 'pop') {
      this.solverPopped = [...this.solverPopped, step.nodeId];
    }
    this.cdr.markForCheck();
    this.solverTimer = setTimeout(() => this.stepSolverStack(), SOLVER_STACK_STEP_MS);
  }

  private stepSolverTour(): void {
    if (!this.solverRunning || !this.solverResult) return;

    if (this.solverTourIdx >= this.solverResult.tourEdgeIds.length) {
      this.solverRunning = false;
      this.solverFinished = true;
      this.cdr.markForCheck();
      return;
    }

    const edgeId = this.solverResult.tourEdgeIds[this.solverTourIdx];
    this.solverTourIdx++;
    this.solverLitEdgeIds = new Set(this.solverLitEdgeIds).add(edgeId);
    this.cdr.markForCheck();
    this.solverTimer = setTimeout(() => this.stepSolverTour(), SOLVER_TOUR_STEP_MS);
  }

  private clearSolverTimer(): void {
    if (this.solverTimer !== null) {
      clearTimeout(this.solverTimer);
      this.solverTimer = null;
    }
  }

  // ── Template render helpers ───────────────────────────────────────────────

  edgeState(edge: OneStrokeEdge): 'unused' | 'used' {
    const litSet = this.solverActive ? this.solverLitEdgeIds : this.usedEdgeIds;
    return litSet.has(edge.id) ? 'used' : 'unused';
  }

  markerUrl(state: 'unused' | 'used'): string {
    return state === 'used' ? 'url(#os-arrow-used)' : 'url(#os-arrow)';
  }

  isProblemNode(nodeId: number): boolean {
    return this.showExplain && this.diagnosis.problemNodeIds.includes(nodeId);
  }

  isCurrentNode(nodeId: number): boolean {
    return !this.solverActive && this.currentNodeId === nodeId;
  }

  isStartCandidate(nodeId: number): boolean {
    return this.diagnosis.validStartIds.includes(nodeId);
  }

  // ── Best streak (localStorage, read/write wrapped in try/catch) ────────────

  private readBestStreak(): number {
    try {
      return Number(localStorage.getItem(BEST_STREAK_KEY) ?? 0) || 0;
    } catch {
      return 0;
    }
  }

  private writeBestStreak(value: number): void {
    try {
      localStorage.setItem(BEST_STREAK_KEY, String(value));
    } catch {
      // localStorage unavailable (private mode, blocked) — streak just won't persist.
    }
  }
}
