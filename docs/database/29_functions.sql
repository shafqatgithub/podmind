/*
=========================================================
 PodMind AI
 Database Migration
 File: 29_functions.sql
 Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- UPDATE UPDATED_AT
---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

---------------------------------------------------------
-- GENERATE SLUG
---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_slug(input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    slug TEXT;
BEGIN
    slug := lower(trim(input));

    slug := regexp_replace(slug, '[^a-z0-9]+', '-', 'g');

    slug := regexp_replace(slug, '-+', '-', 'g');

    slug := trim(both '-' FROM slug);

    RETURN slug;
END;
$$;

---------------------------------------------------------
-- RANDOM API KEY
---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN
        'pm_' ||
        encode(gen_random_bytes(24), 'hex');
END;
$$;

---------------------------------------------------------
-- RANDOM TOKEN
---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$;

---------------------------------------------------------
-- PROJECT WORD COUNT
---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.word_count(input TEXT)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
AS $$
SELECT
CASE

WHEN input IS NULL THEN 0

ELSE
array_length(
regexp_split_to_array(trim(input), '\s+'),
1)

END;
$$;

---------------------------------------------------------
-- READING TIME
---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reading_time_minutes(input TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE

words INTEGER;

BEGIN

words := public.word_count(input);

RETURN GREATEST(1, CEIL(words / 200.0));

END;
$$;

---------------------------------------------------------
-- ESTIMATED SPEAKING TIME
---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.speaking_time_minutes(input TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE

words INTEGER;

BEGIN

words := public.word_count(input);

RETURN GREATEST(1, CEIL(words / 150.0));

END;
$$;

---------------------------------------------------------
-- PROJECT SEARCH VECTOR
---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.search_vector(
title TEXT,
body TEXT
)

RETURNS tsvector

LANGUAGE SQL

IMMUTABLE

AS $$

SELECT

to_tsvector(

'english',

coalesce(title,'') || ' ' ||

coalesce(body,'')

);

$$;

---------------------------------------------------------
-- JSON MERGE
---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.jsonb_merge(

a JSONB,

b JSONB

)

RETURNS JSONB

LANGUAGE SQL

IMMUTABLE

AS $$

SELECT

coalesce(a,'{}'::jsonb)

||

coalesce(b,'{}'::jsonb);

$$;

---------------------------------------------------------
-- ORGANIZATION STORAGE
---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.organization_storage_size(

org UUID

)

RETURNS BIGINT

LANGUAGE SQL

AS $$

SELECT

COALESCE(

SUM(file_size),

0

)

FROM public.export_jobs

WHERE organization_id = org;

$$;

---------------------------------------------------------
-- USER IS ADMIN
---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()

RETURNS BOOLEAN

LANGUAGE SQL

SECURITY DEFINER

AS $$

SELECT EXISTS(

SELECT 1

FROM public.admin_users

WHERE user_id = auth.uid()

AND is_active = TRUE

);

$$;

---------------------------------------------------------
-- USER IS SUPER ADMIN
---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_super_admin()

RETURNS BOOLEAN

LANGUAGE SQL

SECURITY DEFINER

AS $$

SELECT EXISTS(

SELECT 1

FROM public.admin_users

WHERE user_id = auth.uid()

AND is_super_admin = TRUE

);

$$;

---------------------------------------------------------
-- AI CREDIT BALANCE
---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.available_ai_credits(

org UUID

)

RETURNS INTEGER

LANGUAGE SQL

AS $$

SELECT available_credits

FROM public.ai_credit_balances

WHERE organization_id = org;

$$;

---------------------------------------------------------
-- TRIGGER
---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.auto_slug()

RETURNS TRIGGER

LANGUAGE plpgsql

AS $$

BEGIN

IF NEW.slug IS NULL THEN

NEW.slug := public.generate_slug(NEW.name);

END IF;

RETURN NEW;

END;

$$;

---------------------------------------------------------
-- GENERIC AUDIT LOG
---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.audit_trigger()

RETURNS TRIGGER

LANGUAGE plpgsql

AS $$

BEGIN

INSERT INTO public.audit_events(

organization_id,

actor_id,

action,

resource_type,

resource_id,

changes

)

VALUES(

NEW.organization_id,

auth.uid(),

TG_OP,

TG_TABLE_NAME,

NEW.id,

to_jsonb(NEW)

);

RETURN NEW;

END;

$$;

COMMIT;

/*
=========================================================

Core Functions Complete

Functions

✓ update_updated_at()
✓ generate_slug()
✓ generate_api_key()
✓ generate_token()
✓ word_count()
✓ reading_time_minutes()
✓ speaking_time_minutes()
✓ search_vector()
✓ jsonb_merge()
✓ organization_storage_size()
✓ is_admin()
✓ is_super_admin()
✓ available_ai_credits()
✓ auto_slug()
✓ audit_trigger()

Purpose

✓ Helper Functions
✓ AI Utilities
✓ Search Utilities
✓ Security
✓ Admin Helpers
✓ Trigger Helpers
✓ Audit Support

Production Ready

Ready For

30_views.sql

=========================================================
*/
