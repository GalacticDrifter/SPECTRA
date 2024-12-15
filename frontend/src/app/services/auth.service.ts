import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  isAuthenticated(): boolean {
    return localStorage.getItem('isAuthenticated') === 'true';
  }

  logout() {
    localStorage.removeItem('isAuthenticated');
  }
}
