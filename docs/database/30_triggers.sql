/*
=========================================================
 PodMind AI
 Database Migration
 File: 30_triggers.sql
 Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- AUTO UPDATE updated_at
---------------------------------------------------------

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated
BEFORE UPDATE
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_organizations_updated ON public.organizations;
CREATE TRIGGER trg_organizations_updated
BEFORE UPDATE
ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_workspaces_updated ON public.workspaces;
CREATE TRIGGER trg_workspaces_updated
BEFORE UPDATE
ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_projects_updated ON public.projects;
CREATE TRIGGER trg_projects_updated
BEFORE UPDATE
ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

---------------------------------------------------------
-- AUTO SLUG
---------------------------------------------------------

DROP TRIGGER IF EXISTS trg_projects_slug ON public.projects;
CREATE TRIGGER trg_projects_slug
BEFORE INSERT
ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.auto_slug();

DROP TRIGGER IF EXISTS trg_templates_slug ON public.templates;
CREATE TRIGGER trg_templates_slug
BEFORE INSERT
ON public.templates
FOR EACH ROW
EXECUTE FUNCTION public.auto_slug();

DROP TRIGGER IF EXISTS trg_marketplace_slug ON public.marketplace_items;
CREATE TRIGGER trg_marketplace_slug
BEFORE INSERT
ON public.marketplace_items
FOR EACH ROW
EXECUTE FUNCTION public.auto_slug();

---------------------------------------------------------
-- AUDIT LOGS
---------------------------------------------------------

DROP TRIGGER IF EXISTS trg_projects_audit ON public.projects;
CREATE TRIGGER trg_projects_audit
AFTER INSERT OR UPDATE OR DELETE
ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS trg_billing_audit ON public.organization_subscriptions;
CREATE TRIGGER trg_billing_audit
AFTER INSERT OR UPDATE OR DELETE
ON public.organization_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS trg_api_keys_audit ON public.api_keys;
CREATE TRIGGER trg_api_keys_audit
AFTER INSERT OR UPDATE OR DELETE
ON public.api_keys
FOR EACH ROW
EXECUTE FUNCTION public.audit_trigger();

---------------------------------------------------------
-- AI CREDIT UPDATE
---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_ai_credit_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

UPDATE public.ai_credit_balances

SET

available_credits = available_credits - NEW.amount,

used_credits = used_credits + NEW.amount,

updated_at = NOW()

WHERE organization_id = NEW.organization_id
AND NEW.transaction_type = 'usage';

RETURN NEW;

END;
$$;

DROP TRIGGER IF EXISTS trg_ai_credit_usage ON public.ai_credit_transactions;
CREATE TRIGGER trg_ai_credit_usage
AFTER INSERT
ON public.ai_credit_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_ai_credit_usage();

---------------------------------------------------------
-- DOWNLOAD COUNTER
---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.increment_template_downloads()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

UPDATE public.templates

SET download_count = download_count + 1

WHERE id = NEW.template_id;

RETURN NEW;

END;
$$;

DROP TRIGGER IF EXISTS trg_template_download ON public.template_downloads;
CREATE TRIGGER trg_template_download
AFTER INSERT
ON public.template_downloads
FOR EACH ROW
EXECUTE FUNCTION public.increment_template_downloads();

---------------------------------------------------------
-- MARKETPLACE DOWNLOADS
---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.increment_marketplace_downloads()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

UPDATE public.marketplace_items

SET metadata =
jsonb_set(
metadata,
'{downloads}',
to_jsonb(
COALESCE((metadata->>'downloads')::INTEGER,0)+1
)
)

WHERE id = NEW.item_id;

RETURN NEW;

END;
$$;

DROP TRIGGER IF EXISTS trg_marketplace_download ON public.marketplace_downloads;
CREATE TRIGGER trg_marketplace_download
AFTER INSERT
ON public.marketplace_downloads
FOR EACH ROW
EXECUTE FUNCTION public.increment_marketplace_downloads();

---------------------------------------------------------
-- NOTIFICATION READ
---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.mark_notification_read()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

IF NEW.is_read = TRUE
AND OLD.is_read = FALSE THEN

NEW.read_at := NOW();

END IF;

RETURN NEW;

END;
$$;

DROP TRIGGER IF EXISTS trg_notification_read ON public.notifications;
CREATE TRIGGER trg_notification_read
BEFORE UPDATE
ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.mark_notification_read();

---------------------------------------------------------
-- UPDATE TEMPLATE RATING
---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.refresh_template_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

UPDATE public.templates

SET average_rating = (

SELECT ROUND(AVG(rating)::numeric,2)

FROM public.template_ratings

WHERE template_id = NEW.template_id

)

WHERE id = NEW.template_id;

RETURN NEW;

END;
$$;

DROP TRIGGER IF EXISTS trg_template_rating ON public.template_ratings;
CREATE TRIGGER trg_template_rating
AFTER INSERT OR UPDATE
ON public.template_ratings
FOR EACH ROW
EXECUTE FUNCTION public.refresh_template_rating();

---------------------------------------------------------
-- UPDATE MARKETPLACE RATING
---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.refresh_marketplace_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

UPDATE public.marketplace_items

SET metadata =
jsonb_set(

metadata,

'{average_rating}',

to_jsonb(

(

SELECT ROUND(AVG(rating)::numeric,2)

FROM public.marketplace_reviews

WHERE item_id = NEW.item_id

)

)

)

WHERE id = NEW.item_id;

RETURN NEW;

END;
$$;

DROP TRIGGER IF EXISTS trg_marketplace_rating ON public.marketplace_reviews;
CREATE TRIGGER trg_marketplace_rating
AFTER INSERT OR UPDATE
ON public.marketplace_reviews
FOR EACH ROW
EXECUTE FUNCTION public.refresh_marketplace_rating();

COMMIT;

/*
=========================================================

Database Trigger Layer Complete

Automation

✓ Auto updated_at
✓ Auto Slug
✓ Audit Logs
✓ AI Credit Usage
✓ Template Downloads
✓ Marketplace Downloads
✓ Notification Read Time
✓ Template Rating
✓ Marketplace Rating

Production Ready

Ready For

31_views.sql

=========================================================
*/
