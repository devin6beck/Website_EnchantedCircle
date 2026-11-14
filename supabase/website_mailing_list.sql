-- "Join our circle" mailing list for enchantedhomecare.com
--
-- NOT APPLIED. Review, then apply to the Supabase project the website should use
-- (for example by copying it into TBC_Timekeeping/supabase/migrations under that
-- repository's normal migration process).
--
-- Design:
--   * The website never reads or writes the table directly. RLS is enabled with
--     no policies, and table privileges are revoked from anon/authenticated.
--   * The only public entry point is join_mailing_list(), which inserts one
--     normalized address and silently ignores duplicates, so the form cannot be
--     used to discover who is already subscribed.
--   * Addresses are exported (CSV) to whichever email tool sends the newsletter.

create table if not exists public.website_mailing_list (
  id bigint generated always as identity primary key,
  email text not null unique
    check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  source text not null default 'website',
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

comment on table public.website_mailing_list is
  'Email addresses submitted through the public website "Join our circle" form.';

alter table public.website_mailing_list enable row level security;
revoke all on table public.website_mailing_list from anon, authenticated;

create or replace function public.join_mailing_list(p_email text, p_source text default 'website')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then
    raise exception 'invalid email address' using errcode = '22023';
  end if;

  insert into public.website_mailing_list (email, source)
  values (v_email, left(coalesce(nullif(btrim(p_source), ''), 'website'), 40))
  on conflict (email) do nothing;
end;
$$;

revoke all on function public.join_mailing_list(text, text) from public;
grant execute on function public.join_mailing_list(text, text) to anon, authenticated;
