# Together — Vision Team Guide

> **Who is this for?** The Vision Team — the people who decide *what* Together should be and *how* it should feel. Designers, product thinkers, UX leads, and anyone whose job is to shape the user experience rather than write the code.

---

## Table of Contents

1. [Your role and the dev team's role](#1-your-role-and-the-dev-teams-role)
2. [The golden rule: specificity ships faster](#2-the-golden-rule-specificity-ships-faster)
3. [Template: New Feature Brief](#3-template-new-feature-brief)
4. [Template: UI Change Request](#4-template-ui-change-request)
5. [Template: User Flow Document](#5-template-user-flow-document)
6. [Template: Bug Report (UX perspective)](#6-template-bug-report-ux-perspective)
7. [Template: Content & Copy Change](#7-template-content--copy-change)
8. [The states every screen needs](#8-the-states-every-screen-needs)
9. [How to document edge cases](#9-how-to-document-edge-cases)
10. [How to communicate UI layout](#10-how-to-communicate-ui-layout)
11. [How to give feedback on built features](#11-how-to-give-feedback-on-built-features)
12. [Prioritisation — making the case for your idea](#12-prioritisation--making-the-case-for-your-idea)
13. [Working with AI to document your ideas](#13-working-with-ai-to-document-your-ideas)
14. [Common scenarios and how to handle them](#14-common-scenarios-and-how-to-handle-them)
15. [Quick reference](#15-quick-reference)

---

## 1. Your role and the dev team's role

Understanding this boundary prevents most miscommunication.

```
┌───────────────────────────────────────────────────────────────────┐
│                    WHO OWNS WHAT                                  │
│                                                                   │
│  VISION TEAM owns the WHAT and the WHY                           │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  • What problem are we solving?                         │     │
│  │  • Who is affected and how often?                       │     │
│  │  • What does success look like?                         │     │
│  │  • What should the user experience feel like?           │     │
│  │  • What are the edge cases and error states?            │     │
│  │  • What copy/labels/messages do we use?                 │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                   │
│  DEV TEAM owns the HOW                                           │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  • How is it technically built?                         │     │
│  │  • Which database tables are involved?                  │     │
│  │  • How long will it take?                               │     │
│  │  • What are the technical tradeoffs?                    │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                   │
│  SHARED DECISIONS                                                │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  • Is this the right priority right now?                │     │
│  │  • Does the technical constraint change the UX?         │     │
│  │  • What's the minimum version we can ship first?        │     │
│  └─────────────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────────────┘
```

### What the dev team needs from you

Developers are not mind readers. The more clearly you answer these four questions, the faster and more accurately your idea gets built:

1. **What problem does this solve?** (not just "the feature", the *why*)
2. **What does it look like in every state?** (loading, empty, error, success)
3. **What are the edge cases?** (what if the user has no friends? what if the name is 100 chars long?)
4. **What is the exact copy?** (button labels, error messages, placeholder text)

---

## 2. The golden rule: specificity ships faster

Vague asks create rework. The developer builds their interpretation, you see it and say "that's not what I meant", they rebuild. You lose a week.

```
┌──────────────────────────────────────────────────────────────────┐
│  VAGUE vs SPECIFIC — the difference in outcome                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  VAGUE:   "Make the friends page better"                         │
│  RESULT:  Developer guesses. Probably wrong.                     │
│                                                                  │
│  SPECIFIC: "On the friends page, users search by exact username  │
│             but they keep typing first names (e.g. 'james')      │
│             and getting no results. Change the search to match   │
│             partial usernames AND full names. Show results as    │
│             you type with a 300ms debounce. If no results show   │
│             'No users found matching @james'."                   │
│  RESULT:  Developer builds exactly that. Ships in 1 day.        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Template: New Feature Brief

Use this when proposing something that doesn't exist yet.

```
╔══════════════════════════════════════════════════════════════════╗
║  NEW FEATURE BRIEF                                               ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  FEATURE NAME                                                    ║
║  ──────────────────────────────────────────────────────────────  ║
║  [Short, verb-first title]                                       ║
║  e.g. "Fuzzy search for friends by name or username"             ║
║                                                                  ║
║  PROBLEM STATEMENT                                               ║
║  ──────────────────────────────────────────────────────────────  ║
║  What is currently broken or missing? Who is affected?           ║
║  How often does this happen? What do users do instead?           ║
║                                                                  ║
║  PROPOSED SOLUTION                                               ║
║  ──────────────────────────────────────────────────────────────  ║
║  Describe the feature in plain English. What does the user do?   ║
║  What happens? Walk through the flow step by step.               ║
║                                                                  ║
║  USER STORY                                                      ║
║  ──────────────────────────────────────────────────────────────  ║
║  As a [type of user],                                            ║
║  I want to [do something],                                       ║
║  So that [I get this benefit].                                   ║
║                                                                  ║
║  SCREENS AFFECTED                                                ║
║  ──────────────────────────────────────────────────────────────  ║
║  List every screen or part of the app this touches.              ║
║                                                                  ║
║  ACCEPTANCE CRITERIA                                             ║
║  ──────────────────────────────────────────────────────────────  ║
║  A checklist. Each item = one thing that must be true for        ║
║  the feature to be considered done.                              ║
║  [ ] ...                                                         ║
║  [ ] ...                                                         ║
║                                                                  ║
║  STATES TO DESIGN                                                ║
║  ──────────────────────────────────────────────────────────────  ║
║  [ ] Default / idle state                                        ║
║  [ ] Loading state                                               ║
║  [ ] Success state                                               ║
║  [ ] Empty state (no data)                                       ║
║  [ ] Error state                                                 ║
║                                                                  ║
║  EDGE CASES                                                      ║
║  ──────────────────────────────────────────────────────────────  ║
║  What happens when... (list unusual but possible scenarios)      ║
║                                                                  ║
║  COPY                                                            ║
║  ──────────────────────────────────────────────────────────────  ║
║  List every button label, placeholder, error message,            ║
║  empty state message, and confirmation text.                     ║
║                                                                  ║
║  PRIORITY                                                        ║
║  ──────────────────────────────────────────────────────────────  ║
║  Why now? What breaks if we don't do this?                       ║
║                                                                  ║
║  OUT OF SCOPE (v1)                                               ║
║  ──────────────────────────────────────────────────────────────  ║
║  List things that are related but deliberately NOT in this       ║
║  first version. This prevents scope creep mid-build.             ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### Filled example — Fuzzy Friend Search

```
FEATURE NAME
  Partial name and username search for adding friends

PROBLEM STATEMENT
  Users currently search for friends by typing an exact username. Most users
  don't know their friends' usernames — they know their real names. This causes
  "No results found" confusion and results in users giving up. Estimated 40%
  of friend requests are never sent because search returns nothing.

PROPOSED SOLUTION
  Change the friend search input to match against both partial usernames AND
  full names. Results appear as the user types (after 3 characters). Show a
  list of up to 5 matching results with avatar, full name, and username.
  Tapping "Add" sends a friend request.

USER STORY
  As a new Together user,
  I want to find my friend James by typing his first name,
  So that I don't need to ask him for his exact username separately.

SCREENS AFFECTED
  - Friends page → "Add a friend" section

ACCEPTANCE CRITERIA
  [x] Typing 3+ characters shows matching results in real time
  [x] Matches on partial username ("joh" finds "john_doe")
  [x] Matches on partial full name ("Jam" finds "James Smith")
  [x] Results show: avatar (or initials), full name, username, Add button
  [x] If already friends, show "Already friends" instead of Add
  [x] If request already sent, show "Request sent"
  [x] Max 5 results shown
  [x] Typing fewer than 3 characters shows nothing (no results flash)

STATES TO DESIGN
  [x] Idle: empty input, "Search by name or @username" placeholder
  [x] Loading: subtle spinner while searching
  [x] Results: list of up to 5 people
  [x] No results: "No users found matching '[query]'"
  [x] Error: "Something went wrong. Try again."

EDGE CASES
  - User searches for themselves → don't show their own profile in results
  - Username has special characters (@, numbers) → still matches
  - Very long name (50+ chars) → truncate with ellipsis in result card
  - Network drops mid-search → show error state, allow retry

COPY
  Placeholder:          "Search by name or @username"
  No results:           "No users found matching '[query]'"
  Already friends:      "Already friends"
  Request pending:      "Request sent"
  Add button:           "Add"
  Success toast:        "Friend request sent to [name]!"
  Error:                "Something went wrong. Try again."

PRIORITY
  High. This is blocking new user activation — people can't find friends,
  so they don't use the social features, so they churn.

OUT OF SCOPE (v1)
  - Search by phone number
  - Suggested friends (mutual connections)
  - Filter results by mutual groups
```

---

## 4. Template: UI Change Request

Use this when something already exists but needs to look or behave differently.

```
╔══════════════════════════════════════════════════════════════════╗
║  UI CHANGE REQUEST                                               ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  WHAT SCREEN / COMPONENT                                         ║
║  The specific page or element being changed.                     ║
║                                                                  ║
║  WHAT IT LOOKS / BEHAVES LIKE NOW                                ║
║  Describe the current state. Screenshots are gold here.          ║
║                                                                  ║
║  WHAT IT SHOULD LOOK / BEHAVE LIKE                               ║
║  Describe the target state. Be specific about:                   ║
║    - Colours, spacing, sizing (approximate is fine)              ║
║    - Animation or transitions                                    ║
║    - Interaction behaviour (tap, swipe, hold, etc.)              ║
║                                                                  ║
║  WHY THIS CHANGE                                                 ║
║  User feedback? Usability issue? Brand consistency?              ║
║                                                                  ║
║  BEFORE / AFTER SKETCH                                           ║
║  Even a rough ASCII sketch or annotated screenshot helps.        ║
║                                                                  ║
║  DOES THIS AFFECT ANYTHING ELSE                                  ║
║  Will this change break or impact other screens?                 ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 5. Template: User Flow Document

Use this when documenting a multi-step journey — login, onboarding, creating a group, etc.

A user flow answers: **what does the user tap/see/do at every single step?**

```
╔══════════════════════════════════════════════════════════════════╗
║  USER FLOW DOCUMENT                                              ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  FLOW NAME                                                       ║
║  e.g. "Creating a group and inviting the first member"           ║
║                                                                  ║
║  ENTRY POINT                                                     ║
║  Where does the user start? Which screen?                        ║
║                                                                  ║
║  HAPPY PATH (the normal, everything-works version)               ║
║  Step 1 → Step 2 → Step 3 → ... → End state                     ║
║                                                                  ║
║  ALTERNATIVE PATHS                                               ║
║  What if the user goes back? Skips a step? Closes the app?       ║
║                                                                  ║
║  ERROR PATHS                                                     ║
║  What if something fails at each step?                           ║
║                                                                  ║
║  END STATE                                                       ║
║  What does the user see when they've completed the flow?         ║
║  What has changed in the app as a result?                        ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### Flow diagram format

Use this to map out steps visually. Diamonds are decisions, rectangles are screens/actions.

```
  User taps "Create Group"
           │
           ▼
  ┌─────────────────┐
  │  Group Name     │  ← Screen: form with name + optional description
  │  input screen   │
  └────────┬────────┘
           │ Taps "Create"
           ▼
        ◇ Valid? ◇
       /           \
     NO             YES
      │               │
      ▼               ▼
  Show error      ┌──────────────────┐
  "Name is        │  Group created!  │
   required"      │  Invite screen   │  ← Prompt to add first member
                  └────────┬─────────┘
                           │
               ┌───────────┼───────────┐
               ▼           ▼           ▼
          Invites      Skips for    Shares
          friend       now          invite link
               │           │           │
               └─────┬─────┘           │
                     ▼                 │
              ┌────────────┐           │
              │ Group Hub  │ ◄─────────┘
              │  screen    │
              └────────────┘
```

---

## 6. Template: Bug Report (UX perspective)

Use this when something works technically but is broken from a user experience point of view.

```
╔══════════════════════════════════════════════════════════════════╗
║  UX BUG REPORT                                                   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  WHAT IS BROKEN                                                  ║
║  One sentence summary.                                           ║
║                                                                  ║
║  HOW TO REPRODUCE                                                ║
║  Exact steps to see the problem:                                 ║
║    1. Open the app                                               ║
║    2. Go to [screen]                                             ║
║    3. Tap [button]                                               ║
║    4. Notice [problem]                                           ║
║                                                                  ║
║  WHAT SHOULD HAPPEN                                              ║
║  Describe the correct behaviour.                                 ║
║                                                                  ║
║  WHAT ACTUALLY HAPPENS                                           ║
║  Describe the broken behaviour.                                  ║
║                                                                  ║
║  SEVERITY                                                        ║
║    Critical — blocks core functionality                          ║
║    High     — bad experience, workaround exists                  ║
║    Medium   — noticeable but minor                               ║
║    Low      — polish issue                                       ║
║                                                                  ║
║  SCREENSHOT / SCREEN RECORDING                                   ║
║  Attach if possible. A 10-second screen recording is worth       ║
║  a thousand words.                                               ║
║                                                                  ║
║  DEVICE / PLATFORM                                               ║
║  iPhone 15 / Android / Chrome on Desktop / etc.                  ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 7. Template: Content & Copy Change

Use this when the words in the app need to change — button labels, onboarding text, empty states, error messages, notification copy, etc.

```
╔══════════════════════════════════════════════════════════════════╗
║  COPY CHANGE REQUEST                                             ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  WHERE                          CURRENT           NEW            ║
║  ─────────────────────────────────────────────────────────────   ║
║  [Screen / component]           "[old text]"     "[new text]"    ║
║                                                                  ║
║  REASON FOR CHANGE                                               ║
║  User confusion / brand voice / A-B test / etc.                  ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### Example

| Where | Current copy | New copy | Reason |
|---|---|---|---|
| Friends page — empty state | "No friends yet" | "Add your first friend to get started" | Too blunt, doesn't guide the user |
| DM send button | "Send" | "→" (icon only) | More modern, saves space on mobile |
| Invite declined toast | "RSVP updated" | "Got it — you won't be going to [event]" | "RSVP updated" is jargon |
| Onboarding step 2 | "Choose theme" | "Make it yours" | Warmer, less technical |

---

## 8. The states every screen needs

This is the most common thing Vision Team misses, and the most common reason dev and design go back and forth. **Every screen has multiple states**, and you need to define all of them.

```
┌─────────────────────────────────────────────────────────────────┐
│              THE 6 STATES OF EVERY SCREEN                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. DEFAULT / IDLE                                              │
│     The screen as it normally appears with data.               │
│     This is the one everyone designs. Don't forget the others. │
│                                                                 │
│  2. LOADING                                                     │
│     What does the user see while data is fetching?             │
│     Options: spinner, skeleton screen, "Loading..." text        │
│     Never leave this blank — a blank screen looks broken.      │
│                                                                 │
│  3. EMPTY                                                       │
│     What if there's no data yet?                               │
│     e.g. Groups page with 0 groups, DMs with no messages       │
│     Must include: message + call to action (what to do next)   │
│                                                                 │
│  4. ERROR                                                       │
│     What if something goes wrong? (no internet, server down)   │
│     Must include: what went wrong + how to recover (retry btn) │
│                                                                 │
│  5. SUCCESS                                                     │
│     After a user completes an action.                          │
│     e.g. after sending a friend request — does something       │
│     change on the button? Is there a toast notification?       │
│                                                                 │
│  6. PARTIAL / DEGRADED                                          │
│     Some data loaded, some didn't. Or feature partially works. │
│     e.g. Avatar fails to load — show initials instead          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### State checklist for every feature you spec

When writing a brief, go through this list for every screen involved:

```
Screen: _______________

[ ] What does it look like when data is loading?
[ ] What does it look like when there's no data?
    └── What's the empty state message?
    └── Is there a CTA (call to action) button?
[ ] What does it look like when there's an error?
    └── What's the error message?
    └── Is there a retry button?
[ ] What happens immediately after the user takes an action?
    └── Toast notification? Button changes? Navigate away?
[ ] What if a user has an unusually high amount of data?
    └── What if someone has 500 friends? Does the list scroll?
[ ] What if the user's name/content is very long or very short?
```

---

## 9. How to document edge cases

Edge cases are the "what ifs" that developers will always ask about. If you don't answer them upfront, work stops while they wait for your answer.

### The edge case categories to always think about

**Data edge cases**
- What if there's no data? (first-time user, empty state)
- What if there's a huge amount of data? (500 items in a list)
- What if the data is extremely long? (50-character username, 1000-word bio)
- What if the data is extremely short? (1-character name)
- What if the data contains special characters? (emojis, accents, symbols)

**User behaviour edge cases**
- What if the user taps the button twice quickly?
- What if the user goes back mid-flow?
- What if the user closes the app halfway through?
- What if the user loses internet connection mid-action?
- What if the user is on a very slow connection?

**Permission edge cases**
- What if the user denies a permission (camera, notifications)?
- What if the user has already done this? (sent a request that's pending)
- What if they're not allowed to do this? (non-admin trying to delete group)

**Time-based edge cases**
- What if an event is in the past?
- What if something expires?
- What if two users do the same thing at the exact same time?

### Format for documenting edge cases

```
EDGE CASE: [describe the situation]
TRIGGER:   When does this happen?
EXPECTED:  What should the user see / experience?
COPY:      What message is shown, if any?
```

**Example:**
```
EDGE CASE: User sends a friend request to someone who already sent them one
TRIGGER:   User searches for a person who has a pending request to them
EXPECTED:  Instead of "Add Friend" button, show "Accept Request" button
COPY:      Button label: "Accept Request"
           Sub-text: "[Name] already sent you a request"
```

---

## 10. How to communicate UI layout

You don't need to be a designer to communicate layout. ASCII wireframes and annotated descriptions work well.

### ASCII wireframes

Simple box drawings get the idea across fast:

```
FRIENDS PAGE — SEARCH SECTION

┌─────────────────────────────────────┐
│  🔍 Search by name or @username     │  ← Input field, full width
└─────────────────────────────────────┘
                 │
         (user types "james")
                 │
                 ▼
┌─────────────────────────────────────┐
│  Search Results                     │
│  ─────────────────────────────────  │
│  [●] James Smith    @jsmith    Add  │  ← Avatar | Name | Username | Button
│  [●] James O'Brien  @jamesobr  Add  │
│  [●] Jameson Lee    @jamlee  Added ✓│  ← Already friends
└─────────────────────────────────────┘
```

### Annotation format

Pair your wireframe with a numbered annotation list:

```
① Search input
   - Placeholder: "Search by name or @username"
   - Results appear after 3 characters, 300ms debounce
   - Clear button (×) appears when input has text

② Result row
   - Avatar (circle, 40px) or initials if no avatar
   - Full name (bold, 14px) on top
   - Username (muted, 12px) below
   - Action button right-aligned (see ③)

③ Action button states
   - Default:         "Add" (primary button)
   - Request sent:    "Sent ✓" (disabled, muted)
   - Already friends: "Friends ✓" (disabled, muted)
   - Can't add self:  row hidden entirely
```

### Describing interactions

For anything that moves or responds to input, describe it like a script:

```
INTERACTION: Sending a friend request

User taps "Add" next to a result
  → Button immediately changes to "Sent ✓" (optimistic — don't wait for server)
  → Small green checkmark appears
  → Toast slides in from bottom: "Friend request sent to James!"
  → Toast disappears after 3 seconds

If the request fails:
  → Button reverts to "Add"
  → Toast: "Couldn't send request. Try again."
```

---

## 11. How to give feedback on built features

When a developer shares a preview link or build for you to review, structured feedback saves huge amounts of time.

### What not to say

```
❌ "This doesn't feel right"
❌ "Can we make it more modern?"
❌ "I don't like it"
❌ "It's close but not quite there"
```

These comments are impossible to act on.

### How to give actionable feedback

Use this format for every piece of feedback:

```
SCREEN:     [which screen]
ELEMENT:    [which part of the screen]
ISSUE:      [what's wrong, specifically]
SUGGESTION: [what you want instead]
REASON:     [why — optional but helpful]
```

**Example:**
```
SCREEN:     Friends page
ELEMENT:    Empty state when user has no friends
ISSUE:      The message "No friends yet" appears but there's no button to add one.
            Users don't know what to do next.
SUGGESTION: Add a "Find friends" button below the message that scrolls to the
            search input at the top of the page.
REASON:     First-time users have nothing to do on this screen and will leave.
```

### The feedback triage

Not all feedback is equal. Label your feedback so devs know what's critical vs nice-to-have:

| Label | Meaning |
|---|---|
| **Blocker** | This must be fixed before launch. Functionally broken or severely wrong. |
| **Should fix** | Important. We'll look bad if we ship this. Fix in this sprint. |
| **Nice to have** | Would be better, but fine to ship without. Log as a ticket. |
| **Question** | I'm not sure about this. Let's discuss before changing anything. |

---

## 12. Prioritisation — making the case for your idea

Every idea competes for developer time. Here's how to make a compelling case.

### The prioritisation scorecard

Score your feature idea on these criteria (1-3 each):

```
┌────────────────────────────────────────────────────────────────┐
│  PRIORITISATION SCORECARD                                      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  USER IMPACT         How many users does this affect?          │
│    1 = edge case, few users                                    │
│    2 = affects some users regularly                            │
│    3 = affects all users every time they open the app          │
│                                                                │
│  FREQUENCY           How often does the pain happen?           │
│    1 = rarely                                                  │
│    2 = sometimes                                               │
│    3 = every single session                                    │
│                                                                │
│  SEVERITY            How bad is it when it happens?            │
│    1 = minor annoyance                                         │
│    2 = significant frustration or confusion                    │
│    3 = user cannot complete what they came to do               │
│                                                                │
│  STRATEGIC FIT       Does this align with our current focus?   │
│    1 = tangential                                              │
│    2 = related                                                 │
│    3 = directly advances our main goal right now              │
│                                                                │
│  TOTAL SCORE: __/12                                            │
│                                                                │
│  8-12 = Strong case for doing now                              │
│  5-7  = Worth doing, plan it in                                │
│  1-4  = Backlog for now                                        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Minimum viable version thinking

When pitching a feature, always propose the smallest version first. This gets value shipped faster and lets you learn before investing more.

```
FEATURE: Friend recommendations (suggest people you might know)

FULL VERSION (too big for now):
  ML-based recommendations using mutual friends, mutual groups,
  contact book sync, location proximity, behavioural patterns.
  → Months of work.

MVP VERSION (ship this first):
  After adding a friend, show "People [Name] is friends with".
  One SQL query, one new section on the friends page.
  → 2 days of work.

LEARN FROM MVP:
  Do users tap on these suggestions?
  If yes → invest in better recommendations.
  If no → we saved months of work.
```

---

## 13. Working with AI to document your ideas

AI is your secret weapon for going from a vague idea to a well-structured brief quickly.

### Turning a rough idea into a full brief

Describe your idea conversationally to AI, then ask it to structure it:

**Prompt template:**
```
I'm working on a social app called Together. We have [describe the relevant
existing feature]. I want to add [your idea]. The users who'd benefit are
[describe them]. The problem right now is [describe the pain].

Can you help me write a feature brief with:
- Problem statement
- User story
- Acceptance criteria (as a checklist)
- The states this screen needs (loading, empty, error, success)
- Edge cases to consider
- Suggested copy for buttons and messages
```

### Getting AI to spot what you missed

After writing your brief, ask AI to audit it:

```
Here's my feature brief: [paste your brief]

What have I missed? Specifically look for:
- States I haven't defined (loading, error, empty, success)
- Edge cases I haven't considered
- Copy I haven't written
- Anything a developer would ask me that I haven't answered
```

### Generating wireframe descriptions

```
Describe the layout for a mobile screen that shows [your feature].
Include: what's in the header, what's in the main content area,
what action buttons are there, and what the empty state looks like.
Format it as an ASCII wireframe with annotations.
```

### What to watch out for

```
⚠️  AI doesn't know your users — it guesses. Always sanity-check
    generated copy and user stories against real feedback.

⚠️  AI will sometimes invent features that aren't in scope.
    If it suggests something you didn't ask for, flag it as
    "out of scope v1" or delete it.

⚠️  AI-generated acceptance criteria can be vague.
    Each criterion should be something you can literally tick off
    ("search shows results after 3 characters") not something
    subjective ("search feels responsive").
```

---

## 14. Common scenarios and how to handle them

### Scenario A: You have an idea but don't know if it's too complex to build

**Don't:** Spec it out in full detail, hand it to dev, find out a week later it takes 3 months.

**Do:** Write a one-paragraph description and ask the dev team for a rough effort estimate (XS/S/M/L/XL) before writing the full brief. If it's XL, discuss whether a smaller version exists.

---

### Scenario B: Dev comes back and says "technically we can't do that"

This happens. The database isn't set up for it, or it would break other things, or it would take 6 weeks.

**Don't:** Fight it or give up entirely.

**Do:** Ask these questions:
1. "What can we do instead that solves the same user problem?"
2. "What's the smallest version of this we *can* build?"
3. "If we wanted to build the full version later, what would need to change first?"

The goal is always the user outcome, not the specific implementation.

---

### Scenario C: A feature gets built and it's not what you imagined

This happens when the brief wasn't specific enough. Don't blame the developer.

**Do:**
1. Use the feedback format from Section 11 — specific, element-by-element
2. Separate "wrong" (must change) from "different to what I imagined" (discuss)
3. Write a clearer spec for the changes so it doesn't happen again

---

### Scenario D: You notice something wrong while using the app

**Don't:** Message the dev in Slack with "the app is broken".

**Do:** Create a bug ticket using the template in Section 6. Include exact steps to reproduce and the device you were on. A good bug report can be fixed in an hour. A vague one sits unresolved for weeks.

---

### Scenario E: Two people on the team want different things

**Do:**
1. Both people write up their version using the feature brief template
2. Compare acceptance criteria — where do they overlap? Where do they differ?
3. Score both with the prioritisation scorecard
4. Make the decision based on user impact, not seniority or who argues louder

---

### Scenario F: You want to change something that's already live

**Do:**
1. Write a UI Change Request (Section 4) with clear before/after
2. Explain why — user feedback, analytics, a specific complaint — not just "I think it looks better"
3. Consider whether the change affects users who've already learned the old way

---

### Scenario G: You're not sure if something is a new feature or a bug

A useful rule:
- If the app does something it was never intended to do → **bug**
- If the app works as built but doesn't do something users need → **feature**

When in doubt, raise it and label it "unclear — needs discussion".

---

### Scenario H: You have a lot of small improvements at once

**Don't:** Bundle them all into one giant ticket.

**Do:** Create one ticket per change. Small tickets ship faster. They're easier to review. They don't hold each other hostage if one is complex.

---

### Scenario I: You want to understand what a developer just built

Ask them to show you on the preview link. If you can't reach them, ask AI:

```
Here's a summary of the code changes: [paste the PR description or diff]
Can you explain in plain English what this does and what a user will
experience differently because of it?
```

---

### Scenario J: A feature is almost right but needs one more pass

This is the most common situation. You reviewed, gave feedback, dev made changes — now it's 90% there.

At this point, decide: is the remaining 10% a **blocker** or a **nice to have**? If it's nice to have, ship the 90% version and log the remaining work as a separate ticket. Perfect is the enemy of shipped.

---

## 15. Quick reference

### Brief templates at a glance

| Situation | Template to use |
|---|---|
| New feature | [Section 3 — New Feature Brief](#3-template-new-feature-brief) |
| Change to existing UI | [Section 4 — UI Change Request](#4-template-ui-change-request) |
| Multi-step user journey | [Section 5 — User Flow Document](#5-template-user-flow-document) |
| Something feels broken | [Section 6 — UX Bug Report](#6-template-bug-report-ux-perspective) |
| Words in the app need changing | [Section 7 — Copy Change Request](#7-template-content--copy-change) |

### The 6 states checklist (put this on your wall)

```
Every screen, every time:

  [ ] Default state — what it looks like with normal data
  [ ] Loading state — what shows while data is fetching
  [ ] Empty state   — what shows when there's no data + CTA
  [ ] Error state   — what shows when something fails + retry
  [ ] Success state — what happens after a user action
  [ ] Degraded      — what shows when one part fails (e.g. no avatar)
```

### Feedback label key

```
  BLOCKER       → Must fix before launch
  SHOULD FIX    → Fix this sprint
  NICE TO HAVE  → Log as a ticket, ship without
  QUESTION      → Discuss before changing anything
```

### AI prompt starters

```
"Help me write a feature brief for..."
"What states does a screen like this need?"
"What edge cases am I missing for this feature?"
"Audit my brief for anything a developer would ask"
"Write the copy for [button / empty state / error message]"
"Explain this PR description in plain English"
"What's the smallest version of this I could ship first?"
```

---

*Last updated: 2026-04-26*
*For the Together Vision Team. Update this as our process evolves.*
