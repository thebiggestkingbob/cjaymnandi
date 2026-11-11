import { validToken,tokenHash } from '../../../../lib/email/crypto';
import { canonicalSite } from '../../../../lib/email/settings';
import { privateDatabase } from '../../../../lib/email/worker';
export const runtime='nodejs';
export async function POST(request:Request,{params}:{params:Promise<{action:string}>}){
 const {action}=await params;if(action!=='confirm'&&action!=='unsubscribe')return new Response(null,{status:404});
 let token:unknown;
 try{
  // RFC 8058 one-click POST is capability-authenticated; GET never changes consent.
  token=action==='unsubscribe'?new URL(request.url).searchParams.get('token'):null;
  if(!token){const origin=new URL(request.headers.get('origin')||'');if(origin.host!==request.headers.get('host')||origin.protocol!==new URL(request.url).protocol)return new Response(null,{status:403});
   const reader=request.body?.getReader();if(!reader)return new Response(null,{status:400});const chunks:Uint8Array[]=[];let size=0;for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>2048){await reader.cancel();return new Response(null,{status:413})}chunks.push(part.value)}token=JSON.parse(Buffer.concat(chunks).toString('utf8')).token;
  }
 }catch{return Response.json({message:'This link is invalid.'},{status:400})}
 if(!validToken(token))return Response.json({message:'This link is invalid.'},{status:400});
 try{const {data,error}=await privateDatabase().rpc(action==='confirm'?'confirm_contact_subscription':'unsubscribe_contact',{p_hash:tokenHash(token)});
  if(error)throw new Error();
  if(action==='confirm'&&!data)return Response.json({message:'This confirmation link is expired or no longer active. Please contact hello@cjaymnandi.co.za.'},{status:400});
  return Response.json({message:action==='confirm'?'Your email is confirmed. You can now receive release updates.':'Your unsubscribe request is complete. This does not affect booking enquiries.'},{headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
 }catch{console.error('contact_subscription',{code:'update_failed'});return Response.json({message:'We could not update your preference. Please try again or email hello@cjaymnandi.co.za.'},{status:503})}
}

export async function GET(request:Request,{params}:{params:Promise<{action:string}>}){
 const {action}=await params,token=new URL(request.url).searchParams.get('token');
 if(action!=='unsubscribe'||!validToken(token))return new Response(null,{status:400});
 return new Response(null,{status:303,headers:{Location:`${canonicalSite}/unsubscribe#token=${token}`,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
}
