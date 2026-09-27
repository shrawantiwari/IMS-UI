import { Injectable } from '@angular/core';

import { AuthTokens, AuthUser } from './models/auth-state.model';

interface PersistedAuth {
  user: AuthUser;
  tokens: AuthTokens;
}

@Injectable({
  providedIn: 'root',
})
export class TokenService {
  private readonly storageKey = 'ims_auth';

  saveAuthentication(user: AuthUser, tokens: AuthTokens): void {
    const authentication: PersistedAuth = {
      user,
      tokens,
    };

    sessionStorage.setItem(this.storageKey, JSON.stringify(authentication));
  }

  getAuthentication(): PersistedAuth | null {
    const storedAuthentication = sessionStorage.getItem(this.storageKey);

    if (!storedAuthentication) {
      return null;
    }

    try {
      return JSON.parse(storedAuthentication) as PersistedAuth;
    } catch {
      this.clearAuthentication();
      return null;
    }
  }

  isTokenExpired(expiresAt: number): boolean {
    const safetyWindow = 60 * 1000;

    return Date.now() >= expiresAt - safetyWindow;
  }

  clearAuthentication(): void {
    sessionStorage.removeItem(this.storageKey);
  }
}
