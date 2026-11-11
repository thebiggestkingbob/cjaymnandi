export type ContactKind = 'mailing' | 'booking';
export type ContactPayload = {
  email: string; name?: string; event_date?: string | null;
  location?: string | null; message?: string; consent?: boolean;
};
export type ValidationResult = { ok: true; kind: ContactKind; payload: ContactPayload; honeypot: boolean } | { ok: false; message: string };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function text(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }

export function validateContact(input: unknown, today = new Intl.DateTimeFormat('en-CA', {timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date())): ValidationResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, message: 'Please check the form and try again.' };
  const data = input as Record<string, unknown>;
  const kind = data.kind;
  if (kind !== 'mailing' && kind !== 'booking') return { ok: false, message: 'Choose a valid enquiry type.' };
  const email = text(data.email).toLowerCase();
  if (!emailPattern.test(email) || email.length > 254) return { ok: false, message: 'Enter a valid email address.' };
  if (text(data.website)) return { ok: true, kind, payload: { email }, honeypot: true };
  if (kind === 'mailing') {
    if (data.consent !== true) return { ok: false, message: 'Please agree to receive music and release updates.' };
    return { ok: true, kind, payload: { email, consent: true }, honeypot: false };
  }
  const name = text(data.name), message = text(data.message), location = text(data.location), date = text(data.event_date);
  if (!name || name.length > 120) return { ok: false, message: 'Enter your name (up to 120 characters).' };
  if (!message || message.length > 5000) return { ok: false, message: 'Tell us about your event (up to 5,000 characters).' };
  if (location.length > 300) return { ok: false, message: 'Keep the location under 300 characters.' };
  if (date) {
    const parsed = new Date(`${date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || date < today) {
      return { ok: false, message: 'Choose a valid event date today or in the future, or leave it blank.' };
    }
  }
  return { ok: true, kind, payload: { email, name, message, location: location || null, event_date: date || null, consent: data.consent===true }, honeypot: false };
}
