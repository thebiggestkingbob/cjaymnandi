begin;
alter table public.mailing_list_signups drop constraint if exists mailing_list_signups_consent_check;
alter table public.mailing_list_signups add column status text not null default 'pending' check(status in ('pending','confirmed','unsubscribed','suppressed'));
alter table public.mailing_list_signups add column confirmation_hash text unique;
alter table public.mailing_list_signups add column unsubscribe_hash text unique;
alter table public.mailing_list_signups add column confirmation_expires_at timestamptz;
alter table public.mailing_list_signups add column confirmation_issued_at timestamptz;
alter table public.mailing_list_signups add column confirmed_at timestamptz;
alter table public.mailing_list_signups add column unsubscribed_at timestamptz;
alter table public.booking_enquiries add column request_id uuid unique;
alter table public.booking_enquiries add column marketing_consent boolean not null default false;

create table public.contact_requests(id uuid primary key,fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$'),kind text not null check(kind in ('mailing','booking')),created_at timestamptz not null default now());
alter table public.booking_enquiries add constraint booking_contact_request_fk foreign key(request_id) references public.contact_requests(id);
create table public.contact_email_outbox(
 id uuid primary key, request_id uuid not null references public.contact_requests(id),
 subscriber_id uuid references public.mailing_list_signups(id),kind text not null check(kind in ('mailing_confirmation','booking_owner','booking_receipt')),
 recipient text not null,payload text not null check(payload ~ '^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'),
 status text not null default 'pending' check(status in ('pending','sending','accepted','delivered','failed','bounced','cancelled')),
 attempts integer not null default 0,available_at timestamptz not null default now(),lease_until timestamptz,lease_token uuid,
 provider_id text unique,last_error text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index contact_email_pending on public.contact_email_outbox(status,available_at);
create table public.contact_unsubscribe_tokens(hash text primary key check(hash ~ '^[a-f0-9]{64}$'),subscriber_id uuid not null references public.mailing_list_signups(id),created_at timestamptz not null default now());
create table public.contact_email_events(id text primary key,provider_id text not null,event_type text not null,received_at timestamptz not null default now());
alter table public.contact_requests enable row level security;
alter table public.contact_email_outbox enable row level security;
alter table public.contact_unsubscribe_tokens enable row level security;
alter table public.contact_email_events enable row level security;
revoke all on public.contact_requests,public.contact_email_outbox,public.contact_email_events,public.contact_unsubscribe_tokens from anon,authenticated;
grant select,insert,update,delete on public.contact_requests,public.contact_email_outbox,public.contact_email_events,public.contact_unsubscribe_tokens to service_role;

create function public.submit_site_contact_v2(p_kind text,p_payload jsonb,p_client_hash text,p_email_hash text,p_request_id uuid,p_fingerprint text,p_confirmation_hash text,p_unsubscribe_hash text,p_jobs jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 slot timestamptz:=pg_catalog.to_timestamp(pg_catalog.floor(extract(epoch from pg_catalog.now())/600)*600);
 previous text; h text; used integer; subscriber uuid; current_status text; issued timestamptz; job jsonb; send_confirmation boolean:=false;
begin
 if p_kind is null or p_kind not in ('mailing','booking') or p_client_hash!~'^[a-f0-9]{64}$' or p_email_hash!~'^[a-f0-9]{64}$' or p_client_hash is null or p_email_hash is null then raise exception 'invalid_contact' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,1));
 select fingerprint into previous from public.contact_requests where id=p_request_id;
 if found then
  if previous<>p_fingerprint then raise exception 'request_conflict' using errcode='22023'; end if;
  return jsonb_build_object('id',p_request_id,'saved',true);
 end if;
 -- Stable lock ordering prevents deadlocks between shared IP/email rate buckets.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(least(p_client_hash,p_email_hash),0));
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(greatest(p_client_hash,p_email_hash),0));
 delete from public.contact_rate_limits where window_start<now()-interval '1 day';
 foreach h in array array[p_client_hash,p_email_hash] loop
  select attempts into used from public.contact_rate_limits where client_hash=h and window_start=slot;
  if coalesce(used,0)>=5 then raise exception 'contact_rate_limit' using errcode='P0001'; end if;
  insert into public.contact_rate_limits(client_hash,window_start,attempts) values(h,slot,1)
   on conflict(client_hash,window_start) do update set attempts=public.contact_rate_limits.attempts+1;
 end loop;
 if p_kind='mailing' and (p_payload->>'consent') is distinct from 'true' then raise exception 'consent_required' using errcode='22023'; end if;
 insert into public.contact_requests(id,fingerprint,kind) values(p_request_id,p_fingerprint,p_kind);
 if p_kind='booking' then
  insert into public.booking_enquiries(name,email,event_date,location,message,marketing_consent,request_id)
   values(p_payload->>'name',lower(p_payload->>'email'),nullif(p_payload->>'event_date','')::date,nullif(p_payload->>'location',''),p_payload->>'message',coalesce((p_payload->>'consent')::boolean,false),p_request_id);
 end if;
 if p_kind='mailing' or (p_payload->>'consent')='true' then
  -- Email lock serialises independent requests for the same mailbox.
  insert into public.mailing_list_signups(email,consent,consent_version) values(lower(p_payload->>'email'),true,'lax-marketing-v2') on conflict do nothing;
  select id,status,confirmation_issued_at into subscriber,current_status,issued from public.mailing_list_signups where lower(email)=lower(p_payload->>'email') for update;
  if current_status='pending' and (issued is null or issued<now()-interval '1 hour') then
   if p_confirmation_hash is null or p_unsubscribe_hash is null or p_confirmation_hash!~'^[a-f0-9]{64}$' or p_unsubscribe_hash!~'^[a-f0-9]{64}$' then raise exception 'invalid_token' using errcode='22023'; end if;
   update public.contact_email_outbox set status='cancelled',updated_at=now() where subscriber_id=subscriber and kind='mailing_confirmation' and status in ('pending','sending');
   insert into public.contact_unsubscribe_tokens(hash,subscriber_id) values(p_unsubscribe_hash,subscriber) on conflict do nothing;
   update public.mailing_list_signups set confirmation_hash=p_confirmation_hash,unsubscribe_hash=p_unsubscribe_hash,confirmation_expires_at=now()+interval '24 hours',confirmation_issued_at=now(),consent_version='lax-marketing-v2' where id=subscriber;
   send_confirmation:=true;
  end if;
 end if;
 if send_confirmation and (select count(*) from jsonb_array_elements(p_jobs) j where j->>'kind'='mailing_confirmation')<>1 then raise exception 'confirmation_job_required' using errcode='22023'; end if;
 if p_kind='booking' and ((select count(*) from jsonb_array_elements(p_jobs) j where j->>'kind'='booking_owner')<>1 or (select count(*) from jsonb_array_elements(p_jobs) j where j->>'kind'='booking_receipt')<>1) then raise exception 'booking_jobs_required' using errcode='22023'; end if;
 for job in select value from jsonb_array_elements(p_jobs) loop
  if (job->>'kind')='mailing_confirmation' and not send_confirmation then continue; end if;
  if (job->>'kind') in ('booking_owner','booking_receipt') and p_kind<>'booking' then raise exception 'invalid_email_job' using errcode='22023'; end if;
  if (job->>'kind')='booking_owner' then
   if job->>'recipient'<>'hello@cjaymnandi.co.za' then raise exception 'invalid_recipient' using errcode='22023'; end if;
  elsif lower(job->>'recipient')<>lower(p_payload->>'email') then raise exception 'invalid_recipient' using errcode='22023'; end if;
  insert into public.contact_email_outbox(id,request_id,subscriber_id,kind,recipient,payload)
   values((job->>'id')::uuid,p_request_id,case when job->>'kind'='mailing_confirmation' then subscriber else null end,job->>'kind',job->>'recipient',job->>'payload');
 end loop;
 return jsonb_build_object('id',p_request_id,'saved',true);
