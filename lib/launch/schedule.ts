// Explicit offset keeps the launch correct regardless of server/browser timezone.
export const launchAt = '2026-11-18T00:00:00+02:00';
export const launchLabel = 'Wednesday, 18 November 2026 · 00:00 SAST';
export const launchHosts = ['cjaymnandi.co.za', 'www.cjaymnandi.co.za'];

export function remainingTime(now = Date.now()) {
  const total = Math.max(0, Math.ceil((Date.parse(launchAt) - now) / 1000));
  return { total, days: Math.floor(total / 86400), hours: Math.floor(total / 3600) % 24,
    minutes: Math.floor(total / 60) % 60, seconds: total % 60 };
}
export function shouldShowCountdown(host: string, now = Date.now()) {
  const hostname = host.toLowerCase().replace(/:\d+$/, '');
  return launchHosts.includes(hostname) && now < Date.parse(launchAt);
}
