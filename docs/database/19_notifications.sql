/*
=========================================================
 PodMind AI
 Database Migration
 File: 19_notifications.sql
 Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- NOTIFICATIONS
---------------------------------------------------------

CREATE TABLE public.notifications (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    project_id UUID
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

    type notification_type NOT NULL,

    title TEXT NOT NULL,

    message TEXT NOT NULL,

    priority TEXT DEFAULT 'normal',

    action_url TEXT,

    icon TEXT,

    is_read BOOLEAN DEFAULT FALSE,

    read_at TIMESTAMPTZ,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- NOTIFICATION PREFERENCES
---------------------------------------------------------

CREATE TABLE public.notification_preferences (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    email_enabled BOOLEAN DEFAULT TRUE,

    push_enabled BOOLEAN DEFAULT TRUE,

    in_app_enabled BOOLEAN DEFAULT TRUE,

    sms_enabled BOOLEAN DEFAULT FALSE,

    marketing_enabled BOOLEAN DEFAULT FALSE,

    quiet_hours_enabled BOOLEAN DEFAULT FALSE,

    quiet_start TIME,

    quiet_end TIME,

    timezone TEXT DEFAULT 'UTC',

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)

);

---------------------------------------------------------
-- PUSH DEVICES
---------------------------------------------------------

CREATE TABLE public.push_devices (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    platform TEXT,

    device_name TEXT,

    device_token TEXT NOT NULL,

    is_active BOOLEAN DEFAULT TRUE,

    last_seen_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- EMAIL QUEUE
---------------------------------------------------------

CREATE TABLE public.email_queue (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    recipient_email TEXT NOT NULL,

    subject TEXT NOT NULL,

    template_name TEXT,

    payload JSONB DEFAULT '{}'::jsonb,

    status TEXT DEFAULT 'pending',

    attempts INTEGER DEFAULT 0,

    error_message TEXT,

    scheduled_at TIMESTAMPTZ DEFAULT NOW(),

    sent_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- WEBHOOK EVENTS
---------------------------------------------------------

CREATE TABLE public.webhook_events (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    event_name TEXT NOT NULL,

    payload JSONB NOT NULL,

    delivery_status TEXT DEFAULT 'pending',

    response_code INTEGER,

    response_body TEXT,

    attempts INTEGER DEFAULT 0,

    delivered_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- NOTIFICATION TEMPLATES
---------------------------------------------------------

CREATE TABLE public.notification_templates (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,

    type notification_type,

    channel TEXT,

    subject TEXT,

    body TEXT,

    variables JSONB DEFAULT '[]'::jsonb,

    is_system BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- NOTIFICATION LOGS
---------------------------------------------------------

CREATE TABLE public.notification_logs (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    notification_id UUID
        REFERENCES public.notifications(id)
        ON DELETE CASCADE,

    channel TEXT,

    status TEXT,

    provider TEXT,

    response TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- INDEXES
---------------------------------------------------------

CREATE INDEX idx_notifications_user
ON public.notifications(user_id);

CREATE INDEX idx_notifications_read
ON public.notifications(is_read);

CREATE INDEX idx_email_queue_status
ON public.email_queue(status);

CREATE INDEX idx_webhooks_status
ON public.webhook_events(delivery_status);

---------------------------------------------------------
-- UPDATED_AT
---------------------------------------------------------

CREATE TRIGGER trg_notification_preferences_updated

BEFORE UPDATE

ON public.notification_preferences

FOR EACH ROW

EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_notification_templates_updated

BEFORE UPDATE

ON public.notification_templates

FOR EACH ROW

EXECUTE FUNCTION public.update_updated_at();

---------------------------------------------------------
-- ENABLE RLS
---------------------------------------------------------

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- RLS POLICIES
---------------------------------------------------------

CREATE POLICY "Users manage own notifications"

ON public.notifications

FOR ALL

USING (

    auth.uid() = user_id

);

CREATE POLICY "Users manage own preferences"

ON public.notification_preferences

FOR ALL

USING (

    auth.uid() = user_id

);

COMMIT;

/*
=========================================================

Notification Engine Complete

Tables

✓ notifications
✓ notification_preferences
✓ push_devices
✓ email_queue
✓ webhook_events
✓ notification_templates
✓ notification_logs

Features

✓ In-App Notifications
✓ Email Queue
✓ Push Notifications
✓ SMS Ready
✓ Quiet Hours
✓ Webhooks
✓ Templates
✓ Delivery Logs
✓ Enterprise Ready

Ready For

20_billing.sql

=========================================================
*/
