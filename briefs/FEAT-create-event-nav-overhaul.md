# Feature Brief — Create Event Flow & Nav Overhaul

**Type:** Feature
**Platform:** Web + Native (both)
**Status:** Ready for development
**Author:** Vision Team
**Effort estimate:** L (native) + M (web)

---

## Problem Statement

Creating an event or plan with friends is cognitively demanding and tiresome, leading to reduced motivation, engagement, and interest. Plans "die in the group chat" because the friction to formalise them is too high. The goal is to make event creation seamless, organic, and achievable within **30–45 seconds** with minimal cognitive load.

---

## Proposed Solution

Two interconnected changes:

1. **Nav bar overhaul** — replace the current nav with a 5-item bar where Create Event is the centrepiece: a noticeably larger button (like Instagram's camera or Snapchat's capture button) that signals "this is the primary action in the app."

2. **Create Event flow** — a fast, multi-step bottom-sheet flow inspired by Outlook's event creation UI. Sequential screens, one decision at a time, minimum required fields.

---

## User Story

> As a Together user,
> I want to create an event and invite friends in under a minute,
> So that a plan I'm excited about actually gets locked in before the moment passes.

---

## Part 1 — Nav Bar Overhaul

### New nav structure (replaces current on both web and native)

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│   Home    Groups   [ CREATE ]   Friends   Profile          │
│    🏠       👥    [  +  BIG  ]     ❤️       👤             │
│                   [  BUTTON  ]                             │
│                                                            │
└────────────────────────────────────────────────────────────┘

  The Create Event button:
  - Noticeably larger than the other 4 icons
  - Raised / elevated above the bar (like Instagram's + or Snapchat's circle)
  - Accent colour background (not just an icon — a filled circle/pill)
  - No label needed — the visual treatment communicates primary action
```

### What changes from current nav

| Current tab | New tab | Notes |
|---|---|---|
| Home | Home | Unchanged |
| Groups | Groups | Unchanged |
| Invites | **Create Event** | Invites moves — see note below |
| Friends | Friends | Unchanged |
| Settings | **Profile** | Profile absorbs Settings |

### ⚠️ Where do Invites go?

Invites is being removed from the nav. **Recommendation:** move pending invites to the Home screen as a section ("You have 2 pending invites") with a badge on the Home icon. This keeps them visible without needing a dedicated nav slot.

**This needs a decision before dev starts.** Options:
- A) Invites section on Home screen (recommended)
- B) Invites accessible from Groups tab
- C) Notification bell in Home header (already exists)

### Acceptance criteria — Nav

```
[ ] 5 tabs: Home, Groups, Create Event, Friends, Profile
[ ] Create Event button is visibly larger than the other 4 tabs
[ ] Create Event button has accent colour fill (not just an outline icon)
[ ] Create Event button is raised/elevated above the tab bar baseline
[ ] Tapping Create Event opens the Create Event flow (see Part 2)
[ ] Profile tab shows: avatar, name, bio, location, and all current Settings options
[ ] Active tab highlighted with accent colour (same as current)
[ ] Unread DM badge still shows on Friends tab
[ ] Nav updated on both web (BottomNav component) and native (tab bar)
```

---

## Part 2 — Create Event Flow

### Overview

Tapping the Create Event button opens a **bottom sheet** (slides up from bottom) that guides the user through event creation in sequential steps. One screen at a time. Minimum required to save: **Title only**.

### Flow diagram

```
  Tap Create Event button
           │
           ▼
  ┌─────────────────────┐
  │   SCREEN 1: TITLE   │  Required. Save button greyed until filled.
  │                     │
  │  Event name...      │
  │                     │
  │  [Next →]           │
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  SCREEN 2: PEOPLE   │  Optional. Can skip.
  │                     │
  │  👤 Search friends  │
  │  [ ] James Smith    │
  │  [ ] Sarah Lee      │
  │  [x] Tom Wu         │  ← selected
  │                     │
  │  [Skip]   [Next →]  │
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  SCREEN 3: DATE     │  Optional. Defaults to today.
  │                     │
  │  📅 Mon, 27 Apr     │
  │     < calendar >    │
  │                     │
  │  [Skip]   [Next →]  │
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  SCREEN 4: TIME     │  Optional. Defaults to next full hour.
  │                     │
  │  🕐 9:00 PM         │
  │  Duration: 1 hour   │
  │                     │
  │  [Skip]   [Next →]  │
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  SCREEN 5: LOCATION │  Optional. Plain text for now.
  │                     │
  │  📍 Add location... │
  │                     │
  │  [Skip]   [Next →]  │
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  SCREEN 6: GROUP    │  Only shown if 1+ friends invited.
  │                     │
  │  Create a group?    │
  │                     │
  │  [ Temporary group ]│  ← disappears when event ends
  │  [ Permanent group ]│  ← stays as an ongoing group
  │  [ No group ]       │
  │                     │
  │  [Create Event ✓]   │
  └──────────┬──────────┘
             │
             ▼
     Event created! ✓
     Toast + navigate to event / group
