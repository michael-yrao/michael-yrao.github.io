import { Component, HostListener, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { NavContextService, NavContextEntry } from './core/services/nav-context.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnDestroy {
  currentCtx: NavContextEntry | null = null;
  descriptionOpen = false;

  private ctxSub: Subscription;

  constructor(readonly navCtx: NavContextService) {
    this.ctxSub = navCtx.ctx$.subscribe(ctx => {
      this.currentCtx = ctx;
      if (!ctx) this.descriptionOpen = false;
    });
  }

  ngOnDestroy(): void {
    this.ctxSub.unsubscribe();
  }

  toggleDescription(event: MouseEvent): void {
    event.stopPropagation();
    this.descriptionOpen = !this.descriptionOpen;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.descriptionOpen = false;
  }
}
