# Together — React Native Migration Plan
### Full Refinement & Ticket Breakdown

> **Goal:** Evolve Together from a Next.js PWA into a true cross-platform product — a native iOS & Android app **plus** the existing web app — sharing one backend (Supabase), one monorepo, and as much business logic as possible.

---

## Table of Contents

1. [Decision Record](#1-decision-record)
2. [Architecture Overview](#2-architecture-overview)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Tech Stack](#4-tech-stack)
5. [Shared Backend (Minimal & Additive Changes)](#5-shared-backend-minimal--additive-changes)
6. [Screen Mapping](#6-screen-mapping)
7. [Epics](#7-epics)
8. [Tickets](#8-tickets)
9. [Dependency Graph](#9-dependency-graph)
10. [Risk Register](#10-risk-register)
11. [Definition of Done](#11-definition-of-done)
12. [Release Checklist](#12-release-checklist)

---

## 1. Decision Record

| Decision | Choice | Rationale |
|---|---|---|
| Mobile framework | **Expo (React Native)** | Managed workflow removes native build complexity; OTA updates; Expo Go for dev |
| Monorepo tool | **Turborepo** | Fast incremental builds, simple workspace config, works with npm |
| Shared code strategy | **`packages/` workspace** | Supabase client, types, hooks, and utilities shared between web and native |
| Styling (native) | **NativeWind v4** | Tailwind class names in React Native — minimal context switch from existing web code |
| Navigation (native) | **Expo Router** | File-based routing mirrors Next.js conventions; same mental model for the team |
| State management | **Zustand** | Lightweight, no boilerplate, replaces fragmented component state for shared concerns (auth, unread counts) |
| Push notifications | **Expo Push Notifications** | Single API for iOS APNs + Android FCM; replaces Web Push entirely on native |
| Image/video | **Expo Image Picker + Expo AV** | Managed, no native code required |
| Storage (native) | **Expo SecureStore + MMKV** | SecureStore for auth tokens, MMKV for fast local cache |
| App distribution | **EAS Build + EAS Submit** | Cloud builds for iOS/Android; no Mac required to build iOS |

---

## 2. Architecture Overview

### Current State (Web Only)

```
┌─────────────────────────────────────────────┐
│                  Browser                    │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │         Next.js 16 App              │   │
│  │  ┌──────────┐  ┌─────────────────┐  │   │
│  │  │  Pages   │  │   Components    │  │   │
│  │  │ (app/)   │  │  (Tailwind CSS) │  │   │
│  │  └────┬─────┘  └────────┬────────┘  │   │
│  │       │                 │            │   │
│  │  ┌────▼─────────────────▼────────┐  │   │
│  │  │      Supabase JS Client       │  │   │
│  │  └────────────────┬──────────────┘  │   │
│  └───────────────────┼─────────────────┘   │
└──────────────────────┼──────────────────────┘
                       │ HTTPS / WSS
┌──────────────────────▼──────────────────────┐
│              Supabase (shared)              │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│  │ Postgres │ │Realtime  │ │   Storage   │ │
│  │   (DB)   │ │ (WS)     │ │  (Files)   │ │
│  └──────────┘ └──────────┘ └─────────────┘ │
└─────────────────────────────────────────────┘
```

### Target State (Web + iOS + Android)

```
┌───────────────────────────────────────────────────────────────────┐
│                        Turborepo Monorepo                         │
│                                                                   │
│  ┌─────────────────┐    ┌────────────────────────────────────┐   │
│  │  apps/web       │    │  apps/native                       │   │
│  │  (Next.js 16)   │    │  (Expo SDK 52 / React Native)      │   │
│  │                 │    │                                    │   │
│  │  Tailwind CSS   │    │  NativeWind v4                     │   │
│  │  Next Router    │    │  Expo Router (file-based)          │   │
│  │  Web Push API   │    │  Expo Push Notifications           │   │
│  └────────┬────────┘    └───────────────┬────────────────────┘   │
│           │                             │                         │
│           └──────────┬──────────────────┘                        │
│                      │                                           │
│         ┌────────────▼──────────────────┐                        │
│         │       packages/shared         │                        │
│         │                               │                        │
│         │  ┌─────────────────────────┐  │                        │
│         │  │  supabase/              │  │                        │
│         │  │  • client.ts            │  │                        │
│         │  │  • types.ts (DB types)  │  │                        │
│         │  └─────────────────────────┘  │                        │
│         │  ┌─────────────────────────┐  │                        │
│         │  │  hooks/                 │  │                        │
│         │  │  • useAuth.ts           │  │                        │
│         │  │  • useFriends.ts        │  │                        │
│         │  │  • useMessages.ts       │  │                        │
│         │  │  • useGroups.ts         │  │                        │
│         │  │  • useUnreadCounts.ts   │  │                        │
│         │  └─────────────────────────┘  │                        │
│         │  ┌─────────────────────────┐  │                        │
│         │  │  stores/                │  │                        │
│         │  │  • authStore.ts (Zustand│  │                        │
│         │  │  • unreadStore.ts       │  │                        │
│         │  └─────────────────────────┘  │                        │
│         │  ┌─────────────────────────┐  │                        │
│         │  │  utils/                 │  │                        │
│         │  │  • formatTime.ts        │  │                        │
│         │  │  • formatDate.ts        │  │                        │
│         │  │  • cache.ts             │  │                        │
│         │  └─────────────────────────┘  │                        │
│         └───────────────────────────────┘                        │
└───────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS / WSS (unchanged)
                              │
┌─────────────────────────────▼──────────────────────────────────────┐
│              Supabase (existing data model + additive migrations)  │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────┐  ┌───────────┐  │
│  │  Postgres   │  │   Realtime   │  │ Storage  │  │   Auth    │  │
│  │  §5 migrs   │  │  unchanged   │  │unchanged │  │ unchanged │  │
│  └─────────────┘  └──────────────┘  └──────────┘  └───────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

---

## 3. Monorepo Structure

```
together/                          ← rename root or create new repo
├── turbo.json                     ← Turborepo `tasks` config (Turborepo 2.x)
├── package.json                   ← root workspace config
├── .env                           ← shared env vars (SUPABASE_URL, ANON_KEY)
│
├── apps/
│   ├── web/                       ← existing Next.js app (moved here)
│   │   ├── app/                   ← all current Next.js pages (unchanged)
│   │   ├── components/            ← web-only components
│   │   ├── public/
│   │   ├── next.config.ts
│   │   └── package.json
│   │
│   └── native/                    ← NEW — Expo app
│       ├── app/                   ← Expo Router file-based routes
│       │   ├── (auth)/
│       │   │   ├── login.tsx
│       │   │   └── onboarding.tsx
│       │   ├── (tabs)/
│       │   │   ├── _layout.tsx    ← Bottom tab navigator
│       │   │   ├── index.tsx      ← Dashboard/Home
│       │   │   ├── groups.tsx
│       │   │   ├── invites.tsx
│       │   │   ├── friends.tsx
│       │   │   └── settings.tsx
│       │   ├── groups/
│       │   │   ├── [id]/
│       │   │   │   ├── index.tsx
│       │   │   │   ├── chat.tsx
│       │   │   │   ├── calendar.tsx
│       │   │   │   ├── memories.tsx
│       │   │   │   └── polls.tsx
│       │   ├── dm/
│       │   │   └── [userId].tsx
│       │   ├── profile/
│       │   │   └── [id].tsx
│       │   ├── calendar.tsx
│       │   └── friends-calendar.tsx
│       ├── components/            ← native-only components
│       ├── assets/
│       ├── app.json               ← Expo config
│       ├── eas.json               ← EAS Build config
│       └── package.json
│
└── packages/
    └── shared/                    ← NEW — shared logic
        ├── src/
        │   ├── supabase/
        │   │   ├── client.ts
        │   │   └── types.ts       ← generated from supabase gen types
        │   ├── hooks/
        │   │   ├── useAuth.ts
        │   │   ├── useFriends.ts
        │   │   ├── useMessages.ts
        │   │   ├── useGroups.ts
        │   │   └── useUnreadCounts.ts
        │   ├── stores/
        │   │   ├── authStore.ts
        │   │   └── unreadStore.ts
        │   └── utils/
        │       ├── formatTime.ts
        │       ├── formatDate.ts
        │       └── cache.ts
        ├── tsconfig.json
        └── package.json
```

---

## 4. Tech Stack

| Layer | Web (existing) | Native (new) | Shared |
|---|---|---|---|
| Framework | Next.js 16 | Expo SDK 52 (React Native 0.76) | — |
| Language | TypeScript | TypeScript | TypeScript |
| Routing | Next.js App Router | Expo Router v4 | — |
| Styling | Tailwind CSS v4 | NativeWind v4 | Design tokens |
| State (global) | React hooks + localStorage | Zustand + MMKV | Zustand stores |
| State (server) | Supabase queries in hooks | Same | `packages/shared/hooks` |
| Auth | Supabase Auth + cookies | Supabase Auth + SecureStore | `useAuth` hook |
| Realtime | Supabase Realtime | Supabase Realtime | Same subscriptions |
| Database | Supabase Postgres | Supabase Postgres | Same core schema; additive migrations in §5 |
| File storage | Supabase Storage | Supabase Storage | Same |
| Push notifications | Web Push API | Expo Push Notifications | Abstracted behind `usePush` hook |
| Image/video pick | `<input type="file">` | Expo Image Picker | — |
| Video playback | HTML `<video>` | Expo AV | — |
| Navigation | Next.js `<Link>` / `useRouter` | Expo Router `<Link>` / `useRouter` | Same API surface |
| Build & deploy (web) | Vercel | — | — |
| Build (native) | — | EAS Build | — |
| Distribution (native) | — | EAS Submit → App Store + Play Store | — |
| OTA updates | Vercel deploys | EAS Update | — |
| CI/CD | GitHub Actions | GitHub Actions + EAS | — |

---

## 5. Shared Backend (Minimal & Additive Changes)

The **application domain model stays the same**: all tables below are shared by web and native. There are **no breaking changes** to existing RLS or core tables for features already shipped on web.

**Additive backend work** (small migrations, triggers, or Edge Functions) is limited to what native + unified push require:

| Scope | Ticket | What |
|---|---|---|
| Schema | **INFRA-04** | Add `expo_push_token` and `platform` on `push_subscriptions` so Web Push and Expo tokens coexist |
| Server-side automation | **INV-03** | When an admin creates a group **invite** event, fan out pending `event_rsvps` for all group members (database trigger and/or Edge Function — implement whichever matches production today) |
| Notifications | **NOTIF-03** | Edge Function sends Web Push and Expo Push from the same `push_subscriptions` rows |

Everything else in Supabase (Postgres tables, Realtime, Storage, Auth sessions) is **unchanged in behaviour** for existing web users.

| Table | Used by web | Used by native |
|---|---|---|
| `profiles` | ✅ | ✅ |
| `groups` | ✅ | ✅ |
| `group_members` | ✅ | ✅ |
| `friendships` | ✅ | ✅ |
| `direct_messages` | ✅ | ✅ |
| `messages` | ✅ | ✅ |
| `events` | ✅ | ✅ |
| `event_rsvps` | ✅ | ✅ |
| `personal_events` | ✅ | ✅ |
| `memories` | ✅ | ✅ |
| `memory_likes` | ✅ | ✅ |
| `memory_comments` | ✅ | ✅ |
| `group_polls` | ✅ | ✅ |
| `group_poll_options` | ✅ | ✅ |
| `group_poll_votes` | ✅ | ✅ |
| `notifications` | ✅ | ✅ |
| `push_subscriptions` | ✅ (web push) | ✅ (expo push token) |

> **Schema addition for push:** `push_subscriptions` needs `expo_push_token` / `platform` as in **INFRA-04** so both platforms can coexist in one table.

---

## 6. Screen Mapping

| Web Route | Native Screen | File (native) | Notes |
|---|---|---|---|
| `/login` | Login | `app/(auth)/login.tsx` | Same flow, TextInput instead of `<input>` |
| `/onboarding` | Onboarding | `app/(auth)/onboarding.tsx` | 2-step wizard, same logic |
| `/dashboard` | Home tab | `app/(tabs)/index.tsx` | Stat cards, feeds |
| `/groups` | Groups tab | `app/(tabs)/groups.tsx` | FlatList of group cards |
| `/groups/[id]` | Group Detail | `app/groups/[id]/index.tsx` | 2×2 action grid |
| `/groups/[id]/chat` | Group Chat | `app/groups/[id]/chat.tsx` | FlatList (inverted), keyboard-aware |
| `/groups/[id]/calendar` | Group Calendar | `app/groups/[id]/calendar.tsx` | Custom calendar view |
| `/groups/[id]/memories` | Memories | `app/groups/[id]/memories.tsx` | FlashList + full-screen viewer |
| `/groups/[id]/polls` | Polls | `app/groups/[id]/polls.tsx` | ScrollView with poll cards |
| `/calendar` | Calendar tab (personal) | `app/(tabs)/calendar.tsx` | Week/month toggle |
| `/friends` | Friends tab | `app/(tabs)/friends.tsx` | Tabs: Friends / Requests |
| `/friends/calendar` | Friends' Calendars | `app/friends-calendar.tsx` | Chip selector, week grid |
| `/dm/[userId]` | DM Screen | `app/dm/[userId].tsx` | KeyboardAvoidingView, FlatList inverted |
| `/invites` | Invites tab | `app/(tabs)/invites.tsx` | Pending / responded tabs |
| `/profile/[id]` | Profile | `app/profile/[id].tsx` | Avatar, bio, actions |
| `/settings` | Settings tab | `app/(tabs)/settings.tsx` | ScrollView with sections |

---

## 7. Epics

| ID | Epic | Description | Tickets |
|---|---|---|---|
| **EP-01** | Infrastructure & Monorepo | Set up Turborepo, shared packages, Expo app skeleton | INFRA-01 → INFRA-06 |
| **EP-02** | Auth & Onboarding | Login, signup, profile setup on native | AUTH-01 → AUTH-04 |
| **EP-03** | Navigation Shell | Bottom tabs, stack navigation, deep links | NAV-01 → NAV-04 |
| **EP-04** | Dashboard & Feeds | Home screen, stat cards, upcoming events, memories feed | DASH-01 → DASH-03 |
| **EP-05** | Friends & DMs | Friend list, requests, direct messaging, typing indicator | FRIEND-01 → FRIEND-06 |
| **EP-06** | Groups | Groups list, group detail, member management | GROUP-01 → GROUP-05 |
| **EP-07** | Group Chat | Real-time chat, long press, edit/delete, pagination | CHAT-01 → CHAT-05 |
| **EP-08** | Calendar | Personal calendar, group calendar, friends' calendars | CAL-01 → CAL-06 |
| **EP-09** | Memories | Photo/video upload, vertical gallery, likes, comments | MEM-01 → MEM-05 |
| **EP-10** | Polls | Create polls, vote, live percentages | POLL-01 → POLL-03 |
| **EP-11** | Invites & RSVPs | Event invites, RSVP actions, pending badge | INV-01 → INV-03 |
| **EP-12** | Notifications | Expo Push, in-app notification centre | NOTIF-01 → NOTIF-05 |
| **EP-13** | Settings & Profile | Profile edit, avatar upload, theme picker, sign out | SET-01 → SET-04 |
| **EP-14** | Shared Package Migration | Extract web hooks/utils into shared packages, update web to consume them | SHARE-01 → SHARE-05 |
| **EP-15** | QA, Performance & Release | Store submission, TestFlight/internal testing, performance audit | REL-01 → REL-06 |

---

## 8. Tickets

> **Effort scale:** XS = half day · S = 1 day · M = 2-3 days · L = 4-5 days · XL = 1+ week

---

### EP-01 — Infrastructure & Monorepo

---

#### INFRA-01 · Convert repo to Turborepo monorepo
**Type:** Task | **Effort:** M | **Depends on:** —

**Description:**
Move the existing Next.js app into `apps/web/`, initialise Turborepo, create the `packages/shared` workspace skeleton and the `apps/native` Expo app.

**Acceptance Criteria:**
- [ ] `turbo.json` defines `build`, `dev`, `lint`, `type-check` tasks (Turborepo 2.x `tasks` key)
- [ ] `apps/web/` contains the full current Next.js codebase; all existing functionality still works
- [ ] `apps/native/` is initialised with `npx create-expo-app` using the blank TypeScript template
- [ ] `packages/shared/` exists with a `package.json` exporting from `src/index.ts`
- [ ] Root `package.json` declares all three as workspaces
- [ ] `npm run dev` at root starts both web and native (Expo) dev servers in parallel
- [ ] `npm run build` at root builds web and validates native TypeScript
- [ ] Existing web CI pipeline continues to pass

**Notes:**
Pin **`turbo` ^2** at the repo root (matches `tasks` below). Example:

```jsonc
// turbo.json — Turborepo 2.x
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": { "cache": false, "persistent": true },
    "lint": {},
    "type-check": { "dependsOn": ["^build"] }
  }
}
```

---

#### INFRA-02 · Set up `packages/shared` — Supabase client & types
**Type:** Task | **Effort:** S | **Depends on:** INFRA-01

**Description:**
Move the Supabase client factory and all TypeScript DB types into `packages/shared` so both web and native import from the same place.

**Acceptance Criteria:**
- [ ] `packages/shared/src/supabase/client.ts` exports a **factory** (e.g. `createSupabaseClient`) — platform-agnostic; no Next.js cookie adapter in this file; `apps/web` wraps with `@supabase/ssr` locally (see table below)
- [ ] `packages/shared/src/supabase/types.ts` contains generated types from `supabase gen types typescript`
- [ ] Web app updated to import types from `@together/shared`
- [ ] Native app imports client from `@together/shared`
- [ ] No TypeScript errors in either app

**Supabase client entry points (web vs native)**

Shared code must not bake in Next.js cookies or React Native `AsyncStorage` in one file.

| Entry | Responsibility |
|---|---|
| `packages/shared/src/supabase/client.ts` | Exports a **factory** `createSupabaseClient(options?)` using `@supabase/supabase-js` with no browser-only or RN-only imports |
| `apps/web` | Wraps the factory with **`@supabase/ssr`**: `createServerClient` / `createBrowserClient` for cookies on Server Components and client |
| Native app or shared RN export | **`client.native.ts`** (as in **AUTH-02**) or `packages/shared` `react-native` export condition; passes `auth.storage = AsyncStorage`, `persistSession`, `autoRefreshToken`, `detectSessionInUrl: false` |

This keeps **INFRA-02** and **AUTH-02** aligned: one shared factory shape; platform-specific adapters live in each app.

---

#### INFRA-03 · Set up `packages/shared` — hooks & stores
**Type:** Task | **Effort:** M | **Depends on:** INFRA-02, SHARE-01, SHARE-05

**Description:**
Populate shared package with platform-agnostic hooks and Zustand stores. **Depends on SHARE-01** so `formatTime` / `formatDate` exist before hooks import them; **depends on SHARE-05** so `cache.ts` lives in shared before hooks use the TTL cache.

**Files to create:**

| File | Contents |
|---|---|
| `hooks/useAuth.ts` | `getUser()`, `signIn()`, `signUp()`, `signOut()` |
| `hooks/useUnreadCounts.ts` | unread DM count + pending RSVP count, realtime subscription |
| `hooks/useFriends.ts` | fetch accepted friends, pending requests |
| `hooks/useGroups.ts` | fetch user's groups |
| `hooks/useMessages.ts` | fetch + subscribe DM conversation |
| `stores/authStore.ts` | Zustand: `user`, `profile`, `setUser`, `setProfile` |
| `stores/unreadStore.ts` | Zustand: `dmUnread`, `rsvpPending`, setters |

**Related utils (other tickets):**

| File | Ticket |
|---|---|
| `utils/formatTime.ts`, `utils/formatDate.ts` | **SHARE-01** |
| `utils/cache.ts` | **SHARE-05** |

**Acceptance Criteria:**
- [ ] All hooks compile without errors against the shared Supabase types
- [ ] Zustand stores initialise correctly (no SSR issues — stores are client-only)
- [ ] Web app can import and use `useAuth` from `@together/shared` with no behaviour change
- [ ] Hooks import formatters from `@together/shared` paths added in **SHARE-01** (no duplicated inline formatters)

---

#### INFRA-04 · Database: add `expo_push_token` column to `push_subscriptions`
**Type:** Task | **Effort:** XS | **Depends on:** —

**Description:**
Extend the push subscriptions table so Expo push tokens can be stored alongside existing Web Push credentials. Both platforms write to the same table; the `type` column distinguishes them.

**Migration SQL:**
```sql
ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS expo_push_token text,
  ADD COLUMN IF NOT EXISTS platform text DEFAULT 'web' CHECK (platform IN ('web', 'ios', 'android'));
```

**Acceptance Criteria:**
- [ ] Migration applied to Supabase project (both prod and local)
- [ ] Web push flow still works (platform = 'web', expo_push_token = null)
- [ ] Native can insert a row with platform = 'ios'/'android' and expo_push_token set

---

#### INFRA-05 · Configure EAS Build (iOS + Android)
**Type:** Task | **Effort:** M | **Depends on:** INFRA-01

**Description:**
Configure Expo Application Services for cloud builds, set up development, preview, and production build profiles.

**`eas.json`:**
```jsonc
{
  "cli": { "version": ">= 7.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false }
    },
    "production": {
      "ios": { "buildConfiguration": "Release" },
      "android": { "buildType": "apk" }
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "APPLE_ID", "ascAppId": "APP_STORE_CONNECT_APP_ID" },
      "android": { "serviceAccountKeyPath": "./google-services.json" }
    }
  }
}
```

**Acceptance Criteria:**
- [ ] `eas build --profile development --platform ios` completes successfully
- [ ] `eas build --profile development --platform android` completes successfully
- [ ] Development build installs on a physical iPhone and Android device
- [ ] Expo Go can run the app in development
- [ ] EAS project linked to GitHub repo for CI builds

---

#### INFRA-06 · Set up GitHub Actions CI for monorepo
**Type:** Task | **Effort:** S | **Depends on:** INFRA-01, INFRA-05

**Description:**
Extend GitHub Actions to validate both apps on every PR.

**Pipeline:**
```
PR opened
├── type-check (web + native + shared)
├── lint (web + native + shared)
├── build:web (Vercel preview deploy)
└── build:native (EAS preview build — triggered on merge to main only)
```

**Acceptance Criteria:**
- [ ] Type check runs across all workspaces
- [ ] Lint runs across all workspaces
- [ ] Web deploys to Vercel preview on every PR
- [ ] EAS build triggers on merge to `main`
- [ ] Failing checks block merge

---

### EP-02 — Auth & Onboarding

---

#### AUTH-01 · Login screen (native)
**Type:** Story | **Effort:** M | **Depends on:** INFRA-03

**Description:**
Port the login/signup flow to React Native. Two modes: Sign In and Create Account.

**UI Spec:**

```
┌─────────────────────────────┐
│                             │
│   Together                  │  ← Logo / wordmark (top 30%)
│                             │
│  ┌───────────────────────┐  │
│  │  email@example.com    │  │  ← TextInput, keyboardType="email-address"
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │  ••••••••             │  │  ← TextInput, secureTextEntry
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │      Sign In          │  │  ← Primary button
│  └───────────────────────┘  │
│                             │
│  Don't have an account?     │
│  Create one →               │  ← Toggle mode
│                             │
└─────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Sign in with valid credentials navigates to Dashboard (or Onboarding if no username)
- [ ] Sign up creates auth user and navigates to Onboarding
- [ ] Error messages displayed inline (wrong password, email taken, etc.)
- [ ] Keyboard `returnKeyType="next"` chains email → password field
- [ ] Password field `returnKeyType="done"` submits the form
- [ ] Loading spinner on button during auth request
- [ ] `KeyboardAvoidingView` prevents keyboard from covering inputs on both iOS and Android

---

#### AUTH-02 · Session persistence (native)
**Type:** Task | **Effort:** S | **Depends on:** AUTH-01

**Description:**
Supabase session must persist between app launches. Uses `@react-native-async-storage/async-storage` as the storage adapter.

**Acceptance Criteria:**
- [ ] Supabase client configured with AsyncStorage adapter
- [ ] User remains logged in after killing and relaunching the app
- [ ] Token refresh handled automatically by Supabase SDK
- [ ] Sign out clears AsyncStorage and navigates to Login
- [ ] App checks session on launch; if valid → Dashboard, if not → Login (no flash)

**Code pattern:**
```ts
// packages/shared/src/supabase/client.native.ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

---

#### AUTH-03 · Onboarding screen (native)
**Type:** Story | **Effort:** M | **Depends on:** AUTH-01

**Description:**
Two-step onboarding: Step 1 — full name + username. Step 2 — theme/accent colour picker.

**Acceptance Criteria:**
- [ ] Step 1: name and username fields with the same validation as web (username uniqueness check)
- [ ] Step 2: accent colour chips rendered as touchable circles (no Tailwind limitations on native)
- [ ] Progress indicator (dots or `1 of 2`)
- [ ] Back button on Step 2 returns to Step 1 without resetting data
- [ ] On completion, navigates to Dashboard and does not re-show on subsequent launches
- [ ] Theme preference saved to `profiles.color_scheme` (same as web)

---

#### AUTH-04 · Auth guard (native)
**Type:** Task | **Effort:** S | **Depends on:** AUTH-02

**Description:**
Implement route protection on native. Unauthenticated users are redirected to Login from any protected screen.

**Acceptance Criteria:**
- [ ] Expo Router layout checks `authStore.user` on mount
- [ ] If no user, redirect to `/(auth)/login`
- [ ] Deep links to protected screens redirect through auth first, then land on the intended screen
- [ ] Auth state change (sign out) immediately navigates to Login from anywhere in the app

---

### EP-03 — Navigation Shell

---

#### NAV-01 · Bottom tab navigator
**Type:** Task | **Effort:** M | **Depends on:** INFRA-01

**Description:**
Implement the 5-tab bottom navigation using Expo Router's `(tabs)` group. Matches web BottomNav exactly.

**Tab structure:**

| Tab | Icon | Badge | Route |
|---|---|---|---|
| Home | House | — | `/(tabs)/` |
| Groups | Users | — | `/(tabs)/groups` |
| Invites | Envelope | pending RSVP count | `/(tabs)/invites` |
| Friends | Heart | unread DM count | `/(tabs)/friends` |
| Settings | Gear | — | `/(tabs)/settings` |

**Acceptance Criteria:**
- [ ] All 5 tabs render correct screens
- [ ] Active tab styled with accent colour (matches web)
- [ ] Invites badge shows pending RSVP count from `unreadStore`
- [ ] Friends badge shows unread DM count from `unreadStore`
- [ ] Badges update in real-time (via subscription in `useUnreadCounts`)
- [ ] Safe area insets respected on both iPhone (notch/Dynamic Island) and Android
- [ ] Haptic feedback on tab press (Expo Haptics — light impact)

---

#### NAV-02 · Stack navigators for each tab
**Type:** Task | **Effort:** M | **Depends on:** NAV-01

**Description:**
Each tab has its own navigation stack. Screens within a tab push onto that stack without losing the tab bar.

**Stack structure:**
```
Home tab stack:       Home → (no child stacks)
Groups tab stack:     Groups → Group Detail → (Chat | Calendar | Memories | Polls)
Invites tab stack:    Invites → (no child stacks)
Friends tab stack:    Friends → DM | Profile | Friends Calendar
Settings tab stack:   Settings → (no child stacks)
```

**Acceptance Criteria:**
- [ ] Back navigation works correctly in every stack
- [ ] Tab bar remains visible on root screens of each tab
- [ ] Tab bar is hidden on deep screens (chat, DM, memories viewer)
- [ ] Native back gesture (swipe from left edge on iOS) works on all screens
- [ ] Header navigation uses native iOS/Android back button conventions

---

#### NAV-03 · Deep linking
**Type:** Task | **Effort:** M | **Depends on:** NAV-02, AUTH-04

**Description:**
Configure deep links so push notification taps navigate to the correct screen.

**Link scheme:** `together://`

| Deep link | Destination |
|---|---|
| `together://dm/[userId]` | DM screen with that user |
| `together://groups/[id]` | Group Detail |
| `together://invites` | Invites tab |
| `together://friends` | Friends tab |
| `together://profile/[id]` | Profile screen |

**Acceptance Criteria:**
- [ ] `app.json` configures scheme and universal links
- [ ] All links above navigate to the correct screen
- [ ] If user is not authenticated, redirected to Login then forwarded to the intended screen
- [ ] Links work from both killed and backgrounded app state
- [ ] Android intent filter configured

---

#### NAV-04 · Shared transition & gesture polish
**Type:** Task | **Effort:** S | **Depends on:** NAV-02

**Description:**
Ensure navigation animations feel native and snappy.

**Acceptance Criteria:**
- [ ] iOS: horizontal slide transitions (default, no override needed)
- [ ] Android: standard Material slide-up for modals, horizontal for stacks
- [ ] No `page-enter` CSS animation (web-only concept); native transitions handle this
- [ ] Long screens scroll without performance issues (FlashList used for lists > 20 items)
- [ ] Scroll-to-top on tab re-tap (standard native behaviour)

---

### EP-04 — Dashboard & Feeds

---

#### DASH-01 · Home screen layout
**Type:** Story | **Effort:** M | **Depends on:** NAV-01, INFRA-03

**Description:**
Port the dashboard to native. Greeting, stat cards, quick links.

**Acceptance Criteria:**
- [ ] Greeting with user's first name
- [ ] 2-column stat grid: Groups count + Friends count (tappable, navigates to tab)
- [ ] 2-column feature cards: Your Groups + My Calendar
- [ ] Quick links list (Invites, Friends, My Calendar) with chevron
- [ ] All counts fetched from `useGroups` and `useFriends` hooks in shared package
- [ ] Notification bell in top-right header (navigates to notification centre)
- [ ] Skeleton loading state shown before data loads

---

#### DASH-02 · Upcoming events feed
**Type:** Story | **Effort:** S | **Depends on:** DASH-01

**Description:**
Port `UpcomingEventsFeed` to a native component. Shows next 3 upcoming events from all the user's groups.

**Acceptance Criteria:**
- [ ] Fetches events from all user's group IDs
- [ ] Shows event title, type icon, date/time, group name
- [ ] Tapping an event navigates to the group's calendar
- [ ] Empty state: "No upcoming events" message
- [ ] Data refreshes on screen focus (`useFocusEffect`)

---

#### DASH-03 · Recent memories feed
**Type:** Story | **Effort:** M | **Depends on:** DASH-01, MEM-01

**Description:**
Horizontal scroll strip of recent memories. Tapping opens the full-screen viewer.

**Acceptance Criteria:**
- [ ] Horizontal `FlatList` of memory thumbnails (images/video)
- [ ] Video thumbnails show a play icon overlay
- [ ] Tapping a memory opens the full-screen vertical viewer (from EP-09)
- [ ] Empty state: "No memories yet" message
- [ ] Images use `expo-image` for performance (fast decode, blur-hash placeholder)

---

### EP-05 — Friends & Direct Messaging

---

#### FRIEND-01 · Friends list screen
**Type:** Story | **Effort:** M | **Depends on:** NAV-01, INFRA-03

**Description:**
Port the friends list to native. Shows accepted friends with unread DM badges, filter input.

**Acceptance Criteria:**
- [ ] `FlatList` of accepted friends with avatar, name, username
- [ ] Unread DM badge shown on each friend's Message button
- [ ] Filter text input narrows the list in real-time
- [ ] Tapping Message → DM screen
- [ ] Tapping avatar/name → Profile screen
- [ ] Requests tab shows pending incoming friend requests
- [ ] Pending request: Accept / Decline buttons with optimistic UI
- [ ] "Add a friend" section with username search at the top
- [ ] Sent requests listed under Requests tab

---

#### FRIEND-02 · Friend search & request
**Type:** Story | **Effort:** S | **Depends on:** FRIEND-01

**Description:**
Search for a user by username and send a friend request.

**Acceptance Criteria:**
- [ ] `TextInput` with `@` prefix clears non-alphanumeric/underscore characters
- [ ] Search button fetches profile from `profiles` table
- [ ] Shows result card: avatar, name, username
- [ ] "Add Friend" button inserts into `friendships` table
- [ ] If already friends or request already sent, shows appropriate status
- [ ] Error and success states shown inline

---

#### FRIEND-03 · DM screen (direct messages)
**Type:** Story | **Effort:** L | **Depends on:** FRIEND-01, INFRA-03

**Description:**
Full real-time 1-on-1 chat. The most complex individual screen on native — keyboard handling, optimistic messages, realtime.

**Acceptance Criteria:**
- [ ] `FlatList` inverted — newest messages at bottom; scroll to bottom on new message
- [ ] `KeyboardAvoidingView` with `behavior="padding"` on iOS, `"height"` on Android — messages always visible above keyboard
- [ ] `TextInput` with multiline; Enter key sends (configurable); shift+enter for newline
- [ ] Optimistic insert: message appears instantly with temp ID, replaced after DB confirms
- [ ] Real-time subscription shows friend's messages as they arrive
- [ ] Incoming messages auto-marked as `read = true` when screen is focused
- [ ] Long press on own message → bottom sheet with Edit / Delete options
- [ ] Edit: replaces message text inline with a save/cancel UI
- [ ] Delete: removes message from list optimistically
- [ ] Typing indicator: shows animated dots when friend is typing (presence channel)
- [ ] Header shows friend's avatar + name; tapping navigates to their profile
- [ ] Back button navigates back to Friends tab

---

#### FRIEND-04 · Typing indicator (presence)
**Type:** Task | **Effort:** S | **Depends on:** FRIEND-03

**Description:**
Implement the Supabase Presence typing indicator in the native DM screen. Same logic as web.

**Acceptance Criteria:**
- [ ] When user is typing (text field not empty and focused), presence broadcasts `{ typing: true }`
- [ ] 2.5 second debounce resets to `{ typing: false }`
- [ ] Friend's typing state shown as animated 3-dot indicator above input bar
- [ ] Presence clears when user leaves the screen (`useFocusEffect` cleanup)

---

#### FRIEND-05 · Friends' calendars screen
**Type:** Story | **Effort:** L | **Depends on:** FRIEND-01, CAL-01

**Description:**
Port the friends' calendars view. Select one or more friends; see their busy/free blocks overlaid on a week view.

**Acceptance Criteria:**
- [ ] Horizontal scroll of friend chips at top; tap to toggle selection
- [ ] Week calendar grid below shows selected friends' events as coloured blocks
- [ ] Each friend has a distinct colour (6 preset colours cycle)
- [ ] Busy events shown as coloured bar; Free events as lighter bar
- [ ] Week navigation: swipe left/right OR arrow buttons
- [ ] Legend at bottom mapping friend name → colour
- [ ] Empty state: "Select friends above to see their availability"

---

#### FRIEND-06 · Profile screen
**Type:** Story | **Effort:** M | **Depends on:** FRIEND-01

**Description:**
Public profile view. Shows another user's avatar, name, bio, location. Actions depend on friendship status.

**Acceptance Criteria:**
- [ ] Avatar (full-size image or initials fallback)
- [ ] Full name, username, bio, location
- [ ] Friendship status button: Add Friend / Pending / Friends (with Message shortcut)
- [ ] Shared groups section: chips/badges linking to each shared group
- [ ] Message button → DM screen
- [ ] Calendar button → Friends' Calendar pre-selected to this user
- [ ] Own profile tapping avatar → Settings

---

### EP-06 — Groups

---

#### GROUP-01 · Groups list screen
**Type:** Story | **Effort:** M | **Depends on:** NAV-01, INFRA-03

**Description:**
List all groups the user belongs to. Create new group inline.

**Acceptance Criteria:**
- [ ] `FlatList` of group cards: name, description, member count
- [ ] "Create Group" button opens a bottom sheet / modal
- [ ] Create group form: name (required) + description (optional)
- [ ] After creation, navigates immediately to new group's detail screen
- [ ] Search/filter input narrows list
- [ ] Empty state: "No groups yet. Create one!"

---

#### GROUP-02 · Group detail screen
**Type:** Story | **Effort:** L | **Depends on:** GROUP-01

**Description:**
The group hub. Header card, 2×2 action grid (Chat/Calendar/Memories/Polls), upcoming events, members list.

**Acceptance Criteria:**
- [ ] Header: group name, description, member avatars (stacked, max 5 + overflow count)
- [ ] Milestone badge if 5+ past events (same as web)
- [ ] Share button: uses React Native's native share sheet (`Share.share()`)
- [ ] 2×2 grid of action cards with SVG icons — Chat (with unread badge), Calendar, Memories, Polls
- [ ] Upcoming events list (max 3, "See all" links to group calendar)
- [ ] Members section with role badges
- [ ] Admins see: Promote / Kick inline confirm (no `Alert.alert` blocking pattern — use inline confirm state same as web fix)
- [ ] Add member: TextInput search by username with duplicate guard
- [ ] Group Settings section: Leave / Delete

---

#### GROUP-03 · Member management
**Type:** Story | **Effort:** S | **Depends on:** GROUP-02

**Description:**
Admin controls for promoting and removing members.

**Acceptance Criteria:**
- [ ] Promote: Updates `group_members.role` to `admin`; list refreshes
- [ ] Kick: Two-tap confirm (Kick → "Sure?" + "No") before delete
- [ ] Success/error feedback shown as inline message below member list
- [ ] Member list refreshes after each action
- [ ] Cannot kick or demote self

---

#### GROUP-04 · Invite member by username
**Type:** Task | **Effort:** S | **Depends on:** GROUP-02

**Description:**
Admin can add a member by typing their username.

**Acceptance Criteria:**
- [ ] TextInput with `@` prefix; filters to valid username characters
- [ ] "Add" button queries `profiles` by username
- [ ] If already a member → show "Already in the group"
- [ ] On success → "Member added!" + list refreshes
- [ ] On failure → error message

---

#### GROUP-05 · Leave / Delete group
**Type:** Task | **Effort:** S | **Depends on:** GROUP-02

**Description:**
Members can leave; the creator can delete. Uses `Alert.alert` as this is a destructive action where native alert is appropriate.

**Acceptance Criteria:**
- [ ] Non-creators see "Leave Group" button
- [ ] Creators see "Delete Group" button (leave is not an option)
- [ ] Both require `Alert.alert` confirmation (native modal — appropriate for irreversible actions)
- [ ] After leave/delete, navigates back to Groups list
- [ ] Error shown via Alert if DB error

---

### EP-07 — Group Chat

---

#### CHAT-01 · Group chat screen layout
**Type:** Story | **Effort:** L | **Depends on:** GROUP-02

**Description:**
Real-time group chat. Inverted FlatList, realtime subscription, keyboard-aware input.

**Acceptance Criteria:**
- [ ] Inverted `FlatList` (newest at bottom) with `maintainVisibleContentPosition`
- [ ] Each message shows sender avatar (left for others, right-aligned for own), name, content, timestamp
- [ ] Own messages: accent background, right-aligned, no name
- [ ] Others' messages: elevated background, left-aligned, sender name above
- [ ] `KeyboardAvoidingView` keeps input visible above keyboard on both platforms
- [ ] Real-time `INSERT` subscription adds new messages to bottom
- [ ] Real-time `UPDATE` subscription patches edited messages in-place
- [ ] Sending a message clears the input immediately (optimistic)
- [ ] Auto-scroll to bottom on new message (if user is near bottom)
- [ ] "New message ↓" toast if user is scrolled up and a new message arrives

---

#### CHAT-02 · Load older messages (pagination)
**Type:** Story | **Effort:** S | **Depends on:** CHAT-01

**Description:**
When user scrolls to the top of the message list, load the previous page.

**Acceptance Criteria:**
- [ ] Initial load: 30 most recent messages
- [ ] Scrolling to top triggers `loadOlder()` — loads previous 30
- [ ] Scroll position preserved after prepend (no jump)
- [ ] "Load older messages" button shown at top if more exist
- [ ] Loading spinner shown during fetch

---

#### CHAT-03 · Long press message actions (edit / delete)
**Type:** Story | **Effort:** M | **Depends on:** CHAT-01

**Description:**
Long pressing your own message opens a bottom sheet with Edit and Delete options.

**Acceptance Criteria:**
- [ ] Long press triggers haptic feedback (medium impact)
- [ ] Bottom sheet (using `@gorhom/bottom-sheet`) shows: Edit, Delete, Cancel
- [ ] Edit: replaces message bubble with inline `TextInput` + Save/Cancel
- [ ] Save: `UPDATE` in `messages` (group chat row); updates in list optimistically
- [ ] Delete: `DELETE` in `messages`; removes from list optimistically
- [ ] Long press on other users' messages: no action
- [ ] Right-click (if run in web) still uses existing context menu

---

#### CHAT-04 · Unread message count badge
**Type:** Task | **Effort:** S | **Depends on:** CHAT-01, NAV-01

**Description:**
Track unread messages for the group chat and show a badge on the Chat card in Group Detail, and the Groups tab.

**Acceptance Criteria:**
- [ ] `localStorage` equivalent (`MMKV`) stores `group_chat_last_viewed_{groupId}` timestamp
- [ ] On entering chat screen, timestamp updated to now
- [ ] Unread count = messages after `last_viewed` timestamp not from current user
- [ ] Badge shows on Chat action card in Group Detail
- [ ] Badge clears when chat screen is opened

---

#### CHAT-05 · Reactions (future — schema TBD)
**Type:** Spike | **Effort:** S | **Depends on:** CHAT-01

**Description:**
**Note:** The existing `event_reactions` table is for **calendar events** (emoji on events), not group chat messages. Group chat reactions are **not** implemented on web yet; this spike covers **native UX only** (e.g. long press → emoji row) and whether a future `message_reactions` table (or other schema) is required before build-out.

**Deliverable:** Figma-style wireframe or written UX spec added to this ticket. No code.

---

### EP-08 — Calendar

---

#### CAL-01 · Personal calendar screen
**Type:** Story | **Effort:** XL | **Depends on:** NAV-01, INFRA-03

**Description:**
Personal private calendar. Week and month views, event creation by tapping a day, event detail.

**UI Layout (Week View):**
```
┌──────────────────────────────────┐
│  ← Apr 7 – Apr 13, 2026  →       │  ← week nav header
│                                  │
│  MON 7    TUE 8    WED 9  ...    │  ← day column headers
│  ───────────────────────────     │
│  09:00  ████ Meeting             │  ← event block (tappable)
│  10:00                           │
│  11:00  ████ Lunch               │
│  ...                             │
│                                  │
│  [+ Add event] FAB               │
└──────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Week view: 7-column scrollable grid; current day highlighted
- [ ] Month view: standard calendar grid; event dots on days with events
- [ ] Tapping a day (week or month) opens the create event bottom sheet pre-filled with that date at 09:00
- [ ] Create event form: title, description, start datetime picker, end datetime picker, show-as (busy/free), repeat (none/weekly/daily)
- [ ] Datetime pickers use `@react-native-community/datetimepicker` (native date/time wheels — no `datetime-local` input)
- [ ] Event detail bottom sheet: title, time, show-as badge, description, delete button
- [ ] Privacy note visible on screen (private to you)
- [ ] Recurring events displayed correctly on relevant days

---

#### CAL-02 · Group calendar screen
**Type:** Story | **Effort:** L | **Depends on:** GROUP-02, CAL-01

**Description:**
Group's shared event calendar. Read-only for members, admins can create events. Overlays friends' personal availability.

**Acceptance Criteria:**
- [ ] Same week/month toggle as personal calendar
- [ ] Group events shown with colour based on event type
- [ ] Tapping event shows detail bottom sheet (title, time, location, RSVP status)
- [ ] Admins see "+ Create Event" button
- [ ] Create event form: title, description, event type picker, start/end datetime, location
- [ ] Friends' personal availability overlaid as subtle background blocks (busy = light red, free = light green)
- [ ] Availability overlay can be toggled on/off

---

#### CAL-03 · Datetime pickers (native)
**Type:** Task | **Effort:** S | **Depends on:** CAL-01

**Description:**
Replace `<input type="datetime-local">` with native date/time pickers. This is the most platform-specific part of the calendar implementation.

**Implementation:**
```tsx
import DateTimePicker from '@react-native-community/datetimepicker'

// iOS: inline spinner or compact mode
// Android: modal date picker, then modal time picker (separate steps)
```

**Acceptance Criteria:**
- [ ] iOS: compact date/time picker renders inline in the form
- [ ] Android: tapping the date field opens system date picker modal; tapping time opens system time picker modal
- [ ] Selected value displays in human-readable format below the button
- [ ] Min date enforced (end must be after start)
- [ ] Timezone correct (device local time)

---

#### CAL-04 · Friends' calendars screen (native)
**Type:** Story | **Effort:** L | **Depends on:** FRIEND-01, CAL-01

**Description:**
See which friends are busy or free across a given week. Port from web.

**Acceptance Criteria:**
- [ ] ScrollView of friend selector chips at top
- [ ] Week grid below with time-slotted rows
- [ ] Each selected friend's events shown as coloured horizontal bars in their time slots
- [ ] Week navigation: `<` `>` buttons and/or swipe gesture
- [ ] Tap an event block to see whose it is and their availability label (Busy/Free — not the event title since those are private)
- [ ] Empty state if no friends selected

---

#### CAL-05 · Event RSVP from calendar
**Type:** Task | **Effort:** S | **Depends on:** CAL-02, INV-01

**Description:**
Tapping a group event in the calendar shows RSVP status and allows changing it without going to the Invites tab.

**Acceptance Criteria:**
- [ ] Event detail bottom sheet shows current RSVP status
- [ ] Row of RSVP buttons: Going / Maybe / Can't / Unsure
- [ ] Tapping a button updates `event_rsvps` and closes sheet
- [ ] Button for current status shown as active/selected

---

#### CAL-06 · Calendar performance optimisation
**Type:** Task | **Effort:** S | **Depends on:** CAL-01, CAL-02

**Description:**
Calendar rendering must be smooth — no dropped frames when switching weeks or months.

**Acceptance Criteria:**
- [ ] Week/month switch is instant (no visible render lag)
- [ ] Scrolling through weeks uses `FlatList` or pre-rendered adjacent weeks (virtualised)
- [ ] Events fetched for a wider window (e.g. ±4 weeks) so navigation feels instant
- [ ] `React.memo` used on individual day cells to prevent unnecessary re-renders
- [ ] Profiler shows no component taking > 16ms to render

---

### EP-09 — Memories

---

#### MEM-01 · Memories gallery screen
**Type:** Story | **Effort:** L | **Depends on:** GROUP-02

**Description:**
Grid of photos and videos for a group. Tapping opens the full-screen vertical viewer.

**Acceptance Criteria:**
- [ ] 3-column grid using `FlashList` (high performance for large image grids)
- [ ] Images rendered with `expo-image` (lazy load, blur-hash placeholder, cache)
- [ ] Videos show thumbnail with play icon overlay
- [ ] Tapping an item opens the full-screen viewer at that index
- [ ] Upload button (camera icon or "+") triggers image/video picker
- [ ] Empty state: "No memories yet. Add the first one!"

---

#### MEM-02 · Media upload (native)
**Type:** Task | **Effort:** M | **Depends on:** MEM-01

**Description:**
Upload photos and videos from the device's camera roll or camera directly to Supabase Storage.

**Acceptance Criteria:**
- [ ] `expo-image-picker` opens native photo library or camera
- [ ] Images and videos up to 50MB supported
- [ ] Progress indicator shown during upload
- [ ] After upload, record inserted into `memories` table
- [ ] Caption text field shown before/during upload (optional)
- [ ] Upload happens in background if user navigates away (using `expo-background-task` if needed)
- [ ] Permission request handled gracefully (camera roll, camera)

---

#### MEM-03 · Full-screen vertical viewer (TikTok-style)
**Type:** Story | **Effort:** XL | **Depends on:** MEM-01

**Description:**
The centrepiece of the Memories feature. Full-screen vertical swipe through memories with likes and comments. Most complex UI component.

**Implementation approach:**
- Use `FlatList` with `pagingEnabled` and `snapToInterval` equal to screen height
- Each item fills the full screen (`height: SCREEN_HEIGHT`)
- `expo-av` for video playback; auto-play when item is visible (use `onViewableItemsChanged`)

**Acceptance Criteria:**
- [ ] Vertical swipe snaps cleanly to each item (no rubber-band or momentum issues)
- [ ] Images: pinch-to-zoom supported (`react-native-gesture-handler` + `react-native-reanimated`)
- [ ] Videos: auto-play when in view, auto-pause when swiped away, looping
- [ ] Video: tap to pause/resume
- [ ] Like button: heart icon, toggles, count shown, optimistic update
- [ ] Comment panel: slides up from bottom, shows existing comments, text input at bottom
- [ ] Delete button shown if the user owns the memory; `Alert.alert` confirmation
- [ ] Caption shown at bottom of each item (over the media)
- [ ] Uploader name and timestamp shown
- [ ] Swipe down to close (back to grid)
- [ ] Viewer opens at the tapped index

---

#### MEM-04 · Likes and comments (native)
**Type:** Task | **Effort:** M | **Depends on:** MEM-03

**Description:**
Like and comment on memories within the full-screen viewer.

**Acceptance Criteria:**
- [ ] Likes: toggle insert/delete in `memory_likes`; count updates optimistically
- [ ] Like button has spring animation on press (`react-native-reanimated`)
- [ ] Comments: `FlatList` in a bottom sheet, newest at bottom
- [ ] Comment input: `TextInput` with "Send" button
- [ ] Comment shows commenter avatar, name, content, relative time
- [ ] Real-time: new likes/comments from others appear without refresh
- [ ] Loading state while comments fetch

---

#### MEM-05 · Memory permissions
**Type:** Task | **Effort:** XS | **Depends on:** MEM-02

**Description:**
Request the correct iOS and Android permissions for camera and photo library access.

**Acceptance Criteria:**
- [ ] `app.json` declares `NSPhotoLibraryUsageDescription`, `NSCameraUsageDescription`, `CAMERA`, `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO` permissions
- [ ] If permission denied, show a friendly message with a button to open device Settings
- [ ] Permission requested lazily (when user taps Upload, not on app launch)

---

### EP-10 — Polls

---

#### POLL-01 · Polls list screen
**Type:** Story | **Effort:** M | **Depends on:** GROUP-02

**Description:**
List of polls for a group. Create new polls, vote, see live results.

**Acceptance Criteria:**
- [ ] `FlatList` of poll cards: question, options with vote bars and percentages, voter count
- [ ] If user has not voted: option buttons are active
- [ ] If user has voted: selected option highlighted; percentages shown for all options
- [ ] Voter avatar row (first 3 voters, "+N more" label)
- [ ] "Create Poll" button opens a modal/bottom sheet
- [ ] Only admins (or group members?) can create polls — match web behaviour
- [ ] Poll count shown as badge on Polls card in Group Detail

---

#### POLL-02 · Create poll
**Type:** Task | **Effort:** S | **Depends on:** POLL-01

**Description:**
Form to create a new poll with a question and 2–6 options.

**Acceptance Criteria:**
- [ ] Question text input (required)
- [ ] 2 option inputs by default; "+ Add option" button adds up to 6
- [ ] Remove option button (×) on options 3+
- [ ] Submit inserts into `group_polls` and `group_poll_options`
- [ ] After submit, poll appears at top of list (optimistic or refetch)
- [ ] Validation: question required, minimum 2 options non-empty

---

#### POLL-03 · Voting & live results
**Type:** Task | **Effort:** S | **Depends on:** POLL-01

**Description:**
Vote on a poll and see results update live.

**Acceptance Criteria:**
- [ ] Tapping an option inserts into `group_poll_votes` (one vote per user per poll)
- [ ] Optimistic update: selected option immediately shows as voted
- [ ] Percentages recalculate correctly after voting
- [ ] Changing vote: delete old, insert new (or upsert)
- [ ] Real-time subscription refreshes vote counts when others vote

---

### EP-11 — Invites & RSVPs

---

#### INV-01 · Invites screen
**Type:** Story | **Effort:** M | **Depends on:** NAV-01, INFRA-03

**Description:**
Port the invites screen. Tab bar: Pending vs Responded.

**Acceptance Criteria:**
- [ ] Pending tab: list of events user has not responded to
- [ ] Responded tab: past RSVPs with status badge (Going/Maybe/Can't/Unsure)
- [ ] Each invite shows: event title, group name, date/time, location
- [ ] Quick action buttons: Accept / Maybe / Decline / Unsure
- [ ] Tapping an action updates `event_rsvps` and moves item to Responded tab
- [ ] Pending badge on Invites tab updates after RSVP
- [ ] Empty state for each tab

---

#### INV-02 · RSVP badge realtime update
**Type:** Task | **Effort:** S | **Depends on:** INV-01, NAV-01

**Description:**
The pending RSVP count in the Invites tab badge must update in real-time.

**Acceptance Criteria:**
- [ ] `useUnreadCounts` hook (shared) subscribes to `event_rsvps` changes
- [ ] Badge on Invites tab decrements when user RSVPs
- [ ] Badge updates if a new invite is added while the app is open
- [ ] Badge count persists across tab switches (stored in `unreadStore`)

---

#### INV-03 · Create event (from group calendar)
**Type:** Task | **Effort:** M | **Depends on:** CAL-02, INV-01

**Description:**
Admins can create group events. Created events automatically generate `event_rsvps` rows for all group members.

**Acceptance Criteria:**
- [ ] Create event form in Group Calendar (see CAL-02)
- [ ] On creation, insert into `events` table with `is_invite = true`
- [ ] Supabase trigger or Edge Function inserts pending `event_rsvps` for each `group_members` row
- [ ] Notifications sent to all group members (see NOTIF-03)
- [ ] Event appears in Invites tab for all members

---

### EP-12 — Notifications

---

#### NOTIF-01 · Expo Push Notifications setup
**Type:** Task | **Effort:** M | **Depends on:** INFRA-05, INFRA-04

**Description:**
Register for push notifications on app launch, store Expo push token in `push_subscriptions`, handle foreground and background notifications.

**Acceptance Criteria:**
- [ ] `expo-notifications` installed and configured
- [ ] On first launch (after auth), permission requested
- [ ] Expo push token fetched via `Notifications.getExpoPushTokenAsync()`
- [ ] Token upserted into `push_subscriptions` with `platform = 'ios'/'android'` and `expo_push_token`
- [ ] Foreground notification shown using `Notifications.setNotificationHandler`
- [ ] Background notification wakes app and navigates to the correct screen on tap (via deep link)
- [ ] Token refreshed if it changes (`addPushTokenListener`)
- [ ] `app.json` declares notification permissions and icon

---

#### NOTIF-02 · In-app notification centre
**Type:** Story | **Effort:** M | **Depends on:** NOTIF-01

**Description:**
Notification bell in the dashboard header opens a full-screen or modal notification list.

**Acceptance Criteria:**
- [ ] Bell icon in Home screen header; unread count badge
- [ ] Tapping bell navigates to notification list screen (or opens a modal sheet)
- [ ] List shows: icon by type, title, body, relative timestamp, unread highlight
- [ ] Tapping a notification: marks as read, navigates to the linked screen
- [ ] "Mark all read" button
- [ ] Real-time subscription adds new notifications to top of list
- [ ] Empty state: "You're all caught up"

---

#### NOTIF-03 · Send push notifications from Supabase Edge Function
**Type:** Task | **Effort:** M | **Depends on:** NOTIF-01, INFRA-04

**Description:**
Replace the current web push server logic with an Edge Function that handles both Web Push (existing) and Expo Push (new) tokens from the same `push_subscriptions` table.

**Edge Function logic:**
```
send_notification(user_id, title, body, link)
  → query push_subscriptions where user_id = ?
  → for each subscription:
      if platform = 'web'   → send via web-push library (unchanged)
      if platform in ('ios', 'android') → send via Expo Push API
```

**Acceptance Criteria:**
- [ ] Edge Function `send-notification` created in `supabase/functions/`
- [ ] Expo Push API sends to correct token
- [ ] Web Push still works for existing web users
- [ ] Function called from existing notification insert triggers
- [ ] Failed sends logged; invalid tokens cleaned up

---

#### NOTIF-04 · Notification types & routing
**Type:** Task | **Effort:** S | **Depends on:** NOTIF-02, NAV-03

**Description:**
Each notification type routes to the correct screen when tapped.

| Notification Type | Tap Destination |
|---|---|
| `message` | `/dm/[senderId]` |
| `friend_request` | `/friends` (Requests tab) |
| `group_invite` | `/invites` |
| `group_message` | `/groups/[id]/chat` |
| `memory_like` | `/groups/[id]/memories` |
| `memory_comment` | `/groups/[id]/memories` |

**Acceptance Criteria:**
- [ ] All types above route correctly from both killed and backgrounded app state
- [ ] Notification badge on app icon clears after opening the app (iOS badge count API)

---

#### NOTIF-05 · Notification preferences (settings)
**Type:** Task | **Effort:** S | **Depends on:** NOTIF-01, SET-01

**Description:**
User can toggle push notifications on/off from Settings.

**Acceptance Criteria:**
- [ ] Toggle switch in Settings screen
- [ ] On disable: deletes the `push_subscriptions` row for this device
- [ ] On re-enable: re-registers and inserts new token
- [ ] If OS-level permissions revoked, Settings shows a "Enable in device Settings" prompt
- [ ] Preference persists across app restarts

---

### EP-13 — Settings & Profile

---

#### SET-01 · Settings screen
**Type:** Story | **Effort:** M | **Depends on:** NAV-01, INFRA-03

**Description:**
Port the settings screen. Profile info, avatar upload, theme picker, notification toggle, sign out.

**Sections:**

| Section | Contents |
|---|---|
| Profile | Avatar (tappable to upload), full name, username, bio, location |
| Appearance | Accent colour picker (6 options), background style (6 options) |
| Notifications | Push notification toggle |
| Account | Sign Out button |

**Acceptance Criteria:**
- [ ] All fields editable inline with a "Save" button per section (or global Save)
- [ ] Changes saved to `profiles` table
- [ ] Username uniqueness validated before save
- [ ] Accent and background pickers apply theme instantly (React Native appearance API)
- [ ] Sign Out: clears auth session + AsyncStorage + navigates to Login
- [ ] Keyboard avoidance on all inputs

---

#### SET-02 · Avatar upload (native)
**Type:** Task | **Effort:** M | **Depends on:** SET-01, MEM-05

**Description:**
Upload a profile photo from camera or library directly to Supabase Storage.

**Acceptance Criteria:**
- [ ] Tapping avatar shows `ActionSheet` with "Take Photo" and "Choose from Library"
- [ ] Selected image resized to max 512×512 before upload (using `expo-image-manipulator`)
- [ ] Uploaded to `avatars/{userId}.jpg` in Supabase Storage; public URL saved to `profiles.avatar_url`
- [ ] Avatar updates immediately in UI (optimistic)
- [ ] Loading indicator during upload

---

#### SET-03 · Theme system (native)
**Type:** Task | **Effort:** M | **Depends on:** SET-01

**Description:**
Port the 6-accent × 6-background theme system to React Native. CSS variables don't exist on native; use a React context with a style object.

**Implementation:**
```ts
// packages/shared/src/stores/themeStore.ts
interface ThemeStore {
  accent: AccentId
  bg: BgId
  colors: ThemeColors  // resolved hex values
  setAccent: (id: AccentId) => void
  setBg: (id: BgId) => void
}
```

**Acceptance Criteria:**
- [ ] Theme store initialised from `MMKV` (same keys: `accent`, `bg`)
- [ ] `useTheme()` hook returns `colors` object with named colour tokens
- [ ] All native screens consume `useTheme()` instead of hardcoded colours
- [ ] Theme changes apply instantly across the entire app (no restart required)
- [ ] Dark/light mode: `bg` preset drives the base colours; device system preference used as default

---

#### SET-04 · Account deletion (future)
**Type:** Spike | **Effort:** S | **Depends on:** SET-01

**Description:**
Apple App Store **requires** apps with account creation to offer account deletion. This ticket spikes the implementation before store submission.

**Deliverable:**
- Written plan for how `DELETE account` would cascade through all tables
- Draft UI for the "Delete Account" flow (confirmation steps)
- Note on Apple review requirement (guideline 5.1.1)

---

### EP-14 — Shared Package Migration

---

#### SHARE-01 · Extract `formatTime` and `formatDate` utilities
**Type:** Task | **Effort:** XS | **Depends on:** INFRA-02

**Description:**
Both web and native need the same time/date formatting. Extract from the web app into `packages/shared`.

**Acceptance Criteria:**
- [ ] `packages/shared/src/utils/formatTime.ts` exports `formatTime(iso: string): string`
- [ ] `packages/shared/src/utils/formatDate.ts` exports `formatDate(iso: string): string`
- [ ] All web pages updated to import from `@together/shared` (no behaviour change)
- [ ] Native uses same functions

---

#### SHARE-02 · Extract `useAuth` hook
**Type:** Task | **Effort:** S | **Depends on:** INFRA-03, AUTH-02

**Description:**
Shared authentication hook used by both platforms.

**Acceptance Criteria:**
- [ ] `useAuth()` returns `{ user, profile, signIn, signUp, signOut, loading }`
- [ ] Web uses `@supabase/ssr` cookie adapter internally; native uses AsyncStorage adapter
- [ ] Platform distinction handled via environment/build-time flag or separate client files
- [ ] Web pages migrated to use `useAuth` from shared package

---

#### SHARE-03 · Extract `useUnreadCounts` hook
**Type:** Task | **Effort:** S | **Depends on:** INFRA-03

**Description:**
Shared hook for unread DM count and pending RSVP count. Powers both BottomNav (web) and tab bar badges (native).

**Acceptance Criteria:**
- [ ] Subscribes to `direct_messages` changes for unread DMs
- [ ] Subscribes to `event_rsvps` changes for pending RSVPs
- [ ] Updates `unreadStore` (Zustand) on every change
- [ ] Web `BottomNav` reads from `unreadStore` instead of local state
- [ ] Native tab bar reads from `unreadStore`

---

#### SHARE-04 · Extract `useGroups` and `useFriends` hooks
**Type:** Task | **Effort:** S | **Depends on:** INFRA-03

**Description:**
Data-fetching hooks for the two most commonly needed datasets.

**Acceptance Criteria:**
- [ ] `useGroups(userId)` returns `{ groups, loading, refetch }` with 30s TTL cache
- [ ] `useFriends(userId)` returns `{ friends, pending, sent, loading, refetch }`
- [ ] Both hooks use shared `cache.ts` for stale-while-revalidate
- [ ] Web pages updated to consume from shared (no behaviour change)

---

#### SHARE-05 · Migrate `cache.ts` to be platform-safe
**Type:** Task | **Effort:** XS | **Depends on:** INFRA-02

**Description:**
Current `cache.ts` uses in-memory JS Map. Works on both platforms already; just needs to be moved to shared.

**Acceptance Criteria:**
- [ ] `packages/shared/src/utils/cache.ts` is the canonical version
- [ ] Web `lib/cache.ts` re-exports from shared (no breaking changes)
- [ ] Native imports from shared directly

---

### EP-15 — QA, Performance & Release

---

#### REL-01 · TestFlight (iOS) internal testing
**Type:** Task | **Effort:** M | **Depends on:** All EP-02 through EP-13

**Description:**
Submit a preview build to Apple TestFlight for internal testing by the team.

**Acceptance Criteria:**
- [ ] `eas build --profile preview --platform ios` succeeds
- [ ] Build submitted to TestFlight via `eas submit`
- [ ] All team members invited and can install via TestFlight
- [ ] App does not crash on launch on iPhone 12 or newer
- [ ] Core flows (login, message, create group) work end to end

---

#### REL-02 · Android internal testing (Google Play)
**Type:** Task | **Effort:** M | **Depends on:** All EP-02 through EP-13

**Description:**
Submit a preview build to Google Play Internal Testing track.

**Acceptance Criteria:**
- [ ] `eas build --profile preview --platform android` succeeds
- [ ] APK/AAB submitted to Play Console Internal Testing
- [ ] App installs and launches on Android 10+ (API 29+)
- [ ] Core flows work end to end

---

#### REL-03 · Performance audit
**Type:** Task | **Effort:** M | **Depends on:** REL-01, REL-02

**Description:**
Profile the app on real devices and fix any jank or slow screens.

**Targets:**

| Metric | Target |
|---|---|
| App launch to Dashboard (cold) | < 2 seconds |
| Tab switch | < 100ms |
| Chat message send to appear | < 200ms (optimistic) |
| Memory grid scroll | 60fps (no dropped frames) |
| Vertical memory viewer swipe | 60fps |

**Acceptance Criteria:**
- [ ] Flipper or React Native Perf Monitor shows no sustained frame drops during normal use
- [ ] `FlashList` used in all lists > 20 items
- [ ] `expo-image` used for all remote images
- [ ] No synchronous work on main thread (Supabase queries are all async)
- [ ] Memo and useCallback applied where profiler identifies unnecessary renders

---

#### REL-04 · App Store metadata & assets
**Type:** Task | **Effort:** S | **Depends on:** —

**Description:**
Prepare App Store listing assets for both iOS and Android.

**Deliverables:**

| Asset | iOS | Android |
|---|---|---|
| App icon | 1024×1024 PNG | 512×512 PNG |
| Screenshots | 6.7" and 6.1" iPhone | Phone + tablet |
| App name | Together | Together |
| Subtitle | Plan, chat, and make memories | — |
| Description | (to be written) | (to be written) |
| Keywords | friends, group chat, calendar, memories, polls | — |
| Privacy policy URL | Required | Required |
| Support URL | Required | Required |
| Content rating | 4+ | Everyone |

---

#### REL-05 · Apple App Store submission
**Type:** Task | **Effort:** M | **Depends on:** REL-01, REL-04, SET-04

**Description:**
Submit the production build for App Store review.

**Checklist:**
- [ ] Privacy manifest (`PrivacyInfo.xcprivacy`) completed (required from May 2024)
- [ ] Account deletion flow implemented (SET-04 spike completed and built)
- [ ] `NSUserTrackingUsageDescription` added if any analytics used
- [ ] App does not use private APIs
- [ ] All required permissions have usage descriptions in `app.json`
- [ ] `eas submit --platform ios` runs without error
- [ ] App Review submission notes written (explain any non-obvious flows)

---

#### REL-06 · Google Play Store submission
**Type:** Task | **Effort:** M | **Depends on:** REL-02, REL-04

**Description:**
Submit the production build to Google Play.

**Checklist:**
- [ ] Target API 34+ (required from Aug 2024)
- [ ] 64-bit binaries included
- [ ] Data safety form completed in Play Console
- [ ] Content rating questionnaire completed
- [ ] `eas submit --platform android` runs without error
- [ ] AAB (not APK) submitted for production track

---

## 9. Dependency Graph

```
EP-01 (Infrastructure)
│
├──► EP-02 (Auth)
│    │
│    └──► EP-03 (Navigation)
│         │
│         ├──► EP-04 (Dashboard)
│         │
│         ├──► EP-05 (Friends & DMs)  ──────────────────────┐
│         │                                                   │
│         ├──► EP-06 (Groups)  ──────────────────────────┐  │
│         │    │                                           │  │
│         │    ├──► EP-07 (Group Chat)                    │  │
│         │    │                                           │  │
│         │    ├──► EP-08 (Calendar)  ◄────── EP-05 ───────┘ │
│         │    │                                              │
│         │    ├──► EP-09 (Memories)                         │
│         │    │                                              │
│         │    ├──► EP-10 (Polls)                            │
│         │    │                                              │
│         │    └──► EP-11 (Invites)                          │
│         │                                                   │
│         ├──► EP-12 (Notifications) ◄─── EP-06, EP-05 ──────┘
│         │
│         └──► EP-13 (Settings)
│
├──► EP-14 (Shared Migration)  ← overlaps EP-01; see ticket order below
│
└──────────────────────────────────────────────────────────────────────
                    All complete ──► EP-15 (QA & Release)
```

**Ticket order within Sprint 1 (removes circular deps):** `INFRA-01` → `INFRA-02` → **`SHARE-01`** and **`SHARE-05`** (parallel) → **`INFRA-03`** → **`SHARE-02`**, **`SHARE-03`**, **`SHARE-04`** (after `INFRA-03`; **`SHARE-02`** also needs **`AUTH-02`**).

**Suggested sprint order:**

| Sprint | Epics | Goal |
|---|---|---|
| 1 | EP-01, EP-14 | Monorepo live; run `SHARE-01`/`SHARE-05` before `INFRA-03`; shared package + Expo app boots |
| 2 | EP-02, EP-03 | Auth works on device, navigation shell in place |
| 3 | EP-04, EP-05 | Dashboard and DMs functional |
| 4 | EP-06, EP-07 | Groups and chat working |
| 5 | EP-08 | Calendar on native |
| 6 | EP-09, EP-10, EP-11 | Memories, Polls, Invites |
| 7 | EP-12, EP-13 | Notifications and Settings |
| 8 | EP-15 | QA, store submission |

---

## 10. Risk Register

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-01 | Supabase Realtime WebSocket stability on mobile (background/foreground lifecycle) | Medium | High | Reconnect on `AppState` change to 'active'; test on airplane mode |
| R-02 | Apple App Store rejection (account deletion missing) | High | High | Implement SET-04 before REL-05; account deletion is a hard requirement |
| R-03 | Expo SDK incompatibility with a dependency | Low | Medium | Pin Expo SDK version; check compatibility matrix before adding any library |
| R-04 | `@react-native-community/datetimepicker` Android UX differs significantly from iOS | Medium | Low | Design separate Android flow (two-step: date then time) in CAL-03 |
| R-05 | NativeWind v4 class coverage gaps (some Tailwind classes not supported) | Medium | Medium | Audit class usage in web; fall back to `StyleSheet` for unsupported classes |
| R-06 | Video playback performance on older Android devices | Medium | Medium | Use `expo-av` with `useNativeControls`; test on API 29 device |
| R-07 | Push notification delivery rate (Expo Push → APNs → device) | Low | Medium | Monitor via Expo Push Receipts API; handle `DeviceNotRegistered` errors |
| R-08 | Web app regression during shared package extraction | Medium | Low | Run full web regression test after each SHARE-0x ticket |
| R-09 | EAS Build minutes quota exceeded | Low | Low | Use free tier for dev builds; production builds only on merge to main |
| R-10 | App Store review takes > 7 days | Low | Medium | Submit early (before sprint 8 ends); use TestFlight for user testing in parallel |

---

## 11. Definition of Done

A ticket is **Done** when all of the following are true:

- [ ] All Acceptance Criteria checked off
- [ ] Code reviewed and approved by at least one other person
- [ ] TypeScript: zero errors (`tsc --noEmit` passes)
- [ ] Lint: zero warnings (`eslint` passes)
- [ ] Tested manually on a physical iPhone (iOS 16+) and Android device (API 33+)
- [ ] Tested manually in Expo Go on both platforms (where applicable)
- [ ] No console errors or warnings in the relevant flows
- [ ] No regression introduced in the web app (for SHARE-0x tickets)
- [ ] Relevant documentation updated (this file, `README.md` if applicable)

---

## 12. Release Checklist

### Pre-submission (both platforms)
- [ ] All EP-01 through EP-14 tickets Done
- [ ] Privacy policy published at a public URL
- [ ] Terms of service published
- [ ] App icon at correct dimensions with no transparency (iOS: no alpha channel)
- [ ] Splash screen configured (Expo: `expo-splash-screen`)
- [ ] Deep linking tested from cold start
- [ ] Push notifications tested on physical devices
- [ ] Sign out → sign in flow tested (no stale data)
- [ ] Memory upload tested on both platforms (permissions, large files)
- [ ] Offline behaviour: graceful error messages when no network

### iOS specific
- [ ] Privacy manifest (`PrivacyInfo.xcprivacy`) declares all used APIs
- [ ] Minimum iOS version set to 16.0
- [ ] Account deletion flow implemented and tested
- [ ] Screenshots taken on iPhone 14 Pro Max (6.7") and iPhone 15 (6.1")
- [ ] TestFlight beta tested for at least 3 days before production submission

### Android specific
- [ ] Target SDK 34
- [ ] `android:exported` set correctly on all activities
- [ ] Data safety form completed in Play Console (what data is collected and why)
- [ ] Screenshots taken on a Pixel-class device
- [ ] APK tested on API 29 (Android 10) minimum

---

*Last updated: 2026-05-02*
*Authored for: Together app — React Native migration*
*Total tickets: 57 across 15 epics*
