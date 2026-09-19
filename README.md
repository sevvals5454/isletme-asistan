# TechİŞ — İşletme Asistanı (Business Assistant)

A production, multi-tenant **SaaS for small businesses** that unifies **CRM, appointments, packages/memberships, online booking, staff management, finance and a data-driven "smart assistant"** in a single, mobile-friendly panel — designed to be **sector-independent** (pilates & fitness studios, beauty & hair salons, clinics, tutoring, and any appointment-based business).

> Designed and built end-to-end (full-stack, solo) — and **used by real small businesses across multiple sectors** (pilates studio, beauty salon, hair salon, medical retail).

**🔗 Live demo:** https://isletme-asistan.vercel.app

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres_%2B_Auth_%2B_RLS-3FCF8E?logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-deployed-000000?logo=vercel&logoColor=white)

---

## Why it's interesting

This is not a CRUD demo — it's a real product solving real operational problems for owner-operated businesses, with production concerns handled end-to-end:

- **Multi-tenant security enforced at the database layer** (PostgreSQL Row-Level Security), not just in the UI.
- **Role-based access (owner / employee) implemented in the database** with security-definer functions — an employee physically cannot read another staff's customers or the business's finances, even via direct API calls.
- **A "smart assistant" analytics layer with no paid AI** — churn detection, package-expiry alerts, revenue/service analysis, no-show risk and staff performance, all computed from real data with explicit guards against fabricating insights when data is insufficient.
- **Web push notifications** (VAPID, no Firebase) with a morning digest, plus **installable PWA / mobile** packaging.
- **Resilient migrations & tolerant queries** so a not-yet-applied migration degrades gracefully instead of breaking core flows.

---

## Features

**Customers (CRM)**
- Contacts with notes, tags/segments, Turkish phone formatting & validation, KVKK (GDPR-equivalent) consent tracking
- Bulk import (paste a list → parse name/phone/note → preview → import), per-group tagging & filtering
- Customer "since" date for back-dating existing clients

**Appointments & Calendar**
- Service-driven duration & price, status tracking (scheduled / completed / no-show / cancelled)
- Recurring appointments (weekly / bi-weekly / monthly)
- Month **and** week calendar views; same time-slot ("group") appointments share a color (accessible, validated palette)
- Availability warnings against working hours, closed days and per-staff leave

**Packages & Memberships**
- Session packages (credit-based) and monthly memberships (payment-day tracking), automatic remaining-session calc
- Make-up (telafi) system: one make-up right per package that doesn't consume sessions

**Online Booking (customer self-service)**
- Public per-business booking page; capacity is computed **per staff** (active staff − on-leave), respecting working hours, closed days and existing bookings
- Phone required + rate limiting (anti-abuse), optional owner-approval workflow, min-notice / max-advance windows
- Instant web-push to the owner on a new booking

**Staff & Roles**
- Two roles — **owner** sees everything; **employee** sees only their own customers/appointments (finance, reports, settings hidden and DB-blocked)
- Owner-invited employee logins; auto-assignment of new records to the creating employee

**Finance & Reports**
- Payments ledger (cash / card / transfer), expenses, payroll (salary + commission)
- Monthly revenue, collection, completion rate, no-show, top services, loyal customers, staff performance

**Smart Assistant (no external AI)**
- "What should I do today", weekly report, churn / win-back, package-ending, revenue & service analysis, appointment-risk, staff performance — all from real data

**Messaging & Notifications**
- Editable message templates with variables (`{ad} {tarih} {saat} {hizmet} {paket} {kalan} {isletme}`), one-tap WhatsApp (free, via `wa.me`), bulk messaging by segment/tag
- Web push: appointment reminders, due-note reminders, morning daily digest

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 16** (App Router, React Server Components) |
| Language | **TypeScript** |
| UI | **React 19**, **Tailwind CSS 4**, lucide-react, sonner |
| Backend / DB | **Supabase** — PostgreSQL, Auth (`@supabase/ssr`), **Row-Level Security** |
| Validation | Zod |
| Notifications | Web Push (VAPID, `web-push`) + external cron |
| Mobile | PWA + **Capacitor** (Android) |
| Hosting | **Vercel** (CI/CD on push) |

---

## Architecture & engineering highlights

- **Multi-tenancy via RLS** — every row is scoped by `organization_id`; a security-definer `user_org_ids()` function backs the policies so each business only ever sees its own data. Verified with end-to-end isolation tests (an anon or cross-tenant client cannot read protected tables).
- **Database-level authorization** — `is_org_owner()`, `owner_org_ids()`, `current_staff_id()` power role-based policies; employees are limited to their own records by the policy, not the client. Employee invites are wired server-side with the service-role key so privilege can't be self-granted.
- **Security-definer RPCs for controlled writes** — e.g., employees can edit shared message templates without being able to change protected org fields (name, IBAN).
- **Booking capacity engine** — availability is computed per staff, folding in leave, closed days, working hours and overlap detection, with the same logic enforced in the write path (no double-booking, even under concurrent requests).
- **No-AI analytics** — the assistant derives every insight from aggregates over real data and explicitly refuses to show a metric when the sample is too small (no hallucinated numbers).
- **Resilience** — queries try the newest schema and fall back gracefully, so deploying code ahead of a manual migration never breaks core flows.
- **Correctness details** — all date/time logic is pinned to `Europe/Istanbul` regardless of server timezone; membership lookups are always filtered by `user_id` to stay correct once a business has multiple members.

---

## Project structure

```
src/
  app/(app)/        # authenticated panel: dashboard, customers, appointments,
                    # calendar, packages, reports, expenses, assistant, settings…
  app/(auth)/       # login / signup
  app/b/[org]/      # public online-booking page
  app/api/          # route handlers (push, booking, staff invite…)
  components/       # UI + feature components
  lib/              # domain logic (insights, packages, templates, time, phone…)
supabase/
  schema.sql        # full schema + RLS (idempotent)
  migrations/       # incremental, idempotent migrations (001–028)
```

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in Supabase + VAPID keys
npm run dev                  # http://localhost:3000
```

Required env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (and, for push/server features, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`). Run `supabase/schema.sql` then the files in `supabase/migrations/` in your Supabase SQL editor.

---

## About

Built by **Şevval Uzunoğlu** as a solo full-stack project — product design, database & security model, UI, and deployment. It runs entirely on a free stack (no paid API dependency) and is in active use by early real-world businesses.
