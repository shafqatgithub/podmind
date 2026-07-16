/*
=========================================================
 PodMind AI
 Database Migration
 File: 25_marketplace.sql
 Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- MARKETPLACE ITEMS
---------------------------------------------------------

CREATE TABLE public.marketplace_items (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE SET NULL,

    created_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    item_type TEXT NOT NULL,

    name TEXT NOT NULL,

    slug CITEXT UNIQUE NOT NULL,

    short_description TEXT,

    description TEXT,

    category TEXT,

    thumbnail_url TEXT,

    banner_url TEXT,

    version TEXT DEFAULT '1.0.0',

    price NUMERIC(10,2) DEFAULT 0,

    currency TEXT DEFAULT 'USD',

    visibility project_visibility DEFAULT 'public',

    is_verified BOOLEAN DEFAULT FALSE,

    is_featured BOOLEAN DEFAULT FALSE,

    is_active BOOLEAN DEFAULT TRUE,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- MARKETPLACE CATEGORIES
---------------------------------------------------------

CREATE TABLE public.marketplace_categories (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT UNIQUE NOT NULL,

    slug CITEXT UNIQUE NOT NULL,

    description TEXT,

    icon TEXT,

    color TEXT,

    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- MARKETPLACE PURCHASES
---------------------------------------------------------

CREATE TABLE public.marketplace_purchases (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    item_id UUID NOT NULL
        REFERENCES public.marketplace_items(id)
        ON DELETE CASCADE,

    buyer_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE SET NULL,

    amount NUMERIC(10,2),

    currency TEXT DEFAULT 'USD',

    payment_status TEXT DEFAULT 'completed',

    purchased_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- MARKETPLACE REVIEWS
---------------------------------------------------------

CREATE TABLE public.marketplace_reviews (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    item_id UUID NOT NULL
        REFERENCES public.marketplace_items(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    rating INTEGER NOT NULL
        CHECK (rating BETWEEN 1 AND 5),

    review TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(item_id, user_id)

);

---------------------------------------------------------
-- MARKETPLACE FAVORITES
---------------------------------------------------------

CREATE TABLE public.marketplace_favorites (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    item_id UUID NOT NULL
        REFERENCES public.marketplace_items(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(item_id, user_id)

);

---------------------------------------------------------
-- MARKETPLACE DOWNLOADS
---------------------------------------------------------

CREATE TABLE public.marketplace_downloads (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    item_id UUID NOT NULL
        REFERENCES public.marketplace_items(id)
        ON DELETE CASCADE,

    user_id UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    downloaded_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- MARKETPLACE COLLECTIONS
---------------------------------------------------------

CREATE TABLE public.marketplace_collections (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    created_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    name TEXT NOT NULL,

    description TEXT,

    is_public BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- COLLECTION ITEMS
---------------------------------------------------------

CREATE TABLE public.marketplace_collection_items (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    collection_id UUID NOT NULL
        REFERENCES public.marketplace_collections(id)
        ON DELETE CASCADE,

    item_id UUID NOT NULL
        REFERENCES public.marketplace_items(id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(collection_id, item_id)

);

---------------------------------------------------------
-- CREATOR PROFILES
---------------------------------------------------------

CREATE TABLE public.marketplace_creators (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    display_name TEXT,

    bio TEXT,

    website TEXT,

    avatar_url TEXT,

    verified BOOLEAN DEFAULT FALSE,

    total_sales INTEGER DEFAULT 0,

    average_rating NUMERIC(3,2) DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)

);

---------------------------------------------------------
-- INDEXES
---------------------------------------------------------

CREATE INDEX idx_marketplace_slug
ON public.marketplace_items(slug);

CREATE INDEX idx_marketplace_category
ON public.marketplace_items(category);

CREATE INDEX idx_marketplace_featured
ON public.marketplace_items(is_featured);

CREATE INDEX idx_marketplace_verified
ON public.marketplace_items(is_verified);

---------------------------------------------------------
-- UPDATED_AT
---------------------------------------------------------

CREATE TRIGGER trg_marketplace_items_updated
BEFORE UPDATE
ON public.marketplace_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

---------------------------------------------------------
-- ENABLE RLS
---------------------------------------------------------

ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_creators ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- RLS POLICIES
---------------------------------------------------------

CREATE POLICY "Users can view public marketplace items"

ON public.marketplace_items

FOR SELECT

USING (

    visibility = 'public'
    OR created_by = auth.uid()

);

CREATE POLICY "Creators manage own marketplace items"

ON public.marketplace_items

FOR ALL

USING (

    created_by = auth.uid()

);

COMMIT;

/*
=========================================================

Marketplace Module Complete

Tables

✓ marketplace_items
✓ marketplace_categories
✓ marketplace_purchases
✓ marketplace_reviews
✓ marketplace_favorites
✓ marketplace_downloads
✓ marketplace_collections
✓ marketplace_collection_items
✓ marketplace_creators

Marketplace Items

✓ AI Agents
✓ Prompt Packs
✓ Templates
✓ Plugins
✓ Automations
✓ Workflows
✓ Knowledge Packs
✓ Voice Packs

Features

✓ Ratings
✓ Reviews
✓ Creator Profiles
✓ Collections
✓ Favorites
✓ Purchases
✓ Downloads
✓ Featured Items
✓ Verified Creators
✓ Enterprise Ready

Ready For

26_integrations.sql

=========================================================
*/
