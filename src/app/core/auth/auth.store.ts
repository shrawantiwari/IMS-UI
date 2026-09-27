import { Injectable, computed, signal } from '@angular/core';

import { AuthState, AuthTokens, AuthUser } from './models/auth-state.model';

@Injectable({
  providedIn: 'root',
})
export class AuthStore {
  private readonly state = signal<AuthState>({
    isAuthenticated: false,
    user: null,
    tokens: null,
  });

  readonly isAuthenticated = computed(() => this.state().isAuthenticated);

  readonly user = computed(() => this.state().user);

  readonly accessToken = computed(() => this.state().tokens?.accessToken ?? null);

  readonly refreshToken = computed(() => this.state().tokens?.refreshToken ?? null);

  readonly idToken = computed(() => this.state().tokens?.idToken ?? null);

  readonly tokensExpiresAt = computed(() => this.state().tokens?.expiresAt ?? null);

  setAuthentication(user: AuthUser, tokens: AuthTokens): void {
    this.state.set({
      isAuthenticated: true,
      user,
      tokens,
    });
  }

  clearAuthentication(): void {
    this.state.set({
      isAuthenticated: false,
      user: null,
      tokens: null,
    });
  }
}
