'use client';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import manifest from '../lib/collage/manifest.json';
import { collageSpeed, composeCollage, shufflePhotos, wrapOffset } from '../lib/collage/layout';
import type { Photograph } from '../lib/collage/layout';

export default function InfiniteCollage(){
  const viewport=useRef<HTMLDivElement>(null), track=useRef<HTMLDivElement>(null), viewer=useRef<HTMLDialogElement>(null);
  const offset=useRef(0), impulse=useRef(0), pausedRef=useRef(false), reducedRef=useRef(false), phaseHeight=useRef(0);
  const active=useRef(true), lastFocus=useRef<HTMLElement|null>(null), restoring=useRef(false);
  const drag=useRef<{id:number;y:number;time:number;distance:number}|null>(null), dragged=useRef(false);
  const [photos,setPhotos]=useState<Photograph[]>([]), [size,setSize]=useState({width:0,height:0});
  const [paused,setPaused]=useState(false),[reduced,setReduced]=useState(false),[selected,setSelected]=useState<Photograph|null>(null),[viewerError,setViewerError]=useState(false);
  useEffect(()=>{setPhotos(shufflePhotos(manifest));},[]);
  useEffect(()=>{
    const element=viewport.current;if(!element)return;
    const measure=()=>setSize({width:element.clientWidth,height:element.clientHeight});
    measure();const observer=new ResizeObserver(measure);observer.observe(element);
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>{reducedRef.current=motion.matches;setReduced(motion.matches);impulse.current=0;offset.current=0;element.scrollTop=0;};
    update();motion.addEventListener('change',update);
    const intersection=new IntersectionObserver(([entry])=>{active.current=entry.isIntersecting;});intersection.observe(element);
    return()=>{observer.disconnect();intersection.disconnect();motion.removeEventListener('change',update);};
  },[]);
  const layout=useMemo(()=>size.width&&photos.length?composeCollage(photos,size.width):{tiles:[],height:0,width:0},[photos,size.width]);
  const copies=reduced?1:Math.max(2,Math.ceil(size.height/Math.max(1,layout.height))+1);
  useLayoutEffect(()=>{
    const old=phaseHeight.current;phaseHeight.current=layout.height;
    offset.current=old?wrapOffset(offset.current/old*layout.height,layout.height):0;
    if(track.current)track.current.style.transform=reduced?'none':`translate3d(0,${-offset.current}px,0)`;
  },[layout.height,reduced]);
  const draw=useCallback(()=>{
    if(track.current)track.current.style.transform=reducedRef.current?'none':`translate3d(0,${-offset.current}px,0)`;
  },[]);
  useEffect(()=>{
    let frame=0,last=0;
    const tick=(now:number)=>{
      const dt=last?Math.min((now-last)/1000,.05):0;last=now;
      if(!document.hidden&&active.current&&!reducedRef.current&&phaseHeight.current){
        offset.current=wrapOffset(offset.current+((pausedRef.current?0:collageSpeed)+impulse.current)*dt,phaseHeight.current);
        impulse.current*=Math.exp(-dt/0.55);draw();
      }
      frame=requestAnimationFrame(tick);
    };
    const visibility=()=>{last=0;impulse.current=0;};
    document.addEventListener('visibilitychange',visibility);frame=requestAnimationFrame(tick);
    return()=>{cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',visibility);};
  },[draw]);
  useEffect(()=>{
    const element=viewport.current;if(!element)return;
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries){if(!entry.isIntersecting)continue;const image=entry.target as HTMLImageElement;
        if(image.dataset.srcset)image.srcset=image.dataset.srcset;
        if(image.dataset.src)image.src=image.dataset.src;
        observer.unobserve(image);
      }
    },{root:element,rootMargin:'900px 0px'});
    element.querySelectorAll<HTMLImageElement>('img[data-src]').forEach(image=>observer.observe(image));
    return()=>observer.disconnect();
  },[layout,copies]);
  const move=useCallback((delta:number)=>{
    offset.current=wrapOffset(offset.current+delta,phaseHeight.current);draw();
  },[draw]);
  useEffect(()=>{
    const element=viewport.current;if(!element)return;
    const wheel=(event:WheelEvent)=>{
      if(reducedRef.current||event.ctrlKey)return;
      event.preventDefault();const delta=event.deltaY*(event.deltaMode===1?18:event.deltaMode===2?element.clientHeight:1);
      move(delta*.6);impulse.current=pausedRef.current?0:Math.max(-1800,Math.min(1800,impulse.current+delta*4));
    };
    element.addEventListener('wheel',wheel,{passive:false});return()=>element.removeEventListener('wheel',wheel);
  },[move]);
  function togglePause(){pausedRef.current=!pausedRef.current;impulse.current=0;setPaused(pausedRef.current);}
  function closeViewer(){
    viewer.current?.close();setSelected(null);restoring.current=true;lastFocus.current?.focus({preventScroll:true});restoring.current=false;
  }
  useEffect(()=>{if(selected){setViewerError(false);viewer.current?.showModal();const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};}},[selected]);
  const instances=Array.from({length:copies},(_,copy)=>layout.tiles.map((tile,index)=>({tile,index,copy})) ).flat();
  return <section className="collage" aria-label="Infinite living photographic collage">
    <h2 className="sr-only">Gallery</h2>
    <button type="button" className="collage-pause" onClick={togglePause} disabled={reduced} aria-pressed={paused||reduced}>{reduced?'MOTION OFF':paused?'RESUME':'PAUSE'}</button>
    <div ref={viewport} className={`collage-viewport${reduced?' is-still':''}`} tabIndex={0} role="region" aria-label="Photographic wall" data-period={layout.height}
      onKeyDown={event=>{if(event.target!==event.currentTarget||reduced)return;const step=event.key==='ArrowDown'?100:event.key==='ArrowUp'?-100:event.key==='PageDown'?size.height*.8:event.key==='PageUp'?-size.height*.8:0;if(step){event.preventDefault();move(step);}}}
      onPointerDown={event=>{dragged.current=false;if(event.pointerType==='touch'&&!reduced)drag.current={id:event.pointerId,y:event.clientY,time:event.timeStamp,distance:0};}}
      onPointerMove={event=>{const d=drag.current;if(!d||d.id!==event.pointerId)return;const delta=d.y-event.clientY;d.distance+=Math.abs(delta);if(d.distance>7){dragged.current=true;event.currentTarget.setPointerCapture(event.pointerId);move(delta);impulse.current=Math.max(-1800,Math.min(1800,delta/Math.max(.016,(event.timeStamp-d.time)/1000)));}d.y=event.clientY;d.time=event.timeStamp;}}
      onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}
      onClickCapture={event=>{if(dragged.current){event.preventDefault();event.stopPropagation();dragged.current=false;}}}>
      {!layout.tiles.length&&<p className="collage-loading" role="status">Entering the orbit…</p>}
      <div ref={track} className="collage-track" style={{height:layout.height*copies}}>
        {instances.map(({tile,copy,index})=>{
          const photo=tile.photo, small=photo.variants.find(v=>v.width>=640)||photo.variants.at(-1)!;
          const srcset=photo.variants.filter(v=>v.width<=960).map(v=>`${v.src} ${v.width}w`).join(', ');
          const first=copy===0&&tile.y<size.height+200;
          return <button type="button" key={`${copy}-${index}`} data-photo={photo.id} data-copy={copy} className="collage-photo" tabIndex={copy===0&&index<photos.length?0:-1} aria-hidden={copy>0||index>=photos.length?true:undefined} aria-label={`View photograph: ${photo.alt}`}
            style={{left:tile.x,top:tile.y+copy*layout.height,width:tile.width,height:tile.height}}
            onFocus={event=>{if(event.currentTarget.matches(':focus-visible')&&!reduced&&!selected&&!restoring.current){offset.current=wrapOffset(tile.y-20,layout.height);if(viewport.current)viewport.current.scrollTop=0;draw();}}}
            onClick={event=>{lastFocus.current=event.currentTarget;setSelected(photo);}}>
            <img width={photo.width} height={photo.height} alt={photo.alt} draggable={false} decoding="async" sizes={`${Math.ceil(tile.width)}px`}
              src={first?small.src:undefined} srcSet={first?srcset:undefined} data-src={small.src} data-srcset={srcset} fetchPriority={first&&index<6?'high':'auto'}
              onError={event=>{event.currentTarget.style.visibility='hidden';event.currentTarget.parentElement?.setAttribute('data-unavailable','true');}}/>
          </button>;
        })}
      </div>
    </div>
    <dialog ref={viewer} className="collage-viewer" aria-label="Photograph viewer" onCancel={event=>{event.preventDefault();event.stopPropagation();closeViewer();}} onClick={event=>{if(event.target===event.currentTarget)closeViewer();}}>
      <button className="collage-viewer-close" onClick={closeViewer} type="button" aria-label="Close photograph">CLOSE ×</button>
      {selected&&(viewerError?<p role="status">This photograph could not load. Please close and try again.</p>:<img key={selected.id} src={selected.variants.at(-1)!.src} alt={selected.alt} width={selected.width} height={selected.height} onError={()=>setViewerError(true)}/>)}
    </dialog>
  </section>;
}
