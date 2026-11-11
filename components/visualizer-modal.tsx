'use client';
import { useEffect, useRef } from 'react';
export const visualizerUrl='https://www.youtube.com/watch?v=OlXTom_jz-s';
export default function VisualizerModal({open,onClose}:{open:boolean;onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null),previousFocus=useRef<HTMLElement|null>(null);
  useEffect(()=>{
    if(open){previousFocus.current=document.activeElement as HTMLElement;dialog.current?.showModal();document.body.style.overflow='hidden';}
    else if(dialog.current?.open){dialog.current.close();document.body.style.overflow='';previousFocus.current?.focus();}
  },[open]);
  useEffect(()=>()=>{document.body.style.overflow='';},[]);
  return <dialog ref={dialog} className="launch-player" aria-labelledby="visualizer-heading" onCancel={event=>{event.preventDefault();onClose()}} onClick={event=>{if(event.target===dialog.current)onClose()}}>
    <div className="launch-player-inner"><div className="launch-player-top"><h2 id="visualizer-heading">LAX! · Official visualizer</h2><button type="button" onClick={onClose} aria-label="Close visualizer">CLOSE ×</button></div>
      {open&&<iframe title="LAX! official visualizer on YouTube" src="https://www.youtube.com/embed/OlXTom_jz-s?autoplay=1&playsinline=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>}
      <p>Player unavailable? <a href={visualizerUrl} target="_blank" rel="noreferrer">Open on YouTube</a></p>
    </div>
  </dialog>;
}
