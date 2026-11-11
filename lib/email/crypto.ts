import { createHash, randomBytes, createCipheriv, createDecipheriv, createHmac, timingSafeEqual } from 'node:crypto';
export function newToken(){return randomBytes(32).toString('base64url')}
export function tokenHash(token:string){return createHash('sha256').update(token).digest('hex')}
export function validToken(token:unknown):token is string{return typeof token==='string'&&/^[A-Za-z0-9_-]{43}$/.test(token)}
function encryptionKey(secret:string){if(secret.length<32)throw new Error('EMAIL_TOKEN_SECRET must have at least 32 characters');return createHash('sha256').update(`outbox-v1:${secret}`).digest()}
export function seal(value:unknown,secret:string){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',encryptionKey(secret),iv);const body=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return [iv,cipher.getAuthTag(),body].map(b=>b.toString('base64url')).join('.')}
export function unseal<T>(value:string,secret:string):T{const [iv,tag,body]=value.split('.').map(x=>Buffer.from(x,'base64url'));const decipher=createDecipheriv('aes-256-gcm',encryptionKey(secret),iv);decipher.setAuthTag(tag);return JSON.parse(Buffer.concat([decipher.update(body),decipher.final()]).toString('utf8'))}
export function verifyWebhook(body:string,headers:Headers,secret:string,now=Date.now()){
  const id=headers.get('svix-id'),timestamp=headers.get('svix-timestamp'),signatures=headers.get('svix-signature');
  if(!id||!timestamp||!/^\d+$/.test(timestamp)||!signatures||Math.abs(now/1000-Number(timestamp))>300)return false;
  try{const expected=createHmac('sha256',Buffer.from(secret.replace(/^whsec_/,''),'base64')).update(`${id}.${timestamp}.${body}`).digest();return signatures.split(' ').some(item=>{const [version,sig]=item.split(',');if(version!=='v1'||!sig)return false;const actual=Buffer.from(sig,'base64');return actual.length===expected.length&&timingSafeEqual(actual,expected)})}catch{return false}
}
