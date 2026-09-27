import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AUTH_CONFIG } from './auth.config';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);

  login(email: string, password: string) {
    const body = new HttpParams().set('email', email).set('password', password);

    return this.http.post(`${AUTH_CONFIG.authServerUrl}/login`, body.toString(), {
      headers: new HttpHeaders({
        'Content-Type': 'application/x-www-form-urlencoded',
      }),
      withCredentials: true,
      responseType: 'text',
    });
  }
  logout(): Observable<void> {
    return this.http.post<void>(`${AUTH_CONFIG.authServerUrl}/api/sessions/logout`, {});
  }
}
