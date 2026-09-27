export type JwtPayload = Record<string, unknown>;

export function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split('.');

  if (parts.length !== 3) {
    return null;
  }

  try {
    const normalizedPayload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      '=',
    );
    const decodedPayload = atob(paddedPayload);
    const payload = JSON.parse(decodedPayload) as unknown;

    return payload !== null && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as JwtPayload)
      : null;
  } catch {
    return null;
  }
}
