import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FloodFillComponent, COLORS } from './flood-fill.component';

describe('FloodFillComponent', () => {
  let component: FloodFillComponent;
  let fixture: ComponentFixture<FloodFillComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FloodFillComponent],
      imports: [RouterTestingModule],
    });
    fixture = TestBed.createComponent(FloodFillComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('initializes a 12x12 grid of 144 cells', () => {
    expect(component.cells.length).toBe(144);
  });

  it('initializes all cells with valid color indices', () => {
    expect(component.cells.every(c => c >= 0 && c < COLORS.length)).toBeTrue();
  });

  it('starts with max moves and playing state', () => {
    expect(component.movesLeft).toBe(component.maxMoves);
    expect(component.gameState).toBe('playing');
  });

  it('starts with at least one conquered cell', () => {
    expect(component.conqueredCount).toBeGreaterThanOrEqual(1);
  });

  it('does not decrement moves when picking the current color', () => {
    const before = component.movesLeft;
    component.pickColor(component.currentColor);
    expect(component.movesLeft).toBe(before);
  });

  it('decrements movesLeft on a valid color pick', fakeAsync(() => {
    const before = component.movesLeft;
    const differentColor = (component.currentColor + 1) % COLORS.length;
    component.pickColor(differentColor);
    tick(5000);
    expect(component.movesLeft).toBe(before - 1);
  }));

  it('resets game state on initGame', fakeAsync(() => {
    const differentColor = (component.currentColor + 1) % COLORS.length;
    component.pickColor(differentColor);
    tick(5000);
    component.initGame();
    expect(component.movesLeft).toBe(component.maxMoves);
    expect(component.gameState).toBe('playing');
  }));
});
