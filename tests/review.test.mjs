import test from 'node:test';
import assert from 'node:assert/strict';
import { checkProjectReadiness } from '../lib/review/checks.ts';
import { isReviewHost, parsePanel } from '../lib/site/navigation.ts';

const env={SUPABASE_URL:'https://project.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test',CONTACT_OPERATOR_NAME:'Test operator',CONTACT_SUPPORT_EMAIL:'test@example.com',CONTACT_PRIVACY_APPROVED:'true',CONTACT_FORMS_ENABLED:'true'};
const paths=Object.fromEntries(['/mailing_list_signups','/booking_enquiries','/contact_rate_limits','/rpc/submit_site_contact'].map(path=>[path,{}]));

test('review checks fail closed without configuration and make no network request',async()=>{
  let calls=0;
  const report=await checkProjectReadiness({},async()=>{calls++;throw new Error('Not expected')});
  assert.equal(calls,0);assert.equal(report.connection.status,'pending');assert.equal(report.forms.status,'pending');assert.ok(report.missing.includes('SUPABASE_SECRET_KEY'));
});

test('readiness probe reads only API schema, reports capabilities, and never returns credentials or records',async()=>{
  const calls=[];
  const report=await checkProjectReadiness(env,async(url,init)=>{calls.push({url:String(url),init});return Response.json({paths,customer_data:'must-not-be-returned'});});
  assert.equal(calls.length,2);
  for(const call of calls){assert.equal(call.url,'https://project.supabase.co/rest/v1/');assert.equal(call.init.method,undefined);assert.equal(call.init.redirect,'error');assert.equal(call.init.cache,'no-store');}
  assert.equal(report.connection.status,'ready');assert.equal(report.schema.status,'ready');assert.equal(report.forms.status,'ready');assert.equal(report.checkout.status,'pending');assert.equal(report.email.status,'pending');
  const output=JSON.stringify(report);for(const sensitive of ['sb_publishable_test','sb_secret_test','must-not-be-returned'])assert.equal(output.includes(sensitive),false);
});

test('legacy server keys send the JWT role and missing schema never becomes form-ready',async()=>{
  const calls=[];
  const report=await checkProjectReadiness({...env,SUPABASE_SECRET_KEY:'eyJ.legacy.service-role'},async(url,init)=>{calls.push(init);return Response.json({paths:{}})});
  assert.equal(calls[1].headers.Authorization,'Bearer eyJ.legacy.service-role');assert.equal(report.schema.status,'pending');assert.equal(report.forms.status,'pending');
});

test('connection and privacy failures report actionable states without raw provider errors',async()=>{
  const denied=await checkProjectReadiness(env,async()=>new Response('private provider detail',{status:401}));assert.equal(denied.connection.status,'unavailable');assert.equal(JSON.stringify(denied).includes('private provider detail'),false);
  const incomplete=await checkProjectReadiness({...env,CONTACT_PRIVACY_APPROVED:'false'},async()=>Response.json({paths}));assert.equal(incomplete.forms.status,'pending');assert.ok(incomplete.missing.includes('CONTACT_PRIVACY_APPROVED'));
  const invalid=await checkProjectReadiness({...env,SUPABASE_URL:'http://untrusted.example'},async()=>{throw new Error('must not fetch')});assert.equal(invalid.connection.status,'unavailable');
});

test('review host and deep-link parsing reject public domains and unexpected inputs',()=>{
  assert.equal(isReviewHost('cjaymnandi.vercel.app'),true);assert.equal(isReviewHost('cjaymnandi-git-development-team.vercel.app'),true);assert.equal(isReviewHost('127.0.0.1:3000'),true);assert.equal(isReviewHost('www.cjaymnandi.co.za'),false);assert.equal(isReviewHost('cjaymnandi.vercel.app.evil.example'),false);
  assert.equal(parsePanel('bookings'),'bookings');assert.equal(parsePanel('support'),'support');assert.equal(parsePanel(['store','support']),null);assert.equal(parsePanel('unexpected'),null);
});
