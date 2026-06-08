import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface NavContextEntry {
  num: number;
  title: string;
  description: string;
  examples: Array<{ input: string; output: string; explanation?: string }>;
  constraints: string[];
}

@Injectable({ providedIn: 'root' })
export class NavContextService {
  private readonly _ctx = new BehaviorSubject<NavContextEntry | null>(null);
  readonly ctx$ = this._ctx.asObservable();

  set(entry: NavContextEntry): void {
    this._ctx.next(entry);
  }

  clear(): void {
    this._ctx.next(null);
  }
}