end $$;

create function public.confirm_contact_subscription(p_hash text) returns boolean language plpgsql security invoker set search_path='' as $$
declare found_id uuid;
begin
 update public.mailing_list_signups set status='confirmed',confirmed_at=coalesce(confirmed_at,now())
 where confirmation_hash=p_hash and status in ('pending','confirmed') and confirmation_expires_at>now() returning id into found_id;
 return found_id is not null;
end $$;
create function public.unsubscribe_contact(p_hash text) returns void language plpgsql security invoker set search_path='' as $$
declare found_id uuid;
begin
 update public.mailing_list_signups set status='unsubscribed',consent=false,unsubscribed_at=coalesce(unsubscribed_at,now()) where unsubscribe_hash=p_hash or id in(select subscriber_id from public.contact_unsubscribe_tokens where hash=p_hash) returning id into found_id;
 update public.contact_email_outbox set status='cancelled',updated_at=now() where subscriber_id=found_id and kind='mailing_confirmation' and status in ('pending','sending');
end $$;

create function public.claim_contact_emails(p_limit integer default 3) returns setof public.contact_email_outbox language plpgsql security invoker set search_path='' as $$
begin
 update public.contact_email_outbox o set status='cancelled',updated_at=now() from public.mailing_list_signups s where o.subscriber_id=s.id and o.kind='mailing_confirmation' and o.status in ('pending','sending') and s.status<>'pending';
 update public.contact_email_outbox set status='failed',last_error='retry_window_expired',updated_at=now() where (status='pending' or (status='sending' and lease_until<now())) and (attempts>=6 or created_at<now()-interval '20 hours');
 return query
 with candidates as (select id from public.contact_email_outbox where ((status='pending' and available_at<=now()) or (status='sending' and lease_until<now())) and attempts<6 and created_at>now()-interval '20 hours' order by created_at for update skip locked limit least(greatest(p_limit,1),10))
 update public.contact_email_outbox o set status='sending',attempts=attempts+1,lease_until=now()+interval '2 minutes',lease_token=gen_random_uuid(),updated_at=now() from candidates c where o.id=c.id returning o.*;
