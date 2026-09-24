import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { OneStrokeComponent } from './one-stroke.component';
import { OneStrokeBoard, diagnoseEuler, MIN_NODES, MAX_NODES, MIN_EDGES, MAX_EDGES } from './one-stroke.solver';

// Two-node, one-edge board: the only possible tour is a win in one move.
const WIN_BOARD: OneStrokeBoard = {
  nodes: [
    { id: 0, x: 0, y: 0 },
    { id: 1, x: 1, y: 0 },
  ],
  edges: [{ id: 0, from: 0, to: 1 }],
  directed: false,
};

// Odd nodes are 0 and 3 (valid starts). Starting at node 1 instead and
// walking 1→2→0→3 strands edge 0 (0–1) unused — a guaranteed dead end.
const LOSS_BOARD: OneStrokeBoard = {
  nodes: [
    { id: 0, x: 0, y: 0 },
    { id: 1, x: 1, y: 0 },
    { id: 2, x: 2, y: 0 },
    { id: 3, x: 3, y: 0 },
  ],
  edges: [
    { id: 0, from: 0, to: 1 },
    { id: 1, from: 1, to: 2 },
    { id: 2, from: 2, to: 0 },
    { id: 3, from: 0, to: 3 },
  ],
  directed: false,
};

type PrivateBoardAccess = {
  board: OneStrokeBoard;
  diagnosis: ReturnType<typeof diagnoseEuler>;
  loadPlayState: () => void;
};

function loadFixtureBoard(component: OneStrokeComponent, board: OneStrokeBoard): void {
  const access = component as unknown as PrivateBoardAccess;
  access.board = board;
  access.diagnosis = diagnoseEuler(board);
  access.loadPlayState();
}

