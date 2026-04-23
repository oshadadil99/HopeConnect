-- ============================================================
-- HopeConnect Phase 1 — Database Schema
-- Run this in Supabase SQL Editor before rls_policies.sql
-- ============================================================

-- Teardown (safe to re-run)
DROP TABLE IF EXISTS case_updates, documents, cases, children, profiles CASCADE;
DROP TYPE IF EXISTS user_role, case_status, document_type, verification_status CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Enums
CREATE TYPE user_role AS ENUM ('admin', 'ngo', 'social_worker');
CREATE TYPE case_status AS ENUM ('pending', 'assigned', 'in_progress', 'resolved');
CREATE TYPE document_type AS ENUM ('birth_certificate', 'medical_report', 'police_report');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');

-- profiles: extends auth.users
CREATE TABLE profiles (
  id                uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name         text NOT NULL,
  role              user_role NOT NULL,
  organization_name text,
  created_at        timestamptz DEFAULT now()
);

-- children
CREATE TABLE children (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name    text NOT NULL,
  last_name     text NOT NULL,
  date_of_birth date NOT NULL,
  created_by    uuid NOT NULL REFERENCES profiles(id),
  created_at    timestamptz DEFAULT now()
);

-- cases
CREATE TABLE cases (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id        uuid NOT NULL REFERENCES children(id),
  reported_by     uuid NOT NULL REFERENCES profiles(id),
  assigned_ngo_id uuid REFERENCES profiles(id),
  status          case_status NOT NULL DEFAULT 'pending',
  needs           text[] DEFAULT '{}',
  created_at      timestamptz DEFAULT now()
);

-- documents
CREATE TABLE documents (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id             uuid NOT NULL REFERENCES cases(id),
  uploaded_by         uuid NOT NULL REFERENCES profiles(id),
  file_url            text NOT NULL,
  document_type       document_type NOT NULL,
  verification_status verification_status NOT NULL DEFAULT 'pending',
  created_at          timestamptz DEFAULT now()
);

-- case_updates
CREATE TABLE case_updates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     uuid NOT NULL REFERENCES cases(id),
  ngo_id      uuid NOT NULL REFERENCES profiles(id),
  update_text text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE children     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases        ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents    ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_updates ENABLE ROW LEVEL SECURITY;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'social_worker')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
