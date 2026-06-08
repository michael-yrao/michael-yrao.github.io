import {
  Component, Input, Output, EventEmitter, ChangeDetectorRef,
  ChangeDetectionStrategy, OnDestroy, OnInit,
} from '@angular/core';

@Component({
  selector: 'app-step-controls',
  templateUrl: './step-controls.component.html',
  styleUrls: ['./step-controls.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepControlsComponent implements OnInit, OnDestroy {
  @Input() currentStep = 0;
  @Input() totalSteps = 0;
  @Output() stepChange = new EventEmitter<number>();
  @Output() reset = new EventEmitter<void>();

  isPlaying = false;
  speed = 1000;

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.stopTimer();
  }

  get atStart(): boolean { return this.currentStep === 0; }
  get atEnd(): boolean   { return this.currentStep >= this.totalSteps - 1; }

  stepBack(): void {
    if (!this.atStart) this.stepChange.emit(this.currentStep - 1);
  }

  stepForward(): void {
    if (!this.atEnd) this.stepChange.emit(this.currentStep + 1);
    else this.pause();
  }

  goToStart(): void {
    this.pause();
    this.stepChange.emit(0);
  }

  goToEnd(): void {
    this.pause();
    this.stepChange.emit(this.totalSteps - 1);
  }

  togglePlay(): void {
    this.isPlaying ? this.pause() : this.play();
  }

  play(): void {
    if (this.atEnd) this.stepChange.emit(0);
    this.isPlaying = true;
    this.timer = setInterval(() => {
      if (this.atEnd) {
        this.pause();
        return;
      }
      this.stepChange.emit(this.currentStep + 1);
    }, this.speed);
  }

  pause(): void {
    this.isPlaying = false;
    this.stopTimer();
    this.cdr.markForCheck();
  }

  onSpeedChange(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.speed = val;
    if (this.isPlaying) {
      this.stopTimer();
      this.play();
    }
  }

  onReset(): void {
    this.pause();
    this.reset.emit();
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
