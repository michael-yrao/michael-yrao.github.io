import { Component, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';

type Phase = 'generating' | 'ready' | 'solving' | 'solved';
type Solver = 'bfs' | 'dfs';

interface MazeCell {
  r: number;
  c: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  carved: boolean;
  isCurrent: boolean;
  solve: 'none' | 'explored' | 'path';
}

interface SolveResult {
  explored: number;
  pathLength: number;
}

const ROWS = 15;
const COLS = 21;
// Carving + exploration animation pacing (cells per timer tick).
const GEN_CELLS_PER_TICK = 3;
const SOLVE_CELLS_PER_TICK = 4;
const TICK_MS = 16;
const PATH_TICK_MS = 24;

@Component({
  selector: 'app-maze',
  templateUrl: './maze.component.html',
  styleUrls: ['./maze.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MazeComponent implements OnDestroy {
  readonly rows = ROWS;
  readonly cols = COLS;
  grid: MazeCell[][] = [];
  phase: Phase = 'generating';
  activeSolver: Solver | null = null;
  results: Partial<Record<Solver, SolveResult>> = {};

  private genOrder: [number, number][] = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  get startKey(): string { return '0,0'; }
  get goalKey(): string { return `${ROWS - 1},${COLS - 1}`; }

  constructor(private cdr: ChangeDetectorRef) {
    this.newMaze();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  trackCell(_: number, cell: MazeCell): string {
    return `${cell.r},${cell.c}`;
  }

  // ── Generation: recursive backtracker (randomized DFS) ─────────────────────
  newMaze(): void {
    this.stopTimer();
    this.results = {};
    this.activeSolver = null;
    this.grid = Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) => ({
        r, c,
        walls: { top: true, right: true, bottom: true, left: true },
        carved: false,
        isCurrent: false,
        solve: 'none' as const,
      }))
    );

    // Carve the full maze immediately (final wall data), recording visit order
    // so the animation can replay the DFS carving path.
    this.genOrder = [];
    const visited = new Set<string>(['0,0']);
    const stack: [number, number][] = [[0, 0]];
    this.genOrder.push([0, 0]);

    while (stack.length) {
      const [r, c] = stack[stack.length - 1];
      const neighbors: [number, number, keyof MazeCell['walls'], keyof MazeCell['walls']][] = [];
      if (r > 0 && !visited.has(`${r - 1},${c}`)) neighbors.push([r - 1, c, 'top', 'bottom']);
      if (r < ROWS - 1 && !visited.has(`${r + 1},${c}`)) neighbors.push([r + 1, c, 'bottom', 'top']);
      if (c > 0 && !visited.has(`${r},${c - 1}`)) neighbors.push([r, c - 1, 'left', 'right']);
      if (c < COLS - 1 && !visited.has(`${r},${c + 1}`)) neighbors.push([r, c + 1, 'right', 'left']);

      if (!neighbors.length) {
        stack.pop();
        continue;
      }
      const [nr, nc, wallHere, wallThere] = neighbors[Math.floor(Math.random() * neighbors.length)];
      this.grid[r][c].walls[wallHere] = false;
      this.grid[nr][nc].walls[wallThere] = false;
      visited.add(`${nr},${nc}`);
      stack.push([nr, nc]);
      this.genOrder.push([nr, nc]);
    }

    this.animateGeneration();
  }

  private animateGeneration(): void {
    this.phase = 'generating';
    let i = 0;
    let prev: MazeCell | null = null;
    this.timer = setInterval(() => {
      for (let k = 0; k < GEN_CELLS_PER_TICK && i < this.genOrder.length; k++, i++) {
        const [r, c] = this.genOrder[i];
        if (prev) prev.isCurrent = false;
        const cell = this.grid[r][c];
        cell.carved = true;
        cell.isCurrent = true;
        prev = cell;
      }
      if (i >= this.genOrder.length) {
        if (prev) prev.isCurrent = false;
        this.stopTimer();
        this.phase = 'ready';
      }
      this.cdr.markForCheck();
    }, TICK_MS);
  }

  // ── Solvers ────────────────────────────────────────────────────────────────
  solve(solver: Solver): void {
    if (this.phase === 'generating' || this.phase === 'solving') return;
    this.stopTimer();
    this.activeSolver = solver;
    for (const row of this.grid) for (const cell of row) cell.solve = 'none';

    const { order, path } = solver === 'bfs' ? this.runBfs() : this.runDfs();
    this.results = { ...this.results, [solver]: { explored: order.length, pathLength: path.length } };
    this.animateSolve(order, path);
  }

  /** Neighbors reachable through open walls, in a fixed order: right, down, left, up. */
  private openNeighbors(r: number, c: number): [number, number][] {
    const cell = this.grid[r][c];
    const out: [number, number][] = [];
    if (!cell.walls.right && c < COLS - 1) out.push([r, c + 1]);
    if (!cell.walls.bottom && r < ROWS - 1) out.push([r + 1, c]);
    if (!cell.walls.left && c > 0) out.push([r, c - 1]);
    if (!cell.walls.top && r > 0) out.push([r - 1, c]);
    return out;
  }

  private runBfs(): { order: [number, number][]; path: [number, number][] } {
    const queue: [number, number][] = [[0, 0]];
    const visited = new Set<string>(['0,0']);
    const parent = new Map<string, string>();
    const order: [number, number][] = [];

    while (queue.length) {
      const [r, c] = queue.shift()!;
      order.push([r, c]);
      if (r === ROWS - 1 && c === COLS - 1) break;
      for (const [nr, nc] of this.openNeighbors(r, c)) {
        const k = `${nr},${nc}`;
        if (visited.has(k)) continue;
        visited.add(k);
        parent.set(k, `${r},${c}`);
        queue.push([nr, nc]);
      }
    }
    return { order, path: this.buildPath(parent) };
  }

  private runDfs(): { order: [number, number][]; path: [number, number][] } {
    const stack: [number, number][] = [[0, 0]];
    const visited = new Set<string>(['0,0']);
    const parent = new Map<string, string>();
    const order: [number, number][] = [];

    while (stack.length) {
      const [r, c] = stack.pop()!;
      order.push([r, c]);
      if (r === ROWS - 1 && c === COLS - 1) break;
      for (const [nr, nc] of this.openNeighbors(r, c)) {
        const k = `${nr},${nc}`;
        if (visited.has(k)) continue;
        visited.add(k);
        parent.set(k, `${r},${c}`);
        stack.push([nr, nc]);
      }
    }
    return { order, path: this.buildPath(parent) };
  }

  private buildPath(parent: Map<string, string>): [number, number][] {
    const path: [number, number][] = [];
    let k: string | undefined = this.goalKey;
    while (k) {
      const [r, c] = k.split(',').map(Number);
      path.unshift([r, c]);
      k = parent.get(k);
    }
    return path;
  }

  private animateSolve(order: [number, number][], path: [number, number][]): void {
    this.phase = 'solving';
    let i = 0;
    this.timer = setInterval(() => {
      for (let k = 0; k < SOLVE_CELLS_PER_TICK && i < order.length; k++, i++) {
        const [r, c] = order[i];
        this.grid[r][c].solve = 'explored';
      }
      if (i >= order.length) {
        this.stopTimer();
        this.animatePath(path);
      }
      this.cdr.markForCheck();
    }, TICK_MS);
  }

  private animatePath(path: [number, number][]): void {
    let i = 0;
    this.timer = setInterval(() => {
      if (i < path.length) {
        const [r, c] = path[i++];
        this.grid[r][c].solve = 'path';
      } else {
        this.stopTimer();
        this.phase = 'solved';
      }
      this.cdr.markForCheck();
    }, PATH_TICK_MS);
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
