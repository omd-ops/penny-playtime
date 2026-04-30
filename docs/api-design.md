# Daily Expense Tracker — API Design

**API version:** `v1`  
**Base URL:** `https://api.example.com/api/v1` (replace with production host)  
**Last updated:** April 14, 2026  
**Related:** [Product documentation](./expense-tracker-documentation.md) · [System design](./system-design.md) · [Database design](./db-design.md) · [Open questions](./open-questions.md)

---

## 1. Conventions

### 1.1 Global rules

| Rule | Detail |
|------|--------|
| Format | JSON; `Content-Type: application/json` |
| Property names | **camelCase** |
| IDs | **UUID** v4 in paths and bodies |
| Dates | **ISO 8601** UTC: `2026-04-14T12:30:00.000Z` |
| Currency amounts | Decimal strings in JSON (e.g. `"42.50"`) **or** integers in minor units—**pick one** per implementation and document in OpenAPI |
| Auth | `Authorization: Bearer <access_token>` unless using cookie sessions |
| Versioning | URL prefix `/api/v1/`; breaking changes → `/api/v2/` |

### 1.2 Pagination (list endpoints)

**Query parameters:**

| Param | Type | Default | Notes |
|-------|------|---------|--------|
| `page` | integer | `1` | Min 1 |
| `limit` | integer | `20` | Min 1, max 100 |

**Response wrapper:**

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Alternative:** cursor-based `?cursor=<opaque>&limit=20` with `nextCursor` in response—prefer for very large lists.

### 1.3 Filtering (expenses)

| Param | Example | Semantics |
|-------|---------|-----------|
| `categoryId` | uuid | Exact match |
| `from` | ISO date | `occurredAt >= from` (start of day UTC per product) |
| `to` | ISO date | `occurredAt <= end of day` |
| `search` | string | Optional: note substring |

### 1.4 Standard error response

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request validation failed",
    "details": [
      { "field": "amount", "message": "Must be a positive number" }
    ]
  }
}
```

---

## 2. Resource hierarchy

```
/api/v1
├── /me
│   ├── GET     — current user profile
│   └── PATCH   — update profile (currency, timezone, displayName)
├── /categories
├── /expenses
├── /budget-targets
├── /calendar
│   └── /month — GET month grid summaries
├── /days
│   └── /:date — GET day detail; PUT target-completion
├── /analytics
│   └── /summary — GET aggregates
├── /notification-preferences
├── /push-subscriptions
├── /report-exports
│   ├── POST   — create export job
│   └── /:jobId — GET status / metadata
├── /exports
│   └── /csv — GET or POST narrow CSV export (optional)
└── /agent (post-MVP)
    └── /turn — POST conversational turn
```

Nesting depth stays at most **two** path segments after `/api/v1` for collections (`/report-exports/:jobId`).

---

## 3. Endpoints

### 3.1 User profile

#### `GET /me`

Returns the authenticated user.

**Response `200`:**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "user@example.com",
  "displayName": "Alex",
  "currency": "USD",
  "timezone": "America/New_York",
  "createdAt": "2026-01-10T08:00:00.000Z",
  "updatedAt": "2026-04-01T10:00:00.000Z"
}
```

#### `PATCH /me`

**Request body (all optional):**

| Field | Type | Constraints |
|-------|------|-------------|
| displayName | string | 1–80 chars |
| currency | string | ISO 4217 code |
| timezone | string | IANA timezone |

**Response `200`:** updated user object.

---

### 3.2 Categories

#### `GET /categories`

List categories for the current user.

**Response `200`:** paginated `items` of:

```json
{
  "id": "uuid",
  "name": "Food",
  "color": "#5C6BC0",
  "iconKey": "restaurant",
  "createdAt": "2026-01-10T08:00:00.000Z",
  "updatedAt": "2026-01-10T08:00:00.000Z"
}
```

#### `POST /categories`

**Request body:**

