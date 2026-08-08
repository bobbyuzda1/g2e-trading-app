-- Enable Row-Level Security on all public tables
-- ============================================================================
-- Fixes Supabase Security Advisor: rls_disabled_in_public (CRITICAL)
-- Project ref: ekxxkfwhokfzzkhmqxbo (g2e-trading-app)
--
-- Audited 2026-08-07: ALL 13 public tables had RLS disabled, and anon held
-- SELECT/INSERT/UPDATE/DELETE on every one of them. This is the more serious
-- of the two flagged projects -- it holds user records, brokerage account
-- links and broker API credentials.
--
-- WHY THIS IS SAFE TO RUN AGAINST PRODUCTION
-- ------------------------------------------
-- The backend talks to Postgres directly (SQLAlchemy + Alembic) as the
-- `postgres` role, which owns every table in public and has
-- rolbypassrls = true. RLS is never evaluated for it, so enabling RLS changes
-- nothing for the application and only closes the PostgREST/anon path.
--
-- Verified: postgres.rolbypassrls = true, all public tables owned by postgres.
--
-- No policies are created. RLS-on with zero policies is a default-deny for
-- anon/authenticated; the owner and service_role pass through untouched.
--
-- Apply via: Supabase Dashboard -> SQL Editor -> New Query (paste + run)
-- ============================================================================

BEGIN;

-- Credentials and identity -- highest sensitivity.
-- user_broker_credentials stores encrypted_key / encrypted_secret. They are
-- encrypted at rest (the decryption key lives in backend env, not the DB), so
-- exfiltration does not directly hand over a usable broker key -- but the rows
-- were still world-readable and, worse, world-WRITABLE: anon could overwrite
-- or delete them, or insert rows.
ALTER TABLE public.user_broker_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brokerage_accounts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brokerage_connections   ENABLE ROW LEVEL SECURITY;

-- User content and trading configuration.
ALTER TABLE public.conversations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_plans             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_strategies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.explicit_user_rules       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preference_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_feedback   ENABLE ROW LEVEL SECURITY;

-- Audit trail -- must not be anon-writable, or the log can be forged/erased.
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Alembic bookkeeping. No sensitive data, but anon could corrupt the migration
-- pointer and break future deploys.
ALTER TABLE public.alembic_version ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================================================
-- IF A BROWSER CLIENT EVER TALKS TO SUPABASE DIRECTLY
-- ----------------------------------------------------------------------------
-- Today the frontend does not use the Supabase anon key (nothing in the repo
-- references it) -- all traffic goes through the Python backend. If that
-- changes, do NOT simply disable RLS again. Add per-user policies instead,
-- e.g. for a table with a user_id column:
--
--   CREATE POLICY "own rows" ON public.trading_plans
--     FOR ALL TO authenticated
--     USING (user_id = auth.uid())
--     WITH CHECK (user_id = auth.uid());
--
-- Never add such a policy to user_broker_credentials -- that table should stay
-- server-only, reachable exclusively through the backend.
-- ============================================================================

-- ============================================================================
-- VERIFICATION — run after applying. Expect 13 rows, all rls_enabled = true.
--
--   SELECT c.relname, c.relrowsecurity AS rls_enabled
--     FROM pg_class c
--     JOIN pg_namespace n ON n.oid = c.relnamespace
--    WHERE n.nspname = 'public' AND c.relkind = 'r'
--    ORDER BY c.relname;
--
-- Then smoke-test the app: log in, load a conversation, confirm the brokerage
-- connection still reads. All of that runs through the backend's postgres role.
-- ============================================================================
