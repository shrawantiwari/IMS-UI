import { Injectable } from '@angular/core';

import { generatePkcePair } from './pkce.util';
import { AUTH_CONFIG } from './auth.config';

@Injectable({
  providedIn: 'root',
})
export class OAuthService {
  private readonly pkceVerifierKey = 'oauth_pkce_code_verifier';

  private readonly stateKey = 'oauth_state';

  async startAuthorization(): Promise<void> {
    const { codeVerifier, codeChallenge } = await generatePkcePair();

    const state = this.generateState();

    sessionStorage.setItem(this.pkceVerifierKey, codeVerifier);

    sessionStorage.setItem(this.stateKey, state);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: AUTH_CONFIG.clientId,
      redirect_uri: AUTH_CONFIG.redirectUri,
      scope: AUTH_CONFIG.scopes.join(' '),
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
    });

    const authorizationUrl = `${AUTH_CONFIG.authServerUrl}/oauth2/authorize?${params.toString()}`;

    window.location.assign(authorizationUrl);
  }

  getCodeVerifier(): string | null {
    return sessionStorage.getItem(this.pkceVerifierKey);
  }

  getStoredState(): string | null {
    return sessionStorage.getItem(this.stateKey);
  }

  clearAuthorizationSession(): void {
    sessionStorage.removeItem(this.pkceVerifierKey);

    sessionStorage.removeItem(this.stateKey);
  }

  private generateState(): string {
    const randomValues = new Uint8Array(32);

    crypto.getRandomValues(randomValues);

    return Array.from(randomValues, (value) => value.toString(16).padStart(2, '0')).join('');
  }
}
