'use client';
import {releases,featureVideos,visualVideos} from '../lib/music/catalog';
import {useSiteMusic} from './site-music';
import InlineVideo from './inline-video';
export function MusicReleases({includeFeatured=true}:{includeFeatured?:boolean}){
  const music=useSiteMusic();
  return <div className="release-list">{releases.filter(item=>includeFeatured||item.id!=='2JYLBbngIOycsumS0b9TCA').map(item=><article className="archive-item" key={item.id} data-release={item.id}>
    {item.title&&<h4>{item.title}</h4>}
    {item.id==='2JYLBbngIOycsumS0b9TCA'?<button className="lax-outline" onClick={music.start}>PLAY LAX!</button>:<iframe title={`Play ${item.title||`C.JayMnandi ${item.kind}`} on Spotify`} src={`https://open.spotify.com/embed/${item.kind}/${item.id}?theme=0`} height={item.kind==='track'?152:352} loading="eager" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"/>}
    <a className="player-fallback" href={`https://open.spotify.com/${item.kind}/${item.id}`} target="_blank" rel="noreferrer">Open on Spotify</a>
  </article>)}</div>;
}
export function VideoLibrary(){return <>
  <section id="archive-features" aria-labelledby="features-heading"><h3 id="features-heading">Features</h3>
    {featureVideos.map(video=><article className="archive-item" key={video.id} id={video.id==='ZKFxonhUVdA'?'archive-performances':`video-${video.id}`}><h4>{video.title}</h4><span className="video-category">{video.category}</span><InlineVideo id={video.id} title={video.title}/></article>)}
  </section>
  <section id="archive-visuals" aria-labelledby="visuals-heading"><h3 id="visuals-heading">Visuals</h3>{visualVideos.map(video=><article className="archive-item" key={video.id}><h4>{video.title}</h4><InlineVideo id={video.id} title={video.title}/></article>)}</section>
</>;}
