create table if not exists public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  reference_no bigint generated always as identity unique,
  submitted_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  topic text not null check (topic in ('General inquiry','Research collaboration','Media request','Education','Participation or volunteering','State bird campaign','Privacy request')),
  message text not null check (char_length(message) between 1 and 5000),
  consent boolean not null default false,
  status text not null default 'new' check (status in ('new','reviewing','responded','closed','spam')),
  internal_notes text,
  source_ip_hash text,
  user_agent text
);

alter table public.contact_inquiries enable row level security;
revoke all on table public.contact_inquiries from public, anon, authenticated;
grant select, insert, update, delete on table public.contact_inquiries to service_role;
grant usage, select on sequence public.contact_inquiries_reference_no_seq to service_role;

create index if not exists contact_inquiries_submitted_at_idx on public.contact_inquiries (submitted_at desc);
create index if not exists contact_inquiries_status_idx on public.contact_inquiries (status);
create index if not exists contact_inquiries_ip_time_idx on public.contact_inquiries (source_ip_hash, submitted_at desc);
