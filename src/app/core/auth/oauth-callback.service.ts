import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';

import { OAuthService } from './oauth.service';
import { AUTH_CONFIG } from './auth.config';

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
}

@Injectable({
  providedIn: 'root',
})
export class OAuthCallbackService {
  private readonly http = inject(HttpClient);

  private readonly oauthService = inject(OAuthService);

  exchangeAuthorizationCode(code: string, state: string | null): Observable<OAuthTokenResponse> {
    const storedState = this.oauthService.getStoredState();

    if (!state || !storedState || state !== storedState) {
      return throwError(() => new Error('Invalid OAuth state'));
    }

    const codeVerifier = this.oauthService.getCodeVerifier();

    if (!codeVerifier) {
      return throwError(() => new Error('PKCE code verifier is missing'));
    }

    const body = new HttpParams()
      .set('grant_type', 'authorization_code')
      .set('code', code)
      .set('redirect_uri', AUTH_CONFIG.redirectUri)
      .set('client_id', AUTH_CONFIG.clientId)
      .set('code_verifier', codeVerifier);

    return this.http.post<OAuthTokenResponse>(
      `${AUTH_CONFIG.authServerUrl}/oauth2/token`,
      body.toString(),
      {
        headers: new HttpHeaders({
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
      },
    );
  }
}
