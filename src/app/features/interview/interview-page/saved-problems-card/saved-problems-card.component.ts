import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { InterviewSetupComponent } from '../../interview-setup/interview-setup.component';
import { listSavedProblems, loadSavedProblem, removeSavedProblem } from '../../saved-problem-store';
import type { InterviewProblem } from '../../session/interview-problem';
import { formatDebriefDate } from '../interview-format';

const DELETE_CONFIRM = 'Delete this saved problem? Interviews already set up from it are kept.';

interface SetupTarget {
  readonly id: string;
  readonly problem: InterviewProblem;
}

/** The landing's list of saved problems, each with Edit, Test run, Set up interview and Delete. */
@Component({
  selector: 'app-saved-problems-card',
  templateUrl: './saved-problems-card.component.html',
  styleUrls: ['./saved-problems-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InterviewSetupComponent, ModalComponent, RouterLink],
})
export class SavedProblemsCardComponent {
  protected readonly saved = signal(listSavedProblems());
  protected readonly setupFor = signal<SetupTarget | null>(null);
  protected readonly formatDate = formatDebriefDate;

  protected openSetup(id: string): void {
    const saved = loadSavedProblem(id);
    if (saved !== null) {
      this.setupFor.set({ id, problem: saved.problem });
    }
  }

  protected remove(id: string): void {
    if (!window.confirm(DELETE_CONFIRM)) {
      return;
    }
    removeSavedProblem(id);
    this.saved.set(listSavedProblems());
  }
}