end $$;
create function public.finish_contact_email(p_id uuid,p_lease uuid,p_provider_id text,p_error text,p_retryable boolean) returns void language plpgsql security invoker set search_path='' as $$
begin
 update public.contact_email_outbox set provider_id=p_provider_id,last_error=p_error,status=case when p_provider_id is not null then 'accepted' when p_retryable and attempts<6 then 'pending' else 'failed' end,
 available_at=now()+interval '1 minute'*power(2,attempts),lease_until=null,lease_token=null,updated_at=now()
 where id=p_id and lease_token=p_lease and status='sending';
 update public.contact_email_outbox set provider_id=p_provider_id,lease_until=null,lease_token=null,updated_at=now() where id=p_id and lease_token=p_lease and status='cancelled' and p_provider_id is not null;
 -- A delivery webhook may have arrived before the provider acknowledgement was saved.
 update public.contact_email_outbox o set status=case
 when exists(select 1 from public.contact_email_events e where e.provider_id=o.provider_id and e.event_type in ('email.bounced','email.complained','email.suppressed')) then 'bounced'
 when exists(select 1 from public.contact_email_events e where e.provider_id=o.provider_id and e.event_type='email.failed') then 'failed'
 else 'delivered' end,updated_at=now()
 where o.id=p_id and o.status<>'cancelled' and exists(select 1 from public.contact_email_events e where e.provider_id=o.provider_id and e.event_type in ('email.delivered','email.bounced','email.complained','email.failed','email.suppressed'));
 update public.mailing_list_signups s set status='suppressed',consent=false from public.contact_email_outbox o where o.id=p_id and o.subscriber_id=s.id and o.status='bounced' and s.status<>'unsubscribed';
 update public.contact_email_outbox o set status='cancelled',updated_at=now() from public.mailing_list_signups s where o.subscriber_id=s.id and o.kind='mailing_confirmation' and o.status in ('pending','sending') and s.status in ('unsubscribed','suppressed');
end $$;
create function public.record_contact_email_event(p_event_id text,p_provider_id text,p_type text) returns void language plpgsql security invoker set search_path='' as $$
begin
 insert into public.contact_email_events(id,provider_id,event_type) values(p_event_id,p_provider_id,p_type) on conflict do nothing;
 if not found then return; end if;
 if p_type in ('email.delivered','email.bounced','email.complained','email.failed','email.suppressed') then
  update public.contact_email_outbox set status=case when p_type='email.delivered' then 'delivered' when p_type='email.failed' then 'failed' else 'bounced' end,last_error=case when p_type='email.delivered' then null else 'provider_delivery_failure' end,updated_at=now()
   where provider_id=p_provider_id and status not in ('cancelled','bounced') and not(status='failed' and p_type='email.delivered');
  if p_type in ('email.bounced','email.complained','email.suppressed') then
   update public.mailing_list_signups s set status='suppressed',consent=false from public.contact_email_outbox o where o.provider_id=p_provider_id and o.subscriber_id=s.id and s.status<>'unsubscribed';
  end if;
 end if;
 update public.contact_email_outbox o set status='cancelled',updated_at=now() from public.mailing_list_signups s where o.subscriber_id=s.id and o.kind='mailing_confirmation' and o.status in ('pending','sending') and s.status in ('unsubscribed','suppressed');
end $$;

revoke all on function public.submit_site_contact_v2(text,jsonb,text,text,uuid,text,text,text,jsonb),public.confirm_contact_subscription(text),public.unsubscribe_contact(text),public.claim_contact_emails(integer),public.finish_contact_email(uuid,uuid,text,text,boolean),public.record_contact_email_event(text,text,text) from public,anon,authenticated;
grant execute on function public.submit_site_contact_v2(text,jsonb,text,text,uuid,text,text,text,jsonb),public.confirm_contact_subscription(text),public.unsubscribe_contact(text),public.claim_contact_emails(integer),public.finish_contact_email(uuid,uuid,text,text,boolean),public.record_contact_email_event(text,text,text) to service_role;
commit;
