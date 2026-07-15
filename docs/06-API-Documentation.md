# PodMind AI

# API Documentation

Version: 1.0

Document: 06-API-Documentation.md

Status: Draft

---

# 1. Overview

The PodMind AI API follows REST architecture.

All endpoints are versioned.

Example

/api/v1/

Every response returns JSON.

Authentication uses JWT via Supabase.

All endpoints must support proper validation, pagination, error handling and logging.

---

# 2. Base URL

Development

http://localhost:8000/api/v1

Production

https://api.podmind.ai/api/v1

---

# 3. Authentication

Authorization

Bearer JWT Token

Example

Authorization: Bearer eyJhbGciOi...

---

# 4. Standard Response

Success

{
    "success": true,
    "message": "Operation completed",
    "data": {}
}

Error

{
    "success": false,
    "message": "Validation Error",
    "errors": []
}

---

# 5. HTTP Status Codes

200 Success

201 Created

204 Deleted

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

422 Validation Error

429 Rate Limited

500 Server Error

---

# 6. API Modules

Authentication

Projects

Research

AI Chat

Guest Assistant

Content Builder

SEO

Social Media

Exports

Billing

Settings

Notifications

Analytics

Admin

---

# 7. Authentication API

POST /auth/register

POST /auth/login

POST /auth/logout

POST /auth/forgot-password

POST /auth/reset-password

GET /auth/me

PATCH /auth/profile

DELETE /auth/account

---

# 8. Projects API

GET /projects

POST /projects

GET /projects/{id}

PATCH /projects/{id}

DELETE /projects/{id}

POST /projects/{id}/duplicate

POST /projects/{id}/archive

POST /projects/{id}/favorite

---

# 9. Research API

POST /research/generate

GET /research

GET /research/{id}

PATCH /research/{id}

DELETE /research/{id}

POST /research/{id}/regenerate

POST /research/{id}/export

GET /research/{id}/sources

POST /research/{id}/bookmark

POST /research/{id}/share

---

# 10. AI Chat API

POST /chat/message

GET /chat/history

GET /chat/{id}

DELETE /chat/{id}

POST /chat/regenerate

POST /chat/stop

POST /chat/summarize

POST /chat/continue

---

# 11. Guest Assistant API

POST /guests/search

POST /guests/research

GET /guests

GET /guests/{id}

PATCH /guests/{id}

DELETE /guests/{id}

POST /guests/questions

POST /guests/export

---

# 12. Content Builder API

POST /outline/generate

POST /script/generate

POST /script/improve

POST /script/rewrite

POST /script/shorten

POST /script/expand

POST /script/export

GET /scripts

---

# 13. SEO API

POST /seo/generate

GET /seo/{id}

PATCH /seo/{id}

POST /seo/regenerate

POST /seo/export

---

# 14. Social Media API

POST /social/generate

POST /social/linkedin

POST /social/twitter

POST /social/facebook

POST /social/instagram

POST /social/threads

POST /social/newsletter

POST /social/export

---

# 15. Export API

POST /export/pdf

POST /export/docx

POST /export/markdown

POST /export/txt

GET /exports

DELETE /exports/{id}

---

# 16. Billing API

GET /billing/plans

GET /billing/subscription

POST /billing/checkout

POST /billing/cancel

POST /billing/resume

GET /billing/invoices

GET /billing/credits

---

# 17. Settings API

GET /settings

PATCH /settings/profile

PATCH /settings/theme

PATCH /settings/notifications

PATCH /settings/language

PATCH /settings/provider

PATCH /settings/security

---

# 18. Notifications API

GET /notifications

PATCH /notifications/read

PATCH /notifications/read-all

DELETE /notifications/{id}

---

# 19. Analytics API

GET /analytics/dashboard

GET /analytics/projects

GET /analytics/usage

GET /analytics/credits

GET /analytics/research

---

# 20. Admin API

GET /admin/users

PATCH /admin/users/{id}

DELETE /admin/users/{id}

GET /admin/subscriptions

GET /admin/analytics

GET /admin/ai-usage

GET /admin/logs

GET /admin/system

---

# 21. Webhooks

Stripe

Supabase

Future

Zapier

Make

Slack

Discord

---

# 22. Pagination

?page=1

&limit=20

&sort=created_at

&order=desc

---

# 23. Filtering

status=

provider=

category=

date=

project=

user=

---

# 24. Searching

?q=keyword

---

# 25. Validation

Every endpoint validates

UUID

Strings

Numbers

Dates

Enums

Files

---

# 26. Rate Limits

Free

60 requests/min

Pro

300 requests/min

Business

1000 requests/min

Enterprise

Unlimited (Fair Usage Policy)

---

# 27. Security

JWT

HTTPS

RLS

Rate Limit

Input Sanitization

Audit Logs

---

# 28. Logging

Every API logs

User

IP

Duration

Errors

Provider

Credits

---

# 29. Versioning

/api/v1/

/api/v2/

Older versions remain supported during migration.

---

# 30. API Standards

REST

JSON

Consistent Responses

Meaningful Error Messages

Idempotent PATCH/DELETE where applicable

---

# 31. Future APIs

Voice

Recording

Video

Plugin Marketplace

Chrome Extension

Mobile

Public SDK

GraphQL Gateway (Future)

---

# 32. Acceptance Criteria

✓ REST Standard

✓ Secure

✓ Scalable

✓ Versioned

✓ Documented

✓ Production Ready

---

Next Document

07-AI-Prompt-Library.md