describe('OneStrokeComponent', () => {
  let component: OneStrokeComponent;
  let fixture: ComponentFixture<OneStrokeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, OneStrokeComponent],
    });
    fixture = TestBed.createComponent(OneStrokeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('generates a board within the configured node/edge bounds', () => {
    expect(component.board.nodes.length).toBeGreaterThanOrEqual(MIN_NODES);
    expect(component.board.nodes.length).toBeLessThanOrEqual(MAX_NODES);
    expect(component.board.edges.length).toBeGreaterThanOrEqual(MIN_EDGES);
    expect(component.board.edges.length).toBeLessThanOrEqual(MAX_EDGES);
  });

  it('starts in the choosing-start phase with no moves made', () => {
    expect(component.phase).toBe('choosing-start');
    expect(component.movesCount).toBe(0);
    expect(component.canUndo).toBe(false);
  });

  describe('win transition', () => {
    beforeEach(() => loadFixtureBoard(component, WIN_BOARD));

    it('completing the only edge wins the round and grows the streak', () => {
      component.selectNode(0);
      expect(component.phase).toBe('playing');
      expect(component.invalidStartMessage).toBeNull();

      component.selectNode(1);
      expect(component.phase).toBe('won');
      expect(component.usedEdgeIds.size).toBe(1);
      expect(component.winStreak).toBe(1);
      expect(component.bestStreak).toBeGreaterThanOrEqual(1);
    });
  });

  describe('loss transition', () => {
    beforeEach(() => loadFixtureBoard(component, LOSS_BOARD));

    it('flags an off-rule start and then strands an edge into a dead end', () => {
      component.selectNode(1); // not a valid start (only 0 and 3 are)
      expect(component.invalidStartMessage).not.toBeNull();

      component.selectNode(2);
      component.selectNode(0);
      component.selectNode(3);

      expect(component.phase).toBe('lost');
      expect(component.showExplain).toBe(true);
      expect(component.usedEdgeIds.size).toBe(3);
      expect(component.winStreak).toBe(0);
    });

    it('ignores a click on a node with no unused edge from the current one', () => {
      component.selectNode(1); // node 1's only edges go to 0 and 2 — not 3
      const before = component.movesCount;
      component.selectNode(3);
      expect(component.movesCount).toBe(before);
      expect(component.currentNodeId).toBe(1);
    });
  });

  describe('undo', () => {
    beforeEach(() => loadFixtureBoard(component, LOSS_BOARD));

    it('reverts the last move and restores canUndo state', () => {
      component.selectNode(0);
      expect(component.canUndo).toBe(true);

      component.selectNode(1);
      expect(component.usedEdgeIds.size).toBe(1);
      expect(component.path).toEqual([0, 1]);

      component.undo();
      expect(component.usedEdgeIds.size).toBe(0);
      expect(component.path).toEqual([0]);
      expect(component.phase).toBe('playing');

      component.undo();
      expect(component.phase).toBe('choosing-start');
      expect(component.canUndo).toBe(false);
    });

    it('is a no-op with no history', () => {
      expect(component.canUndo).toBe(false);
      expect(() => component.undo()).not.toThrow();
      expect(component.phase).toBe('choosing-start');
    });
  });

  describe('solver playback', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      loadFixtureBoard(component, LOSS_BOARD);
    });

    afterEach(() => {
      vi.clearAllTimers();
      vi.useRealTimers();
    });

    it('runs the animation and stopSolver restores the players board', () => {
      component.selectNode(0);
      component.selectNode(1);
      const playerPath = [...component.path];
      const playerUsed = component.usedEdgeIds.size;

      component.watchSolver();
      expect(component.solverRunning).toBe(true);

      component.stopSolver();
      expect(component.solverRunning).toBe(false);
      expect(component.path).toEqual(playerPath);
      expect(component.usedEdgeIds.size).toBe(playerUsed);
    });

    it('a second watchSolver call cannot start two loops', () => {
      component.watchSolver();
      component.watchSolver();
      expect(component.solverRunning).toBe(true);

      expect(() => vi.runAllTimers()).not.toThrow();
      expect(component.solverRunning).toBe(false);
    });

    it('clears all timers on destroy', () => {
      component.watchSolver();
      component.ngOnDestroy();
      expect(() => vi.runAllTimers()).not.toThrow();
    });

    it('keeps the tour lit after completion until the player goes back', () => {
      component.selectNode(0);
      component.selectNode(1);
      const priorPath = [...component.path];
      const priorUsed = component.usedEdgeIds.size;

      component.watchSolver();
      vi.runAllTimers();

      expect(component.solverRunning).toBe(false);
      expect(component.solverFinished).toBe(true);
      expect(component.solverLitEdgeIds.size).toBeGreaterThan(0);
      expect(component.solverActive).toBe(true);

      component.stopSolver();
      expect(component.solverFinished).toBe(false);
      expect(component.path).toEqual(priorPath);
      expect(component.usedEdgeIds.size).toBe(priorUsed);
    });

    it('watching twice with player moves in between never restores a stale snapshot', () => {
      component.selectNode(0);
      component.selectNode(1);
      const stateA = { path: [...component.path], used: component.usedEdgeIds.size };

      component.watchSolver();
      vi.runAllTimers();
      component.stopSolver(); // "Back to my board" — should land on state A
      expect(component.path).toEqual(stateA.path);
      expect(component.usedEdgeIds.size).toBe(stateA.used);

      component.selectNode(2); // a real move made after the first watch
      const stateB = { path: [...component.path], used: component.usedEdgeIds.size };
      expect(stateB.path).not.toEqual(stateA.path);

      component.watchSolver();
      vi.runAllTimers();
      component.stopSolver(); // must land on state B, not the stale state A
      expect(component.path).toEqual(stateB.path);
      expect(component.usedEdgeIds.size).toBe(stateB.used);
    });
  });

  describe('streak integrity', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.clearAllTimers();
      vi.useRealTimers();
    });

    it('undoing and redoing a win does not double-count the streak', () => {
      loadFixtureBoard(component, WIN_BOARD);
      component.selectNode(0);
      component.selectNode(1);
      expect(component.phase).toBe('won');
      expect(component.winStreak).toBe(1);

      component.undo();
      expect(component.phase).toBe('playing');
      component.selectNode(1);
      expect(component.phase).toBe('won');
      expect(component.winStreak).toBe(1);
    });

    it('a win on a board where the solver was watched earns no streak credit', () => {
      loadFixtureBoard(component, WIN_BOARD);
      component.watchSolver();
      vi.runAllTimers();
      component.stopSolver();
      expect(component.winStreak).toBe(0);

      component.selectNode(0);
      component.selectNode(1);
      expect(component.phase).toBe('won');
      expect(component.winStreak).toBe(0);
    });

    it('a normal win on a different, never-watched board still counts', () => {
      loadFixtureBoard(component, WIN_BOARD);
      component.selectNode(0);
      component.selectNode(1);
      expect(component.winStreak).toBe(1);
    });
  });

  describe('reset and new board', () => {
    it('resetBoard keeps the same board but clears play state', () => {
      loadFixtureBoard(component, WIN_BOARD);
      component.selectNode(0);
      const boardBefore = component.board;

      component.resetBoard();
      expect(component.board).toBe(boardBefore);
      expect(component.phase).toBe('choosing-start');
      expect(component.canUndo).toBe(false);
    });

    it('newBoard regenerates the board and resets play state', () => {
      loadFixtureBoard(component, WIN_BOARD);
      component.selectNode(0);

      component.newBoard();
      expect(component.phase).toBe('choosing-start');
      expect(component.movesCount).toBe(0);
    });
  });
});
