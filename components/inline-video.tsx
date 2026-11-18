'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {useSiteMusic} from './site-music';
import {videoThumbnail} from '../lib/music/catalog';
export default function InlineVideo({id,title}:{id:string;title:string}){
  const [posterFailed,setPosterFailed]=useState(false);
  const music=useSiteMusic(),owner=useId(),end=useRef(music.endVideo);
  end.current=music.endVideo;
  const playing=music.activeVideo===owner;
  useEffect(()=>()=>end.current(owner),[owner]);
  return <div className="inline-video" data-video={id}>
    <iframe title={`Play ${title}`} src={`https://www.youtube.com/embed/${id}?playsinline=1&rel=0&autoplay=${playing?1:0}`} loading="eager" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" tabIndex={playing?0:-1} aria-hidden={!playing}/>
    {!playing&&<button type="button" className="inline-video-poster" aria-label={`Play ${title} on this website`} onClick={()=>music.beginVideo(owner)}>
      {!posterFailed&&<img src={videoThumbnail(id)} width={480} height={360} alt="" loading="eager" decoding="async" onError={()=>setPosterFailed(true)}/>}
      <span className="inline-video-play">PLAY VIDEO</span><span className="inline-video-label">{title}</span>
    </button>}
  </div>;
}
