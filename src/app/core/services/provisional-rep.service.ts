import { Injectable, inject } from '@angular/core';

import { AuthService } from '../auth/auth.service';
import { attemptNumberFromPath, parseAttemptFile } from '../practice/practice-attempt';
import { PracticeSaveService } from './practice-save.service';
import { ProvisionalRecord, loadRecords, removeRecord } from './provisional-records';

/** Re-sends provisional reps whose save never landed (the page closed, the network dropped). */
@Injectable({ providedIn: 'root' })
export class ProvisionalRepService {
  private readonly auth = inject(AuthService);
  private readonly saver = inject(PracticeSaveService);
  private isResending = false;

  /** Signed-in owner only: each stored record is dropped when its path already holds a complete
   *  file, else re-sent. A failed send keeps the record for the next load. */
  async resendPending(): Promise<void> {
    const login = this.auth.login();
    if (this.isResending || !this.auth.isSignedIn() || login === null) return;
    this.isResending = true;
    try {
      for (const record of loadRecords()) {
        if (record.ref.owner.toLowerCase() === login.toLowerCase()) await this.settle(record);
      }
    } finally {
      this.isResending = false;
    }
  }

  private async settle(record: ProvisionalRecord): Promise<void> {
    const number = attemptNumberFromPath(record.path.split('/').pop() ?? '');
    if (number === null) return;
    const remote = await this.saver.latestFile(record.ref, number);
    const isRemoteComplete = remote?.path === record.path && parseAttemptFile(remote.content)?.complete === true;
    if (isRemoteComplete) {
      removeRecord(record.path);
      return;
    }
    await this.saver.sendProvisional(record.ref, record.path, record.content);
  }
}
