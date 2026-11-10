begin;

create table public.contact_rate_limits (
  client_hash text not null check (client_hash ~ '^[a-f0-9]{64}$'),
  window_start timestamptz not null,
  attempts integer not null check (attempts between 1 and 5),
  primary key (client_hash, window_start)
);
alter table public.contact_rate_limits enable row level security;
revoke all on table public.contact_rate_limits from anon, authenticated;
grant select, insert, update, delete on table public.contact_rate_limits to service_role;

-- One transaction both reserves a rate-limit slot and stores the request.
-- The private key stays in the server route; public callers cannot execute this.
create function public.submit_site_contact(p_kind text, p_payload jsonb, p_client_hash text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  slot timestamptz := pg_catalog.to_timestamp(pg_catalog.floor(extract(epoch from pg_catalog.now()) / 600) * 600);
  used integer;
begin
  if p_kind not in ('mailing', 'booking') or p_kind is null then
    raise exception 'invalid_contact_kind' using errcode = '22023';
  end if;
  if p_client_hash is null or p_client_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid_client_hash' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_client_hash, 0));
  delete from public.contact_rate_limits where window_start < pg_catalog.now() - interval '1 day';
  select attempts into used from public.contact_rate_limits
    where client_hash = p_client_hash and window_start = slot;
  if coalesce(used, 0) >= 5 then
    raise exception 'contact_rate_limit' using errcode = 'P0001';
  end if;
  insert into public.contact_rate_limits(client_hash, window_start, attempts)
    values (p_client_hash, slot, 1)
    on conflict (client_hash, window_start) do update
    set attempts = public.contact_rate_limits.attempts + 1;
  if p_kind = 'mailing' then
    if (p_payload->>'consent') is distinct from 'true' then
      raise exception 'consent_required' using errcode = '22023';
    end if;
    insert into public.mailing_list_signups(email, consent, consent_version)
      values (pg_catalog.lower(p_payload->>'email'), true, 'site-signup-v1')
      on conflict do nothing;
  else
    insert into public.booking_enquiries(name, email, event_date, location, message)
      values (p_payload->>'name', pg_catalog.lower(p_payload->>'email'),
        nullif(p_payload->>'event_date', '')::date, nullif(p_payload->>'location', ''), p_payload->>'message');
  end if;
end;
$$;
revoke all on function public.submit_site_contact(text, jsonb, text) from public, anon, authenticated;
grant execute on function public.submit_site_contact(text, jsonb, text) to service_role;

commit;
