'use client';
import {releases,featureVideos,visualVideos} from '../lib/music/catalog';
import {useSiteMusic} from './site-music';
import InlineVideo from './inline-video';
export function MusicReleases({includeFeatured=true}:{includeFeatured?:boolean}){
  const music=useSiteMusic();
  return <div className="release-list">{releases.filter(item=>includeFeatured||item.id!=='2JYLBbngIOycsumS0b9TCA').map(item=>{
    const metadata=music.metadata[item.id],title=metadata?.title||item.title||(item.kind==='album'?'Album release':'Single release');
    const active=music.currentId===item.id,playing=active&&music.playing;
    return <article className={`release-card${active?' is-current':''}`} key={item.id} data-release={item.id}>
      {metadata?.image?<img className="release-art" src={metadata.image} width={80} height={80} alt="" loading="eager"/>:<div className="release-art release-art-placeholder" aria-hidden="true">{item.kind==='album'?'ALBUM':'SINGLE'}</div>}
      <div className="release-details"><h4>{title}</h4><span>{playing?'PLAYING':item.kind==='album'?'ALBUM':'SINGLE'}</span></div>
      <button className="release-play" type="button" aria-label={`${playing?'Pause':'Play'} ${title}`} aria-pressed={playing} onClick={()=>playing?music.pause():music.selectRelease(item.id)}>{playing?'PAUSE':'PLAY'}</button>
    </article>;
  })}</div>;
}
export function VideoLibrary(){return <>
  <section id="archive-features" aria-labelledby="features-heading"><h3 id="features-heading">Features</h3>
    {featureVideos.map(video=><article className="archive-item" key={video.id} id={video.id==='ZKFxonhUVdA'?'archive-performances':`video-${video.id}`}><h4>{video.title}</h4><span className="video-category">{video.category}</span><InlineVideo id={video.id} title={video.title}/></article>)}
  </section>
  <section id="archive-visuals" aria-labelledby="visuals-heading"><h3 id="visuals-heading">Visuals</h3>{visualVideos.map(video=><article className="archive-item" key={video.id}><h4>{video.title}</h4><InlineVideo id={video.id} title={video.title}/></article>)}</section>
</>;}
