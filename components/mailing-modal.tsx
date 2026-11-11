'use client';
import { useEffect, useRef } from 'react';
import ContactForm, { useContactState } from './contact-form';

export default function MailingModal({open,onClose,enabled}:{open:boolean;onClose:()=>void;enabled:boolean}) {
  const dialog=useRef<HTMLDialogElement>(null), previousFocus=useRef<HTMLElement|null>(null);
  const controller=useContactState();
  useEffect(()=>{
    if(open){previousFocus.current=document.activeElement as HTMLElement;dialog.current?.showModal();document.body.style.overflow='hidden';}
    else if(dialog.current?.open){dialog.current.close();document.body.style.overflow='';previousFocus.current?.focus();}
  },[open]);
  useEffect(()=>()=>{document.body.style.overflow='';},[]);
  return <dialog ref={dialog} className="launch-signup" aria-labelledby="signup-heading" onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target===dialog.current)onClose();}}>
    <div className="launch-signup-inner">
      <div className="launch-player-top"><span>C.JayMnandi / LAX!</span><button type="button" onClick={onClose} aria-label="Close mailing list">CLOSE ×</button></div>
      <h2 id="signup-heading">STAY IN THE ORBIT.</h2>
      <p>Music. Releases. The next chapter. Straight to your inbox.</p>
      <ContactForm kind="mailing" enabled={enabled} controller={controller}/>
    </div>
  </dialog>;
}
