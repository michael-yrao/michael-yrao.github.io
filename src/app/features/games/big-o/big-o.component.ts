import { Component, ChangeDetectionStrategy } from '@angular/core';
import { BIG_O_QUESTIONS, BigOQuestion } from '../../../core/data/big-o-questions.data';

type Mode = 'quiz' | 'revealed' | 'finished';

@Component({
  selector: 'app-big-o',
  templateUrl: './big-o.component.html',
  styleUrls: ['./big-o.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BigOComponent {
  deck: BigOQuestion[] = [];
  questionIndex = 0;
  current: BigOQuestion | null = null;

  selectedTime: string | null = null;
  selectedSpace: string | null = null;
  mode: Mode = 'quiz';

  timeScore = 0;
  spaceScore = 0;

  constructor() {
    this.startRun();
  }

  get canCheck(): boolean {
    return this.selectedTime !== null && this.selectedSpace !== null;
  }

  get timeCorrect(): boolean {
    return this.mode === 'revealed' && this.selectedTime === this.current?.correctTime;
  }

  get spaceCorrect(): boolean {
    return this.mode === 'revealed' && this.selectedSpace === this.current?.correctSpace;
  }

  get progressLabel(): string {
    return `${this.questionIndex + 1} / ${this.deck.length}`;
  }

  get totalScore(): number {
    return this.timeScore + this.spaceScore;
  }

  get maxScore(): number {
    return this.deck.length * 2;
  }

  get scorePercent(): number {
    return this.maxScore > 0 ? Math.round((this.totalScore / this.maxScore) * 100) : 0;
  }

  startRun(): void {
    this.deck = this.shuffle([...BIG_O_QUESTIONS]);
    this.questionIndex = 0;
    this.current = this.deck[0] ?? null;
    this.selectedTime = null;
    this.selectedSpace = null;
    this.mode = 'quiz';
    this.timeScore = 0;
    this.spaceScore = 0;
  }

  pickTime(opt: string): void {
    if (this.mode === 'revealed') return;
    this.selectedTime = opt;
  }

  pickSpace(opt: string): void {
    if (this.mode === 'revealed') return;
    this.selectedSpace = opt;
  }

  check(): void {
    if (!this.canCheck || !this.current) return;
    this.mode = 'revealed';
    if (this.selectedTime === this.current.correctTime) this.timeScore++;
    if (this.selectedSpace === this.current.correctSpace) this.spaceScore++;
  }

  next(): void {
    if (this.mode !== 'revealed') return;
    if (this.questionIndex + 1 >= this.deck.length) {
      this.mode = 'finished';
      return;
    }
    this.questionIndex++;
    this.current = this.deck[this.questionIndex];
    this.selectedTime = null;
    this.selectedSpace = null;
    this.mode = 'quiz';
  }

  private shuffle<T>(arr: T[]): T[] {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
}
