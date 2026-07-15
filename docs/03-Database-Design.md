# PodMind AI – Database Design

Version: 1.0

Document: 03-Database-Design.md

Status: Draft

---

# 1. Database Overview

Database Engine

- PostgreSQL
- Supabase

Design Goals

- Highly Scalable
- Secure
- Normalized
- AI Ready
- Multi-Tenant
- Fast Queries
- Production Ready

---

# 2. Naming Convention

Primary Key

id UUID

Foreign Keys

user_id

project_id

research_id

guest_id

created_by

updated_by

Time Columns

created_at

updated_at

deleted_at

---

# 3. Core Tables

## users

Purpose

Store authentication users.

Columns

id

email

password (Handled by Supabase)

provider

role

status

last_login

created_at

updated_at

---

## profiles

Purpose

User profile information.

Columns

id

user_id

full_name

username

avatar

bio

timezone

language

country

website

company

job_title

subscription_id

ai_credits

created_at

updated_at

---

## subscriptions

Columns

id

user_id

plan

status

billing_cycle

start_date

end_date

renewal_date

stripe_customer_id

stripe_subscription_id

created_at

---

## projects

Purpose

Every podcast is one project.

Columns

id

user_id

title

slug

description

podcast_name

category

language

status

cover_image

favorite

archived

created_at

updated_at

---

## folders

id

user_id

name

color

icon

created_at

---

## project_folders

project_id

folder_id

---

# 4. AI Research

## research

id

project_id

topic

summary

key_points

statistics

pros

cons

timeline

myths

expert_opinions

discussion_points

references

status

ai_provider

tokens_used

generation_time

created_at

---

## research_sources

id

research_id

title

url

source

author

published_date

trust_score

category

created_at

---

## research_notes

id

research_id

user_id

note

highlight

color

created_at

---

## research_tags

id

name

color

---

## research_tag_items

tag_id

research_id

---

# 5. Guest Research

## guests

id

project_id

name

company

website

linkedin

twitter

biography

industry

created_at

---

## guest_questions

id

guest_id

question

type

order_no

created_at

---

# 6. Content Builder

## outlines

id

project_id

hook

intro

sections

cta

conclusion

created_at

---

## scripts

id

project_id

version

content

word_count

ai_provider

created_at

---

# 7. SEO

## seo

id

project_id

title

description

keywords

hashtags

youtube_chapters

created_at

---

# 8. Social Media

## social_posts

id

project_id

platform

content

status

scheduled_at

published_at

created_at

---

# 9. AI Chat

## ai_conversations

id

project_id

user_id

title

created_at

---

## ai_messages

id

conversation_id

role

content

tokens

provider

created_at

---

# 10. Exports

## exports

id

project_id

type

file_url

status

created_at

---

# 11. Notifications

## notifications

id

user_id

title

message

type

read

created_at

---

# 12. Billing

## invoices

id

user_id

invoice_number

amount

currency

status

payment_date

created_at

---

# 13. Credits

## ai_usage

id

user_id

provider

feature

tokens

credits_used

estimated_cost

created_at

---

## credit_transactions

id

user_id

type

amount

reason

created_at

---

# 14. API Keys

## api_keys

id

user_id

provider

encrypted_key

status

created_at

---

# 15. Feedback

## feedback

id

user_id

rating

message

status

created_at

---

# 16. Audit Logs

## audit_logs

id

user_id

action

entity

entity_id

ip_address

user_agent

created_at

---

# 17. Settings

## user_settings

id

user_id

theme

language

timezone

notifications

default_ai_provider

created_at

---

# 18. Storage Buckets

avatars

exports

research-files

attachments

project-covers

documents

---

# 19. Indexes

Create indexes on

email

username

project_id

user_id

created_at

status

topic

conversation_id

provider

plan

---

# 20. Row Level Security

Every table must implement RLS.

Example

Users can only access their own:

Projects

Research

Guests

Scripts

Exports

Notes

Billing

Settings

Admins can access all data.

---

# 21. Database Functions

Generate Slug

Increase Credits

Decrease Credits

Archive Project

Duplicate Project

Log AI Usage

Create Notification

---

# 22. Database Triggers

Auto Update updated_at

Create Profile After Signup

Log User Activity

Track AI Usage

Create Default Folder

---

# 23. Future Tables

voice_projects

podcast_episodes

team_members

organizations

workspaces

comments

mentions

tasks

calendar_events

templates

plugins

integrations

sponsors

analytics

---

# 24. Estimated Database Size

Users

100K+

Projects

10 Million+

Research Records

50 Million+

AI Messages

500 Million+

Exports

20 Million+

---

# 25. Database Principles

UUID Everywhere

Soft Deletes

Audit Logging

Encryption

Normalization

Indexes

Scalable Relations

No Duplicate Data

---

# 26. Acceptance Criteria

✓ Fully normalized schema

✓ Supports millions of records

✓ Supports multi-workspace in future

✓ AI usage tracking included

✓ Subscription ready

✓ Enterprise scalable

---

Next Document

04-UI-UX-Blueprint.md
