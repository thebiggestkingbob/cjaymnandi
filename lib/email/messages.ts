import { randomUUID } from 'node:crypto';
import { officialEmail, canonicalSite, consentVersion } from './settings.ts';
import { seal, newToken, tokenHash } from './crypto.ts';
import type { ContactPayload, ContactKind } from '../contact/validation';
export type EmailMessage={to:string;subject:string;text:string;reply_to:string;headers?:Record<string,string>};
export type EmailJob={id:string;kind:string;recipient:string;payload:string};
export function prepareMessages(kind:ContactKind,payload:ContactPayload,requestId:string,secret:string){
  const confirmation=newToken(),unsubscribe=newToken(),jobs:EmailJob[]=[];
  const add=(jobKind:string,message:EmailMessage)=>jobs.push({id:randomUUID(),kind:jobKind,recipient:message.to,payload:seal(message,secret)});
  if(kind==='mailing'||payload.consent===true){
    add('mailing_confirmation',{to:payload.email,reply_to:officialEmail,subject:'Confirm your C.JayMnandi release updates',text:`You asked to receive music and release updates from C.JayMnandi. Confirm your email using the button on this page:\n\n${canonicalSite}/confirm#token=${confirmation}\n\nThis link expires in 24 hours. No marketing updates will be sent unless you confirm. If you did not request this, ignore the message or unsubscribe here:\n${canonicalSite}/unsubscribe#token=${unsubscribe}\n\nQuestions: ${officialEmail}`,headers:{'List-Unsubscribe':`<${canonicalSite}/api/subscription/unsubscribe?token=${unsubscribe}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}});
  }
  if(kind==='booking'){
    add('booking_owner',{to:officialEmail,reply_to:payload.email,subject:`New C.JayMnandi booking enquiry · ${requestId}`,text:`Reference: ${requestId}\nName: ${payload.name}\nEmail: ${payload.email}\nDate: ${payload.event_date||'Not supplied'}\nLocation: ${payload.location||'Not supplied'}\n\n${payload.message}\n\nMarketing consent is separate from this enquiry.`});
    add('booking_receipt',{to:payload.email,reply_to:officialEmail,subject:'We received your C.JayMnandi booking enquiry',text:`Thank you for your enquiry. Your reference is ${requestId}.\n\nThis is a receipt, not a confirmed booking. For follow-up, contact ${officialEmail} and include your reference. You have not been added to a marketing list unless you separately opted in and confirmed your email.`});
  }
  return {jobs,confirmationHash:tokenHash(confirmation),unsubscribeHash:tokenHash(unsubscribe),consentVersion};
}
