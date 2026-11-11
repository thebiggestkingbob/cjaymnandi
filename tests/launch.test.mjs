import test from 'node:test';
import assert from 'node:assert/strict';
import { launchAt, remainingTime, shouldShowCountdown } from '../lib/launch/schedule.ts';

test('launch is Wednesday 18 November at midnight South African time', () => {
  assert.equal(new Date(launchAt).toISOString(), '2026-11-17T22:00:00.000Z');
  assert.equal(new Intl.DateTimeFormat('en',{weekday:'long',timeZone:'Africa/Johannesburg'}).format(new Date(launchAt)), 'Wednesday');
  assert.deepEqual(remainingTime(Date.parse(launchAt)-90061000), {total:90061,days:1,hours:1,minutes:1,seconds:1});
  assert.equal(remainingTime(Date.parse(launchAt)).total,0);
  assert.equal(remainingTime(Date.parse(launchAt)+5000).total,0);
});

test('only custom domains are gated before launch, never the Vercel review hostname', () => {
  const before = Date.parse(launchAt)-1;
  assert.equal(shouldShowCountdown('cjaymnandi.co.za',before),true);
  assert.equal(shouldShowCountdown('www.cjaymnandi.co.za',before),true);
  assert.equal(shouldShowCountdown('CJAYMNANDI.CO.ZA:443',before),true);
  assert.equal(shouldShowCountdown('cjaymnandi.vercel.app',before),false);
  assert.equal(shouldShowCountdown('localhost:3000',before),false);
  assert.equal(shouldShowCountdown('cjaymnandi.co.za.evil.example',before),false);
  assert.equal(shouldShowCountdown('cjaymnandi.co.za',Date.parse(launchAt)),false);
});
