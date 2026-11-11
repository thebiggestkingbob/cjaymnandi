const socials = [
  {name:'Instagram',href:'https://www.instagram.com/c.jaymnandi/'},
  {name:'X',href:'https://x.com/C_JayMnandi'},
  {name:'TikTok',href:'https://www.tiktok.com/@c_jaymnandi/'},
] as const;
function Icon({name}:{name:typeof socials[number]['name']}) {
  if(name==='Instagram') return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.7"/><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>;
  if(name==='X') return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.9 2h3.3L15 10.3 23.5 22h-6.7l-5.2-7.1L5.4 22H2l7.8-8.9L1.5 2h6.9l4.7 6.5L18.9 2Zm-1.2 18h1.8L7.4 3.9h-2L17.7 20Z"/></svg>;
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.7 2h-3.2v13.4a3 3 0 1 1-2.6-3V9.1a6.3 6.3 0 1 0 5.8 6.3V8.7a8 8 0 0 0 4.6 1.4V6.9A4.7 4.7 0 0 1 16.7 2Z"/></svg>;
}
export default function SocialLinks(){return <nav className="launch-socials" aria-label="C.JayMnandi social profiles">{socials.map(s=><a key={s.name} href={s.href} target="_blank" rel="noreferrer" aria-label={`${s.name} (opens in a new tab)`}><Icon name={s.name}/><span className="social-tooltip" aria-hidden="true">{s.name}</span></a>)}</nav>}
