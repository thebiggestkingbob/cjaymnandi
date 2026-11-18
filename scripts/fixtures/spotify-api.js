// Browser fixture only. It verifies application lifecycle, not real Spotify delivery.
(()=>{
  let allow=window.__allowTestAutoplay!==false;
  window.addEventListener('pointerdown',()=>{allow=true;},{capture:true});
  window.onSpotifyIframeApiReady?.({createController(host,options,ready){
    const iframe=document.createElement('iframe');iframe.title='Play LAX! on Spotify';iframe.src='https://open.spotify.com/embed/track/2JYLBbngIOycsumS0b9TCA?theme=0';iframe.height='152';host.replaceChildren(iframe);
    const handlers={},state={isPaused:true,position:0};
    const emit=()=>handlers.playback_update?.({data:{...state}});
    const controller={play(){window.__musicPlayAttempts=(window.__musicPlayAttempts||0)+1;if(allow){state.isPaused=false;emit();}},pause(){state.isPaused=true;emit();},addListener(name,cb){handlers[name]=cb;},destroy(){clearInterval(timer);iframe.remove();}};
    const timer=setInterval(()=>{if(!state.isPaused){state.position+=1000;emit();}},1000);
    window.__musicState=state;ready(controller);handlers.ready?.({});
  }});
})();
