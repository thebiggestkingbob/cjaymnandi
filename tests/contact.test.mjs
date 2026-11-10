import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { validateContact } from '../lib/contact/validation.ts';

test('contact validation requires explicit consent and rejects invalid/past dates', () => {
  assert.equal(validateContact({kind:'mailing', email:'fan@example.com', consent:false}).ok, false);
  assert.equal(validateContact({kind:'mailing', email:'bad', consent:true}).ok, false);
  assert.equal(validateContact({kind:'mailing', email:' FAN@EXAMPLE.COM ', consent:true}).payload.email, 'fan@example.com');
  const booking = {kind:'booking', name:'Test', email:'fan@example.com', message:'A show'};
  assert.equal(validateContact({...booking,event_date:'2027-02-30'}, '2026-11-10').ok, false);
  assert.equal(validateContact({...booking,event_date:'2020-01-01'}, '2026-11-10').ok, false);
  assert.equal(validateContact({...booking,event_date:''}, '2026-11-10').ok, true);
  assert.equal(validateContact({...booking, message:'x'.repeat(5001)}).ok, false);
  assert.equal(validateContact({...booking, website:'spam'}).honeypot, true);
});

test('database stores contacts privately, deduplicates signups, and enforces an atomic shared rate limit', async () => {
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    for (const file of ['202611100001_contacts.sql', '202611100002_contact_submission.sql']) {
      await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
    }
    const enabled = await db.query("select relname, relrowsecurity from pg_class where relname in ('mailing_list_signups','booking_enquiries','contact_rate_limits')");
    assert.equal(enabled.rows.length,3); assert.ok(enabled.rows.every(row => row.relrowsecurity));
    for (const role of ['anon','authenticated']) {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query('select * from public.mailing_list_signups'), /permission denied/);
      await assert.rejects(db.query("insert into public.booking_enquiries(name,email,message) values ('Test','test@example.com','test')"), /permission denied/);
      await assert.rejects(db.query("select public.submit_site_contact('mailing', '{\"email\":\"test@example.com\",\"consent\":true}', $1)", ['a'.repeat(64)]), /permission denied/);
      await db.exec('reset role');
    }
    await db.exec('set role service_role');
    const submit = (kind, payload, hash='a'.repeat(64)) => db.query('select public.submit_site_contact($1,$2,$3)',[kind,JSON.stringify(payload),hash]);
    await submit('mailing',{email:'fan@example.com',consent:true});
    await submit('mailing',{email:'FAN@EXAMPLE.COM',consent:true});
    assert.equal((await db.query('select * from public.mailing_list_signups')).rows.length,1);
    await assert.rejects(submit('mailing',{email:'no-consent@example.com',consent:false}), /consent_required/);
    // Rejected inserts roll back their reserved slot.
    assert.equal((await db.query('select attempts from public.contact_rate_limits')).rows[0].attempts,2);
    await submit('booking',{name:'Test',email:'test@example.com',message:'A test event'});
    await submit('mailing',{email:'other@example.com',consent:true});
    await submit('mailing',{email:'third@example.com',consent:true});
    await assert.rejects(submit('booking',{name:'Test',email:'test@example.com',message:'Over limit'}), /contact_rate_limit/);
    assert.equal((await db.query('select count(*)::int as total from public.booking_enquiries')).rows[0].total,1);
    assert.equal((await db.query('select attempts from public.contact_rate_limits')).rows[0].attempts,5);
    await assert.rejects(submit('other',{},'b'.repeat(64)), /invalid_contact_kind/);
  } finally { await db.close(); }
});
