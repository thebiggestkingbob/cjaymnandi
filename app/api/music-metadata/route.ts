import {releases} from '../../../lib/music/catalog';
import {cleanMusicTitle,spotifyImage} from '../../../lib/music/playback';
export async function GET(request:Request){
  const id=new URL(request.url).searchParams.get('id');
  const release=releases.find(item=>item.id===id);
  if(!release)return Response.json({message:'Unknown release.'},{status:404});
  try{
    const uri=`https://open.spotify.com/${release.kind}/${release.id}`;
    const response=await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(uri)}`,{next:{revalidate:86400},redirect:'error',signal:AbortSignal.timeout(5000)});
    if(!response.ok)throw new Error('Metadata unavailable');
    const data=await response.json();
    if(typeof data.title!=='string')throw new Error('Invalid metadata');
    return Response.json({id:release.id,title:cleanMusicTitle(data.title),image:spotifyImage(data.thumbnail_url)},{headers:{'Cache-Control':'public, max-age=3600, s-maxage=86400'}});
  }catch{return Response.json({id:release.id,message:'Release details are temporarily unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
