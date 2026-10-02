import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BarbellLifterComponent } from './barbell-lifter.component';
import { MAX_PLATES_PER_SIDE } from './lifter-state';

describe('BarbellLifterComponent', () => {
  let fixture: ComponentFixture<BarbellLifterComponent>;
  let root: HTMLElement;

  const click = (times: number): void => {
    const button = root.querySelector('button') as HTMLButtonElement;
    for (let i = 0; i < times; i++) {
      button.click();
      fixture.detectChanges();
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [BarbellLifterComponent] });
    fixture = TestBed.createComponent(BarbellLifterComponent);
    root = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('adds plates per side, spills past the max, and clears the spill on animationend', () => {
    click(2);
    expect(root.querySelectorAll('.plate').length).toBe(4);

    click(MAX_PLATES_PER_SIDE - 2);
    expect(root.querySelector('.spill')).toBeNull();

    click(1);
    expect(root.querySelector('.spill')).not.toBeNull();
    expect(root.querySelectorAll('.plate').length).toBe(0);

    root.querySelector('.spill')!.dispatchEvent(new Event('animationend'));
    fixture.detectChanges();
    expect(root.querySelector('.spill')).toBeNull();
  });
});
