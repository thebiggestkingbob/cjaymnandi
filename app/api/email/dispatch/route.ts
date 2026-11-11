import { timingSafeEqual } from 'node:crypto';
import { dispatchEmails } from '../../../../lib/email/worker';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(request:Request){
 const expected=process.env.CRON_SECRET,actual=request.headers.get('authorization')||'';
 if(!expected||Buffer.byteLength(actual)!==Buffer.byteLength(`Bearer ${expected}`)||!timingSafeEqual(Buffer.from(actual),Buffer.from(`Bearer ${expected}`)))return new Response(null,{status:401});
 try{return Response.json(await dispatchEmails(),{headers:{'Cache-Control':'no-store'}})}catch{console.error('contact_email_worker',{code:'dispatch_failed'});return Response.json({error:'dispatch_failed'},{status:503})}
}
