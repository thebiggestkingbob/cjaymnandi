import { officialEmail } from './settings.ts';
import type { EmailMessage } from './messages.ts';
export class DeliveryError extends Error{code:string;retryable:boolean;constructor(code:string,retryable:boolean){super(code);this.code=code;this.retryable=retryable}}
export async function sendTransactional(message:EmailMessage,idempotencyKey:string,key:string,fetcher:typeof fetch=fetch){
  let response:Response;
  try{response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':idempotencyKey},body:JSON.stringify({from:`C.JayMnandi <${officialEmail}>`,to:[message.to],reply_to:message.reply_to,subject:message.subject,text:message.text,...(message.headers?{headers:message.headers}:{})}),redirect:'error',signal:AbortSignal.timeout(10000)})}catch{throw new DeliveryError('provider_unreachable',true)}
  if(!response.ok)throw new DeliveryError(`provider_http_${response.status}`,response.status===429||response.status>=500);
  let data;try{data=await response.json()}catch{throw new DeliveryError('provider_invalid_response',true)}if(!data||typeof data.id!=='string')throw new DeliveryError('provider_invalid_response',true);
  return data.id as string; // Provider acceptance is not inbox delivery.
}
