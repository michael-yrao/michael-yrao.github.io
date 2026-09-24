import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ConnectCitiesComponent } from './connect-cities.component';
import { Edge } from './connect-cities.solver';

function findEdge(component: ConnectCitiesComponent, a: number, b: number): Edge {
  const edge = component.edges.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));
  if (!edge) throw new Error(`no edge between ${a} and ${b} on this board`);
  return edge;
}

/** Greedily walks every candidate edge and selects it unless it would close
 * a cycle — over a complete graph this always finishes as a full spanning
 * tree, so it needs no knowledge of the randomly generated coordinates. */
function playToWin(component: ConnectCitiesComponent): void {
  for (const edge of component.edges) {
    if (component.selectedEdges.length === component.edgesNeeded) break;
    component.selectEdge(edge);
  }
}

describe('ConnectCitiesComponent', () => {
  let component: ConnectCitiesComponent;
  let fixture: ComponentFixture<ConnectCitiesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, ConnectCitiesComponent],
    });
    fixture = TestBed.createComponent(ConnectCitiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('generates a board with 8-12 cities and all-pairs edges', () => {
    expect(component.points.length).toBeGreaterThanOrEqual(8);
    expect(component.points.length).toBeLessThanOrEqual(12);
    const n = component.points.length;
    expect(component.edges.length).toBe((n * (n - 1)) / 2);
  });

  it('starts in the playing state with no edges selected', () => {
    expect(component.gameState).toBe('playing');
    expect(component.selectedEdges.length).toBe(0);
  });

  it('selecting an edge adds it and updates the player cost', () => {
    const edge = findEdge(component, 0, 1);
    component.selectEdge(edge);
    expect(component.selectedEdges.length).toBe(1);
    expect(component.playerCost).toBe(edge.weight);
  });

  it('selecting an already-selected edge is a no-op', () => {
    const edge = findEdge(component, 0, 1);
    component.selectEdge(edge);
    component.selectEdge(edge);
    expect(component.selectedEdges.length).toBe(1);
  });

  it('rejects an edge that would close a cycle', () => {
    component.selectEdge(findEdge(component, 0, 1));
    component.selectEdge(findEdge(component, 1, 2));
    const before = component.selectedEdges.length;

    const closingEdge = findEdge(component, 0, 2);
    component.selectEdge(closingEdge);

    expect(component.selectedEdges.length).toBe(before);
    expect(component.isCycleFlash(closingEdge)).toBe(true);
  });

  it('undo removes the last edge and rebuilds union-find so it can be reselected', () => {
    const e01 = findEdge(component, 0, 1);
    component.selectEdge(e01);
    expect(component.selectedEdges.length).toBe(1);

    component.undoLast();
    expect(component.selectedEdges.length).toBe(0);

    // Re-selecting the same edge must now succeed (proves the DSU was
    // rebuilt, not left stuck unioned).
    component.selectEdge(e01);
    expect(component.selectedEdges.length).toBe(1);
  });

  it('undo on an empty board is a no-op', () => {
    component.undoLast();
    expect(component.selectedEdges.length).toBe(0);
  });

  it('reaching edgesNeeded selected edges wins the game', () => {
    playToWin(component);
    expect(component.selectedEdges.length).toBe(component.edgesNeeded);
    expect(component.gameState).toBe('won');
  });

  it('selecting exactly Prim\'s edge set wins optimally and increments best score', () => {
    const before = component.bestScore;
    for (const edge of component.primEdges) {
      component.selectEdge(edge);
    }
    expect(component.gameState).toBe('won');
    expect(component.isOptimal).toBe(true);
    expect(component.playerCost).toBe(component.optimalCost);
    expect(component.bestScore).toBe(before + 1);
  });

  it('an optimal win counts at most once per board, even after undo + reselect', () => {
    const before = component.bestScore;
    for (const edge of component.primEdges) {
      component.selectEdge(edge);
    }
    expect(component.bestScore).toBe(before + 1);

    const lastEdge = component.primEdges[component.primEdges.length - 1];
    component.undoLast();
    expect(component.gameState).toBe('playing');
    component.selectEdge(lastEdge);

    expect(component.gameState).toBe('won');
    expect(component.isOptimal).toBe(true);
    expect(component.bestScore).toBe(before + 1); // not before + 2
  });

  it('a win after watching the solver on this board does not count toward best score', () => {
    const before = component.bestScore;

    component.watchSolver();
    component.stopSolver(); // back to the (still empty) player board, but the board is now "spoiled"

    for (const edge of component.primEdges) {
      component.selectEdge(edge);
    }

    expect(component.gameState).toBe('won');
    expect(component.isOptimal).toBe(true);
    expect(component.bestScore).toBe(before);
  });

  it('a non-optimal win reports the overage and does not bump best score', () => {
    const before = component.bestScore;
    playToWin(component);
    if (component.isOptimal) {
      // The greedy walk happened to find the optimal tree on this board —
      // not the case under test; skip rather than assert a false negative.
      return;
    }
    expect(component.overCost).toBeGreaterThan(0);
    expect(component.bestScore).toBe(before);
  });

  it('newBoard resets selected edges and game state', () => {
    component.selectEdge(findEdge(component, 0, 1));
    component.newBoard();
    expect(component.selectedEdges.length).toBe(0);
    expect(component.gameState).toBe('playing');
  });

  describe('solver playback', () => {
    beforeEach(() => vi.useFakeTimers());

    it('watchSolver clears the board and grows Prim\'s tree one edge per tick', () => {
      component.selectEdge(findEdge(component, 0, 1));
      component.watchSolver();
      expect(component.solverRunning).toBe(true);
      expect(component.selectedEdges.length).toBe(0);

      vi.runOnlyPendingTimers(); // first tick
      expect(component.selectedEdges.length).toBe(1);
    });

    it('watchSolver calls stopSolver first, so a double click never runs two loops', () => {
      component.watchSolver();
      const timerCountAfterFirst = vi.getTimerCount();

      component.watchSolver();
      expect(vi.getTimerCount()).toBe(timerCountAfterFirst); // old loop's timer was cleared, one fresh timer scheduled
      expect(component.solverRunning).toBe(true);
    });

    it('stopSolver restores the player\'s board exactly as it was before watching', () => {
      const e01 = findEdge(component, 0, 1);
      component.selectEdge(e01);
      const playerEdgesBefore = [...component.selectedEdges];

      component.watchSolver();
      vi.runOnlyPendingTimers(); // exactly one tick — the board has >= 8 cities, so the solver is still mid-run

      component.stopSolver();
      expect(component.solverRunning).toBe(false);
      expect(component.selectedEdges).toEqual(playerEdgesBefore);
    });

    it('running the full solver to completion shows Prim\'s tree, not a player win', () => {
      component.watchSolver();
      vi.runAllTimers();

      expect(component.solverRunning).toBe(false);
      expect(component.solverFinished).toBe(true);
      expect(component.selectedEdges.length).toBe(component.edgesNeeded);
      // Natural completion is never a player win — the overlay is gated on
      // gameState === 'won', which must stay untouched by the solver.
      expect(component.gameState).not.toBe('won');
    });

    it('player interaction stays locked while the finished solver tree is on screen', () => {
      component.watchSolver();
      vi.runAllTimers();

      const edgesBefore = component.selectedEdges.length;
      component.selectEdge(findEdge(component, 0, 1));
      component.undoLast();
      expect(component.selectedEdges.length).toBe(edgesBefore);
    });

    it('"Back to my board" (stopSolver) after natural completion restores the player\'s exact prior edges', () => {
      const e01 = findEdge(component, 0, 1);
      component.selectEdge(e01);
      const playerEdgesBefore = [...component.selectedEdges];

      component.watchSolver();
      vi.runAllTimers(); // let Prim's finish growing the whole tree
      expect(component.solverFinished).toBe(true);

      component.stopSolver();
      expect(component.solverFinished).toBe(false);
      expect(component.isSolverActive).toBe(false);
      expect(component.selectedEdges).toEqual(playerEdgesBefore);
    });

    it('ngOnDestroy clears the solver timer without throwing', () => {
      component.watchSolver();
      const timerCountBeforeDestroy = vi.getTimerCount();

      expect(() => fixture.destroy()).not.toThrow();

      // Our own pending solver tick is gone; only unrelated framework
      // timers (if any) may remain, so this only ever decreases.
      expect(vi.getTimerCount()).toBeLessThan(timerCountBeforeDestroy);
    });
  });
});