| Field | Type | Required |
|-------|------|----------|
| name | string | yes, 1–64 chars |
| color | string | no, hex or token |
| iconKey | string | no |

**Response `201`:** category object.

#### `GET /categories/:categoryId`

**Response `200`:** single category.

#### `PATCH /categories/:categoryId`

**Response `200`:** updated category.

#### `DELETE /categories/:categoryId`

**Response `204`** if no expenses block deletion; **`409`** if expenses still reference category (or implement reassign via query `?reassignTo=<uuid>`).

---

### 3.3 Expenses

#### `GET /expenses`

**Query:** pagination + `categoryId`, `from`, `to`, `search` as in §1.3.

**Sort:** default `occurredAt desc`; optional `sort=occurredAt&order=asc`.

**Response `200`:** paginated list of:

```json
{
  "id": "uuid",
  "categoryId": "uuid",
  "categoryName": "Food",
  "amount": "12.50",
  "note": "Lunch",
  "occurredAt": "2026-04-14T12:30:00.000Z",
  "entryType": "debit",
  "createdAt": "2026-04-14T12:31:00.000Z",
  "updatedAt": "2026-04-14T12:31:00.000Z"
}
```

*`entryType` defaults to `debit` (outflow). `credit` is for inflows (refunds/income) when enabled—see product and DB design.*

#### `POST /expenses`

**Request body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| categoryId | uuid | yes | Must belong to user |
| amount | string (decimal) | yes | Must be positive |
| note | string | no | max 500 |
| occurredAt | ISO datetime | no | default now |
| entryType | enum | no | `debit` (default) or `credit` — credits roll into **credited** totals on calendar |

**Response `201`:** expense object.

#### `GET /expenses/:expenseId`

**Response `200`:** expense object.

#### `PATCH /expenses/:expenseId`

Partial update; same fields as POST (optional).

**Response `200`:** expense object.

#### `DELETE /expenses/:expenseId`

**Response `204`**.

---

### 3.4 Budget targets

#### `GET /budget-targets`

Optional query: `period=daily|monthly|yearly` to filter.

**Response `200`:** paginated or array (if small) of:

```json
{
  "id": "uuid",
  "period": "daily",
  "amount": "80.00",
  "effectiveFrom": "2026-04-01",
  "effectiveTo": null,
  "createdAt": "2026-04-01T08:00:00.000Z",
  "updatedAt": "2026-04-01T08:00:00.000Z"
}
```

#### `POST /budget-targets`

**Request body:**

| Field | Type | Required |
|-------|------|----------|
| period | enum | yes: `daily`, `monthly`, `yearly` |
| amount | string | yes |
| effectiveFrom | date | no |
| effectiveTo | date | no |

**Response `201`:** budget target.

#### `PATCH /budget-targets/:targetId`

**Response `200`:** updated target.

#### `DELETE /budget-targets/:targetId`

**Response `204`**.

---

### 3.5 Calendar & day detail

#### `GET /calendar/month`

Returns per-day rollups for building the **month grid** (totals, activity flags, saved checkbox).

**Query parameters:**

| Param | Type | Required |
|-------|------|----------|
| `year` | integer | yes |
| `month` | integer | yes, 1–12 |

**Response `200`:**

```json
{
  "year": 2026,
  "month": 4,
  "timezone": "America/New_York",
  "days": [
    {
      "date": "2026-04-14",
      "debitedTotal": "42.50",
      "creditedTotal": "0.00",
      "hasActivity": true,
      "targetCompleted": false
    }
  ]
}
```

*`creditedTotal` is `"0.00"` until income/refund modeling exists; `targetCompleted` reflects the user’s checkbox for that date.*

#### `GET /days/:date`

`:date` format **`YYYY-MM-DD`** (user’s calendar interpreted with their profile `timezone` for day boundaries).

**Response `200`:**

