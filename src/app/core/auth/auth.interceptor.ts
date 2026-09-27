import {
  HttpContextToken,
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, switchMap, throwError } from 'rxjs';

import { AuthStore } from './auth.store';
import { TokenRefreshService } from './token-refresh.service';
import { TokenService } from './token.service';

const excludedRequestPaths = [
  '/login',
  '/oauth2/authorize',
  '/oauth2/token',
  '/.well-known/openid-configuration',
];

const RETRY_AFTER_REFRESH = new HttpContextToken<boolean>(() => false);

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authStore = inject(AuthStore);
  const tokenService = inject(TokenService);
  const tokenRefreshService = inject(TokenRefreshService);
  const router = inject(Router);

  if (excludedRequestPaths.some((path) => request.url.includes(path))) {
    return next(request);
  }

  const accessToken = authStore.accessToken();

  if (!accessToken) {
    return next(request);
  }

  const expiresAt = authStore.tokensExpiresAt();

  /*
   * Proactive refresh:
   * Access token is already expired or inside the safety window.
   */
  if (expiresAt !== null && tokenService.isTokenExpired(expiresAt)) {
    return tokenRefreshService.refresh().pipe(
      switchMap(() => {
        const refreshedAccessToken = authStore.accessToken();

        if (!refreshedAccessToken) {
          return throwError(() => new Error('Access token is unavailable after refresh'));
        }

        return sendAuthenticatedRequest(
          request,
          refreshedAccessToken,
          true,
          next,
          authStore,
          tokenService,
          tokenRefreshService,
          router,
        );
      }),
      catchError((error) => throwError(() => error)),
    );
  }

  return sendAuthenticatedRequest(
    request,
    accessToken,
    false,
    next,
    authStore,
    tokenService,
    tokenRefreshService,
    router,
  );
};

function sendAuthenticatedRequest(
  request: HttpRequest<unknown>,
  accessToken: string,
  alreadyRetried: boolean,
  next: HttpHandlerFn,
  authStore: AuthStore,
  tokenService: TokenService,
  tokenRefreshService: TokenRefreshService,
  router: Router,
): Observable<HttpEvent<unknown>> {
  const authenticatedRequest = request.clone({
    context: request.context.set(RETRY_AFTER_REFRESH, alreadyRetried),
    setHeaders: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      /*
       * Only 401 should trigger token refresh.
       */
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      const hasAlreadyRetried = authenticatedRequest.context.get(RETRY_AFTER_REFRESH);

      /*
       * Prevent:
       *
       * 401 → refresh → retry → 401 → refresh → ...
       */
      if (hasAlreadyRetried) {
        authStore.clearAuthentication();
        tokenService.clearAuthentication();

        void router.navigate(['/login'], {
          replaceUrl: true,
        });

        return throwError(() => error);
      }

      /*
       * Token was rejected by backend.
       * Try refreshing once.
       */
      return tokenRefreshService.refresh().pipe(
        switchMap(() => {
          const refreshedAccessToken = authStore.accessToken();

          if (!refreshedAccessToken) {
            authStore.clearAuthentication();
            tokenService.clearAuthentication();

            void router.navigate(['/login'], {
              replaceUrl: true,
            });

            return throwError(() => new Error('Access token unavailable after refresh'));
          }

          return sendAuthenticatedRequest(
            request,
            refreshedAccessToken,
            true,
            next,
            authStore,
            tokenService,
            tokenRefreshService,
            router,
          );
        }),
        catchError((refreshError) => {
          authStore.clearAuthentication();
          tokenService.clearAuthentication();

          void router.navigate(['/login'], {
            replaceUrl: true,
          });

          return throwError(() => refreshError);
        }),
      );
    }),
  );
}
