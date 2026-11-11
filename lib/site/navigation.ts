export const panelNames = ['music','archive','store','bookings','about','connect','support'] as const;
export type Panel = typeof panelNames[number] | null;
export function parsePanel(value: unknown): Panel {
  return typeof value === 'string' && panelNames.includes(value as Exclude<Panel,null>) ? value as Exclude<Panel,null> : null;
}
export function isReviewHost(host: string) {
  const name = host.toLowerCase().replace(/:\d+$/, '');
  return name === 'localhost' || name === '127.0.0.1' || name.endsWith('.vercel.app');
}
