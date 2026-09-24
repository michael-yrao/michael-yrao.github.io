import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { QuizComponent } from './quiz.component';

describe('QuizComponent', () => {
  let component: QuizComponent;
  let fixture: ComponentFixture<QuizComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, QuizComponent],
    });
    fixture = TestBed.createComponent(QuizComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders Pattern Sense then Big-O Trainer, in that order', () => {
    const titles = Array.from(fixture.nativeElement.querySelectorAll('.game-card__title')).map(
      (el) => (el as HTMLElement).textContent?.trim(),
    );

    expect(titles).toEqual(['Pattern Sense', 'Big-O Trainer']);
  });
});
