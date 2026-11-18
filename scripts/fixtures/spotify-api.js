// Browser fixture only: lifecycle and queue semantics, never real Spotify delivery.
(()=>{
  let allow=window.__allowTestAutoplay!==false;
  window.addEventListener('pointerdown',()=>{allow=true;},{capture:true});
  window.onSpotifyIframeApiReady?.({createController(host,options,ready){
    const iframe=document.createElement('iframe');iframe.title='Spotify music player';iframe.height='152';host.replaceChildren(iframe);
    const handlers={},state={isPaused:true,position:0,duration:180000,uri:options.uri};
    window.__musicControllers=(window.__musicControllers||0)+1;
    const frameSource=()=>{const [,kind,id]=state.uri.split(':');iframe.src=`https://open.spotify.com/embed/${kind}/${id}?theme=0`;};frameSource();
    const emit=()=>handlers.playback_update?.({data:{...state}});
    const controller={
      play(){window.__musicPlayAttempts=(window.__musicPlayAttempts||0)+1;if(allow){state.isPaused=false;emit();}},
      pause(){state.isPaused=true;emit();},
      loadUri(uri){(window.__musicLoads||=[]).push({oldUri:state.uri,oldPaused:state.isPaused,uri});state.uri=uri;state.position=0;state.isPaused=true;frameSource();emit();},
      addListener(name,cb){handlers[name]=cb;},destroy(){clearInterval(timer);iframe.remove();window.__musicControllers--;}
    };
    const timer=setInterval(()=>{if(!state.isPaused){state.position+=1000;emit();}},1000);
    window.__musicState=state;window.__emitMusicUpdate=data=>handlers.playback_update?.({data});
    window.__finishMusic=()=>{state.position=state.duration;state.isPaused=true;emit();};
    ready(controller);handlers.ready?.({});
  }});
})();
