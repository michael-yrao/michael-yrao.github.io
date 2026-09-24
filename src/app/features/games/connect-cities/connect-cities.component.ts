import { Component, OnDestroy, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent, BreadcrumbEntry } from '../../../shared/components/page-header/page-header.component';
import { vizRouteFor } from '../../../core/data/viz-route';
import { leetCodeUrlFor } from '../../../core/data/lc-url';
import {
  Edge,
  PLANE_SIZE,
  Point,
  PrimResult,
  buildEdges,
  buildUnionFind,
  createParent,
  edgeKey,
  generatePoints,
  primMST,
  totalWeight,
  union,
} from './connect-cities.solver';

const BREADCRUMB: BreadcrumbEntry[] = [
  { label: 'Home', link: '/' },
  { label: 'Games', link: '/games' },
  { label: 'Connect the Cities' },
];

const LC_NUMBER = 1584;
const BEST_SCORE_KEY = 'po-connect-cities-best';
const CYCLE_FLASH_MS = 350;
const SOLVER_TICK_MS = 700;
const SOLVER_START_DELAY_MS = 300;
const CITY_RADIUS = 8;
const CITY_LABEL_OFFSET = 13;

type GameState = 'playing' | 'won';

@Component({
  selector: 'app-connect-cities',
  templateUrl: './connect-cities.component.html',
  styleUrls: ['./connect-cities.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeaderComponent],
})
export class ConnectCitiesComponent implements OnInit, OnDestroy {
  readonly breadcrumb = BREADCRUMB;
  readonly lcNumber = LC_NUMBER;
  readonly vizRoute = vizRouteFor(LC_NUMBER);
  readonly lcUrl = leetCodeUrlFor(null, LC_NUMBER);
  readonly planeSize = PLANE_SIZE;
  readonly cityRadius = CITY_RADIUS;
  readonly cityLabelOffset = CITY_LABEL_OFFSET;

  points: Point[] = [];
  edges: Edge[] = [];
  selectedEdges: Edge[] = [];
  gameState: GameState = 'playing';

  hoveredEdgeKey: string | null = null;
  cycleRejectEdgeKey: string | null = null;

  bestScore = 0;
  /** True only while the tick loop is actively scheduling itself. */
  solverRunning = false;
  /** True once Prim's has fully grown the tree and the loop stopped
   * naturally — distinct from solverRunning so the finished tree stays on
   * screen (with player interaction locked) until an explicit Stop/Back. */
  solverFinished = false;
  solverStepIdx = 0;
  solverFrontierEdges: readonly Edge[] = [];

  private unionFindParent: number[] = [];
  private primResult: PrimResult = { edges: [], totalCost: 0, steps: [] };
  private playerSnapshotEdges: Edge[] = [];
  private solverTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private cycleFlashTimeoutId: ReturnType<typeof setTimeout> | null = null;
  /** Per-board guards against best-score inflation: an optimal win counts
   * at most once per board, and never counts if the solver was watched on
   * this board (that would just be copying the shown answer). Both reset
   * in initGame(). */
  private hasCountedOptimalWin = false;
  private hasWatchedSolver = false;

  constructor(private cdr: ChangeDetectorRef) {
    this.bestScore = this.readBestScore();
  }

  ngOnInit(): void {
    this.initGame();
  }

  ngOnDestroy(): void {
    this.clearSolverTimeout();
    this.clearCycleFlashTimeout();
  }

  get playerCost(): number {
    return totalWeight(this.selectedEdges);
  }

  get optimalCost(): number {
    return this.primResult.totalCost;
  }

  get overCost(): number {
    return this.playerCost - this.optimalCost;
  }

  get overPercent(): number {
    if (this.optimalCost === 0) return 0;
    return Math.round((this.overCost / this.optimalCost) * 100);
  }

  get isOptimal(): boolean {
    return this.gameState === 'won' && this.overCost === 0;
  }

  get edgesNeeded(): number {
    return Math.max(this.points.length - 1, 0);
  }

  /** Prim's tree edges for this board — exposed read-only for the score
   * panel and for tests that need a known-optimal edge set to select. */
  get primEdges(): readonly Edge[] {
    return this.primResult.edges;
  }

  /** True whenever the board on screen is the solver's, not the player's —
   * covers both mid-animation and the finished-but-not-dismissed state. */
  get isSolverActive(): boolean {
    return this.solverRunning || this.solverFinished;
  }

  initGame(): void {
    this.clearSolverTimeout();
    this.clearCycleFlashTimeout();

    this.points = generatePoints();
    this.edges = buildEdges(this.points);
    this.selectedEdges = [];
    this.unionFindParent = createParent(this.points.length);
    this.gameState = 'playing';
    this.hoveredEdgeKey = null;
    this.cycleRejectEdgeKey = null;
    this.solverRunning = false;
    this.solverFinished = false;
    this.solverStepIdx = 0;
    this.solverFrontierEdges = [];
    this.playerSnapshotEdges = [];
    this.primResult = primMST(this.points);
    this.hasCountedOptimalWin = false;
    this.hasWatchedSolver = false;

    this.cdr.markForCheck();
  }

  newBoard(): void {
    this.initGame();
  }

  selectEdge(edge: Edge): void {
    if (this.isSolverActive || this.gameState !== 'playing') return;
    if (this.isEdgeSelected(edge)) return;

    const nextParent = union(this.unionFindParent, edge.a, edge.b);
    if (nextParent === null) {
      this.flashCycleReject(edge);
      return;
    }

    this.unionFindParent = nextParent;
    this.selectedEdges = [...this.selectedEdges, edge];

    if (this.selectedEdges.length === this.edgesNeeded) {
      this.gameState = 'won';
      this.recordWinIfOptimal();
    }

    this.cdr.markForCheck();
  }

  undoLast(): void {
    if (this.isSolverActive || this.selectedEdges.length === 0) return;

    this.selectedEdges = this.selectedEdges.slice(0, -1);
    this.unionFindParent = buildUnionFind(this.points.length, this.selectedEdges);
    this.gameState = 'playing';

    this.cdr.markForCheck();
  }

  setHover(edge: Edge): void {
    this.hoveredEdgeKey = edgeKey(edge);
  }

  clearHover(): void {
    this.hoveredEdgeKey = null;
  }

  isEdgeSelected(edge: Edge): boolean {
    const key = edgeKey(edge);
    return this.selectedEdges.some((e) => edgeKey(e) === key);
  }

  isHovered(edge: Edge): boolean {
    return this.hoveredEdgeKey === edgeKey(edge);
  }

  isCycleFlash(edge: Edge): boolean {
    return this.cycleRejectEdgeKey === edgeKey(edge);
  }

  isSolverFrontier(edge: Edge): boolean {
    if (!this.isSolverActive) return false;
    const key = edgeKey(edge);
    return this.solverFrontierEdges.some((e) => edgeKey(e) === key);
  }

  edgeKeyOf(edge: Edge): string {
    return edgeKey(edge);
  }

  midX(edge: Edge): number {
    return (this.points[edge.a].x + this.points[edge.b].x) / 2;
  }

  midY(edge: Edge): number {
    return (this.points[edge.a].y + this.points[edge.b].y) / 2;
  }

  // ── Solver playback ──────────────────────────────────────────────────────

  watchSolver(): void {
    this.stopSolver();

    this.playerSnapshotEdges = [...this.selectedEdges];
    this.selectedEdges = [];
    this.unionFindParent = createParent(this.points.length);
    this.gameState = 'playing';
    this.solverRunning = true;
    this.solverFinished = false;
    this.solverStepIdx = 0;
    this.solverFrontierEdges = [];
    // Watching the solver disqualifies this board from the best-score
    // count for the rest of its life, even after Stop — it already showed
    // the answer.
    this.hasWatchedSolver = true;

    this.cdr.markForCheck();
    this.solverTimeoutId = setTimeout(() => this.stepSolver(), SOLVER_START_DELAY_MS);
  }

  /** Leaves solver mode (running or finished) and restores the player's
   * board exactly as it was before watchSolver() was called. This is the
   * only path out of the finished state too ("Back to my board"). */
  stopSolver(): void {
    this.clearSolverTimeout();

    if (this.isSolverActive) {
      this.selectedEdges = [...this.playerSnapshotEdges];
      this.unionFindParent = buildUnionFind(this.points.length, this.selectedEdges);
      this.gameState = this.selectedEdges.length === this.edgesNeeded ? 'won' : 'playing';
    }

    this.solverRunning = false;
    this.solverFinished = false;
    this.solverStepIdx = 0;
    this.solverFrontierEdges = [];

    this.cdr.markForCheck();
  }

  private stepSolver(): void {
    if (!this.solverRunning) return; // stopped externally mid-tick — nothing to do

    if (this.solverStepIdx >= this.primResult.steps.length) {
      this.completeSolver();
      return;
    }

    const step = this.primResult.steps[this.solverStepIdx];
    this.selectedEdges = [...this.selectedEdges, step.edge];
    this.unionFindParent = buildUnionFind(this.points.length, this.selectedEdges);
    this.solverFrontierEdges = step.frontier;
    this.solverStepIdx++;

    if (this.solverStepIdx >= this.primResult.steps.length) {
      this.completeSolver();
      return;
    }

    this.cdr.markForCheck();
    this.solverTimeoutId = setTimeout(() => this.stepSolver(), SOLVER_TICK_MS);
  }

  /** Natural completion: Prim's tree stays on screen and player
   * interaction stays locked (gameState is deliberately left at 'playing',
   * never 'won' — this is the solver's tree, not a player win) until Stop
   * / "Back to my board" is clicked. */
  private completeSolver(): void {
    this.solverRunning = false;
    this.solverFinished = true;
    this.solverFrontierEdges = [];
    this.cdr.markForCheck();
  }

  private clearSolverTimeout(): void {
    if (this.solverTimeoutId !== null) {
      clearTimeout(this.solverTimeoutId);
      this.solverTimeoutId = null;
    }
  }

  // ── Cycle-reject flash ────────────────────────────────────────────────────

  private flashCycleReject(edge: Edge): void {
    this.clearCycleFlashTimeout();
    this.cycleRejectEdgeKey = edgeKey(edge);
    this.cdr.markForCheck();

    this.cycleFlashTimeoutId = setTimeout(() => {
      this.cycleRejectEdgeKey = null;
      this.cycleFlashTimeoutId = null;
      this.cdr.markForCheck();
    }, CYCLE_FLASH_MS);
  }

  private clearCycleFlashTimeout(): void {
    if (this.cycleFlashTimeoutId !== null) {
      clearTimeout(this.cycleFlashTimeoutId);
      this.cycleFlashTimeoutId = null;
    }
  }

  // ── Best score ────────────────────────────────────────────────────────────

  private recordWinIfOptimal(): void {
    if (this.overCost !== 0) return;
    if (this.hasCountedOptimalWin || this.hasWatchedSolver) return;

    this.hasCountedOptimalWin = true;
    this.bestScore++;
    try {
      localStorage.setItem(BEST_SCORE_KEY, String(this.bestScore));
    } catch {
      // localStorage unavailable (private window, blocked storage) — best
      // score just won't persist across reloads this session.
    }
  }

  private readBestScore(): number {
    try {
      return Number(localStorage.getItem(BEST_SCORE_KEY) ?? 0) || 0;
    } catch {
      return 0;
    }
  }
}
