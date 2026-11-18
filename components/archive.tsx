import {MusicReleases,VideoLibrary} from './music-catalog';
export default function Archive(){return <div className="archive">
  <p className="lax-panel-kicker">THE COLLECTION</p><h2>ARCHIVE.</h2>
  <nav className="archive-index" aria-label="Archive sections"><a href="#archive-music">Music</a><a href="#archive-visuals">Visuals</a><a href="#archive-performances">Past performances</a><a href="#archive-features">Features</a></nav>
  <section id="archive-music" aria-labelledby="music-heading"><h3 id="music-heading">Music</h3><MusicReleases/></section>
  <VideoLibrary/>
</div>}
