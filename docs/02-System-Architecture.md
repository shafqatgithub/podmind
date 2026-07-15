# PodMind AI – System Architecture

**Version:** 1.0

**Document:** 02-System-Architecture.md

**Status:** Draft

---

# 1. Overview

PodMind AI is a modern AI-powered SaaS platform built using a scalable, modular and production-ready architecture.

The platform follows a monorepo architecture to ensure scalability, maintainability and faster development.

The system is divided into independent layers:

- Frontend
- Backend
- AI Services
- Database
- Authentication
- Storage
- Billing
- Analytics

Each layer communicates through secure APIs.

---

# 2. High Level Architecture

Users

↓

Landing Website

↓

Authentication

↓

Dashboard

↓

Projects

↓

AI Engine

↓

Database

↓

Export

↓

Analytics

---

# 3. Monorepo Structure

podmind/

apps/

    web/

    api/

    admin/

packages/

    ai/

    ui/

    auth/

    database/

    types/

    hooks/

    utils/

supabase/

docs/

scripts/

.github/

README.md

---

# 4. Frontend Architecture

Technology

Next.js

React

TypeScript

Tailwind CSS

Shadcn UI

Framer Motion

React Query

React Hook Form

Zod

Features

SSR

CSR

Server Components

Dark Mode

Responsive Layout

Reusable Components

Optimized Images

Loading Skeletons

Error Boundaries

---

# 5. Backend Architecture

Technology

FastAPI

Python

REST APIs

Background Workers

Redis Queue

Responsibilities

Authentication

AI Requests

Projects

Research

Guest Research

Export

Billing

Notifications

Logging

Monitoring

---

# 6. AI Layer

AI Providers

OpenAI

Claude

Gemini

Future

DeepSeek

Llama

OpenRouter

Grok

Every provider is connected through one AI Router.

---

# 7. AI Router

Purpose

Instead of hardcoding one AI model, every request passes through AI Router.

AI Router decides

Best Provider

Fallback Provider

Token Limits

Cost Optimization

Response Validation

Retry Logic

Future providers can be added without changing business logic.

---

# 8. Database Architecture

Database

PostgreSQL

Supabase

Storage

Supabase Storage

Caching

Redis

Search

Postgres Full Text Search

Future

Vector Database

Pinecone

Qdrant

---

# 9. Authentication

Supabase Auth

Email Login

Google Login

GitHub Login

Session Management

JWT

Refresh Tokens

Role Based Access

Roles

User

Pro User

Admin

Super Admin

---

# 10. Storage

Research Files

Exports

Images

Attachments

Profile Photos

Documents

Stored in

Supabase Storage

---

# 11. Billing

Stripe

Plans

Free

Starter

Pro

Business

Enterprise

Billing Features

Invoices

Payment History

Upgrade

Downgrade

Cancel Subscription

AI Credit System

---

# 12. API Architecture

REST API

Example

/api/auth

/api/projects

/api/research

/api/guest

/api/script

/api/seo

/api/export

/api/profile

/api/settings

/api/billing

---

# 13. AI Request Flow

User enters topic

↓

Frontend

↓

Backend

↓

AI Router

↓

Selected AI Model

↓

Validation

↓

Formatting

↓

Database Save

↓

Frontend Response

---

# 14. Research Flow

Create Project

↓

Enter Topic

↓

AI Research

↓

Research Pack Generated

↓

Save Research

↓

Export

↓

AI Chat

---

# 15. Security Layer

HTTPS

JWT

RLS

Input Validation

Rate Limiting

XSS Protection

SQL Injection Protection

CSRF Protection

Encrypted API Keys

Audit Logs

---

# 16. Error Handling

Global Exception Handler

Retry Failed Requests

Timeout Handling

AI Provider Failover

Error Logging

User Friendly Messages

---

# 17. Logging

Authentication Logs

AI Usage Logs

Billing Logs

Research Logs

Export Logs

System Errors

---

# 18. Monitoring

Health Check

API Monitoring

AI Monitoring

Database Monitoring

Background Jobs

Performance Metrics

---

# 19. Caching

Redis

Cache

Trending Topics

Research Results

Settings

User Profile

AI Responses

TTL Strategy

---

# 20. Notifications

Email

In App

Future

Push Notifications

Slack

Discord

---

# 21. Background Jobs

Export PDF

Export DOCX

AI Research

Email Sending

Cleanup

Analytics

Scheduled Tasks

---

# 22. Search Engine

Global Search

Projects

Research

Guests

Notes

Scripts

Tags

---

# 23. Export Engine

PDF

DOCX

Markdown

TXT

Future

Google Docs

Notion

HTML

---

# 24. Scalability Strategy

Stateless Backend

Horizontal Scaling

Redis Queue

CDN

Database Indexing

Caching

Lazy Loading

Pagination

---

# 25. Deployment

Frontend

Vercel

Backend

Railway

Database

Supabase

Storage

Supabase Storage

DNS

Cloudflare

Monitoring

BetterStack

Sentry

---

# 26. Folder Responsibilities

apps/web

Frontend

apps/api

Backend

apps/admin

Admin Dashboard

packages/ai

AI Logic

packages/ui

Shared Components

packages/database

Database Functions

packages/auth

Authentication

packages/types

Shared Types

packages/utils

Utilities

packages/hooks

Custom Hooks

---

# 27. Future Architecture

Plugin System

Marketplace

AI Agents

Voice Assistant

Desktop App

Mobile App

Chrome Extension

Public API

Webhook Support

---

# 28. Architecture Principles

Modular

Scalable

Maintainable

Reusable

Production Ready

AI First

API First

Security First

Performance First

---

# 29. Acceptance Criteria

✓ Architecture supports multiple AI providers.

✓ Architecture supports thousands of concurrent users.

✓ New modules can be added without major refactoring.

✓ Every module remains independent.

✓ Production deployment is possible without architecture changes.

---

# Next Document

03-Database-Design.md
