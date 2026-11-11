export const panelNames = ['music','archive','store','bookings','about','connect','support','shop','events'] as const;
export type Panel = typeof panelNames[number] | null;
export function parsePanel(value: unknown): Panel {
  if(value==='buy')return 'store';if(value==='content')return 'archive';if(value==='home')return null;
  return typeof value === 'string' && panelNames.includes(value as Exclude<Panel,null>) ? value as Exclude<Panel,null> : null;
}
export function isReviewHost(host: string) {
  const name = host.toLowerCase().replace(/:\d+$/, '');
  return name === 'localhost' || name === '127.0.0.1' || name.endsWith('.vercel.app');
}
