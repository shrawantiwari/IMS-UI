import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthStore } from '../../../core/auth/auth.store';
import { OAuthCallbackService } from '../../../core/auth/oauth-callback.service';
import { OAuthService } from '../../../core/auth/oauth.service';
import { AuthTokens, AuthUser } from '../../../core/auth/models/auth-state.model';
import { decodeJwtPayload } from '../../../core/auth/jwt.util';
import { TokenService } from '../../../core/auth/token.service';

@Component({
  selector: 'app-oauth-callback',
  template: '',
})
export class OAuthCallback implements OnInit {
  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly oauthCallbackService = inject(OAuthCallbackService);

  private readonly oauthService = inject(OAuthService);

  private readonly authStore = inject(AuthStore);

  private readonly tokenService = inject(TokenService);

  ngOnInit(): void {
    this.handleCallback();
  }

  private handleCallback(): void {
    const queryParams = this.route.snapshot.queryParamMap;

    const error = queryParams.get('error');

    const errorDescription = queryParams.get('error_description');

    const code = queryParams.get('code');

    const state = queryParams.get('state');

    if (error) {
      this.handleError(errorDescription ?? `OAuth authorization failed: ${error}`);

      return;
    }

    if (!code) {
      if (this.authStore.isAuthenticated()) {
        this.redirectToDashboard();

        return;
      }

      this.handleError('Authorization code is missing.');

      return;
    }

    if (
      this.authStore.isAuthenticated() &&
      (!state || !this.oauthService.getStoredState() || !this.oauthService.getCodeVerifier())
    ) {
      this.redirectToDashboard();

      return;
    }

    this.oauthCallbackService.exchangeAuthorizationCode(code, state).subscribe({
      next: (response) => {
        // Never log access, refresh, or ID tokens.
        console.log('OAuth token exchange successful.');

        const user = this.createAuthUser(response.id_token ?? null);

        if (!user) {
          this.handleError('Unable to complete secure authentication. Please try again.');

          return;
        }

        const tokens: AuthTokens = {
          accessToken: response.access_token,

          refreshToken: response.refresh_token ?? null,

          idToken: response.id_token ?? null,

          expiresAt: Date.now() + response.expires_in * 1000,
        };

        /*
         * Update runtime authentication state.
         */
        this.authStore.setAuthentication(user, tokens);

        /*
         * Persist authentication so that
         * page refresh/application restart
         * can restore the session.
         */
        this.tokenService.saveAuthentication(user, tokens);

        /*
         * Remove one-time OAuth state
         * and PKCE verifier.
         */
        this.oauthService.clearAuthorizationSession();

        /*
         * Replace the OAuth callback URL
         * with the application route.
         */
        this.router.navigate(['/dashboard'], {
          replaceUrl: true,
        });
      },

      error: () => {
        this.handleError('Unable to complete secure authentication. Please try again.');
      },
    });
  }

  private redirectToDashboard(): void {
    this.router.navigate(['/dashboard'], {
      replaceUrl: true,
    });
  }

  private createAuthUser(idToken: string | null): AuthUser | null {
    if (!idToken) {
      return null;
    }

    const payload = decodeJwtPayload(idToken);

    if (!payload) {
      return null;
    }

    const userId = payload['userId'];

    const email = payload['email'];

    const roles = this.normalizeRoles(payload['roles']);

    if (
      typeof userId !== 'string' ||
      userId.trim().length === 0 ||
      typeof email !== 'string' ||
      email.trim().length === 0 ||
      !roles
    ) {
      return null;
    }

    return {
      userId,
      email,
      roles,
    };
  }

  private normalizeRoles(value: unknown): string[] | null {
    if (!Array.isArray(value)) {
      return null;
    }

    if (!value.every((role): role is string => typeof role === 'string')) {
      return null;
    }

    const roles = value.map((role) => role.trim()).filter(Boolean);

    return roles.length === value.length && roles.length > 0 ? roles : null;
  }

  private handleError(message: string): void {
    this.oauthService.clearAuthorizationSession();

    console.error('OAuth authentication failed:', message);

    this.router.navigate(['/login'], {
      replaceUrl: true,
    });
  }
}
