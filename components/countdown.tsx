'use client';
import { useEffect, useState } from 'react';
import { launchAt, launchHosts, launchLabel, remainingTime } from '../lib/launch/schedule';

export default function Countdown({serverNow}: {serverNow: number}) {
  const [time, setTime] = useState<ReturnType<typeof remainingTime> | null>(null);
  useEffect(() => {
    const started = performance.now();
    const tick = () => {
      const next = remainingTime(serverNow + performance.now() - started); setTime(next);
      if (next.total === 0 && launchHosts.includes(window.location.hostname)) window.location.replace('/');
    };
    tick(); const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [serverNow]);
  const units = [['days', time?.days], ['hours', time?.hours], ['minutes', time?.minutes], ['seconds', time?.seconds]] as const;
  return <main className="launch-page">
    <div className="launch-art" aria-hidden="true"/>
    <header className="launch-header"><span>C.JayMnandi</span><span>JUPITER VIBEZ</span></header>
    <section className="launch-content" aria-labelledby="launch-title">
      <p className="launch-kicker">THE WORLD OPENS ON FRIDAY THE 13TH</p>
      <h1 id="launch-title">LAX!</h1>
      <p className="launch-subtitle">A world of his own. Almost yours.</p>
      <time className="launch-date" dateTime={launchAt}>{launchLabel}</time>
      {time?.total === 0 ? <p className="launch-arrived">The time has arrived.</p> : <div className="launch-clock" role="timer" aria-live="off" aria-label="Time until the LAX! experience opens">
        {units.map(([label, value]) => <div key={label} className="launch-time-unit">
          <span className="launch-digit">{(value === undefined ? '––' : String(value).padStart(2, '0')).split('').map((digit, index) =>
            <span className="launch-digit-place" key={index}><span className="launch-digit-glyph" key={digit}>{digit}</span></span>
          )}</span><span className="launch-unit">{label}</span>
        </div>)}
      </div>}
      <p className="launch-invitation">Until then, stay in the orbit.</p>
      <a className="launch-link" href="https://open.spotify.com/artist/5vvHnvQWm6Wlgq07j79vni" target="_blank" rel="noreferrer">LISTEN TO C.JayMnandi</a>
    </section>
    <footer className="launch-footer"><span>STINKWATER · HAMMANSKRAAL · JUPITER</span><a href="/privacy">PRIVACY</a></footer>
  </main>;
}
