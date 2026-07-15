# PodMind AI

# Database ERD (Entity Relationship Design)

Version: 1.0

Document: 14-Database-ERD.md

Status: Master Database Architecture

Classification: Confidential

---

# 1. Purpose

This document defines the complete database architecture for PodMind AI.

Goals

- Enterprise Ready
- Multi Tenant
- AI Optimized
- Scalable
- Secure
- High Performance

Database Engine

Supabase PostgreSQL

---

# 2. Database Design Principles

• UUID Primary Keys

• Soft Delete

• Audit Logging

• Row Level Security

• JSONB for Flexible AI Data

• Full Text Search

• Vector Search Ready

• Version History

• Multi Workspace Support

---

# 3. Core Entity Relationship

Organization
    │
Workspace
    │
Users
    │
Projects
    │
 ┌─────────────┬─────────────┬─────────────┐
 │             │             │
Research     Guests       Scripts
 │             │             │
Outline       Notes        SEO
 │             │             │
Exports     Analytics     Memory

---

# 4. Authentication Tables

users

profiles

sessions

refresh_tokens

devices

user_preferences

api_keys

login_history

password_resets

email_verifications

---

# 5. Organization Tables

organizations

organization_members

organization_roles

organization_permissions

organization_settings

billing_accounts

audit_logs

---

# 6. Workspace Tables

workspaces

workspace_members

workspace_roles

workspace_settings

workspace_invites

workspace_activity

workspace_usage

---

# 7. Project Tables

projects

project_status

project_categories

project_tags

project_files

project_history

project_activity

project_templates

project_comments

project_versions

---

# 8. Research Tables

research_requests

research_results

research_sources

research_statistics

research_timelines

research_case_studies

research_questions

research_bookmarks

research_history

research_citations

---

# 9. Guest Intelligence Tables

guests

guest_profiles

guest_companies

guest_books

guest_interviews

guest_social_profiles

guest_questions

guest_topics

guest_relationships

guest_notes

---

# 10. Outline Tables

outlines

outline_sections

outline_templates

outline_versions

outline_comments

---

# 11. Script Tables

scripts

script_versions

script_comments

script_rewrites

script_styles

script_reviews

script_history

---

# 12. SEO Tables

seo_projects

seo_titles

seo_keywords

seo_descriptions

seo_hashtags

seo_chapters

seo_history

---

# 13. Social Media Tables

social_posts

social_platforms

social_templates

social_exports

social_schedule

social_history

---

# 14. AI Chat Tables

conversations

conversation_messages

conversation_context

conversation_memory

conversation_feedback

conversation_exports

---

# 15. AI Memory Tables

memory_profiles

memory_preferences

memory_history

memory_embeddings

memory_tags

memory_relationships

---

# 16. Knowledge Hub Tables

knowledge_articles

knowledge_topics

knowledge_sources

knowledge_tags

knowledge_collections

knowledge_relationships

knowledge_bookmarks

---

# 17. AI Agent Tables

ai_agents

agent_runs

agent_tasks

agent_logs

agent_results

agent_errors

agent_metrics

agent_versions

---

# 18. AI Provider Tables

ai_providers

provider_models

provider_usage

provider_costs

provider_limits

provider_logs

provider_failures

---

# 19. Export Tables

exports

export_files

export_history

export_templates

---

# 20. Analytics Tables

analytics_events

analytics_sessions

analytics_projects

analytics_ai_usage

analytics_exports

analytics_dashboard

analytics_retention

---

# 21. Billing Tables

plans

subscriptions

payments

invoices

credit_transactions

credit_balance

coupon_codes

usage_records

---

# 22. Notification Tables

notifications

notification_preferences

notification_logs

notification_templates

---

# 23. Template Tables

templates

template_categories

template_ratings

template_versions

template_downloads

---

# 24. Marketplace Tables (Future)

marketplace_items

marketplace_categories

marketplace_sales

marketplace_reviews

marketplace_creators

marketplace_payouts

---

# 25. API Tables

api_clients

api_keys

api_requests

api_usage

api_logs

api_limits

webhooks

---

# 26. Enterprise Tables

departments

teams

team_members

approvals

audit_events

compliance_reports

custom_roles

organization_policies

---

# 27. Vector Database

embeddings

embedding_chunks

embedding_metadata

semantic_index

knowledge_vectors

Purpose

Semantic Search

AI Context Retrieval

RAG

Knowledge Graph

---

# 28. Audit Tables

audit_logs

system_logs

security_logs

user_logs

ai_logs

billing_logs

---

# 29. Soft Delete Strategy

Every major table includes

deleted_at

deleted_by

is_deleted

No permanent deletion by default.

---

# 30. Common Columns

id UUID

created_at

updated_at

created_by

updated_by

deleted_at

metadata JSONB

status

---

# 31. Indexing Strategy

Primary Keys

UUID

Indexes

email

workspace_id

project_id

user_id

created_at

status

GIN Index

JSONB

Full Text

Embeddings

---

# 32. Row Level Security

Users only access

Own Projects

Workspace Projects

Organization Data (Permission Based)

Admins

Full Access

---

# 33. Database Relationships

Organization

↓

Workspace

↓

Users

↓

Projects

↓

Research

↓

Outline

↓

Script

↓

SEO

↓

Social

↓

Exports

↓

Analytics

---

# 34. AI Context Relationships

User

↓

Workspace

↓

Project

↓

Research

↓

Guest

↓

Outline

↓

Script

↓

Memory

↓

Knowledge

Every AI request uses these relationships.

---

# 35. Backup Strategy

Daily Backup

Weekly Snapshot

Monthly Archive

Point In Time Recovery

Disaster Recovery

---

# 36. Performance Targets

Query Time

<100ms

Search

<300ms

AI Context Fetch

<500ms

Dashboard Load

<2 Seconds

---

# 37. Security

Encrypted API Keys

Hashed Passwords

JWT Authentication

RLS Policies

Encrypted Sensitive Data

Audit Logging

---

# 38. Future Database Expansion

CRM

Sponsors

Podcast Episodes

RSS Feeds

Audio Processing

Video Assets

Voice Cloning

Plugin Data

AI Marketplace

Workflow Automation

---

# 39. Estimated Scale

Users

1,000,000+

Projects

100,000,000+

Research Records

500,000,000+

AI Requests

Billions

Storage

Petabyte Ready

---

# 40. Acceptance Criteria

✓ Fully Normalized

✓ Enterprise Ready

✓ AI Optimized

✓ Multi Tenant

✓ Secure

✓ Scalable

✓ Vector Search Ready

✓ RLS Enabled

✓ Future Proof

---

# High-Level ERD

Organizations
│
├── Workspaces
│   ├── Workspace Members
│   ├── Projects
│   │   ├── Research
│   │   ├── Guests
│   │   ├── Outlines
│   │   ├── Scripts
│   │   ├── SEO
│   │   ├── Social Posts
│   │   ├── Exports
│   │   └── Analytics
│   ├── AI Chats
│   ├── Knowledge Hub
│   └── AI Memory
│
└── Billing
    ├── Plans
    ├── Subscriptions
    └── Payments
