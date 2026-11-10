'use client';
import { useEffect, useRef, useState } from 'react';
function Arrow() { return <svg className="arrow" aria-hidden="true" viewBox="0 0 16 16" fill="none"><path d="M3 13 13 3M3 3h10v10" stroke="currentColor" strokeWidth="1.3" /></svg>; }
const spotify = 'https://open.spotify.com/artist/5vvHnvQWm6Wlgq07j79vni';
const sections = ['Music', 'Store', 'Bookings', 'About', 'Stay connected'] as const;
type Section = typeof sections[number];
export default function Home() {
  const [panel, setPanel] = useState<Section | null>(null);
  const [media, setMedia] = useState<{ video?: string; audio?: string }>({});
  const [playing, setPlaying] = useState(false);
  const [message, setMessage] = useState('');
  const audio = useRef<HTMLAudioElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    // Missing media never produces broken images or automatic downloads.
    const controller = new AbortController();
    Promise.all(['visualizer.mp4', 'ReelAudio-11318.mp3'].map(async (file) => {
      const response = await fetch(`/media/${file}`, { method: 'HEAD', signal: controller.signal });
      return response.ok ? `/media/${file}` : undefined;
    })).then(([video, audio]) => setMedia({ video, audio })).catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (panel) { previousFocus.current = document.activeElement as HTMLElement; dialog.current?.showModal(); document.body.style.overflow = 'hidden'; }
    else { dialog.current?.close(); document.body.style.overflow = ''; previousFocus.current?.focus(); }
    return () => { document.body.style.overflow = ''; };
  }, [panel]);
  async function toggleSound() {
    if (!media.audio) { setMessage('The LAX! audio is coming soon. Explore C.JayMnandi on Spotify.'); return; }
    if (playing) { audio.current?.pause(); setPlaying(false); }
    else { try { await audio.current?.play(); setPlaying(true); setMessage(''); } catch { setMessage('Audio could not play. Please try again.'); } }
  }
  return <main>
    <div className="stage" aria-hidden="true">
      {media.video && <video ref={video} className="visualizer" src={media.video} loop muted playsInline preload="none" />}
      <div className="orbit orbit-one" /><div className="orbit orbit-two" />
      <span className="backdrop-word">LAX!</span><div className="grain" />
    </div>
    <header><a className="wordmark" href="#home" aria-label="C.JayMnandi home">C.JayMnandi<span>JUPITER VIBEZ</span></a>
      <nav aria-label="Main navigation">{sections.map(s => <button key={s} onClick={() => setPanel(s)}>{s === 'Stay connected' ? 'Connect' : s}</button>)}</nav>
      <button className="button header-buy" onClick={() => setPanel('Store')}>BUY LAX! <span><Arrow /></span></button>
    </header>
    <section id="home" className="hero" aria-labelledby="hero-title">
      <div className="edition"><span className="dot" /> THE LAX! EXPERIENCE <span className="edition-number">01 / C.JAYMNANDI</span></div>
      <p className="eyebrow">FROM STINKWATER. TO YOUR WORLD.</p>
      <h1 id="hero-title">LAX<span className="exclamation">!</span></h1>
      <div className="hero-bottom"><div><p className="hero-copy">A world of his own.<br />Welcome to Jupiter Vibez.</p><p className="credit">C.JayMnandi / Hammanskraal, South Africa</p></div>
        <div className="hero-actions"><button className="button primary" onClick={() => setPanel('Store')}>BUY LAX! <span><Arrow /></span></button><a className="text-link" href={spotify} target="_blank" rel="noreferrer">Explore on Spotify <Arrow /></a></div>
      </div>
    </section>
    <footer><div className="media-controls"><button onClick={toggleSound} aria-pressed={playing}><span aria-hidden="true">{playing ? 'Ⅱ' : '▷'}</span> SOUND {playing ? 'ON' : 'OFF'}</button>{media.video && <button onClick={() => { if (video.current?.paused) video.current.play().catch(() => setMessage('Video could not play.')); else video.current?.pause(); }}>PLAY / PAUSE VISUALIZER</button>}</div><span className="preview-label">VISUAL EXPERIENCE PREVIEW · ORIGINAL MEDIA COMING SOON</span><button className="footer-connect" onClick={() => setPanel('Stay connected')}>STAY IN THE ORBIT <Arrow /></button></footer>
    <p className="status" role="status">{message}</p>
    {media.audio && <audio ref={audio} src={media.audio} loop preload="none" onError={() => { setPlaying(false); setMessage('Audio is temporarily unavailable.'); }} />}
    <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); setPanel(null); }} onClick={event => { if (event.target === dialog.current) setPanel(null); }} aria-labelledby="panel-title">
      <article className="panel"><div className="panel-top"><span className="eyebrow">C.JayMnandi / LAX!</span><button className="close" aria-label="Close overlay" onClick={() => setPanel(null)}>✕</button></div><h2 id="panel-title">{panel === 'Store' ? 'Own the experience.' : panel === 'Stay connected' ? 'Stay in the orbit.' : panel}</h2>
      {panel === 'Music' && <><p>Step into the world of C.JayMnandi.</p><a className="button" href={spotify} target="_blank" rel="noreferrer">LISTEN ON SPOTIFY <Arrow /></a><p className="note">LAX! artwork, track list and release links will be added when supplied.</p></>}
      {panel === 'Store' && <><div className="release-card"><span className="release-type">DIGITAL RELEASE</span><strong>LAX!</strong><span>C.JayMnandi</span></div><p>The LAX! digital release is being prepared.</p><p className="note">Price and purchase files are awaiting confirmation. Secure guest checkout through Yoco will open once everything is ready.</p><button className="button" disabled>SALES OPENING SOON</button><p className="note">No payment is collected on this preview.</p></>}
      {panel === 'Bookings' && <><p>Bring Jupiter Vibez to your stage.</p><p className="note">The official booking contact will be published here once confirmed. Booking enquiries are not collected on this preview.</p></>}
      {panel === 'About' && <><p className="large-copy">From Stinkwater.<br />In his own orbit.</p><p>Kamogelo “C.JayMnandi” Mkhwebane is from Stinkwater, Hammanskraal. His creative persona is Jupiter Vibez.</p><p className="note">More of the story is on the way.</p></>}
      {panel === 'Stay connected' && <><p>Music. New releases. The next chapter.</p><a className="button" href={spotify} target="_blank" rel="noreferrer">FOLLOW ON SPOTIFY <Arrow /></a><p className="note">Mailing-list and WhatsApp updates are coming once the official channels are confirmed. Joining will always be optional.</p></>}
      <div className="panel-foot">THE LAX! EXPERIENCE <span><Arrow /></span></div></article>
    </dialog>
  </main>;
}
