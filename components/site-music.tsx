'use client';
import {createContext,useContext,useEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {featuredSong} from '../lib/music/featured';
import {releases} from '../lib/music/catalog';
import {newProgress,observeCompletion,queueIndex} from '../lib/music/playback';
import type {PlaybackUpdate} from '../lib/music/playback';
type Metadata=Record<string,{title:string;image?:string}>;
type Controller={play:()=>void;pause:()=>void;loadUri?:(uri:string)=>void;destroy?:()=>void;addListener:(name:string,listener:(event:{data?:PlaybackUpdate})=>void)=>void};
type SpotifyApi={createController:(element:HTMLElement,options:{uri:string;width:string;height:number},ready:(controller:Controller)=>void)=>void};
declare global{interface Window{onSpotifyIframeApiReady?:(api:SpotifyApi)=>void;__laxSpotifyApi?:SpotifyApi}}
const MusicContext=createContext({playing:false,currentId:releases[0].id,metadata:{} as Metadata,activeVideo:null as string|null,start:()=>{},toggle:()=>{},pause:()=>{},resume:()=>{},selectRelease:(_id:string)=>{},next:()=>{},previous:()=>{},beginVideo:(_id:string)=>{},endVideo:(_id:string)=>{}});
export const useSiteMusic=()=>useContext(MusicContext);
const source=(index:number)=>releases[index].audioSrc||(index===0?featuredSong.audioSrc:null);
const uri=(index:number)=>`spotify:${releases[index].kind}:${releases[index].id}`;
export default function SiteMusic({children}:{children:ReactNode}){
  const host=useRef<HTMLDivElement>(null),audio=useRef<HTMLAudioElement>(null),controller=useRef<Controller|null>(null),lastTrigger=useRef<HTMLElement|null>(null);
  const indexRef=useRef(0),playingRef=useRef(false),wanted=useRef(false),manualPause=useRef(false),progress=useRef(newProgress()),switchAt=useRef(0);
  const activeVideoRef=useRef<string|null>(null),beforeVideo=useRef(false),fallbackRef=useRef(false);
  const [index,setIndex]=useState(0),[playing,setPlaying]=useState(false),[open,setOpen]=useState(false),[fallback,setFallback]=useState(false),[metadata,setMetadata]=useState<Metadata>({}),[activeVideo,setActiveVideo]=useState<string|null>(null);
  const release=releases[index],title=metadata[release.id]?.title||release.title||(release.kind==='album'?'Album release':'Single release');
  function updatePlaying(value:boolean){playingRef.current=value;setPlaying(value);}
  function pauseEngines(){audio.current?.pause();try{controller.current?.pause();}catch{}updatePlaying(false);}
  function clearVideo(){activeVideoRef.current=null;beforeVideo.current=false;setActiveVideo(null);}
  function requestPlay(){manualPause.current=false;wanted.current=true;if(source(indexRef.current))audio.current?.play().catch(()=>updatePlaying(false));else try{controller.current?.play();}catch{updatePlaying(false);}}
  function pause(){manualPause.current=true;wanted.current=false;pauseEngines();}
  function resume(){requestPlay();}
  function start(){lastTrigger.current=document.activeElement as HTMLElement;setOpen(true);clearVideo();requestPlay();}
  function toggle(){if(playingRef.current)pause();else start();}
  function useFallback(){if(fallbackRef.current)return;fallbackRef.current=true;try{controller.current?.pause();controller.current?.destroy?.();}catch{}controller.current=null;host.current?.replaceChildren();setFallback(true);updatePlaying(false);}
  function selectIndex(next:number,show:boolean){
    next=queueIndex(next,releases.length);clearVideo();
    if(next===indexRef.current){if(show){lastTrigger.current=document.activeElement as HTMLElement;setOpen(true);}requestPlay();return;}
    manualPause.current=true;wanted.current=false;pauseEngines();
    indexRef.current=next;setIndex(next);progress.current=newProgress();switchAt.current=performance.now();
    if(show){lastTrigger.current=document.activeElement as HTMLElement;setOpen(true);}
    const local=source(next);
    if(local){if(audio.current){audio.current.src=local;audio.current.load();}}
    else if(controller.current){if(controller.current.loadUri)controller.current.loadUri(uri(next));else useFallback();}
    requestPlay();
  }
  function next(){selectIndex(indexRef.current+1,false);}
  function previous(){selectIndex(indexRef.current-1,false);}
  function selectRelease(id:string){const nextIndex=releases.findIndex(item=>item.id===id);if(nextIndex>=0)selectIndex(nextIndex,true);}
  function beginVideo(id:string){if(!activeVideoRef.current)beforeVideo.current=playingRef.current||wanted.current;activeVideoRef.current=id;setActiveVideo(id);pause();}
  function endVideo(id:string){if(activeVideoRef.current!==id)return;activeVideoRef.current=null;setActiveVideo(null);const restore=beforeVideo.current;beforeVideo.current=false;if(restore)requestPlay();}
  useEffect(()=>{
    const abort=new AbortController();
    releases.forEach(item=>{fetch(`/api/music-metadata?id=${item.id}`,{signal:abort.signal}).then(async response=>{if(!response.ok)return;const value=await response.json();if(typeof value.title==='string')setMetadata(old=>({...old,[item.id]:{title:value.title,image:typeof value.image==='string'?value.image:undefined}}));}).catch(()=>{});});
    return()=>abort.abort();
  },[]);
  useEffect(()=>{
    let dead=false,started=false;
    const mayAutoStart=['/','/archive','/photos'].includes(location.pathname);wanted.current=mayAutoStart;
    if(source(indexRef.current)&&mayAutoStart)requestPlay();
    const setup=(api:SpotifyApi)=>{
      window.__laxSpotifyApi=api;if(dead||started||fallbackRef.current||!host.current)return;started=true;
      const mount=document.createElement('div');host.current.replaceChildren(mount);const initial=indexRef.current;
      api.createController(mount,{uri:uri(initial),width:'100%',height:152},c=>{
        if(dead||fallbackRef.current){c.destroy?.();return;}controller.current=c;
        if(indexRef.current!==initial&&c.loadUri)c.loadUri(uri(indexRef.current));
        host.current?.querySelector('iframe')?.setAttribute('title','Spotify music player');
        c.addListener('playback_update',event=>{
          if(dead||source(indexRef.current)||!event.data)return;
          if(activeVideoRef.current&&event.data.isPaused===false){c.pause();return;}
          const wasPlaying=playingRef.current;
          if(event.data.isPaused===false){manualPause.current=false;wanted.current=true;}
          if(typeof event.data.isPaused==='boolean')updatePlaying(event.data.isPaused===false);
          if(performance.now()-switchAt.current<300)return;
          if(observeCompletion(progress.current,event.data,manualPause.current||Boolean(activeVideoRef.current))){next();return;}
          if(event.data.isPaused===true&&wasPlaying&&!event.data.isBuffering)wanted.current=false;
        });
        const attempt=()=>{if(!dead&&wanted.current&&!manualPause.current)requestPlay();};c.addListener('ready',attempt);attempt();
      });
    };
    window.onSpotifyIframeApiReady=setup;
    const script=document.createElement('script');script.src='https://open.spotify.com/embed/iframe-api/v1';script.async=true;script.onerror=()=>{if(!dead&&!controller.current)useFallback();};
    if(window.__laxSpotifyApi)setup(window.__laxSpotifyApi);else document.head.appendChild(script);
    const timeout=setTimeout(()=>{if(!dead&&!controller.current)useFallback();},5000);
    return()=>{dead=true;clearTimeout(timeout);script.remove();if(window.onSpotifyIframeApiReady===setup)delete window.onSpotifyIframeApiReady;controller.current?.destroy?.();controller.current=null;};
  },[]);
  return <MusicContext.Provider value={{playing,currentId:release.id,metadata,activeVideo,start,toggle,pause,resume,selectRelease,next,previous,beginVideo,endVideo}}>{children}
    <audio ref={audio} src={source(index)||undefined} preload="auto" onPlay={()=>{if(source(indexRef.current))updatePlaying(true);}} onPause={()=>{if(source(indexRef.current))updatePlaying(false);}} onEnded={event=>{if(source(indexRef.current)&&event.currentTarget.ended)next();}}/>
    <aside className={`site-music-player${open?' is-open':''}`} aria-label="Music player" aria-hidden={!open} inert={!open} data-current-release={release.id}>
      <div className="site-music-bar"><span>{title}</span><button type="button" onClick={()=>{setOpen(false);if(lastTrigger.current?.isConnected)lastTrigger.current.focus({preventScroll:true});}} aria-label="Hide music player">HIDE</button></div>
      <div ref={host} className="site-music-embed" hidden={Boolean(source(index))}>{fallback&&!activeVideo&&<iframe title="Spotify music player" src={`https://open.spotify.com/embed/${release.kind}/${release.id}?theme=0`} height="152" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"/>}</div>
      <div className="site-music-controls"><button onClick={previous} type="button">PREVIOUS</button><button onClick={toggle} type="button">{playing?'PAUSE':'PLAY'}</button><button onClick={next} type="button">NEXT</button></div>
    </aside>
  </MusicContext.Provider>;
}
