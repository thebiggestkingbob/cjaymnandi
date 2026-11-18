'use client';
import {useEffect,useRef,useState} from 'react';
import {useSiteMusic} from './site-music';
import {videoThumbnail} from '../lib/music/catalog';
export default function InlineVideo({id,title}:{id:string;title:string}){
  const [playing,setPlaying]=useState(false),[posterFailed,setPosterFailed]=useState(false);
  const music=useSiteMusic(),wasPlaying=useRef(false),resume=useRef(music.resume);
  resume.current=music.resume;
  useEffect(()=>()=>{if(wasPlaying.current)resume.current();},[]);
  return <div className="inline-video" data-video={id}>
    <iframe title={`Play ${title}`} src={`https://www.youtube.com/embed/${id}?playsinline=1&rel=0&autoplay=${playing?1:0}`} loading="eager" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" tabIndex={playing?0:-1} aria-hidden={!playing}/>
    {!playing&&<button type="button" className="inline-video-poster" aria-label={`Play ${title} on this website`} onClick={()=>{wasPlaying.current=music.playing;music.pause();setPlaying(true);}}>
      {!posterFailed&&<img src={videoThumbnail(id)} width={480} height={360} alt="" loading="eager" decoding="async" onError={()=>setPosterFailed(true)}/>}
      <span className="inline-video-play" aria-hidden="true">▶</span><span className="inline-video-label">{title}</span>
    </button>}
  </div>;
}
