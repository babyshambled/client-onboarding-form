-- Lock down onboarding_submissions (written 27 Nov 2026). NOT a normal migration.
--
-- Today the table lets ANYONE holding the project's public (anon) key:
--   * read every submission ("Allow all reads"), and
--   * write any row they like straight into the table ("Allow anonymous inserts"),
--     skipping the form's checks entirely.
-- The v2 code reads and writes only through the service key, so neither policy is needed.
--
-- Apply ONLY AFTER: (1) the v2 code is live, and (2) SUPABASE_SERVICE_ROLE_KEY is set in Vercel
-- and a test submission has worked. Before that, the old live form still needs the insert policy.
-- Affects this one table only; the VA tracker's tables are untouched.

begin;
set local lock_timeout = '5s';

drop policy if exists "Allow all reads" on public.onboarding_submissions;
drop policy if exists "Allow anonymous inserts" on public.onboarding_submissions;
revoke all on public.onboarding_submissions from anon, authenticated;

commit;

-- Read-back (expect: no rows, then false, false):
-- select policyname from pg_policies where schemaname='public' and tablename='onboarding_submissions';
-- select has_table_privilege('anon','public.onboarding_submissions','INSERT'),
--        has_table_privilege('anon','public.onboarding_submissions','SELECT');
--
-- To undo:
-- grant select, insert on public.onboarding_submissions to anon, authenticated;
-- create policy "Allow all reads" on public.onboarding_submissions for select to public using (true);
-- create policy "Allow anonymous inserts" on public.onboarding_submissions for insert to public with check (true);
