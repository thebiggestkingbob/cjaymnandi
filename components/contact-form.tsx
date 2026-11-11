'use client';
import { useId, useState } from 'react';
import type { FormEvent } from 'react';

const emptyDraft = {name:'',email:'',event_date:'',location:'',message:'',website:'',consent:false};
export function useContactState() {
  const [requestId,setRequestId]=useState<string|null>(null);
  const [draft,setDraft]=useState({...emptyDraft});
  const [pending,setPending]=useState(false),[message,setMessage]=useState(''),[sent,setSent]=useState(false);
  return {requestId,setRequestId,draft,setDraft,pending,setPending,message,setMessage,sent,setSent};
}
export default function ContactForm({kind, enabled, controller}: {kind: 'mailing' | 'booking'; enabled: boolean; controller: ReturnType<typeof useContactState>}) {
  const id = useId();
  const {requestId,setRequestId,draft,setDraft,pending,setPending,message,setMessage,sent,setSent}=controller;
  function remember(form: HTMLFormElement) {
    setRequestId(null);
    const data=new FormData(form);
    setDraft({name:String(data.get('name')||''),email:String(data.get('email')||''),event_date:String(data.get('event_date')||''),location:String(data.get('location')||''),message:String(data.get('message')||''),website:String(data.get('website')||''),consent:data.get('consent')==='on'});
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending || !enabled) return;
    const form = event.currentTarget, data = new FormData(form);
    const submissionId=requestId||crypto.randomUUID();setRequestId(submissionId);
    setPending(true); setMessage('');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json','Idempotency-Key':submissionId },
        body: JSON.stringify({ kind, email: data.get('email'), name: data.get('name'), message: data.get('message'),
          event_date: data.get('event_date'), location: data.get('location'), website: data.get('website'), consent: data.get('consent') === 'on' }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      setMessage((typeof result.message === 'string' ? result.message : 'Please try again later.')+(kind==='booking'&&typeof result.reference==='string'?` Reference: ${result.reference}`:''));
      if (response.ok) { setSent(true); setDraft({...emptyDraft}); form.reset(); }
    } catch { setMessage('Your request could not be confirmed. Please try again later.'); }
    finally { setPending(false); }
  }
  return <div className="contact-block">
    {!enabled && <p className="lax-note">{kind === 'booking' ? 'Online booking enquiries are opening soon. For now, use the official contact links.' : 'The mailing list is opening soon. You can follow the music on Spotify in the meantime.'}</p>}
    <form className="contact-form" onSubmit={submit} onChange={event=>remember(event.currentTarget)} aria-label={kind === 'booking' ? 'Booking enquiry' : 'Mailing-list signup'} aria-describedby={`${id}-status`}>
      <fieldset disabled={!enabled || pending || sent}>
        <legend className="sr-only">{kind === 'booking' ? 'Your event details' : 'Release updates'}</legend>
        {kind === 'booking' && <><label htmlFor={`${id}-name`}>YOUR NAME<input id={`${id}-name`} name="name" defaultValue={draft.name} autoComplete="name" required maxLength={120}/></label></>}
        <label htmlFor={`${id}-email`}>EMAIL ADDRESS<input id={`${id}-email`} name="email" defaultValue={draft.email} type="email" autoComplete="email" required maxLength={254}/></label>
        {kind === 'booking' && <><div className="form-row"><label htmlFor={`${id}-date`}>EVENT DATE (OPTIONAL)<input id={`${id}-date`} name="event_date" defaultValue={draft.event_date} type="date"/></label><label htmlFor={`${id}-location`}>LOCATION (OPTIONAL)<input id={`${id}-location`} name="location" defaultValue={draft.location} maxLength={300}/></label></div><label htmlFor={`${id}-message`}>TELL US ABOUT YOUR EVENT<textarea id={`${id}-message`} name="message" defaultValue={draft.message} required maxLength={5000} rows={4}/></label><p className="lax-note">Submitting an enquiry does not confirm a booking. We use these details to respond about your event.</p></>}
        <div className="form-trap" aria-hidden="true"><label htmlFor={`${id}-website`}>Leave blank<input id={`${id}-website`} name="website" defaultValue={draft.website} tabIndex={-1} autoComplete="off"/></label></div>
        {<label className="consent" htmlFor={`${id}-consent`}><input id={`${id}-consent`} name="consent" defaultChecked={draft.consent} type="checkbox" required={kind==='mailing'}/>{kind==='booking'?'Optional: ':''}I agree to receive music and release updates from C.JayMnandi. I can withdraw consent at any time.</label>}
        <p className="lax-note"><a className="privacy-link" href="/privacy" target="_blank" rel="noreferrer">Read the privacy notice (opens a new tab)</a></p>
        <button className="lax-outline" type="submit">{pending ? 'SENDING…' : sent ? 'RECEIVED' : !enabled ? 'OPENING SOON' : kind === 'booking' ? 'SEND ENQUIRY' : 'JOIN THE MAILING LIST'}</button>
      </fieldset>
      <p id={`${id}-status`} role="status" aria-live="polite" className="form-status">{message}</p>
    </form>
  </div>;
}
