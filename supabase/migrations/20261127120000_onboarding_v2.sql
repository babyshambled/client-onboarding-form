-- Onboarding form v2 (27 Nov 2026). Additive only: no column dropped, no data changed.
-- Apply BEFORE the v2 code is deployed. Safe to run twice.

begin;
-- Shared database: fail fast rather than queue behind another app's lock.
set local lock_timeout = '5s';

-- New columns for the v2 form, the LinkedIn pull, the brief and the one-email tracking.
alter table public.onboarding_submissions
  add column if not exists form_version text not null default 'v1',
  add column if not exists answers jsonb,
  add column if not exists linkedin_report jsonb,
  add column if not exists linkedin_status text,
  add column if not exists session_brief text,
  add column if not exists brief_status text,
  add column if not exists processing_started_at timestamptz,
  add column if not exists email_sent_at timestamptz,
  add column if not exists email_error text,
  add column if not exists email_attempts integer not null default 0,
  add column if not exists alert_sent_at timestamptz;

-- v2 has 7 ratings, not 10. The five old ratings with no v2 equivalent may now be empty.
alter table public.onboarding_submissions
  alter column rating_articulation drop not null,
  alter column rating_inbound_leads drop not null,
  alter column rating_objection_handling drop not null,
  alter column rating_content_conversations drop not null,
  alter column rating_expert_positioning drop not null;

-- The safety net looks for rows whose email has not gone yet.
create index if not exists onboarding_submissions_backstop_idx
  on public.onboarding_submissions (form_version, created_at)
  where email_sent_at is null;

commit;

-- Read-back (run after applying):
-- select column_name, is_nullable, column_default from information_schema.columns
--  where table_schema='public' and table_name='onboarding_submissions'
--  and column_name in ('form_version','answers','linkedin_report','email_sent_at','email_attempts','alert_sent_at','rating_articulation');
-- select to_regclass('public.onboarding_submissions_backstop_idx');
