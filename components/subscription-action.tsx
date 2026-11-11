'use client';
import { useEffect,useState } from 'react';
export default function SubscriptionAction({action}:{action:'confirm'|'unsubscribe'}){
 const [token,setToken]=useState(''),[pending,setPending]=useState(false),[done,setDone]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{
  const capture=()=>{const url=new URL(window.location.href),next=new URLSearchParams(url.hash.slice(1)).get('token')||url.searchParams.get('token');if(next){setToken(next);setDone(false);setMessage('');}if(url.hash||url.searchParams.has('token')){url.hash='';url.searchParams.delete('token');window.history.replaceState(null,'',url.pathname+url.search)}};
  capture();window.addEventListener('hashchange',capture);return()=>window.removeEventListener('hashchange',capture);
 },[]);
 async function submit(){setPending(true);try{const response=await fetch(`/api/subscription/${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token}),signal:AbortSignal.timeout(15000)});const data=await response.json();setMessage(data.message||'Please try again.');if(response.ok){setDone(true);setToken('')}}catch{setMessage('The request could not be confirmed. Please try again or contact hello@cjaymnandi.co.za.')}finally{setPending(false)}}
 return <main className="privacy-page"><a href="/">C.JayMnandi / LAX!</a><h1>{action==='confirm'?'Confirm updates.':'Unsubscribe.'}</h1><p>{action==='confirm'?'Confirm that you want music and release updates from C.JayMnandi.':'Stop marketing updates. This does not cancel or change any booking enquiry.'}</p>{!done&&<button className="lax-outline" disabled={!token||pending} onClick={submit}>{pending?'UPDATING…':action==='confirm'?'CONFIRM MY EMAIL':'UNSUBSCRIBE'}</button>}<p role="status">{message}</p>{!token&&!done&&<p>Open the link from your email, or contact <a href="mailto:hello@cjaymnandi.co.za">hello@cjaymnandi.co.za</a> for help.</p>}</main>;
}
