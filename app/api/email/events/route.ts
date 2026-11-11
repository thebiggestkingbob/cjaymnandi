import { verifyWebhook } from '../../../../lib/email/crypto';
import { privateDatabase } from '../../../../lib/email/worker';
export const runtime='nodejs';
export async function POST(request:Request){
 const secret=process.env.RESEND_WEBHOOK_SECRET;if(!secret)return new Response(null,{status:503});
 const reader=request.body?.getReader();if(!reader)return new Response(null,{status:400});
 const chunks:Uint8Array[]=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536){await reader.cancel();return new Response(null,{status:413})}chunks.push(value)}
 const body=Buffer.concat(chunks).toString('utf8');
 if(!verifyWebhook(body,request.headers,secret))return new Response(null,{status:401});
 try{const event=JSON.parse(body),eventId=request.headers.get('svix-id')!;
  if(typeof event.type!=='string'||typeof event.data?.email_id!=='string'||eventId.length>200)return new Response(null,{status:400});
  if(!['email.delivered','email.bounced','email.complained','email.failed','email.suppressed'].includes(event.type))return Response.json({received:true});
  const {error}=await privateDatabase().rpc('record_contact_email_event',{p_event_id:eventId,p_provider_id:event.data.email_id,p_type:event.type});
  if(error){console.error('contact_email_event',{code:'persist_failed'});return new Response(null,{status:503})}
  return Response.json({received:true},{headers:{'Cache-Control':'no-store'}});
 }catch{console.error('contact_email_event',{code:'event_failed'});return new Response(null,{status:503})}
}
