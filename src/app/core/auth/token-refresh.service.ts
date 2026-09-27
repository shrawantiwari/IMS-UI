import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, map, shareReplay, tap, throwError } from 'rxjs';

import { AUTH_CONFIG } from './auth.config';
import { AuthStore } from './auth.store';
import { TokenService } from './token.service';
import { OAuthTokenResponse } from './oauth-callback.service';

@Injectable({
  providedIn: 'root',
})
export class TokenRefreshService {
  private readonly http = inject(HttpClient);
  private readonly authStore = inject(AuthStore);
  private readonly tokenService = inject(TokenService);

  private refreshRequest$: Observable<OAuthTokenResponse> | null = null;

  refresh(): Observable<OAuthTokenResponse> {
    if (this.refreshRequest$) {
      return this.refreshRequest$;
    }

    const refreshToken = this.authStore.refreshToken();

    if (!refreshToken) {
      return throwError(() => new Error('Refresh token is not available'));
    }

    const body = new HttpParams()
      .set('grant_type', 'refresh_token')
      .set('refresh_token', refreshToken)
      .set('client_id', AUTH_CONFIG.clientId);

    this.refreshRequest$ = this.http
      .post<OAuthTokenResponse>(`${AUTH_CONFIG.authServerUrl}/oauth2/token`, body.toString(), {
        headers: new HttpHeaders({
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
      })
      .pipe(
        tap((response) => {
          this.updateAuthentication(response);
        }),
        catchError((error) => {
          this.authStore.clearAuthentication();
          this.tokenService.clearAuthentication();

          return throwError(() => error);
        }),
        finalize(() => {
          this.refreshRequest$ = null;
        }),
        shareReplay(1),
      );

    return this.refreshRequest$;
  }

  private updateAuthentication(response: OAuthTokenResponse): void {
    const currentUser = this.authStore.user();

    if (!currentUser) {
      throw new Error('Authenticated user is not available');
    }

    const expiresAt = Date.now() + response.expires_in * 1000;

    const tokens = {
      accessToken: response.access_token,
      refreshToken: response.refresh_token ?? this.authStore.refreshToken(),
      idToken: response.id_token ?? this.authStore.idToken(),
      expiresAt,
    };

    this.authStore.setAuthentication(currentUser, tokens);

    this.tokenService.saveAuthentication(currentUser, tokens);
  }
}