```

---

### Screen-by-screen spec

---

#### Screen 1 — Title

```
┌─────────────────────────────────┐
│  ×                          [✓] │  ← ✓ greyed until title entered
│                                 │
│  New Event                      │  ← screen heading
│                                 │
│  ┌─────────────────────────┐    │
│  │  Event name...          │    │  ← auto-focused, keyboard open
│  └─────────────────────────┘    │
│                                 │
│                    [Next →]     │  ← greyed until title has text
└─────────────────────────────────┘
```

**States:**
- Empty: Next button greyed, ✓ greyed
- Has text: Next and ✓ both active
- ✓ tapped at any point: saves event with whatever is filled in so far and skips remaining screens

**Copy:**
- Placeholder: `Event name...`
- Screen title: `New Event`
- Next button: `Next`
- Quick save button: `✓` (checkmark, top right)

---

#### Screen 2 — People

```
┌─────────────────────────────────┐
│  ← Back                     [✓]│
│                                 │
│  Who's coming?                  │
│                                 │
│  ┌─────────────────────────┐    │
│  │  🔍 Search friends...   │    │
│  └─────────────────────────┘    │
│                                 │
│  [●] James Smith    @jsmith     │  ← tap to select
│  [●] Sarah Lee      @slee       │
│  [●] Tom Wu         @tomwu  ✓  │  ← selected (accent colour tick)
│                                 │
│  [Skip]              [Next →]   │
└─────────────────────────────────┘
```

**States:**
- No friends added yet: empty list, "You haven't added any friends yet" message
- Search active: filters list in real time
- 1+ selected: selection count shown ("3 people coming")

**Copy:**
- Screen title: `Who's coming?`
- Search placeholder: `Search friends...`
- Empty friends state: `Add friends first to invite them to events`
- Selection count: `[N] coming`
- Skip: `Skip`

---

#### Screen 3 — Date

```
┌─────────────────────────────────┐
│  ← Back                     [✓]│
│                                 │
│  When is it?                    │
│                                 │
│  ┌─────────────────────────┐    │
│  │   April 2025            │    │
│  │   < calendar grid >     │    │  ← tappable day grid
│  │   Today highlighted     │    │
│  └─────────────────────────┘    │
│                                 │
│  All day  ○──────────────●      │  ← toggle (default: off)
│                                 │
│  [Skip]              [Next →]   │
└─────────────────────────────────┘
```

**States:**
- No date selected: today highlighted as default
- Date selected: highlighted in accent colour
- All day toggle on: hides time screen (jumps straight to Location)

---

#### Screen 4 — Time

*(Only shown if All Day toggle is off)*

```
┌─────────────────────────────────┐
│  ← Back                     [✓]│
│                                 │
│  What time?                     │
│                                 │
│  Starts    9:00 PM              │  ← tappable, opens time picker
│  Ends      10:00 PM             │  ← tappable, opens time picker
│  Duration  1 hour               │  ← auto-calculated, read-only
│                                 │
│  [Skip]              [Next →]   │
└─────────────────────────────────┘
```

**Rules:**
- End time must be after start time — show error if not
- Duration auto-calculates from start/end
- Default: next full hour → next full hour + 1

**Copy:**
- Error if end before start: `End time must be after start time`

---

#### Screen 5 — Location

```
┌─────────────────────────────────┐
│  ← Back                     [✓]│
│                                 │
│  Where?                         │
│                                 │
│  ┌─────────────────────────┐    │
│  │  📍 Add a location...   │    │  ← plain text field for now
│  └─────────────────────────┘    │
│                                 │
│  [Skip]              [Next →]   │
└─────────────────────────────────┘
```

**Note for dev:** Plain text field only for now. Google Maps Places API integration is planned for a future sprint — build with this in mind (the field value should map cleanly to a `location_text` column in the DB).

---

#### Screen 6 — Group (only if friends were invited)

```
┌─────────────────────────────────┐
│  ← Back                         │
│                                 │
│  Create a group?                │
│                                 │
│  ┌─────────────────────────┐    │
│  │  ⏱  Temporary group    │    │  ← group dissolves when event ends
│  │     Just for this event │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │  ∞  Permanent group     │    │  ← group stays after event
│  │     Keep chatting after │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │     No group            │    │  ← just send invites, no chat
│  └─────────────────────────┘    │
│                                 │
│              [Create Event ✓]   │
└─────────────────────────────────┘
```

**Temporary group behaviour:**
- Group created, all invited friends added as members
- Group chat available until event end datetime
- After event ends: group archived (read-only), chat history preserved
- If no end time set: group stays until manually dissolved

**Permanent group behaviour:**
- Standard group, same as creating a group manually
- Event attached to the group's calendar
- Group persists indefinitely

**No group:**
- Friends receive event invites only (shows in their Invites section)
- No group chat created

---

## Part 3 — Profile screen (replaces Settings)

Profile absorbs all current Settings functionality. The tab now serves two purposes: view your public profile AND edit your account settings.

