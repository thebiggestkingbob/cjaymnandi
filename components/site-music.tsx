'use client';
import {createContext,useContext,useEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {featuredSong} from '../lib/music/featured';
type Controller={play:()=>void;pause:()=>void;destroy?:()=>void;addListener:(name:string,listener:(event:{data?:{isPaused?:boolean}})=>void)=>void};
type SpotifyApi={createController:(element:HTMLElement,options:{uri:string;width:string;height:number},ready:(controller:Controller)=>void)=>void};
declare global{interface Window{onSpotifyIframeApiReady?:(api:SpotifyApi)=>void;__laxSpotifyApi?:SpotifyApi}}
const MusicContext=createContext({playing:false,start:()=>{},toggle:()=>{}});
export const useSiteMusic=()=>useContext(MusicContext);
export default function SiteMusic({children}:{children:ReactNode}){
  const lastTrigger=useRef<HTMLElement|null>(null);
  const host=useRef<HTMLDivElement>(null),audio=useRef<HTMLAudioElement>(null),controller=useRef<Controller|null>(null);
  const [playing,setPlaying]=useState(false),[open,setOpen]=useState(false),[fallback,setFallback]=useState(false);
  useEffect(()=>{
    const mayAutoStart=['/','/archive','/photos'].includes(location.pathname);
    if(featuredSong.audioSrc){if(mayAutoStart)audio.current?.play().catch(()=>{});return;}
    let dead=false,started=false,fallbackUsed=false;
    const setup=(api:SpotifyApi)=>{
      window.__laxSpotifyApi=api;
      if(dead||started||fallbackUsed||!host.current)return;started=true;
      const mount=document.createElement('div');host.current.replaceChildren(mount);
      api.createController(mount,{uri:'spotify:track:2JYLBbngIOycsumS0b9TCA',width:'100%',height:152},c=>{
        if(dead||fallbackUsed){c.destroy?.();return;}controller.current=c;host.current?.querySelector('iframe')?.setAttribute('title','Play LAX! on Spotify');
        c.addListener('playback_update',event=>{if(!dead&&typeof event.data?.isPaused==='boolean')setPlaying(!event.data.isPaused);});
        const attempt=()=>{try{c.play();}catch{/* A real user gesture may be required by the browser/provider. */}};
        c.addListener('ready',()=>{if(mayAutoStart)attempt();});if(mayAutoStart)attempt();
      });
    };
    const useFallback=()=>{if(!dead&&!controller.current){fallbackUsed=true;host.current?.replaceChildren();setFallback(true);}};
    window.onSpotifyIframeApiReady=setup;
    const script=document.createElement('script');script.src='https://open.spotify.com/embed/iframe-api/v1';script.async=true;script.onerror=useFallback;
    if(window.__laxSpotifyApi)setup(window.__laxSpotifyApi);else document.head.appendChild(script);
    const timeout=setTimeout(useFallback,5000);
    return()=>{dead=true;clearTimeout(timeout);script.remove();if(window.onSpotifyIframeApiReady===setup)delete window.onSpotifyIframeApiReady;controller.current?.destroy?.();controller.current=null;};
  },[]);
  function start(){lastTrigger.current=document.activeElement as HTMLElement;setOpen(true);if(audio.current)audio.current.play().catch(()=>{});else try{controller.current?.play();}catch{}}
  function toggle(){if(playing){if(audio.current)audio.current.pause();else controller.current?.pause();}else start();}
  return <MusicContext.Provider value={{playing,start,toggle}}>{children}
    {featuredSong.audioSrc&&<audio ref={audio} src={featuredSong.audioSrc} autoPlay loop preload="auto" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)}/>}
    <aside className={`site-music-player${open?' is-open':''}`} aria-label="Persistent LAX music player" aria-hidden={!open} inert={!open}>
      <div className="site-music-bar"><span>LAX! / C.JayMnandi</span><button type="button" onClick={()=>{setOpen(false);if(lastTrigger.current?.isConnected)lastTrigger.current.focus({preventScroll:true});}} aria-label="Hide music player">HIDE ×</button></div>
      {!featuredSong.audioSrc&&<div ref={host} className="site-music-embed">{fallback&&<iframe title="Play LAX! on Spotify" src={featuredSong.embed} height="152" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"/>}</div>}
      {featuredSong.audioSrc&&<button className="lax-outline" onClick={toggle}>{playing?'PAUSE LAX!':'PLAY LAX!'}</button>}
      <a href={featuredSong.spotify} target="_blank" rel="noreferrer">OPEN ON SPOTIFY</a>
    </aside>
  </MusicContext.Provider>;
}
