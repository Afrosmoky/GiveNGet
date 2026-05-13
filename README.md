# GiveNGet — Food Sharing Marketplace

GiveNGet is a Polish community platform for sharing surplus food between individuals and local businesses. Users can post food offers, browse listings on a map, and communicate in real time with other members.

## What It Does

Users register as individuals or companies, browse and post food offers (with location, photos, and categories), and contact offer owners through a built-in chat. The platform includes push notifications, email verification, a favorites system, and a moderation panel for admins.

---

## Why This Project Is Interesting

- **Real-time architecture** — WebSocket-based chat with read receipts and unread message counters
- **Dual registration flow** — separate paths and validation for individual users and companies, both with avatar/logo upload
- **Geolocation integration** — offers displayed on an interactive map powered by Geoapify
- **Push notifications** — Firebase Cloud Messaging with a service worker for background delivery
- **Email verification pipeline** — activation codes with expiry, deduplication via `sessionStorage`, and cache-eviction fix to prevent stale login state
- **Role-based access** — user, moderator, and admin roles with separate permission scopes
- **Production-ready Docker setup** — single `docker compose up` spins up MySQL, backend, and frontend

---

## Architecture Overview

```
┌─────────────────────┐        REST + WebSocket        ┌──────────────────────┐
│   Next.js 15 (SPA)  │ ─────────────────────────────► │  Spring Boot 3.5 API │
│   App Router        │                                 │  JWT Auth            │
│   Tailwind CSS      │ ◄───────────────────────────── │  WebSocket (STOMP)   │
└─────────────────────┘                                 └──────────┬───────────┘
                                                                   │
                                                            ┌──────▼──────┐
                                                            │   MySQL 8   │
                                                            └─────────────┘
```

Key patterns:
- Service / Repository layering in Spring Boot
- Spring Cache (`@Cacheable` / `@CacheEvict`) for user lookups
- JPA with `JOINED` inheritance strategy for user types
- Next.js App Router with server and client components
- `sessionStorage` guard to prevent duplicate API calls on React remounts

---

## Tech Stack

**Backend**
- Java 21, Spring Boot 3.5
- Spring Security + JWT
- Spring WebSocket (STOMP over SockJS)
- Spring Cache (Caffeine)
- Liquibase (database migrations)
- MySQL 8

**Frontend**
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Firebase SDK (push notifications)

**Infrastructure**
- Docker + Docker Compose
- Nginx (reverse proxy)
- VPS deployment (Ubuntu)

**External APIs**
- Geoapify (geocoding + map tiles)
- Firebase Cloud Messaging (push notifications)
- SMTP (email verification)

---

## Key Features

| Feature | Description |
|---|---|
| Registration | Individual and company flows with avatar/logo upload |
| Email verification | Activation link with 3-day expiry |
| Offers | Create, browse, filter by category and location |
| Map view | Interactive map with offer markers (Geoapify) |
| Chat | Real-time 1:1 messaging with unread counters |
| Push notifications | FCM via service worker (background delivery) |
| Favorites | Save and manage preferred offers |
| Admin panel | User management, complaints, moderation, dashboard stats |

---

## Local Setup

### Prerequisites

- Docker Desktop
- `.env` file (copy from `.env.local` and fill in values)

### Start

```bash
docker compose up -d --build
```

Services:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8080`
- MySQL: `localhost:3306`

### Environment Variables

| Variable | Description |
|---|---|
| `MYSQL_*` | Database connection |
| `JWT_SECRET` | JWT signing key |
| `MAIL_*` | SMTP credentials for verification emails |
| `NEXT_PUBLIC_API_URL` | Backend URL (baked into Next.js build) |
| `GEOAPIFY_KEY` | Geoapify API key |
| `CORS_ALLOWED_ORIGIN` | Frontend origin for WebSocket CORS |
| Firebase config | FCM project credentials |

---

## My Role

- Full-stack architecture and implementation
- Spring Boot backend (auth, chat, offers, notifications)
- Next.js frontend (registration flow, chat UI, map view, admin panel)
- Docker infrastructure and VPS deployment
- WebSocket real-time chat design
- Firebase push notification integration