```json
{
  "date": "2026-04-14",
  "debitedTotal": "42.50",
  "creditedTotal": "0.00",
  "dailyTarget": {
    "limit": "80.00",
    "spent": "42.50",
    "remaining": "37.50",
    "status": "ok"
  },
  "targetCompleted": false,
  "expenses": [
    {
      "id": "uuid",
      "categoryId": "uuid",
      "categoryName": "Food",
      "amount": "18.00",
      "note": "Lunch",
      "occurredAt": "2026-04-14T12:30:00.000Z"
    }
  ]
}
```

#### `PUT /days/:date/target-completion`

Sets or clears the user’s **“met daily target”** flag for that calendar date.

**Request body:**

```json
{
  "targetCompleted": true
}
```

**Response `200`:**

```json
{
  "date": "2026-04-14",
  "targetCompleted": true,
  "updatedAt": "2026-04-14T20:00:00.000Z"
}
```

**Errors:** `404` if `:date` invalid; `422` if body invalid.

---

### 3.6 Analytics

#### `GET /analytics/summary`

Read-only aggregates for dashboards.

**Query parameters:**

| Param | Required | Values |
|-------|----------|--------|
| `granularity` | yes | `day`, `week`, `month`, `year` |
| `anchor` | no | ISO date; default today |
| `compare` | no | `true` — include previous period totals |

**Response `200`:**

```json
{
  "period": {
    "start": "2026-04-01T00:00:00.000Z",
    "end": "2026-04-30T23:59:59.999Z"
  },
  "totalSpend": "1240.00",
  "byCategory": [
    { "categoryId": "uuid", "name": "Food", "amount": "520.00", "percent": 42 }
  ],
  "previousPeriod": {
    "totalSpend": "1150.00",
    "deltaPercent": 7.8
  },
  "targets": {
    "daily": { "limit": "80.00", "spent": "42.50", "status": "ok" }
  }
}
```

*`status` may be `ok`, `warning`, `over` per product rules.*

---

### 3.7 Notification preferences

#### `GET /notification-preferences`

**Response `200`:**

```json
{
  "pushEnabled": true,
  "dailyReminderEnabled": true,
  "dailyReminderTime": "20:00",
  "thresholdPercent": 80,
  "quietHoursStart": "22:00",
  "quietHoursEnd": "07:00",
  "weeklyDigestEnabled": false,
  "weeklyDigestDay": "sunday"
}
```

#### `PUT /notification-preferences`

Full replacement or `PATCH` partial—choose one style consistently.

**Response `200`:** updated object.

---

### 3.8 Push subscriptions (Web Push)

#### `POST /push-subscriptions`

Registers VAPID subscription from service worker.

**Request body:**

```json
{
  "endpoint": "https://fcm.googleapis.com/...",
  "keys": { "p256dh": "...", "auth": "..." }
}
```

**Response `201`:** `{ "id": "uuid" }`.

#### `DELETE /push-subscriptions/:subscriptionId`

**Response `204`**.

---

### 3.9 Report exports (Excel / PDF)

#### `POST /report-exports`

Creates an async job.

**Request body:**

| Field | Type | Required |
|-------|------|----------|
| reportType | `expense_detail` \| `target_vs_actual` | yes |
| format | `xlsx` \| `pdf` | yes |
| dateFrom | date | yes |
| dateTo | date | yes |
| includeTransactionTable | boolean | no, default true |
| includeCharts | boolean | no, default true |
| targetPeriods | string[] | no | e.g. `["daily","monthly"]` for target report |

**Headers (optional):** `Idempotency-Key: <uuid>` to avoid duplicate jobs.

**Response `202`:**

```json
{
  "jobId": "uuid",
  "status": "queued",
  "pollUrl": "/api/v1/report-exports/uuid"
}
```

#### `GET /report-exports/:jobId`

**Response `200` (completed):**

```json
{
  "jobId": "uuid",
  "status": "completed",
  "downloadUrl": "https://storage.../signed",
  "expiresAt": "2026-04-14T13:00:00.000Z",
  "format": "pdf",
  "reportType": "expense_detail"
}
```

