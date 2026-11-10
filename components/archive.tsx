const music = [
  { title: "Don't Kill My Qwaa!", kind: 'track', id: '5Q4uyRnSm7ar6qHgOaU6SK' },
  { title: 'Ntjwaka Mei Dawgo', kind: 'album', id: '3fRud4kn6iXSPimTlWgbJf' },
];
const films = [
  { title: 'Ntjwaka Mei Dawgo', category: 'Visuals', id: '6c42u8MHtfc' },
  { title: 'C.JayMnandi x Homecoming Africa 2024', category: 'Past performances', id: 'ZKFxonhUVdA' },
  { title: 'Featured appearance', category: 'Features', id: '89--pR19iUg' },
];
export default function Archive(){return <div className="archive">
  <p className="lax-panel-kicker">THE COLLECTION</p><h2>ARCHIVE.</h2>
  <nav className="archive-index" aria-label="Archive sections"><a href="#archive-music">Music</a><a href="#archive-visuals">Visuals</a><a href="#archive-performances">Past performances</a><a href="#archive-features">Features</a></nav>
  <section id="archive-music" aria-labelledby="music-heading"><h3 id="music-heading">Music <span>01</span></h3>{music.map(item=><article className="archive-item" key={item.id}><h4>{item.title}</h4><iframe title={`Play ${item.title} on Spotify`} src={`https://open.spotify.com/embed/${item.kind}/${item.id}?utm_source=generator&theme=0`} height={item.kind==='track'?152:352} loading="eager" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" /><a className="player-fallback" href={`https://open.spotify.com/${item.kind}/${item.id}`} target="_blank" rel="noreferrer">Open on Spotify</a></article>)}</section>
  {films.map((item,index)=><section id={index===0?'archive-visuals':index===1?'archive-performances':'archive-features'} key={item.id} aria-labelledby={`film-heading-${index}`}><h3 id={`film-heading-${index}`}>{item.category}<span>0{index+2}</span></h3><article className="archive-item"><h4>{item.title}</h4><iframe className="film-player" title={`Play ${item.title}`} src={`https://www.youtube.com/embed/${item.id}?playsinline=1&rel=0`} loading="eager" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/><a className="player-fallback" href={`https://www.youtube.com/watch?v=${item.id}`} target="_blank" rel="noreferrer">Open on YouTube</a></article></section>)}
</div>}
