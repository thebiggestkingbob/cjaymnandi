export type PlaybackUpdate={position?:number;duration?:number;isPaused?:boolean;isBuffering?:boolean};
export type Progress={armed:boolean;played:boolean;lastPosition:number;handled:boolean};
export const newProgress=():Progress=>({armed:false,played:false,lastPosition:0,handled:false});
export function observeCompletion(progress:Progress,event:PlaybackUpdate,manualPause:boolean){
  const position=event.position,duration=event.duration;
  if(progress.handled||manualPause||!Number.isFinite(position)||!Number.isFinite(duration)||duration!<1000||position!<0)return false;
  const nearEnd=position!>=duration!-250;
  if(position!<duration!-1000)progress.armed=true;
  if(event.isPaused===false&&position!>0)progress.played=true;
  const ended=progress.armed&&progress.played&&event.isPaused===true&&!event.isBuffering&&(nearEnd||(position===0&&progress.lastPosition>=duration!-250));
  progress.lastPosition=position!;
  if(ended)progress.handled=true;
  return ended;
}
export const queueIndex=(index:number,length:number)=>length?((index%length)+length)%length:0;
export function cleanMusicTitle(value:string){return value.replace(/[\p{Extended_Pictographic}\p{Regional_Indicator}\uFE0F\u200D]/gu,'').replace(/\s+/g,' ').trim().slice(0,200);}
export function spotifyImage(value:unknown){
  if(typeof value!=='string')return undefined;
  try{const url=new URL(value);if(url.protocol==='https:'&&!url.username&&!url.password&&(url.hostname.endsWith('.scdn.co')||url.hostname.endsWith('.spotifycdn.com')))return url.href;}catch{}
}
