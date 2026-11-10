begin;

create table public.mailing_list_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) between 3 and 254),
  consent boolean not null check (consent = true),
  consent_version text not null,
  created_at timestamptz not null default now()
);
create unique index mailing_list_email_unique on public.mailing_list_signups (lower(email));

create table public.booking_enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  event_date date,
  location text check (char_length(location) <= 300),
  message text not null check (char_length(message) between 1 and 5000),
  created_at timestamptz not null default now()
);

-- No public access to customer data. Submissions must use validated server routes.
alter table public.mailing_list_signups enable row level security;
alter table public.booking_enquiries enable row level security;
revoke all on table public.mailing_list_signups from anon, authenticated;
revoke all on table public.booking_enquiries from anon, authenticated;
grant select, insert, update, delete on table public.mailing_list_signups to service_role;
grant select, insert, update, delete on table public.booking_enquiries to service_role;

commit;
