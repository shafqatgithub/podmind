-- ============================================================
-- 36_ai_model_identifiers.sql
-- Correct the Anthropic model identifiers.
--
-- `ai_models.model_name` is sent verbatim as the `model` field in provider
-- API calls, so it must be a real API identifier. Anthropic rejects display
-- names and shorthand ("claude-opus") with a 400; only full IDs such as
-- claude-opus-4-8 are accepted. The seed shipped the shorthand, so every
-- research request would fail on its first (preferred) provider and silently
-- fall back to OpenAI — paying a wasted round trip and never using the model
-- the routing rules ask for.
--
-- The Model Catalog resolves documented families by prefix, so
-- "claude-opus" still resolves to "claude-opus-4-8" with no code change.
--
-- OpenAI (gpt-5, gpt-5-mini) and Google (gemini-2.5-pro, gemini-2.5-flash)
-- identifiers are already valid API IDs and are left alone.
-- ============================================================

UPDATE public.ai_models m
   SET model_name    = 'claude-opus-4-8',
       display_name  = 'Claude Opus 4.8',
       context_window = 1000000
  FROM public.ai_providers p
 WHERE p.id = m.provider_id
   AND p.provider_type = 'anthropic'
   AND m.model_name = 'claude-opus';

UPDATE public.ai_models m
   SET model_name    = 'claude-sonnet-5',
       display_name  = 'Claude Sonnet 5',
       context_window = 1000000
  FROM public.ai_providers p
 WHERE p.id = m.provider_id
   AND p.provider_type = 'anthropic'
   AND m.model_name = 'claude-sonnet';

-- Fill in the display names the seed left null, so the model picker and
-- analytics have something human-readable to show.
UPDATE public.ai_models SET display_name = 'GPT-5'
 WHERE model_name = 'gpt-5' AND display_name IS NULL;
UPDATE public.ai_models SET display_name = 'GPT-5 Mini'
 WHERE model_name = 'gpt-5-mini' AND display_name IS NULL;
UPDATE public.ai_models SET display_name = 'Gemini 2.5 Pro'
 WHERE model_name = 'gemini-2.5-pro' AND display_name IS NULL;
UPDATE public.ai_models SET display_name = 'Gemini 2.5 Flash'
 WHERE model_name = 'gemini-2.5-flash' AND display_name IS NULL;
UPDATE public.ai_models SET display_name = 'Grok 4'
 WHERE model_name = 'grok-4' AND display_name IS NULL;
UPDATE public.ai_models SET display_name = 'DeepSeek Chat'
 WHERE model_name = 'deepseek-chat' AND display_name IS NULL;
