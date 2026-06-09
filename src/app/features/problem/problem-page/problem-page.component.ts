import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlgorithmMeta, Category, Step, SolutionVariant,
  ArrayState, GridState, LinkedListState, CATEGORY_LABELS,
} from '../../../core/models/algorithm.model';
import { findAlgorithm, getCategoryNeighbors } from '../../../core/data/algorithms.data';
import { NavContextService } from '../../../core/services/nav-context.service';

@Component({
  selector: 'app-problem-page',
  templateUrl: './problem-page.component.html',
  styleUrls: ['./problem-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProblemPageComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly categoryLabels = CATEGORY_LABELS;
  problem: AlgorithmMeta | null = null;
  steps: Step[] = [];
  currentStepIndex = 0;
  activeSolutionIndex = 0;
  started = false;
  prevProblem: AlgorithmMeta | null = null;
  nextProblem: AlgorithmMeta | null = null;

  showViz = true;
  showCode = false;

  @ViewChild('descSentinel') private descSentinel!: ElementRef<HTMLElement>;
  private stickyObs?: IntersectionObserver;

  get activeSolution(): SolutionVariant | null {
    return this.problem?.solutions[this.activeSolutionIndex] ?? null;
  }

  get hasMultipleSolutions(): boolean {
    return (this.problem?.solutions.length ?? 0) > 1;
  }

  get currentStep(): Step | null {
    return this.steps[this.currentStepIndex] ?? null;
  }

  get hasVisualization(): boolean {
    return this.steps.length > 0;
  }

  get currentState(): ArrayState | GridState | LinkedListState | null {
    return (this.currentStep?.state as (ArrayState | GridState | LinkedListState)) ?? null;
  }

  get isArrayState(): boolean {
    return this.currentState?.type === 'array';
  }

  get isGridState(): boolean {
    return this.currentState?.type === 'grid';
  }

  get isLinkedListState(): boolean {
    return this.currentState?.type === 'linked-list';
  }

  get bottomColumns(): string {
    if (this.showViz && this.showCode) return '1fr 1fr';
    return '1fr';
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private navCtx: NavContextService,
  ) {}

  ngAfterViewInit(): void {
    this.stickyObs = new IntersectionObserver(
      ([entry]) => {
        if (this.problem) {
          if (entry.isIntersecting) {
            this.navCtx.clear();
          } else {
            this.navCtx.set({
              num: this.problem.lcNumber,
              title: this.problem.title,
              description: this.problem.description,
              examples: this.problem.examples,
              constraints: this.problem.constraints,
            });
          }
        }
        this.cdr.detectChanges();
      },
      { rootMargin: '-56px 0px 0px 0px', threshold: 0 },
    );
    this.stickyObs.observe(this.descSentinel.nativeElement);
  }

  ngOnDestroy(): void {
    this.stickyObs?.disconnect();
    this.navCtx.clear();
  }

  ngOnInit(): void {
    const map = this.route.snapshot.paramMap;
    const parentMap = this.route.parent?.snapshot.paramMap;
    const category = (map.get('category') ?? parentMap?.get('category')) as Category;
    const id = map.get('id') ?? parentMap?.get('id') ?? '';

    this.problem = findAlgorithm(category, id) ?? null;
    if (!this.problem) {
      this.router.navigate(['/algorithms', category ?? '']);
      return;
    }

    this.activeSolutionIndex = 0;
    this.steps = this.problem.solutions[0]?.generateSteps() ?? [];
    this.currentStepIndex = 0;

    const neighbors = getCategoryNeighbors(category, id);
    this.prevProblem = neighbors.prev;
    this.nextProblem = neighbors.next;
    this.cdr.markForCheck();
  }

  togglePanel(panel: 'viz' | 'code'): void {
    if (panel === 'viz') this.showViz = !this.showViz;
    else this.showCode = !this.showCode;
    this.cdr.markForCheck();
  }

  selectSolution(index: number): void {
    if (index === this.activeSolutionIndex) return;
    this.activeSolutionIndex = index;
    this.steps = this.problem!.solutions[index].generateSteps();
    this.currentStepIndex = 0;
    this.started = false;
    this.showCode = false;
    this.cdr.markForCheck();
  }

  startViz(): void {
    this.started = true;
    this.cdr.markForCheck();
  }

  onStepChange(index: number): void {
    this.started = true;
    this.currentStepIndex = index;
    this.cdr.markForCheck();
  }

  onReset(): void {
    this.currentStepIndex = 0;
    this.cdr.markForCheck();
  }
}