**Response `200` (pending):** `status`: `queued` | `processing`.

**Response `404`:** job not found or not owned by user.

---

### 3.10 CSV export (optional)

#### `GET /exports/csv`

**Query:** same date filters as expenses.

**Response `200`:** `text/csv` stream with `Content-Disposition: attachment`.

---

### 3.11 Agent (post-MVP)

#### `POST /agent/turn`

Server-mediated conversational step; implements tools against domain services.

**Request body:**

```json
{
  "messages": [
    { "role": "user", "content": "Spent 12 dollars on food" }
  ],
  "confirmToolExecution": false
}
```

When `confirmToolExecution` is `false`, tool calls return **drafts** only. When `true`, server executes persisted mutations (user must have confirmed in UI).

**Response `200`:**

```json
{
  "assistantMessage": "I can log $12.00 under Food for today. Should I save?",
  "toolCalls": [
    {
      "tool": "createExpense",
      "status": "pending_confirmation",
      "draft": {
        "amount": "12.00",
        "categoryId": "uuid",
        "occurredAt": "2026-04-14T12:00:00.000Z"
      }
    }
  ]
}
```

**Rate limit:** stricter than standard CRUD.

---

## 4. HTTP status codes (usage)

| Code | When |
|------|------|
| 200 | OK for GET, PATCH, PUT |
| 201 | Created |
| 202 | Accepted (async job) |
| 204 | No content (delete) |
| 400 | Malformed JSON or validation |
| 401 | Missing/invalid auth |
| 403 | Forbidden (rare: blocked user) |
| 404 | Resource not found |
| 409 | Conflict (delete category with expenses) |
| 422 | Business rule violation |
| 429 | Rate limit |
| 500 | Server error |

---

## 5. Error code registry

| Code | HTTP | Description |
|------|------|-------------|
| `AUTH_TOKEN_INVALID` | 401 | Bearer invalid or expired |
| `AUTH_REQUIRED` | 401 | No credentials |
| `FORBIDDEN` | 403 | Operation not allowed |
| `RESOURCE_NOT_FOUND` | 404 | Generic not found |
| `EXPENSE_NOT_FOUND` | 404 | Expense id unknown |
| `CATEGORY_NOT_FOUND` | 404 | Category id unknown |
| `BUDGET_TARGET_NOT_FOUND` | 404 | Target id unknown |
| `VALIDATION_FAILED` | 400 | Schema validation |
| `INVALID_DATE_RANGE` | 422 | `from` after `to` |
| `INVALID_CALENDAR_DATE` | 400 | `:date` not a valid `YYYY-MM-DD` |
| `DUPLICATE_TARGET` | 409 | Overlapping target for same period |
| `CATEGORY_IN_USE` | 409 | Cannot delete |
| `REPORT_JOB_NOT_FOUND` | 404 | Job id |
| `REPORT_NOT_READY` | 425 | Optional: Too Early while processing |
| `REPORT_GENERATION_FAILED` | 500 | Worker failure (details internal) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected |

---

## 6. Rate limits (suggested)

| Route group | Limit |
|-------------|-------|
| Default authenticated | 300 req/min per user |
| `POST /auth/*` | 20 req/min per IP |
| `POST /report-exports` | 10 req/min per user |
| `POST /agent/turn` | 30 req/min per user |

Return `429` with `Retry-After` header when applicable.

---

## 7. OpenAPI

Maintain a single **OpenAPI 3.1** YAML in the repository generated from or synced with this document; use it to generate clients in `packages/shared` if using a monorepo.

---

## 8. Changelog (API)

| Date | Change |
|------|--------|
| 2026-04-14 | Initial `v1` draft |
| 2026-04-14 | Added Calendar: `GET /calendar/month`, `GET /days/:date`, `PUT /days/:date/target-completion`; optional `entryType` on expenses |
