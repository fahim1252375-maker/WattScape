/**
 * Browser-safe, deployment-aware runtime configuration.
 *
 * Local development may fall back to the local Spring API. A production build
 * must provide an explicit HTTPS API origin so a deployed browser never
 * accidentally calls localhost on the end user's own machine.
 */
const LOCAL_API_BASE_URL = 'http://localhost:8080';

export function resolveApiBaseUrl(
  configuredValue: string | undefined,
  isDevelopment: boolean,
): string {
  const configured = configuredValue?.trim();
  if (!configured) return isDevelopment ? LOCAL_API_BASE_URL : '';

  try {
    const parsed = new URL(configured);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
    if (parsed.username || parsed.password || parsed.search || parsed.hash) return '';

    const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
    if (parsed.protocol !== 'https:' && !(isDevelopment && isLoopback)) return '';

    return configured.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

export function resolveIdentityAuthority(configuredValue: string | undefined, isDevelopment: boolean): string {
  const configured = configuredValue?.trim().replace(/\/+$/, '');
  if (!configured) return '';

  try {
    const parsed = new URL(configured);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
    if (parsed.username || parsed.password || parsed.search || parsed.hash) return '';

    const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
    if (parsed.protocol !== 'https:' && !(isDevelopment && isLoopback)) return '';

    return configured;
  } catch {
    return '';
  }
}