```
┌─────────────────────────────────┐
│                                 │
│         [●] Avatar              │  ← tap to upload
│       Full Name                 │
│       @username                 │
│       Bio text here             │
│       📍 Location               │
│                                 │
│  ─────── Appearance ──────────  │
│  Accent colour  ○ ○ ● ○ ○ ○    │
│  Background     ○ ○ ○ ● ○ ○    │
│                                 │
│  ─────── Notifications ────────  │
│  Push notifications    [toggle] │
│                                 │
│  ─────── Account ─────────────  │
│  [Sign Out]                     │
│                                 │
└─────────────────────────────────┘
```

---

## All states to design

| Screen | Loading | Empty | Error | Success |
|---|---|---|---|---|
| People search | Spinner while searching | "No friends match '[query]'" | "Couldn't load friends" + retry | Checkmark on selected |
| Date picker | — | Today default | — | Selected date highlighted |
| Location field | — | Placeholder text | — | Text shown |
| Group screen | — | — | — | — |
| Final save | Spinner on button | — | Toast: "Couldn't create event. Try again." | Toast + navigate |

---

## Edge cases

```
CASE: User taps ✓ (quick save) on Screen 1 without filling anything else
→ Event created with title only, no date/people/location
→ Toast: "Event created! Add more details anytime."

CASE: User has no friends
→ Screen 2 shows empty state, Skip is the only option
→ Screen 6 (group) is skipped entirely

CASE: User invites friends but taps Skip on group screen
→ Friends receive invites, no group created

CASE: Event end time before start time
→ Inline error on Time screen, Next disabled

CASE: Temp group — event has no end time
→ Show note on group screen: "Group will stay open until you dissolve it"

CASE: User closes the bottom sheet mid-flow (taps ×)
→ Alert: "Discard event?" with Discard / Keep editing
→ Nothing saved if Discard

CASE: Network drops during final save
→ Button reverts, toast: "Couldn't create event. Check your connection."

CASE: Title is only whitespace
→ Treat as empty, keep Next/✓ greyed

CASE: Very long event name (100+ chars)
→ Input accepts it, display truncates with ellipsis where needed
```

---

## Copy — complete list

| Element | Copy |
|---|---|
| Nav button label | `Create` (or none — icon only) |
| Sheet heading | `New Event` |
| Title placeholder | `Event name...` |
| People heading | `Who's coming?` |
| People search placeholder | `Search friends...` |
| People empty state | `Add friends first to invite them to events` |
| Date heading | `When is it?` |
| Time heading | `What time?` |
| Location heading | `Where?` |
| Location placeholder | `Add a location...` |
| Group heading | `Create a group?` |
| Temp group label | `Temporary group` |
| Temp group sublabel | `Just for this event` |
| Permanent group label | `Permanent group` |
| Permanent group sublabel | `Keep chatting after` |
| No group label | `No group` |
| Final save button | `Create Event` |
| Success toast | `Event created!` |
| Discard confirmation | `Discard event?` |
| Discard confirm button | `Discard` |
| Discard cancel button | `Keep editing` |
| Error toast | `Couldn't create event. Try again.` |
| End time error | `End time must be after start time` |

---

## Out of scope (v1)

```
- Google Maps / Places API for location search (plain text only for now)
- Repeating / recurring events
- Event cover photo
- External invites (non-friends, shareable link)
- Event description / notes field
- Attachments
- Finances / cost splitting
- Suggested friends based on past events
- Event templates ("Movie night", "Dinner", etc.)
- RSVP deadline
```

---

## Open question — Invites

Where do pending event invites live now that the Invites tab is removed?

**Recommended:** Add an "Invites" section to the Home screen showing pending invites. Badge the Home icon when there are pending invites.

**Needs a decision before dev starts.**

---

## Acceptance criteria — full list

```
NAV
[ ] 5-tab nav on both web and native
[ ] Create Event button noticeably larger than other tabs
[ ] Create Event button has filled accent colour background (not outline)
[ ] Profile tab exists and includes all current Settings functionality
[ ] Settings tab removed

CREATE EVENT FLOW
[ ] Bottom sheet slides up when Create Event tapped
[ ] Screen 1: Title input, auto-focused, keyboard open
[ ] ✓ quick-save button visible on all screens, always active once title entered
[ ] Next button greyed on Screen 1 until title has non-whitespace text
[ ] Screen 2: Friends list with search, multi-select, skip option
[ ] Screen 3: Date picker, all-day toggle
[ ] Screen 4: Time picker (start + end), skipped if all-day on
[ ] Screen 5: Location plain text field, skip option
[ ] Screen 6: Group choice shown only if friends invited
[ ] Temporary group dissolves when event ends (or on manual dissolve)
[ ] Permanent group behaves as a standard group
[ ] No group: invites sent only, no chat
[ ] Closing sheet mid-flow shows discard confirmation
[ ] Success toast shown after event created
[ ] Error toast if save fails

PROFILE
[ ] Avatar, name, username, bio, location visible
[ ] All appearance settings present (accent, background)
[ ] Notification toggle present
[ ] Sign out button present
```

---

*Brief written: 2026-05-02*
*Vision Team — Together*
