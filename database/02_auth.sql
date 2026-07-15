/*
=========================================================
 PodMind AI
 Database Migration
 File: 02_auth.sql
 Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- USER PROFILES
---------------------------------------------------------

CREATE TABLE public.profiles (

    id UUID PRIMARY KEY
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    full_name TEXT,

    username CITEXT UNIQUE,

    avatar_url TEXT,

    bio TEXT,

    website TEXT,

    company TEXT,

    job_title TEXT,

    country TEXT,

    timezone TEXT DEFAULT 'UTC',

    language language_code DEFAULT 'en',

    role user_role DEFAULT 'user',

    onboarding_completed BOOLEAN DEFAULT FALSE,

    email_verified BOOLEAN DEFAULT FALSE,

    is_active BOOLEAN DEFAULT TRUE,

    last_login_at TIMESTAMPTZ,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- USER PREFERENCES
---------------------------------------------------------

CREATE TABLE public.user_preferences (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    theme TEXT DEFAULT 'dark',

    ai_provider ai_provider DEFAULT 'openai',

    default_language language_code DEFAULT 'en',

    writing_tone content_tone DEFAULT 'professional',

    auto_save BOOLEAN DEFAULT TRUE,

    email_notifications BOOLEAN DEFAULT TRUE,

    push_notifications BOOLEAN DEFAULT TRUE,

    marketing_emails BOOLEAN DEFAULT FALSE,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)

);

---------------------------------------------------------
-- LOGIN HISTORY
---------------------------------------------------------

CREATE TABLE public.login_history (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    ip_address INET,

    user_agent TEXT,

    device TEXT,

    browser TEXT,

    operating_system TEXT,

    country TEXT,

    city TEXT,

    login_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- USER DEVICES
---------------------------------------------------------

CREATE TABLE public.user_devices (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    device_name TEXT,

    device_type TEXT,

    browser TEXT,

    operating_system TEXT,

    last_used_at TIMESTAMPTZ,

    is_trusted BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- API KEYS
---------------------------------------------------------

CREATE TABLE public.api_keys (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    provider ai_provider NOT NULL,

    api_key_encrypted TEXT NOT NULL,

    nickname TEXT,

    is_active BOOLEAN DEFAULT TRUE,

    last_used_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- INDEXES
---------------------------------------------------------

CREATE INDEX idx_profiles_username
ON public.profiles(username);

CREATE INDEX idx_profiles_role
ON public.profiles(role);

CREATE INDEX idx_login_history_user
ON public.login_history(user_id);

CREATE INDEX idx_devices_user
ON public.user_devices(user_id);

CREATE INDEX idx_api_keys_user
ON public.api_keys(user_id);

---------------------------------------------------------
-- AUTO UPDATE updated_at
---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN

    NEW.updated_at = NOW();

    RETURN NEW;

END;

$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated

BEFORE UPDATE

ON public.profiles

FOR EACH ROW

EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_preferences_updated

BEFORE UPDATE

ON public.user_preferences

FOR EACH ROW

EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_api_keys_updated

BEFORE UPDATE

ON public.api_keys

FOR EACH ROW

EXECUTE FUNCTION public.update_updated_at();

---------------------------------------------------------
-- AUTO CREATE PROFILE
---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()

RETURNS TRIGGER AS $$

BEGIN

INSERT INTO public.profiles(id)

VALUES(NEW.id);

RETURN NEW;

END;

$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created

AFTER INSERT

ON auth.users

FOR EACH ROW

EXECUTE FUNCTION public.handle_new_user();

---------------------------------------------------------
-- ROW LEVEL SECURITY
---------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- PROFILES POLICY
---------------------------------------------------------

CREATE POLICY "Users can view own profile"

ON public.profiles

FOR SELECT

USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"

ON public.profiles

FOR UPDATE

USING (auth.uid() = id);

---------------------------------------------------------
-- USER PREFERENCES
---------------------------------------------------------

CREATE POLICY "Users manage own preferences"

ON public.user_preferences

FOR ALL

USING (auth.uid() = user_id);

---------------------------------------------------------
-- LOGIN HISTORY
---------------------------------------------------------

CREATE POLICY "Users view own login history"

ON public.login_history

FOR SELECT

USING (auth.uid() = user_id);

---------------------------------------------------------
-- USER DEVICES
---------------------------------------------------------

CREATE POLICY "Users manage own devices"

ON public.user_devices

FOR ALL

USING (auth.uid() = user_id);

---------------------------------------------------------
-- API KEYS
---------------------------------------------------------

CREATE POLICY "Users manage own api keys"

ON public.api_keys

FOR ALL

USING (auth.uid() = user_id);

COMMIT;

/*
=========================================================
Authentication Module Complete

Tables

✓ profiles
✓ user_preferences
✓ login_history
✓ user_devices
✓ api_keys

Features

✓ Auto Profile Creation
✓ Updated Timestamp Trigger
✓ RLS Enabled
✓ Secure Policies
✓ API Key Storage
✓ Login History
✓ User Preferences
✓ Device Tracking

Ready For

03_profiles.sql
=========================================================
*/
