'use client';
import { useId, useState } from 'react';
import type { FormEvent } from 'react';

export default function ContactForm({kind, enabled}: {kind: 'mailing' | 'booking'; enabled: boolean}) {
  const id = useId();
  const [pending, setPending] = useState(false), [message, setMessage] = useState(''), [sent, setSent] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending || !enabled) return;
    const form = event.currentTarget, data = new FormData(form);
    setPending(true); setMessage('');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, email: data.get('email'), name: data.get('name'), message: data.get('message'),
          event_date: data.get('event_date'), location: data.get('location'), website: data.get('website'), consent: data.get('consent') === 'on' }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      setMessage(typeof result.message === 'string' ? result.message : 'Please try again later.');
      if (response.ok) { setSent(true); form.reset(); }
    } catch { setMessage('Your request could not be confirmed. Please try again later.'); }
    finally { setPending(false); }
  }
  return <div className="contact-block">
    {!enabled && <p className="lax-note">{kind === 'booking' ? 'Online booking enquiries are opening soon. For now, use the official contact links.' : 'The mailing list is opening soon. You can follow the music on Spotify in the meantime.'}</p>}
    <form className="contact-form" onSubmit={submit} aria-label={kind === 'booking' ? 'Booking enquiry' : 'Mailing-list signup'} aria-describedby={`${id}-status`}>
      <fieldset disabled={!enabled || pending || sent}>
        <legend className="sr-only">{kind === 'booking' ? 'Your event details' : 'Release updates'}</legend>
        {kind === 'booking' && <><label htmlFor={`${id}-name`}>YOUR NAME<input id={`${id}-name`} name="name" autoComplete="name" required maxLength={120}/></label></>}
        <label htmlFor={`${id}-email`}>EMAIL ADDRESS<input id={`${id}-email`} name="email" type="email" autoComplete="email" required maxLength={254}/></label>
        {kind === 'booking' && <><div className="form-row"><label htmlFor={`${id}-date`}>EVENT DATE (OPTIONAL)<input id={`${id}-date`} name="event_date" type="date"/></label><label htmlFor={`${id}-location`}>LOCATION (OPTIONAL)<input id={`${id}-location`} name="location" maxLength={300}/></label></div><label htmlFor={`${id}-message`}>TELL US ABOUT YOUR EVENT<textarea id={`${id}-message`} name="message" required maxLength={5000} rows={4}/></label><p className="lax-note">Submitting an enquiry does not confirm a booking. We use these details to respond about your event.</p></>}
        <div className="form-trap" aria-hidden="true"><label htmlFor={`${id}-website`}>Leave blank<input id={`${id}-website`} name="website" tabIndex={-1} autoComplete="off"/></label></div>
        {kind === 'mailing' && <label className="consent" htmlFor={`${id}-consent`}><input id={`${id}-consent`} name="consent" type="checkbox" required/>I agree to receive music and release updates from C.JayMnandi. I can withdraw consent at any time.</label>}
        <p className="lax-note"><a className="privacy-link" href="/privacy" target="_blank" rel="noreferrer">Read the privacy notice (opens a new tab)</a></p>
        <button className="lax-outline" type="submit">{pending ? 'SENDING…' : sent ? 'RECEIVED' : !enabled ? 'OPENING SOON' : kind === 'booking' ? 'SEND ENQUIRY' : 'JOIN THE MAILING LIST'}</button>
      </fieldset>
      <p id={`${id}-status`} role="status" aria-live="polite" className="form-status">{message}</p>
    </form>
  </div>;
}
