import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BisectItComponent } from './bisect-it.component';
import {
  applyProbe,
  buildRoundDeck,
  kokoInstance,
  magnetInstance,
  parFor,
  shipInstance,
} from './bisect-it.rounds';

describe('bisect-it.rounds (pure logic)', () => {
  describe('reference answers on fixed instances', () => {
    it('Koko piles [3,6,7,11] h=8 -> minimum speed 4', () => {
      expect(kokoInstance([3, 6, 7, 11], 8).answer).toBe(4);
    });

    it('Ship weights [1..10] D=5 -> minimum capacity 15', () => {
      expect(shipInstance([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5).answer).toBe(15);
    });

    it('Magnets positions [1,2,3,4,7] m=3 -> maximum min-distance 3', () => {
      expect(magnetInstance([1, 2, 3, 4, 7], 3).answer).toBe(3);
    });
  });

  describe('par formula', () => {
    it('is ceil(log2(range width))', () => {
      expect(parFor(1, 1)).toBe(0);
      expect(parFor(1, 2)).toBe(1);
      expect(parFor(1, 4)).toBe(2);
      expect(parFor(1, 40)).toBe(6);
    });
  });

  describe('applyProbe elimination direction', () => {
    it('minimise: a feasible probe keeps the low half [lo, x]', () => {
      expect(applyProbe({ lo: 1, hi: 10 }, 5, true, 'minimise')).toEqual({ lo: 1, hi: 5 });
    });

    it('minimise: an infeasible probe keeps the high half [x+1, hi]', () => {
      expect(applyProbe({ lo: 1, hi: 10 }, 5, false, 'minimise')).toEqual({ lo: 6, hi: 10 });
    });

    it('maximise: a feasible probe keeps the high half [x, hi]', () => {
      expect(applyProbe({ lo: 1, hi: 10 }, 5, true, 'maximise')).toEqual({ lo: 5, hi: 10 });
    });

    it('maximise: an infeasible probe keeps the low half [lo, x-1]', () => {
      expect(applyProbe({ lo: 1, hi: 10 }, 5, false, 'maximise')).toEqual({ lo: 1, hi: 4 });
    });

    it('never widens the range, for every probe value in range', () => {
      const range = { lo: 1, hi: 20 };
      for (let x = range.lo; x <= range.hi; x++) {
        for (const feasible of [true, false]) {
          for (const direction of ['minimise', 'maximise'] as const) {
            const next = applyProbe(range, x, feasible, direction);
            const nextWidth = next.hi - next.lo + 1;
            const originalWidth = range.hi - range.lo + 1;
            expect(nextWidth).toBeLessThanOrEqual(originalWidth);
          }
        }
      }
    });
  });

  describe('buildRoundDeck', () => {
    it('builds 6 rounds — 2 instances of each of the 3 flavours', () => {
      const deck = buildRoundDeck();
      expect(deck.length).toBe(6);
      const counts = { koko: 0, ship: 0, magnet: 0 };
      for (const round of deck) counts[round.flavour]++;
      expect(counts).toEqual({ koko: 2, ship: 2, magnet: 2 });
    });

    it('every generated instance is solvable within its own [lo, hi]', () => {
      const deck = buildRoundDeck();
      for (const round of deck) {
        expect(round.answer).toBeGreaterThanOrEqual(round.lo);
        expect(round.answer).toBeLessThanOrEqual(round.hi);
        expect(round.predicate(round.answer)).toBe(true);
      }
    });
  });
});

describe('BisectItComponent', () => {
  let component: BisectItComponent;
  let fixture: ComponentFixture<BisectItComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, BisectItComponent],
    });
    fixture = TestBed.createComponent(BisectItComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
    try {
      localStorage.clear();
    } catch {
      // ignore — not every test environment exposes localStorage
    }
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts a run with a 6-round deck in the playing state', () => {
    expect(component.deck.length).toBe(6);
    expect(component.mode).toBe('playing');
    expect(component.current).toBe(component.deck[0]);
  });

  it('probing narrows the alive range and logs the probe', () => {
    const instance = component.current!;
    const before = component.aliveRange;
    component.selectValue(instance.lo);
    component.probe();
    expect(component.probes.length).toBe(1);
    const width = component.aliveRange.hi - component.aliveRange.lo + 1;
    const beforeWidth = before.hi - before.lo + 1;
    expect(width).toBeLessThanOrEqual(beforeWidth);
  });

  it('does not allow re-probing an already-probed value', () => {
    // A fixed instance where probing the answer (4) is feasible, so it stays alive
    // after the probe and can be re-selected — that's the case the guard must catch.
    const instance = kokoInstance([3, 6, 7, 11], 8);
    component.current = instance;
    component.aliveRange = { lo: instance.lo, hi: instance.hi };

    component.selectValue(4);
    component.probe();
    expect(component.probedValues.has(4)).toBe(true);

    component.selectValue(4);
    expect(component.selectedValue).toBe(4);
    expect(component.canProbe).toBe(false);
  });

  it('submit is correct exactly when the submitted value matches the reference answer', () => {
    const instance = component.current!;
    component.selectValue(instance.answer);
    component.submit();
    expect(component.mode).toBe('revealed');
    expect(component.isExact).toBe(true);
    expect(component.roundsExact).toBe(1);
  });

  it('submit is marked wrong (not exact) for a non-boundary value inside the range', () => {
    const instance = component.current!;
    const wrong = instance.answer === instance.hi ? instance.lo : instance.hi;
    component.selectValue(wrong);
    component.submit();
    expect(component.mode).toBe('revealed');
    expect(component.isExact).toBe(wrong === instance.answer);
  });

  it('next() advances to the next round after a reveal', () => {
    const first = component.current;
    component.selectValue(first!.answer);
    component.submit();
    component.next();
    expect(component.current).not.toBe(first);
    expect(component.mode).toBe('playing');
  });

  it('finishes the run after the last round is revealed and advanced', () => {
    for (let i = 0; i < component.deck.length; i++) {
      component.selectValue(component.current!.answer);
      component.submit();
      component.next();
    }
    expect(component.mode).toBe('finished');
    expect(component.roundsExact).toBe(component.deck.length);
  });

  describe('solver playback', () => {
    beforeEach(() => vi.useFakeTimers());

    it('watchSolver only runs after a reveal, and steps through the reference trace', () => {
      expect(component.mode).toBe('playing');
      component.watchSolver();
      expect(component.solverRunning).toBe(false);

      const instance = component.current!;
      component.selectValue(instance.answer);
      component.submit();
      component.watchSolver();
      expect(component.solverRunning).toBe(true);

      vi.advanceTimersByTime(600 * (instance.trace.length + 1));
      expect(component.solverRunning).toBe(false);
      expect(component.solverRange).toEqual({ lo: instance.answer, hi: instance.answer });
    });

    it('stopSolver halts playback immediately', () => {
      const instance = component.current!;
      component.selectValue(instance.answer);
      component.submit();
      component.watchSolver();
      component.stopSolver();
      expect(component.solverRunning).toBe(false);
    });
  });

  it('tracks a best exact-boundary streak in localStorage', () => {
    component.selectValue(component.current!.answer);
    component.submit();
    expect(component.bestStreak).toBeGreaterThanOrEqual(1);
    expect(localStorage.getItem('po-bisect-it-best')).toBe(String(component.bestStreak));
  });
});
