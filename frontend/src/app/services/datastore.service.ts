// proposal.store.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, map, concatMap, finalize } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Project {
  id: string;
  name: string;
  created_date: string;
}

export interface EvaluationStats {
  techEvalScore: number;
  workProductScore: number;
  requirementsScore: number;
  totalScore: number;
}

export interface ProjectData {
  requestName: string;
  responseName: string;
  requestUrl: string;
  responseUrl: string;
  derived_requirements_evaluation: {
    answer: 'Met' | 'Not Met' | 'Partially Met';
    id: number;
    justification: string;
    query: string;
  }[];
  work_products_evaluation: any[];
  req_res_evaluation: any[];
  stats: EvaluationStats;
  summaries?: {
    combined_summary: string;
    summary_derived_requirements_evaluation: string;
    summary_req_res_evaluation: string;
    summary_work_products_evaluation: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class DataStore {
  private apiUrl = environment.serverUrl;


  // State
  private projectsSubject = new BehaviorSubject<Project[]>([]);
  private selectedProjectSubject = new BehaviorSubject<Project | null>(null);
  private projectDataSubject = new BehaviorSubject<ProjectData | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  // Observables
  readonly projects$ = this.projectsSubject.asObservable();
  readonly selectedProject$ = this.selectedProjectSubject.asObservable();
  readonly projectData$ = this.projectDataSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();

  summaries?: {
    combined_summary: string;
    summary_derived_requirements_evaluation: string;
    summary_req_res_evaluation: string;
    summary_work_products_evaluation: string;
  };

  // Derived observables
  readonly derivedRequirementsEvaluation$ = this.projectData$.pipe(
    map(data => data?.derived_requirements_evaluation ?? null)
  );

  readonly workProductsEvaluation$ = this.projectData$.pipe(
    map(data => data?.work_products_evaluation ?? null)
  );

  readonly requestResponseEvaluation$ = this.projectData$.pipe(
    map(data => data?.req_res_evaluation ?? null)
  );

  readonly evaluationStats$ = this.projectData$.pipe(
    map(data => data?.stats ?? {
      techEvalScore: 0,
      workProductScore: 0,
      requirementsScore: 0,
      totalScore: 0
    })
  );

  readonly summaries$ = this.projectData$.pipe(
    map(data => data?.summaries ?? null)
  );

  readonly canDeriveRequirements$ = this.projectData$.pipe(
    map(data => !!data?.requestName && !!data?.responseName)
  );

  readonly hasRequirements$ = this.projectData$.pipe(
    map(data => !!data?.derived_requirements_evaluation?.length)
  );

  get selectedProject() {
    return this.selectedProjectSubject.value;
  }

  get hasRequestDocument() {
    return this.projectDataSubject.value?.requestUrl;
  }

  get hasResponseDocument() {
    return this.projectDataSubject.value?.responseUrl;
  }

  get workProductsEvaluation() {
    return this.projectDataSubject.value?.work_products_evaluation;
  }

  get requestResponseEvaluation() {
    return this.projectDataSubject.value?.req_res_evaluation;
  }

  constructor(private http: HttpClient) {
  console.log(this.apiUrl);
  }

  // Actions
  loadProjects() {
    this.setLoading(true);
    this.http.get<Project[]>(`${this.apiUrl}/api/projects`).pipe(
      tap({
        next: (projects) => {
          this.projectsSubject.next(projects);
          this.setLoading(false);
        },
        error: (error) => {
          console.error('Error loading projects:', error);
          this.setLoading(false);
        }
      })
    ).subscribe();
  }

  selectProject(project: Project | null) {
    this.selectedProjectSubject.next(project);
    if (project) {
      this.loadProjectData(project.id);
    } else {
      this.projectDataSubject.next(null);
    }
  }

  createProject(name: string): Observable<Project> {
    this.setLoading(true);
    return this.http.post<Project>(`${this.apiUrl}/api/projects`, { name }).pipe(
      tap({
        next: (project) => {
          const currentProjects = this.projectsSubject.value;
          this.projectsSubject.next([...currentProjects, project]);
          this.selectProject(project);
          this.setLoading(false);
        },
        error: (error) => {
          console.error('Error creating project:', error);
          this.setLoading(false);
        }
      })
    );
  }

  loadProjectData(projectId: string) {
    this.setLoading(true);
    this.http.get<ProjectData>(`${this.apiUrl}/api/projects/${projectId}/data`).pipe(
      tap({
        next: (data) => {
          // Transform URLs to include base API URL
          const transformedData = {
            ...data,
            requestUrl: data.requestUrl ? `${this.apiUrl}${data.requestUrl}` : '',
            responseUrl: data.responseUrl ? `${this.apiUrl}${data.responseUrl}` : ''
          };
          console.log('Project data:', transformedData);
          this.projectDataSubject.next(transformedData);
          this.setLoading(false);
        },
        error: (error) => {
          console.error('Error loading project data:', error);
          this.setLoading(false);
        }
      })
    ).subscribe();
  }

  uploadFile(file: File, type: 'request' | 'response'): Observable<any> {
    const projectId = this.selectedProjectSubject.value?.id;
    if (!projectId) throw new Error('No project selected');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId);

    this.setLoading(true);
    return this.http.post(`${this.apiUrl}/api/upload/${type}`, formData).pipe(
      tap({
        next: (response: any) => {
          const currentData = this.projectDataSubject.value ?? {};
          this.projectDataSubject.next({
            ...currentData,
            [`${type}Name`]: file.name,
            [`${type}Url`]: `${this.apiUrl}${response[`${type}Url`]}`
          } as ProjectData);
          this.loadProjectData(projectId);
        },
        error: (error) => {
          console.error('Error uploading file:', error);
          this.setLoading(false);
        }
      })
    );
  }

  deriveAndEvaluateRequirements(): Observable<any> {
    const projectId = this.selectedProjectSubject.value?.id;
    if (!projectId) return throwError(() => new Error('No project selected'));

    this.setLoading(true);

    return this.deriveRequirements().pipe(
      concatMap(() => this.evaluateDerivedRequirements()),
      tap({
        next: () => {
          // This will run after both deriveRequirements and evaluateDerivedRequirements are complete
          this.loadProjectData(projectId);
        },
        error: (error) => {
          this.setLoading(false);
          console.error('Error during sequential operations:', error);
        }
      }),
      finalize(() => {
        // This will run whether the operations succeeded or failed
        this.setLoading(false);
      })
    );
  }

  deriveRequirements(): Observable<any> {
    const projectId = this.selectedProjectSubject.value?.id;
    if (!projectId) throw new Error('No project selected');

    return this.http.get(`${this.apiUrl}/api/projects/${projectId}/derive-requirements`);
  }

  evaluateDerivedRequirements(): Observable<any> {
    const projectId = this.selectedProjectSubject.value?.id;
    if (!projectId) throw new Error('No project selected');

    return this.http.post(`${this.apiUrl}/api/projects/${projectId}/evaluate-derived-requirements`, {})
  }

  evaluateWorkProducts(): Observable<any> {
    const projectId = this.selectedProjectSubject.value?.id;
    if (!projectId) throw new Error('No project selected');

    this.setLoading(true);
    return this.http.post(`${this.apiUrl}/api/projects/${projectId}/evaluate-work-products`, {}).pipe(
      tap({
        next: () => {
          this.loadProjectData(projectId);
        },
        error: (error) => {
          console.error('Error evaluating work products:', error);
          this.setLoading(false);
        }
      })
    );
  }

  evaluateRequirementsResponse(): Observable<any> {
    const projectId = this.selectedProjectSubject.value?.id;
    if (!projectId) throw new Error('No project selected');

    this.setLoading(true);
    return this.http.post(`${this.apiUrl}/api/projects/${projectId}/evaluate-req-res`, {}).pipe(
      tap({
        next: () => {
          this.loadProjectData(projectId);
        },
        error: (error) => {
          console.error('Error evaluating requirements response:', error);
          this.setLoading(false);
        }
      })
    );
  }

  evaluationSummary(): Observable<any> {
    const projectId = this.selectedProjectSubject.value?.id;
    if (!projectId) throw new Error('No project selected');

    this.setLoading(true);
    return this.http.post(`${this.apiUrl}/api/projects/${projectId}/generate_summary`, {}).pipe(
      tap({
        next: () => {
          this.loadProjectData(projectId);
        },
        error: (error) => {
          console.error('Error generating evaluation summary:', error);
          this.setLoading(false);
        }
      })
    );
  }

  submitRequestResponseForm(data: any): Observable<any> {
    const projectId = this.selectedProjectSubject.value?.id;
    if (!projectId) throw new Error('No project selected');

    this.setLoading(true);
    return this.http.post(`${this.apiUrl}/api/projects/${projectId}/form-update-req-res`, data).pipe(
      tap({
        next: () => {
          this.loadProjectData(projectId);
        },
        error: (error) => {
          console.error('Error submitting request/response form:', error);
          this.setLoading(false);
        }
      })
    );
  }

  submitWorkProductsForm(data: any): Observable<any> {
    const projectId = this.selectedProjectSubject.value?.id;
    if (!projectId) throw new Error('No project selected');

    this.setLoading(true);
    return this.http.post(`${this.apiUrl}/api/projects/${projectId}/form-update-work-products`, data).pipe(
      tap({
        next: () => {
          this.loadProjectData(projectId);
        },
        error: (error) => {
          console.error('Error submitting work products form:', error);
          this.setLoading(false);
        }
      })
    );
  }

  clearGeneratedProjectData() {
    const projectId = this.selectedProjectSubject.value?.id;
    if (!projectId) throw new Error('No project selected');

    console.log('Clearing generated project data');

    this.setLoading(true);
    return this.http.post(`${this.apiUrl}/api/projects/${projectId}/clear-generated-data`, {}).pipe(
      tap({
        next: () => {
          console.log(`${projectId} data cleared`);
          this.loadProjectData(projectId);
          this.setLoading(false);
        },
        error: (error) => {
          console.error('Error cleaning generated project data:', error);
          this.setLoading(false);
        }
      })
    );
  }

  getCurrentEvaluation(): any {
    let currentEvaluation: any = null;
    this.requestResponseEvaluation$.subscribe(data => {
      currentEvaluation = data;
    });
    return currentEvaluation;
  }

  private setLoading(loading: boolean) {
    this.loadingSubject.next(loading);
  }
}
