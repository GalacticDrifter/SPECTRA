// guards/project-selected.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { DataStore } from '../services/datastore.service';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ReqResGuard implements CanActivate {
  constructor(
    private store: DataStore,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.store.requestResponseEvaluation$.pipe(
      take(1),
      map((data: any) => {
        if (!data) {
          this.router.navigate(['/dashboard']);
          return false;
        }
        return true;
      })
    );
  }
}
