import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import {
  CHECK_KEYS,
  CHECK_NAMES,
  EMPTY_NOTES,
  LEVEL_RAISER_MOVES,
  MOVE_NAMES,
  NOTES_MAX_LENGTH,
  verdictOf,
  type CheckKey,
  type InterviewNotes,
  type LevelRaiserMove,
  type Recognition,
} from '../session/debrief';
import { InterviewSessionService } from '../session/interview-session.service';
import { loadNotes, saveNotes } from '../session/notes-store';
import { loadPrepared } from '../session/prepared-store';
import { VERDICT_LABELS } from './verdict-labels';

const MS_PER_MINUTE = 60_000;

const isMove = (value: string): value is LevelRaiserMove => (LEVEL_RAISER_MOVES as readonly string[]).includes(value);

/** The interviewer's marks for the live session: quick checkboxes and one free-text field, saved in
 *  this browser on every change so a reload keeps them. */
@Component({
  selector: 'app-interview-notes',
  templateUrl: './interview-notes.component.html',
  styleUrls: ['./interview-notes.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterviewNotesComponent {
  private readonly session = inject(InterviewSessionService);
  private readonly sessionId = this.session.sessionId();

  protected readonly moves = LEVEL_RAISER_MOVES;
  protected readonly moveNames = MOVE_NAMES;
  protected readonly checkKeys = CHECK_KEYS;
  protected readonly checkNames = CHECK_NAMES;
  protected readonly notesMaxLength = NOTES_MAX_LENGTH;

  /** The focus areas typed when the interview was set up; empty when there are none. Read once. */
  protected readonly focus = this.sessionId === null ? '' : (loadPrepared(this.sessionId)?.schedule?.notes ?? '');

  protected readonly notes = signal<InterviewNotes>(this.initialNotes());
  protected readonly verdict = computed(() => verdictOf(this.notes()));
  protected readonly verdictLabel = computed(() => {
    const verdict = this.verdict();
    return verdict === null ? null : VERDICT_LABELS[verdict];
  });
  /** Thrown can be pressed once, and only after a candidate has connected. */
  protected readonly canThrow = computed(() => this.session.startedAt() !== null && this.notes().raiserMinute === null);

  protected setCold(event: Event): void {
    this.change({ isCold: (event.target as HTMLInputElement).checked });
  }

  protected setRecognition(recognition: Recognition): void {
    this.change({ recognition });
  }

  protected setTime(event: Event): void {
    this.change({ hasTime: (event.target as HTMLInputElement).checked });
  }

  protected setSpace(event: Event): void {
    this.change({ hasSpace: (event.target as HTMLInputElement).checked });
  }

  protected setMove(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.change({ move: isMove(value) ? value : null });
  }

  protected setCheck(key: CheckKey, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.change({ checks: { ...this.notes().checks, [key]: checked } });
  }

  protected setNotes(event: Event): void {
    this.change({ notes: (event.target as HTMLTextAreaElement).value });
  }

  /** Stamps the minute the level raiser was thrown, once. */
  protected throwRaiser(): void {
    const startedAt = this.session.startedAt();
    if (startedAt === null || this.notes().raiserMinute !== null) return;
    this.change({ raiserMinute: Math.floor((Date.now() - startedAt) / MS_PER_MINUTE) });
  }

  private initialNotes(): InterviewNotes {
    return (this.sessionId === null ? null : loadNotes(this.sessionId)) ?? EMPTY_NOTES;
  }

  /** Replaces the notes with a changed copy and saves it. */
  private change(patch: Partial<InterviewNotes>): void {
    const next: InterviewNotes = { ...this.notes(), ...patch };
    this.notes.set(next);
    if (this.sessionId !== null) saveNotes(this.sessionId, next);
  }
}
