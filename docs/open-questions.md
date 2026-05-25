# Daily Expense Tracker — Open Questions & Decisions

**Document version:** 1.0  
**Last updated:** April 14, 2026  
**Purpose:** Single place to track unresolved product and technical choices. Update this file when a decision is made; link out to ADRs or tickets if you use them.

**Related:** [Product documentation](./expense-tracker-documentation.md) · [System design](./system-design.md) · [API design](./api-design.md) · [Database design](./db-design.md)

---

## How to use

| Column     | Meaning                                         |
| ---------- | ----------------------------------------------- |
| **ID**     | Stable reference (e.g. `PQ-001`)                |
| **Status** | `open` · `candidate` · `resolved`               |
| **Area**   | Product, API, Data, Infra, Post-MVP, Compliance |

When resolving an item, set **Status** to `resolved`, add **Decision** and **Date**, and optionally move the record to §7 Resolved log.

---

## 1. Product & UX

| ID     | Question                                                                                                                                 | Status    | Notes / options                                                                                    |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------- |
| PQ-001 | **Offline-first** (local storage, sync later) vs **cloud-first** (API + DB from day one)?                                                | open      | Affects PWA complexity, conflict resolution, and privacy story.                                    |
| PQ-002 | **Single currency** per user vs **multi-currency** with conversion and historical rates?                                                 | open      | Multi-currency implies rate source, storage of original currency per expense, and reporting rules. |
| PQ-003 | Are **category-level budget targets** in scope for v1, or only global daily/monthly/yearly caps?                                         | open      | If yes, UX and schema need per-category limits and rollups.                                        |
| PQ-004 | **Report delivery:** download only vs **email** exported files (adds mail provider, abuse controls)?                                     | open      | Post-MVP voice mentioned “email PDF” as optional.                                                  |
| PQ-005 | **Data retention:** how long to keep expenses, report jobs, and agent audit rows by default?                                             | open      | Matters for GDPR-style deletion and free-tier storage.                                             |
| PQ-006 | **Calendar “credits”:** ship **debit-only** expenses first (credits always `0`) vs require **credit** rows (`entry_type`) before launch? | candidate | [db-design.md](./db-design.md) adds `entry_type`; API defaults `debit`.                            |

---

## 2. Reports & exports

| ID     | Question                                                                                                                                | Status | Notes / options                                      |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------- |
| RQ-001 | **Report generation:** mostly **client-side** (privacy, device limits) vs **server-side** (native Excel charts, heavy PDF, async jobs)? | open   | Hybrid possible: summary client, full report server. |
| RQ-002 | For large date ranges, is **async-only** acceptable with polling, or must some exports stay synchronous?                                | open   | Ties to worker capacity and UX loading states.       |
| RQ-003 | **Object storage** for report files mandatory, or **stream** response and skip persistent storage?                                      | open   | Free-tier friendly if streams + short TTL URLs.      |

---

## 3. API & contracts

| ID     | Question                                                                                                                      | Status | Notes / options                                         |
| ------ | ----------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------- |
| AQ-001 | **Money in JSON:** decimal **strings** (e.g. `"12.50"`) vs **integers** in minor units—single convention for API and OpenAPI? | open   | Must match DB `NUMERIC` and rounding rules everywhere.  |
| AQ-002 | `notification-preferences`: **PUT** full replacement vs **PATCH** partial—one style only?                                     | open   | [api-design.md](./api-design.md) lists both as options. |
| AQ-003 | **Pagination:** offset `page/limit` vs **cursor** for expenses list at scale?                                                 | open   | Cursor better for deep lists; offset simpler for MVP.   |
| AQ-004 | **CSV export:** `GET` with query params vs `POST` with body for complex filters?                                              | open   | Documented as optional endpoint either way.             |

---

## 4. Database & data model

| ID     | Question                                                                                                                                                                    | Status    | Notes / options                                                |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------- |
| DQ-001 | **Budget targets:** **Strategy A** — history with non-overlapping `[effective_from, effective_to]` vs **Strategy B** — single row per `(user_id, period)` updated in place? | candidate | [db-design.md](./db-design.md) recommends B for v1 simplicity. |
| DQ-002 | Enable **`pg_trgm`** + GIN index on `expenses.note` for search, or defer until search is validated?                                                                         | open      | Extra extension and write cost.                                |
| DQ-003 | **Email uniqueness:** case-sensitive vs `citext` / `lower(email)` unique index?                                                                                             | open      | Affects registration and login edge cases.                     |
| DQ-004 | **Account deletion:** hard delete cascade vs soft-delete `users.deleted_at` with periodic purge?                                                                            | open      | Soft-delete keeps referential integrity and audit options.     |

---

## 5. Infrastructure & cost

| ID     | Question                                                                                                     | Status | Notes / options                                         |
| ------ | ------------------------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------- |
| IQ-001 | **Managed Postgres** provider (Neon, Supabase, etc.) vs **self-hosted** Docker for zero recurring cost?      | open   | Free tiers change—confirm current limits before launch. |
| IQ-002 | Is **Redis** (BullMQ) required for v1, or **DB-backed** or **in-process** queue for minimal free deployment? | open   | Redis adds another free-tier dependency (e.g. Upstash). |
| IQ-003 | **Auth vendor:** Supabase Auth, Clerk, Auth0, or self-hosted Auth.js only?                                   | open   | Maps to `users.auth_subject` and OAuth app setup.       |

---

## 6. Post-MVP: voice agent

| ID     | Question                                                                                    | Status | Notes / options                           |
| ------ | ------------------------------------------------------------------------------------------- | ------ | ----------------------------------------- |
| VQ-001 | **STT/TTS/LLM:** cloud APIs vs **on-device** only (privacy vs quality and browser support)? | open   |                                           |
| VQ-002 | **Interaction model:** push-to-talk only vs **wake word** (policy and battery)?             | open   |                                           |
| VQ-003 | **Audio retention:** no storage vs short-lived buffer for debugging (legal + consent)?      | open   | Default should be no raw audio retention. |
| VQ-004 | Should **agent_turns** store full LLM transcript or only tool calls?                        | open   | Privacy and storage size.                 |

---

## 7. Resolved decisions (log)

_Add rows here when you close items from the sections above._

| ID  | Decision | Date |
| --- | -------- | ---- |
| —   | —        | —    |

---

## 8. Document map

| Section | Content               |
| ------- | --------------------- |
| §1      | Product & UX          |
| §2      | Reports & exports     |
| §3      | API & contracts       |
| §4      | Database              |
| §5      | Infrastructure & cost |
| §6      | Voice (post-MVP)      |
| §7      | Resolved log          |
