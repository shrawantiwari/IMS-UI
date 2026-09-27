export const AUTH_CONFIG = {
  authServerUrl: 'http://localhost:9000',
  clientId: 'inventory-client',
  redirectUri: 'http://localhost:4200/oauth/callback',
  scopes: ['openid', 'profile', 'offline_access'],
} as const;
