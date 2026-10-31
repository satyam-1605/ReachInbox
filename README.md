# ReachInbox Email Job Scheduler

A production-grade, distributed email scheduling platform built with Express.js, TypeScript, BullMQ delayed queues on Redis, PostgreSQL (Prisma ORM), Elasticsearch full-text search, Ethereal SMTP delivery, Google OAuth 2.0, Slack rate-limit alert notifications, and a modern Next.js 14 dashboard.

- **Live Deployment**: _[Placeholder: https://your-app.duckdns.org]_
- **Demo Video (Max 5 mins)**: _[Placeholder: YouTube / Loom / Drive link]_
- **Bull Board Queue Dashboard**: `http://localhost:4000/admin/queues` (Local) 

---

## Architecture Overview

```mermaid
flowchart TD
    User([User Browser]) -->|Google OAuth & UI Actions| Frontend[Next.js 14 Dashboard]
    Frontend -->|REST API Requests| API[Express.js TypeScript Backend]
    
    API -->|Persist Users, Senders, Emails| DB[(PostgreSQL 16)]
    API -->|Queue Delayed Jobs jobId=emailId| RedisQueue[(BullMQ Redis Delayed ZSet)]
    API -->|Index Email Metadata| ES[(Elasticsearch 8.13)]
    
    Worker[BullMQ Queue Worker] -->|Picks up due delayed jobs| RedisQueue
    Worker -->|Check DB Idempotency Status| DB
    Worker -->|Atomic INCR Counter rate:sender:window| RedisQueue
    
    Worker -->|Under Limit: Deliver Email| Ethereal[Ethereal SMTP]
    Worker -->|Over Limit: Reschedule to Next Hour| RedisQueue
    Worker -->|First Limit Hit: Alert| SlackAPI[Slack Web API chat.postMessage]
    
    Admin([Developer / Ops]) -->|Live Queue Monitoring| BullBoard[Bull Board Dashboard]
```

### Core Architecture Components

| Component | Technology | Responsibility |
|---|---|---|
| **Frontend** | Next.js 14.2 (App Router) + Tailwind CSS | Dashboard UI, CSV lead file ingestion, Scheduled/Sent email tabs, real-time Elasticsearch search, Google login state, and Slack connection status. |
| **Backend API** | Express.js 4 + TypeScript | Validates payloads with Zod, provisions database records, calculates BullMQ job delays, verifies Google OAuth JWT sessions, and handles Slack OAuth connections. |
| **Queue & Cache** | BullMQ 6 + Redis 7 | Handles persistent delayed job scheduling without polling loops. Redis stores delayed sorted sets (`bull:email-queue:delayed`) and atomic rate limit counters. |
| **Database** | PostgreSQL 16 + Prisma ORM | System of record for users, senders, emails, and Slack workspace credentials. |
| **Email Delivery** | Ethereal SMTP + Nodemailer | Realistic zero-cost transactional email delivery with web-viewable message preview URLs for verification. |
| **Search Engine** | Elasticsearch 8.13 | Near real-time full-text search indexing across email recipients, subjects, and bodies. |
| **Alerting** | Slack Web API (`chat.postMessage`) | Notifies team channels in real-time when a sender exceeds their hourly sending quota. |
| **Queue UI** | Bull Board 9 | Real-time queue inspection interface mounted at `/admin/queues`. |

---

## Hard Constraints & Guarantees

1. **Strictly Zero Cron**: No `node-cron`, `crontab`, `agenda`, `cron` packages or `setInterval` polling loops are used anywhere in the codebase. Scheduling is executed purely through BullMQ delayed jobs backed by Redis sorted sets.
2. **Server & Worker Restart Resilience**: All scheduled jobs and their trigger timestamps live in persistent Redis storage. If the backend API or queue worker crashes or restarts, scheduled emails still execute at their exact intended timestamp without duplicate sends.
3. **Strict Idempotency**:
   - Each BullMQ job is queued with `jobId = emailId`. Redis naturally rejects duplicate jobs with the same ID.
   - When the worker picks up a job, it inspects the PostgreSQL database status. If already `SENT`, it skips processing immediately.
   - Status transitions to `SENT` with an atomic `sentAt` timestamp immediately after successful SMTP dispatch.
4. **Atomic Rate Limiting with Zero Dropped Jobs**:
   - Hourly sender quotas are tracked atomically in Redis using `rate:{senderId}:{YYYY-MM-DD-HH}` keys with a 2-hour TTL.
   - When a sender exceeds their hourly limit, jobs are **never** dropped or marked as failed. They are automatically rescheduled to the beginning of the next hour window (`nextHourStart`), updated to `status = RESCHEDULED` in PostgreSQL, and dispatched in the subsequent window.
   - A real Slack Web API call (`chat.postMessage`) is dispatched on the first limit hit within each hour window.
5. **Real Google & Slack OAuth**: Real OAuth 2.0 flows with secure HTTP-only cookies and database persistence. No mock logins.

---

## Directory Structure

```
emailjobscheduler/
├── docker-compose.yml      # Local development Postgres 16, Redis 7, Elasticsearch 8.13.4
├── init-db.sql             # Automatic initialization script for test database
├── README.md               # Project documentation
├── backend/
│   ├── prisma/
│   │   ├── migrations/     # Committed SQL migrations
│   │   └── schema.prisma   # PostgreSQL Prisma schema (User, Sender, Email, Slack)
│   ├── src/
│   │   ├── config/         # Zod environment variable validation (env.ts)
│   │   ├── modules/
│   │   │   ├── auth/       # Google OAuth 2.0, JWT cookie session, /auth/me
│   │   │   ├── emails/     # Schedule API, list scheduled/sent, BullMQ producer
│   │   │   ├── search/     # Elasticsearch indexing and search service
│   │   │   ├── senders/    # Sender management service
│   │   │   └── slack/      # Slack OAuth connection and rate limit alerting
│   │   ├── queue/          # BullMQ queue, worker processor, rate limiter, Bull Board
│   │   ├── routes/         # Express API router aggregation
│   │   ├── app.ts          # Express application setup, CORS, and routing
│   │   ├── index.ts        # API server entrypoint (Express HTTP server only)
│   │   └── worker.ts       # Queue worker entrypoint (BullMQ worker only)
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
└── frontend/
    ├── app/                # Next.js 14 App Router (layout, page, login, globals.css)
    ├── components/         # Header, Tabs, ComposeView, SearchBar, Sidebar
    │   └── ui/             # Reusable UI library (Button, EmptyState, Toast, etc.)
    ├── lib/                # API client and pure CSV lead parsing engine
    ├── types/              # TypeScript interfaces for strict type safety
    ├── package.json
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── vitest.config.ts
```

---

## Ethereal Email Setup

Ethereal is a zero-cost fake SMTP service used for realistic email delivery testing without sending real emails to actual user inboxes.

### 1. Option A (Automatic Disposable Account)
- Leave `ETHEREAL_USER` and `ETHEREAL_PASS` empty in `backend/.env`.
- On the first email dispatch, the worker lazily calls `nodemailer.createTestAccount()` and caches the transport in memory for that process run.
- On worker restart, a fresh disposable account is generated.
- Individual sent emails are viewed via the direct preview URLs printed in the worker logs:
  ```
  [Worker] Email delivered! Preview: https://ethereal.email/message/...
  ```

### 2. Option B (Persistent Inbox across Restarts - Recommended)
- Create a free persistent account at [ethereal.email/create](https://ethereal.email/create).
- Put your credentials in `backend/.env`:
  ```env
  ETHEREAL_USER=your_user@ethereal.email
  ETHEREAL_PASS=your_password
  ```
- All sent emails across any server restarts will accumulate in your persistent web inbox at [ethereal.email/messages](https://ethereal.email/messages).

---

## Google OAuth 2.0 Setup

1. Open the [Google Cloud Console](https://console.cloud.google.com/) > **APIs & Services** > **Credentials**.
2. Click **Create Credentials** > **OAuth client ID** (Application type: *Web application*).
3. Set **Authorized JavaScript origins**:
   - Development: `http://localhost:3000`
   - Production: `https://your-app.duckdns.org`
4. Set **Authorized redirect URIs**:
   - Development: `http://localhost:4000/auth/google/callback`
   - Production: `https://your-app.duckdns.org/auth/google/callback`
5. Under **OAuth consent screen**:
   - Required scopes: `.../auth/userinfo.profile`, `.../auth/userinfo.email`.
   - If the publishing status is **Testing**, add reviewer Gmail addresses under **Test users**.
6. Copy **Client ID** and **Client Secret** into `backend/.env`:
   ```env
   GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback
   ```

---

## Slack App Setup

1. Open the [Slack API Portal](https://api.slack.com/apps) and click **Create New App** > **From scratch**.
2. Under **OAuth & Permissions** > **Redirect URLs**, add:
   - Development: `http://localhost:4000/auth/slack/callback`
   - Production: `https://your-app.duckdns.org/auth/slack/callback`
3. Under **Scopes** > **Bot Token Scopes**, add:
   - `chat:write` (Allows posting alert messages)
   - `channels:read` (Allows discovering public channels)
4. Under **Basic Information** > **App Credentials**, copy the credentials into `backend/.env`:
   ```env
   SLACK_CLIENT_ID=your_slack_client_id
   SLACK_CLIENT_SECRET=your_slack_client_secret
   SLACK_REDIRECT_URI=http://localhost:4000/auth/slack/callback
   ```
5. On the frontend dashboard, click **Connect Slack** in the sidebar to authorize the workspace and select the notification channel.

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Docker & Docker Compose
- Git

---

### Step 1: Start Infrastructure
Launch PostgreSQL, Redis, and Elasticsearch using Docker Compose:

```bash
docker compose up -d
```

Verify that all three containers are healthy:
```bash
docker compose ps
```

- **PostgreSQL**: `localhost:5433` (mapped from container 5432 to avoid host port 5432 collisions)
- **Redis**: `localhost:6379`
- **Elasticsearch**: `localhost:9200`

---

### Step 2: Configure Environment Variables

#### Backend Configuration (`backend/.env`)
Copy `backend/.env.example` to `backend/.env`:

```bash
cd backend
cp .env.example .env
```

| Variable | Description | Real Example / Default |
|---|---|---|
| `NODE_ENV` | Application environment | `development` / `production` |
| `PORT` | API server port | `4000` |
| `DATABASE_URL` | PostgreSQL connection URL | `postgresql://reachinbox:reachinbox@localhost:5433/reachinbox?schema=public` |
| `REDIS_HOST` | Redis host | `localhost` (dev) / `redis` (docker) |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_DB` | Redis database index | `0` (dev) / `1` (tests) |
| `WORKER_CONCURRENCY` | Concurrent BullMQ worker jobs | `2` (default) |
| `MIN_DELAY_BETWEEN_EMAILS_MS` | Minimum default spacing between emails | `2000` (2 seconds) |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | Server hourly quota per sender | `3` (dev/test) / `200` (production) |
| `MAX_HOURLY_LIMIT_CAP` | Hard ceiling for user-requested hourly limit | `100` |
| `FRONTEND_URL` | Frontend origin for CORS and OAuth redirects | `http://localhost:3000` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `your-id.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `your-secret` |
| `GOOGLE_CALLBACK_URL` | Google OAuth redirect callback | `http://localhost:4000/auth/google/callback` |
| `SESSION_SECRET` | Secret key for JWT session cookies | `your-session-secret-key-min-32-chars` |
| `SLACK_CLIENT_ID` | Slack App OAuth Client ID | `your-slack-client-id` |
| `SLACK_CLIENT_SECRET` | Slack App OAuth Client Secret | `your-slack-client-secret` |
| `SLACK_REDIRECT_URI` | Slack OAuth callback URL | `http://localhost:4000/auth/slack/callback` |
| `ELASTICSEARCH_NODE` | Elasticsearch instance URL | `http://localhost:9200` |
| `ETHEREAL_USER` | Ethereal SMTP username | `user@ethereal.email` (or leave empty) |
| `ETHEREAL_PASS` | Ethereal SMTP password | `password` (or leave empty) |

#### Frontend Configuration (`frontend/.env.local`)
Copy `frontend/.env.local.example` to `frontend/.env.local`:

```bash
cd ../frontend
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

### Step 3: Database Migrations

Apply migrations to initialize your PostgreSQL schema:

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
```

---

### Step 4: Run the Application

Start the three processes in separate terminal windows:

#### 1. Express Backend API
```bash
cd backend
npm run dev
# Running on http://localhost:4000
```

#### 2. BullMQ Queue Worker
```bash
cd backend
npm run worker
# Listening for due jobs on queue 'emailQueue'
```

#### 3. Next.js Dashboard Frontend
```bash
cd frontend
npm install
npm run dev
# Dashboard running on http://localhost:3000
```

---

## Delay Between Emails & Worker Concurrency

- **Custom Staggered Timing**: We do not rely on BullMQ's built-in `limiter` option. Instead, the scheduler computes a deterministic future timestamp for each email in a batch:
  `scheduledAt = baseTime + index * delayBetweenEmailsMs`
- **Delayed Sorted Set**: Each email is enqueued as an independent BullMQ delayed job with `delay = scheduledAt - now`. Redis stores these in a sorted set (`bull:email-queue:delayed`) ordered by trigger timestamp.
- **Worker Concurrency Safety**: Worker concurrency is governed by `WORKER_CONCURRENCY` in `.env` (default: 2). Even if concurrency is set higher (e.g. 5 or 10), jobs do not fire simultaneously because their target timestamps are staggered across the delayed sorted set. When due, BullMQ promotes them one by one.

---

## Per-Request Form Settings vs. Server Limits

- **Delay Between Emails**: In the Compose modal, users can specify an inter-email gap (e.g. 2s = 2000ms). If `0`, empty string `""`, or omitted, the backend schema (`emails.validation.ts`) automatically falls back to `MIN_DELAY_BETWEEN_EMAILS_MS` from the server environment.
- **Hourly Limit**: Users can specify an hourly sending limit in the Compose modal:
  1. The API validates the value and stores it in the database (`emails.hourlyLimit`).
  2. If omitted, `0`, or `""`, it is treated as "not set" and defaults to `MAX_EMAILS_PER_HOUR_PER_SENDER`.
  3. The worker enforces the effective limit:
     `effectiveLimit = Math.min(email.hourlyLimit ?? MAX_EMAILS_PER_HOUR_PER_SENDER, MAX_HOURLY_LIMIT_CAP)`
  4. This allows flexible per-campaign limits while guaranteeing that users cannot bypass the server's hard ceiling (`MAX_HOURLY_LIMIT_CAP`).

---

## Features Implemented

### Backend
- **Zero-Cron Scheduling**: Pure BullMQ delayed jobs backed by Redis sorted sets. Zero cron libraries, zero polling loops.
- **Persistence**: PostgreSQL (Prisma ORM) system of record for users, senders, emails, and OAuth state.
- **Strict Idempotency**: `jobId = emailId` deduplication in BullMQ, pre-send DB status check (`status === SENT`), atomic post-send `sentAt` update.
- **Atomic Rate Limiting**: Redis `INCR` on `rate:{senderId}:{YYYY-MM-DD-HH}` keys with 2-hour TTL.
- **Zero-Drop Rescheduling**: Over-limit jobs are recalculated to the next hour window (`nextHourStart`), updated to `status = RESCHEDULED` in PostgreSQL, and never failed or dropped.
- **Worker Concurrency**: Safe concurrent processing governed by `WORKER_CONCURRENCY`.
- **Search**: Near real-time Elasticsearch indexing across recipients, subjects, and bodies.
- **Slack Alerts**: Real Slack Web API call (`chat.postMessage`) dispatched on the first rate limit breach per sender per hour window (silent skip if Slack is disconnected).
- **Bull Board UI**: Live queue inspection interface mounted at `/admin/queues`.

### Frontend
- **Authentication**: Clean Google OAuth 2.0 SSO card (Continue with Google), session check, and automatic redirection.
- **Sidebar & Profile**: ReachInbox header, top user profile card (avatar, name, email), logout action, live scheduled/sent badges, Slack OAuth connect pill.
- **Visual Rich Text Editor**: WYSIWYG editor supporting bold, italic, underline, strikethrough, text alignment, bulleted lists, numbered lists, links, and file attachments.
- **CSV Upload**: Lead ingestion with header detection, email validation, duplicate removal, and bad-row detection.
- **Scheduled List**: Scheduled emails with target execution timestamps, status badges, and interactive filter/sort popover.
- **Sent List**: Delivered emails with actual delivery timestamps, status indicators, and detail view modal.
- **Elasticsearch Search Bar**: Top control bar search with live debouncing and search result views.
- **State Feedback**: Skeleton loading rows, empty states with call-to-action buttons, error alerts with retry triggers, and animated toast notifications.

---

## Automated Test Suites

The project contains **87 automated tests** (39 backend tests + 48 frontend tests) covering API endpoints, queue workers, rate limiters, search indexing, CSV parsing, and UI components.

### Run Backend Tests (39 tests across 11 suites)
```bash
npm test --prefix backend
```
- `hourlyWindow.test.ts`: Pure UTC hour window calculations and next hour timestamp derivation.
- `hourlyLimit.test.ts`: Form limit resolution above env default, env capping, and graceful validation fallbacks.
- `rateLimiter.test.ts`: Atomic Redis `INCR` counter, 2-hour key expiration, and over-limit detection.
- `idempotency.test.ts`: Deduplication via `jobId = emailId` and skipping emails already marked `SENT`.
- `worker.test.ts`: End-to-end BullMQ worker dispatch, status transition, and Ethereal delivery.
- `restart.test.ts`: Worker shutdown and restart resilience verifying scheduled jobs survive downtime.
- `scheduleApi.test.ts`: POST `/emails/schedule` validation, database persistence, and BullMQ producer.
- `elasticsearch.test.ts`: Indexing documents and querying matches across recipients, subjects, and bodies.
- `slack.test.ts`: Slack OAuth connection flow and rate-limit alert message dispatch.
- `auth.test.ts`: Google OAuth session cookies, route access protection, and `/auth/me`.
- `csvParser.test.ts`: Backend CSV parsing and duplicate removal.

### Run Frontend Tests (48 tests across 11 suites)
```bash
npm test --prefix frontend
```
- `page.test.tsx`: Landing auth gate, dashboard rendering, extended search bar, and interactive status filtering.
- `login.test.tsx`: Clean Google OAuth 2.0 button rendering and session redirection.
- `ComposeView.test.tsx`: Full page layout, CSV lead upload, rich text toolbar actions, and form submission.
- `ScheduledTab.test.tsx`: Scheduled list rendering, skeleton loading, empty state, and refresh action.
- `SentTab.test.tsx`: Delivered emails list, delivery time formatting, and empty state.
- `EmailRow.test.tsx`: Row metadata, star toggle, recipient chips, and status badges.
- `EmailDetailView.test.tsx`: Detail drawer rendering body HTML, sender details, and timestamps.
- `Sidebar.test.tsx`: Top profile card, navigation tabs, compose trigger, and Slack status pill.
- `Toast.test.tsx`: Success, error, and info toast notifications.
- `SendLaterModal.test.tsx`: Scheduling time presets and custom date-time picker.
- `csvParser.test.ts`: Client-side CSV file parsing, duplicate deduction, and invalid row handling.

---

## Technical Specifications & Verified Claims

- **Zero `setInterval`**: Verified across the entire codebase. Neither the backend nor the frontend uses `setInterval` for scheduling or polling loops.
- **Real Dependency Versions**:
  - Next.js: `14.2.35`
  - PostgreSQL: `16` (Alpine)
  - Redis: `7` (Alpine)
  - Elasticsearch: `8.13.4`
- **Redis Persistence**: In local development (`docker-compose.yml`), Redis data is saved to a persistent named volume (`redis_data`).
- **Queue Order on Reschedule**: When multiple emails exceed the hourly quota in a window, all over-limit jobs are rescheduled to the start of the next hour window (`nextHourStart`). Queue order upon rescheduling is **approximate** (FIFO order in the delayed set at the new window start).

---

## Assumptions & Trade-offs

1. **Only Google Login (OAuth 2.0)**: Google OAuth 2.0 is the sole authentication provider. There is no email/password registration, password recovery, or multi-tenant user management, simplifying auth to strict verified Google accounts.
2. **No Delete or Archive Operations**: Scheduled and delivered emails follow a forward-only status lifecycle (`SCHEDULED` -> `SENT` or `RESCHEDULED`). There are no endpoints to delete, cancel, or archive jobs once enqueued.
3. **Approximate Queue Order on Reschedule**: When multiple emails hit the hourly limit, all over-limit jobs are rescheduled to the exact start of the next hour window (`nextHourStart`). While BullMQ preserves approximate FIFO order, individual inter-email stagger delays are reset to the window start.
4. **Default Sender Fallback**: If an email schedule request omits `senderId` or `userId` (such as in programmatic API tests or single-user compose), the backend defaults to the system default user/sender via `getDefaultUserAndSender()` instead of rejecting with 400.
5. **Ethereal Mail in Place of Production SMTP**: Ethereal SMTP is used as specified in the assignment instead of a paid provider (like SendGrid or AWS SES). Real transactional messages are delivered to web viewable mailboxes with message preview URLs printed in logs.
6. **Single-Node Elasticsearch**: Elasticsearch runs in single-node mode (`discovery.type=single-node`) with security disabled (`xpack.security.enabled=false`) inside the private Docker network to reduce memory footprint on an 8 GB VM.
7. **Single Slack Notification per Window**: When the hourly rate limit is hit multiple times by consecutive jobs in the same hour window, only one notification is sent via the Slack Web API (`chat.postMessage`) per sender per window to avoid notification spam.
8. **PostgreSQL Port 5433**: Mapped to host port `5433:5432` in Docker Compose to eliminate port collisions on development machines already running local PostgreSQL instances on port 5432.
