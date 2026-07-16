# Legacy

Pre-documentation implementations, preserved for reference and porting:

- **api-fastapi/** — MVP-1 FastAPI backend (34 passing tests). The AI Provider
  Manager (`app/services/ai/`) is the reference implementation for the NestJS
  AI Router (Stage 7): provider adapters, retry/backoff, BYOK encryption,
  JSON extraction, credit costing.
- **web-mvp1-partial/** — interrupted MVP-1 Next.js scaffold. Superseded by
  the docs-driven frontend (04-UI-UX-Blueprint, 05-Design-System,
  15-Frontend-Architecture).

Nothing in this folder is part of the build graph.
