'use client';
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import SocialLinks from './social-links';
import VisualizerModal from './visualizer-modal';
import { launchAt, launchHosts, launchLabel, remainingTime } from '../lib/launch/schedule';

export default function Countdown({serverNow}: {serverNow: number}) {
  const [time, setTime] = useState<ReturnType<typeof remainingTime> | null>(null);
  const [playing, setPlaying] = useState(false), [mediaError, setMediaError] = useState(false);
  const [playerOpen,setPlayerOpen]=useState(false);
  const watching=useRef(false),resumeFilm=useRef(false);
  const clockMotion=useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const started = performance.now();
    const tick = () => {
      const next = remainingTime(serverNow + performance.now() - started); setTime(next);
      if (next.total === 0 && !watching.current && launchHosts.includes(window.location.hostname)) window.location.replace('/');
    };
    tick(); const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [serverNow]);
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & {connection?: {saveData?: boolean}}).connection;
    if (!motion.matches && !connection?.saveData) video.current?.play().catch(() => {});
    const onMotionChange = () => { if (motion.matches) {video.current?.pause();resetTilt();} };
    motion.addEventListener('change', onMotionChange);
    return () => motion.removeEventListener('change', onMotionChange);
  }, []);
  function resetTilt(){clockMotion.current?.style.setProperty('--clock-tilt-x','0deg');clockMotion.current?.style.setProperty('--clock-tilt-y','0deg');}
  function moveClock(event: PointerEvent<HTMLElement>){
    if(playerOpen||event.pointerType!=='mouse'||!window.matchMedia('(hover: hover) and (pointer: fine)').matches||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const x=Math.max(-1,Math.min(1,(event.clientX/window.innerWidth-.5)*2));
    const y=Math.max(-1,Math.min(1,(event.clientY/window.innerHeight-.5)*2));
    clockMotion.current?.style.setProperty('--clock-tilt-x',`${(-y*1.8).toFixed(2)}deg`);
    clockMotion.current?.style.setProperty('--clock-tilt-y',`${(x*2.4).toFixed(2)}deg`);
  }
  function openPlayer(){resumeFilm.current=Boolean(video.current&&!video.current.paused);watching.current=true;video.current?.pause();resetTilt();setPlayerOpen(true);}
  function closePlayer(){watching.current=false;setPlayerOpen(false);const connection=(navigator as Navigator & {connection?:{saveData?:boolean}}).connection;if(resumeFilm.current&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&!connection?.saveData)video.current?.play().catch(()=>{});}
  function toggleVideo() {
    const film = video.current; if (!film) return;
    if (film.paused) film.play().catch(() => setMediaError(true)); else film.pause();
  }
  const units = [['days', time?.days], ['hours', time?.hours], ['minutes', time?.minutes], ['seconds', time?.seconds]] as const;
  return <main className="launch-page" onPointerMove={moveClock} onPointerLeave={resetTilt}>
    <div className="launch-art" aria-hidden="true">
      <video ref={video} muted loop playsInline preload="none" poster="/media/visualizer-poster.jpg"
        onPlay={() => {setPlaying(true);setMediaError(false);}} onPause={() => setPlaying(false)} onError={() => {setMediaError(true);setPlaying(false);}}>
        <source src="/media/visualizer.mp4" type="video/mp4"/>
      </video>
    </div>
    <header className="launch-header"><span>C.JayMnandi</span><span>JUPITER VIBEZ</span></header>
    <section className="launch-content" aria-labelledby="launch-title">
      <div className="launch-intro-copy">
        <p className="launch-kicker">THE WORLD OPENS ON WEDNESDAY THE 18TH</p>
        <h1 id="launch-title">LAX!</h1>
        <p className="launch-subtitle">A world of his own. Almost yours.</p>
      </div>
      {time?.total === 0 ? <p className="launch-arrived">The time has arrived.</p> : <div className="launch-clock-motion" ref={clockMotion}><div className="launch-clock" role="timer" aria-live="off" aria-label="Time until the LAX! experience opens">
        {units.map(([label, value]) => <div key={label} className="launch-time-unit">
          <span className="launch-digit">{(value === undefined ? '––' : String(value).padStart(2, '0')).split('').map((digit, index) =>
            <span className="launch-digit-place" key={index}><span className="launch-digit-glyph" key={digit}>{digit}</span></span>
          )}</span><span className="launch-unit">{label}</span>
        </div>)}
      </div></div>}
      <div className="launch-details">
        <time className="launch-date" dateTime={launchAt}>{launchLabel}</time>
        <p className="launch-invitation">Until then, stay in the orbit.</p>
        <div className="launch-actions"><button className="launch-link" type="button" onClick={openPlayer}>WATCH VISUALIZER</button><a className="launch-link" href="https://open.spotify.com/artist/5vvHnvQWm6Wlgq07j79vni" target="_blank" rel="noreferrer">LISTEN ON SPOTIFY</a></div><SocialLinks/>
        {mediaError && <p className="launch-media-error" role="status">The film is temporarily unavailable.</p>}
      </div>
    </section>
    <VisualizerModal open={playerOpen} onClose={closePlayer}/>
    <footer className="launch-footer"><span>STINKWATER · HAMMANSKRAAL · JUPITER</span><button className="launch-video-toggle" onClick={toggleVideo} aria-pressed={playing}>{playing ? 'PAUSE FILM' : 'PLAY FILM'}</button><a href="/privacy">PRIVACY</a></footer>
  </main>;
}
