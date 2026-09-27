import { TestBed } from '@angular/core/testing';

import { GrowthAreasComponent } from './growth-areas.component';

function createFixture() {
  TestBed.configureTestingModule({ imports: [GrowthAreasComponent] });
  const fixture = TestBed.createComponent(GrowthAreasComponent);
  fixture.detectChanges();
  return fixture;
}

describe('GrowthAreasComponent', () => {
  it('clicking a toggle button emits that area via select', () => {
    const fixture = createFixture();
    const emitted: string[] = [];
    fixture.componentInstance.select.subscribe((area) => emitted.push(area));

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('.growth-toggle__btn'),
    ) as HTMLButtonElement[];
    const systemDesignBtn = buttons.find((b) => b.textContent?.trim() === 'System Design');
    expect(systemDesignBtn).toBeTruthy();
    systemDesignBtn!.click();

    expect(emitted).toEqual(['system-design']);
  });
});
