import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthStore } from './auth.store';
import { TokenRefreshService } from './token-refresh.service';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root',
})
export class AuthInitializationService {
  private readonly authStore = inject(AuthStore);
  private readonly tokenService = inject(TokenService);
  private readonly tokenRefreshService = inject(TokenRefreshService);

  async initialize(): Promise<void> {
    const authentication = this.tokenService.getAuthentication();

    if (!authentication) {
      return;
    }

    const { user, tokens } = authentication;

    if (
      !user?.userId ||
      !user?.email ||
      !Array.isArray(user.roles) ||
      !tokens?.accessToken ||
      !tokens?.expiresAt
    ) {
      this.clearAuthentication();
      return;
    }

    // Access token is still valid.
    if (!this.tokenService.isTokenExpired(tokens.expiresAt)) {
      this.authStore.setAuthentication(user, tokens);

      return;
    }

    // Access token expired and no refresh token available.
    if (!tokens.refreshToken) {
      this.clearAuthentication();
      return;
    }

    // Put the persisted authentication into the store temporarily
    // so TokenRefreshService can access the refresh token.
    this.authStore.setAuthentication(user, tokens);

    try {
      await firstValueFrom(this.tokenRefreshService.refresh());
    } catch {
      this.clearAuthentication();
    }
  }

  private clearAuthentication(): void {
    this.authStore.clearAuthentication();
    this.tokenService.clearAuthentication();
  }
}
