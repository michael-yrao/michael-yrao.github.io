import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';

const GRID_SIZE = 12;
const MOVE_BUFFER = 5;
const WAVE_INTERVAL_MS = 40;
export const COLORS = ['#06b6d4', '#f97316', '#22c55e', '#a855f7', '#ec4899', '#eab308'];

@Component({
  selector: 'app-flood-fill',
  templateUrl: './flood-fill.component.html',
  styleUrls: ['./flood-fill.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloodFillComponent implements OnInit {
  readonly gridSize = GRID_SIZE;
  readonly moveBuffer = MOVE_BUFFER;
  readonly colors = COLORS;
  readonly colorIndices = Array.from({ length: COLORS.length }, (_, i) => i);

  cells: number[] = [];
  waveCells = new Set<number>();
  maxMoves = 0;
  greedyBest = 0;
  movesLeft = 0;
  gameState: 'playing' | 'won' | 'lost' = 'playing';
  conqueredCount = 0;

  get isAnimating(): boolean { return this._animating; }

  private conqueredSet = new Set<number>();
  private _animating = false;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.initGame();
  }

  get conqueredPercent(): number {
    return Math.round((this.conqueredCount / (GRID_SIZE * GRID_SIZE)) * 100);
  }

  get currentColor(): number {
    return this.cells[0] ?? 0;
  }

  initGame(): void {
    this.cells = Array.from({ length: GRID_SIZE * GRID_SIZE }, () =>
      Math.floor(Math.random() * COLORS.length)
    );
    this.gameState = 'playing';
    this.conqueredSet = this.bfsRegion(0, this.cells[0]);
    this.conqueredCount = this.conqueredSet.size;
    this.waveCells = new Set();
    this._animating = false;

    this.greedyBest = this.computeGreedyMoves();
    this.maxMoves = this.greedyBest + MOVE_BUFFER;
    this.movesLeft = this.maxMoves;

    this.cdr.markForCheck();
  }

  pickColor(colorIdx: number): void {
    if (this._animating || this.gameState !== 'playing' || colorIdx === this.currentColor) return;

    this.movesLeft--;

    for (const idx of this.conqueredSet) {
      this.cells[idx] = colorIdx;
    }

    const waves = this.computeExpansionWaves(colorIdx);

    if (waves.length === 0) {
      this.finalizeTurn();
    } else {
      this._animating = true;
      this.animateWaves(waves, 0, colorIdx);
    }
    this.cdr.markForCheck();
  }

  trackByIdx(index: number): number {
    return index;
  }

  // ── Greedy solver ────────────────────────────────────────────────────────────

  private computeGreedyMoves(): number {
    const cells = [...this.cells];
    const conquered = new Set<number>(this.conqueredSet);
    let moves = 0;

    while (conquered.size < GRID_SIZE * GRID_SIZE) {
      let bestColor = -1;
      let bestGain = 0;

      for (let c = 0; c < COLORS.length; c++) {
        const gain = this.colorGain(cells, conquered, c);
        if (gain > bestGain) {
          bestGain = gain;
          bestColor = c;
        }
      }

      if (bestColor === -1 || bestGain === 0) break;

      this.applyGreedyMove(cells, conquered, bestColor);
      moves++;
    }

    return moves;
  }

  private colorGain(cells: number[], conquered: Set<number>, color: number): number {
    const visited = new Set<number>(conquered);
    const queue: number[] = [];

    for (const idx of conquered) {
      for (const nIdx of this.neighbors(idx)) {
        if (!visited.has(nIdx) && cells[nIdx] === color) {
          queue.push(nIdx);
          visited.add(nIdx);
        }
      }
    }

    let gained = queue.length;
    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const nIdx of this.neighbors(curr)) {
        if (!visited.has(nIdx) && cells[nIdx] === color) {
          queue.push(nIdx);
          visited.add(nIdx);
          gained++;
        }
      }
    }

    return gained;
  }

  private applyGreedyMove(cells: number[], conquered: Set<number>, color: number): void {
    for (const idx of conquered) {
      cells[idx] = color;
    }

    const visited = new Set<number>(conquered);
    const queue: number[] = [];

    for (const idx of conquered) {
      for (const nIdx of this.neighbors(idx)) {
        if (!visited.has(nIdx) && cells[nIdx] === color) {
          queue.push(nIdx);
          visited.add(nIdx);
        }
      }
    }

    while (queue.length > 0) {
      const curr = queue.shift()!;
      conquered.add(curr);
      cells[curr] = color;
      for (const nIdx of this.neighbors(curr)) {
        if (!visited.has(nIdx) && cells[nIdx] === color) {
          queue.push(nIdx);
          visited.add(nIdx);
        }
      }
    }
  }

  // ── BFS helpers ──────────────────────────────────────────────────────────────

  private bfsRegion(startIdx: number, color: number): Set<number> {
    const visited = new Set<number>([startIdx]);
    const queue = [startIdx];
    while (queue.length) {
      const curr = queue.shift()!;
      for (const nIdx of this.neighbors(curr)) {
        if (!visited.has(nIdx) && this.cells[nIdx] === color) {
          visited.add(nIdx);
          queue.push(nIdx);
        }
      }
    }
    return visited;
  }

  private computeExpansionWaves(newColor: number): number[][] {
    const waves: number[][] = [];
    const visited = new Set<number>(this.conqueredSet);
    let frontier: number[] = [];

    for (const idx of this.conqueredSet) {
      for (const nIdx of this.neighbors(idx)) {
        if (!visited.has(nIdx) && this.cells[nIdx] === newColor) {
          frontier.push(nIdx);
          visited.add(nIdx);
        }
      }
    }

    while (frontier.length > 0) {
      waves.push([...frontier]);
      const next: number[] = [];
      for (const idx of frontier) {
        for (const nIdx of this.neighbors(idx)) {
          if (!visited.has(nIdx) && this.cells[nIdx] === newColor) {
            next.push(nIdx);
            visited.add(nIdx);
          }
        }
      }
      frontier = next;
    }

    return waves;
  }

  private animateWaves(waves: number[][], waveIdx: number, newColor: number): void {
    if (waveIdx >= waves.length) {
      this._animating = false;
      this.waveCells = new Set();
      this.finalizeTurn();
      this.cdr.markForCheck();
      return;
    }

    const wave = waves[waveIdx];
    for (const idx of wave) {
      this.conqueredSet.add(idx);
      this.cells[idx] = newColor;
      this.waveCells.add(idx);
    }
    if (waveIdx > 0) {
      for (const idx of waves[waveIdx - 1]) {
        this.waveCells.delete(idx);
      }
    }
    this.cdr.markForCheck();

    setTimeout(() => this.animateWaves(waves, waveIdx + 1, newColor), WAVE_INTERVAL_MS);
  }

  private finalizeTurn(): void {
    this.conqueredCount = this.conqueredSet.size;
    if (this.conqueredCount === GRID_SIZE * GRID_SIZE) {
      this.gameState = 'won';
    } else if (this.movesLeft === 0) {
      this.gameState = 'lost';
    }
    this.cdr.markForCheck();
  }

  private neighbors(idx: number): number[] {
    const r = Math.floor(idx / GRID_SIZE);
    const c = idx % GRID_SIZE;
    const result: number[] = [];
    if (r > 0) result.push((r - 1) * GRID_SIZE + c);
    if (r < GRID_SIZE - 1) result.push((r + 1) * GRID_SIZE + c);
    if (c > 0) result.push(r * GRID_SIZE + (c - 1));
    if (c < GRID_SIZE - 1) result.push(r * GRID_SIZE + (c + 1));
    return result;
  }
}
