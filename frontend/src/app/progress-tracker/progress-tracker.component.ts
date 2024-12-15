// progress-tracker.component.ts
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { BehaviorSubject, Subject, interval } from 'rxjs';
import { takeUntil, switchMap, startWith, filter } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface ProgressStatus {
  status: 'not_found' | 'in_progress' | 'completed' | 'error';
  progress: number;
  current_section: string;
  start_time: string;
  last_update: string;
  error?: string;
}

@Component({
  selector: 'app-progress-tracker',
  standalone: true,
  imports: [CommonModule, MatProgressBarModule, MatCardModule],
  templateUrl: './progress-tracker.component.html',
  styleUrl: './progress-tracker.component.scss'
})
export class ProgressTrackerComponent implements OnInit, OnDestroy {
  @Input() projectId!: string;
  @Input() set resetProgress(value: boolean) {
    if (value) {
      this.resetProgressState();
    }
  }

  private destroy$ = new Subject<void>();
  private polling$ = new BehaviorSubject<boolean>(false);
  progress$ = new BehaviorSubject<ProgressStatus | null>(null);
  private lastCompletedTime = 0;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    // Poll the progress endpoint every 2 seconds
    this.polling$.pipe(
      filter(Boolean),
      switchMap(() => interval(2000).pipe(
        startWith(0),
        switchMap(() => this.fetchProgress()),
        takeUntil(this.destroy$)
      ))
    ).subscribe();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private resetProgressState() {
    // Reset to initial state
    this.progress$.next({
      status: 'not_found',
      progress: 0,
      current_section: '',
      start_time: new Date().toISOString(),
      last_update: new Date().toISOString()
    });
    this.startPolling();
  }

  startPolling() {
    // Record the time when we start a new polling cycle
    this.lastCompletedTime = Date.now();
    this.polling$.next(true);
  }

  stopPolling() {
    this.polling$.next(false);
  }

  private fetchProgress() {
    return this.http.get<ProgressStatus>(
      `${environment.serverUrl}/api/projects/${this.projectId}/progress`
    ).pipe(
      switchMap(async (progress) => {
        // Only update progress if it's newer than our last completed state
        const progressTime = new Date(progress.last_update).getTime();
        if (progressTime > this.lastCompletedTime) {
          this.progress$.next(progress);

          // Stop polling if completed or error
          if (progress.status === 'completed' || progress.status === 'error') {
            this.stopPolling();
            this.lastCompletedTime = Date.now();
          }
        }

        return progress;
      })
    );
  }

  getStatusText(progress: ProgressStatus): string {
    switch (progress.status) {
      case 'in_progress':
        return 'Processing...';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
      case 'not_found':
        return 'Initializing...';
      default:
        return 'Initializing...';
    }
  }

  getProgressMode(progress: ProgressStatus): 'determinate' | 'indeterminate' {
    return progress.status === 'in_progress' && progress.progress > 0
      ? 'determinate'
      : 'indeterminate';
  }

  getElapsedTime(startTime: string): string {
    const start = new Date(startTime).getTime();
    const now = Date.now();
    const elapsed = Math.max(0, Math.floor((now - start) / 1000));
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}m ${seconds}s`;
  }
}