# Together — Team Contributor Guide

> **Who is this for?** Everyone working on Together — designers, product thinkers, and anyone contributing who isn't a full-time software engineer. No prior coding experience assumed.

---

## Table of Contents

1. [What is Git and why do we use it?](#1-what-is-git-and-why-do-we-use-it)
2. [Key concepts explained simply](#2-key-concepts-explained-simply)
3. [Setting up your machine](#3-setting-up-your-machine)
4. [Your daily Git workflow](#4-your-daily-git-workflow)
5. [Branches — working without breaking things](#5-branches--working-without-breaking-things)
6. [Our development process end to end](#6-our-development-process-end-to-end)
7. [Ticket lifecycle — from idea to shipped](#7-ticket-lifecycle--from-idea-to-shipped)
8. [How to raise a new ticket](#8-how-to-raise-a-new-ticket)
9. [Working with AI](#9-working-with-ai)
10. [Quick reference cheatsheet](#10-quick-reference-cheatsheet)

---

## 1. What is Git and why do we use it?

### The simplest possible explanation

Imagine you're writing a group essay in Google Docs. Google Docs saves every version so you can go back and see what the document looked like two weeks ago, who changed what, and undo mistakes.

**Git does exactly that for code** — but it's much more powerful. It lets the whole team work on different parts of the app *at the same time* without overwriting each other's work, and it keeps a full history of every single change ever made.

### Why we can't just share files in a folder

| Sharing files in a folder | Using Git |
|---|---|
| "Wait don't edit that file, I'm in it" | Everyone edits freely, Git merges it |
| "Who deleted that function??" | Every change is logged with who, what, and when |
| "The app is broken and I don't know why" | Instantly roll back to the last working version |
| "I'm scared to change this in case it breaks" | Make a branch — your changes are isolated |

---

## 2. Key concepts explained simply

### Repository (repo)
The project folder that Git is watching. Everything in `together-app/` is our repo. Think of it as the master copy of the project that lives on GitHub.

### Commit
A saved snapshot of your changes. Like hitting "Save" in a game — it records exactly what the project looked like at that moment. Every commit has a message describing what changed and why.

```
Good commit message:  "Add typing indicator to DM screen"
Bad commit message:   "changes" or "fix stuff"
```

### Branch
A parallel copy of the project where you can make changes safely. When you're done, you merge it back into the main copy.

```
Think of it like this:

  MAIN BRANCH (the live app)
       │
       ├──► Your branch: "feat/friends-search"
       │         You add fuzzy search here
       │         Test it, make sure it works
       │         Then merge back ──────────────► MAIN (now has fuzzy search)
       │
       └──► Someone else's branch: "fix/message-bug"
                 They fix a bug independently
                 No conflict with your work
```

### Pull Request (PR)
When your branch is ready, you open a Pull Request — it's a formal request to merge your changes into main. It gives the team a chance to review, comment, and approve before anything goes live.

### Push / Pull
- **Push** — send your local commits up to GitHub so others can see them
- **Pull** — download the latest changes from GitHub onto your machine

---

## 3. Setting up your machine

### Step 1 — Install Git
Download from [git-scm.com](https://git-scm.com/downloads) and install with default settings.

### Step 2 — Tell Git who you are
Open Terminal (Mac) or Git Bash (Windows) and run:
```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

### Step 3 — Clone the repo (first time only)
```bash
git clone https://github.com/adamfaisal3119/together-app.git
cd together-app
npm install
```

You now have a full local copy of the project.

### Step 4 — Install Node.js
Download the LTS version from [nodejs.org](https://nodejs.org). This is needed to run the app locally.

---

## 4. Your daily Git workflow

Every day you work on the project, follow this pattern:

```
┌─────────────────────────────────────────────────────────┐
│                   DAILY WORKFLOW                        │
│                                                         │
│  1. Pull latest changes from main                       │
│     git pull origin main                               │
│                                                         │
│  2. Create or switch to your branch                     │
│     git checkout -b feat/your-feature-name             │
│                                                         │
│  3. Make your changes (code, content, config...)        │
│                                                         │
│  4. Stage your changes                                  │
│     git add -A                                         │
│                                                         │
│  5. Commit with a clear message                         │
│     git commit -m "describe what you did and why"      │
│                                                         │
│  6. Push your branch to GitHub                          │
│     git push origin feat/your-feature-name             │
│                                                         │
│  7. Open a Pull Request on GitHub                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Branches — working without breaking things

### Why branches matter

The `main` branch is the live app. Real users are on it. If you push broken code directly to `main`, you break the app for everyone.

Branches let you experiment freely. If something goes wrong on your branch, `main` is completely untouched. You just fix it or delete the branch and start fresh.

### How our branches are structured

```
main ──────────────────────────────────────────────────────► (live app on Vercel)
  │
  ├── feat/friends-search ──────────────────────► merged → deleted
  │
  ├── feat/dm-typing-indicator ────────────────► merged → deleted
  │
  ├── fix/push-notification-bug ──────────────► merged → deleted
  │
  └── feat/native-auth-screen ────────────────► in progress...
```

### Branch naming rules

Always prefix your branch name so everyone knows what type of change it is:

| Prefix | When to use | Example |
|---|---|---|
| `feat/` | New feature or screen | `feat/friends-fuzzy-search` |
| `fix/` | Bug fix | `fix/dm-silent-failure` |
| `infra/` | Setup, config, tooling | `infra/turborepo-setup` |
| `chore/` | Cleanup, refactor, docs | `chore/update-contributing-guide` |

Use lowercase and hyphens. No spaces.

### Creating a branch — step by step

```bash
# 1. Make sure you're on main and up to date
git checkout main
git pull origin main

# 2. Create your new branch (replace with your actual branch name)
git checkout -b feat/my-feature-name

# 3. You're now on your new branch. Start working!
```

### Checking which branch you're on

```bash
git branch
# The branch with * next to it is your current one
```

### Switching between branches

```bash
git checkout main              # switch to main
git checkout feat/my-feature   # switch to your branch
```

---

## 6. Our development process end to end

```
┌──────────────────────────────────────────────────────────────────────┐
│                    TOGETHER DEVELOPMENT PROCESS                      │
└──────────────────────────────────────────────────────────────────────┘

  IDEA / BUG FOUND
       │
       ▼
  ┌─────────────┐
  │  BACKLOG    │  Ticket written, not yet picked up
  │  (To Do)    │  Lives in GitHub Issues
  └──────┬──────┘
         │  Someone picks it up
         ▼
  ┌─────────────┐
  │ IN PROGRESS │  Branch created, work started
  │             │  Branch: feat/ticket-name
  └──────┬──────┘
         │  Work is done, pushed to GitHub
         ▼
  ┌─────────────┐
  │   REVIEW    │  Pull Request opened
  │   (PR)      │  Team reviews the changes
  └──────┬──────┘
         │  PR approved
         ▼
  ┌─────────────┐
  │   TESTING   │  Vercel preview deployment auto-created
  │             │  Test on the preview link before merging
  └──────┬──────┘
         │  Tests pass
         ▼
  ┌─────────────┐
  │    DONE     │  Merged to main → live on Vercel
  │             │  Ticket closed, branch deleted
  └─────────────┘
```

### What happens when you open a PR

Every Pull Request automatically gets a **preview deployment** on Vercel — a live version of the app with just your changes, at a unique URL. This means:

- You can share the link with anyone to test your feature before it's live
- No risk to the real app
- The team can click around and give feedback on the actual running app, not just code

---

## 7. Ticket lifecycle — from idea to shipped

### The five stages of a ticket

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   BACKLOG ──► TO DO ──► IN PROGRESS ──► IN REVIEW ──► DONE         │
│                                                                     │
│   Backlog:       Captured but not prioritised yet                   │
│   To Do:         Prioritised and ready to be picked up              │
│   In Progress:   Someone is actively working on it                  │
│   In Review:     PR open, waiting for approval                      │
│   Done:          Merged to main, ticket closed                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Picking up a ticket

1. Find an unassigned ticket in the **To Do** column
2. Assign it to yourself
3. Move it to **In Progress**
4. Create a branch: `git checkout -b feat/ticket-name`
5. Work on it — commit regularly as you go (don't save it all for one giant commit)

### During work — commit often

Think of commits like checkpoints in a game. Commit every time you finish a meaningful piece:

```bash
# Example of a good commit history on a branch:
git commit -m "Add search input UI to friends screen"
git commit -m "Wire up Supabase query for username search"
git commit -m "Show result card with avatar and add button"
git commit -m "Handle already-friends and pending states"
```

This is much better than one giant commit called "finished friends search" — it makes it easy to see what changed and why, and to undo a specific part if needed.

### Opening a Pull Request

1. Push your branch: `git push origin feat/your-branch`
2. Go to GitHub → you'll see a prompt to open a PR
3. Fill in:
   - **Title:** short summary of what you built (e.g. `Add fuzzy search to friends screen`)
   - **Description:** what does it do, how to test it, any screenshots
4. Link to the ticket it closes (write `Closes #123` in the description)
5. Assign a reviewer
6. Move the ticket to **In Review**

### Getting reviewed

The reviewer will look at your changes and either:
- **Approve** — looks good, ready to merge
- **Request changes** — leave comments on specific lines, you address them and push again

Don't take change requests personally — they're about the code, not you. Every PR gets reviewed, including senior engineers'.

### Merging and closing

Once approved:
1. Click **Merge Pull Request** on GitHub
2. Delete the branch (GitHub shows a button for this)
3. Move the ticket to **Done**
4. Update your local repo: `git checkout main && git pull origin main`

---

## 8. How to raise a new ticket

### When to raise a ticket

- You found a bug
- You have an idea for a feature
- Something in the UX feels wrong
- You noticed a performance issue

### What makes a good ticket

A ticket that can be picked up by anyone — not just the person who wrote it.

```
┌─────────────────────────────────────────────────────────────────┐
│  TICKET TEMPLATE                                                │
│                                                                 │
│  Title:        [short, verb-first description]                  │
│                e.g. "Add fuzzy search to friends list"          │
│                                                                 │
│  Type:         Bug / Feature / Improvement / Chore              │
│                                                                 │
│  Description:  What needs to happen and why                     │
│                                                                 │
│  Acceptance    A checklist of what "done" looks like:           │
│  Criteria:     [ ] Searching "joh" shows "john_doe"             │
│                [ ] No results shows "No users found"            │
│                [ ] Works on mobile                              │
│                                                                 │
│  Screenshots   Include if it's a visual bug or design change    │
│  / context:                                                     │
│                                                                 │
│  Effort:       XS (< 2 hrs) / S (half day) / M (1-2 days)      │
│                L (3-5 days) / XL (1+ week)                      │
└─────────────────────────────────────────────────────────────────┘
```

### Where tickets live

We track everything in **GitHub Issues**. The board view shows all tickets by stage. If you're not sure if something should be a ticket, raise it anyway — it's better to have it captured than forgotten.

---

## 9. Working with AI

AI (like Claude, ChatGPT, Copilot) is a core part of how we build Together. Used well, it dramatically speeds up development. Used poorly, it creates bugs and tech debt. Here's how to use it right.

### What AI is good at

```
✅ Writing boilerplate code ("create a Supabase query that fetches all friends")
✅ Explaining code ("what does this function do?")
✅ Debugging ("here's my error, what's wrong?")
✅ Writing first drafts (code, copy, documentation)
✅ Suggesting approaches ("what's the best way to implement X?")
✅ Code review ("does this look right to you?")
✅ Translating ideas into code ("I want a screen that shows X, how would I build it?")
```

### What AI is NOT good at

```
❌ Knowing the current state of your specific codebase
❌ Understanding business context and priorities
❌ Making architectural decisions (it'll just agree with you)
❌ Security decisions — always get a second opinion
❌ Knowing what "done" means for YOUR product
❌ Replacing actual testing on a real device
```

### How to prompt AI effectively

**Bad prompt:**
> "make the friends page better"

**Good prompt:**
> "In the friends page at `apps/web/app/friends/page.tsx`, the search only matches exact usernames. I want it to also match partial names — so searching 'joh' finds 'john_doe'. The search runs a Supabase query on the `profiles` table. Can you update the `searchUser` function to use `ilike` for partial matching?"

The more specific context you give, the better the output. Include:
- Which file
- What it currently does
- What you want it to do
- Any relevant constraints

### The golden rule: always read what AI writes

AI generates plausible-looking code that is sometimes wrong. Before committing anything AI wrote:

1. **Read it line by line** — do you understand what each part does?
2. **Test it** — run it and verify it actually works
3. **Check for side effects** — did it change anything you didn't ask it to?
4. **Don't commit code you don't understand** — if you can't explain it, ask AI to explain it first

### AI for non-coders: what you can use it for

Even if you never write code, AI is useful for:

- **Writing ticket descriptions** — describe the problem, ask AI to format it as a proper ticket
- **Understanding changes in a PR** — paste the diff and ask "what does this change do in plain English?"
- **Researching approaches** — "what are the tradeoffs between X and Y?"
- **Design feedback** — share a screenshot and ask what could be improved
- **Writing copy** — app store description, notification text, onboarding copy

---

## 10. Quick reference cheatsheet

### Git commands you'll use every day

```bash
# Get the latest code
git pull origin main

# See what branch you're on and what's changed
git status

# Create a new branch
git checkout -b feat/your-feature-name

# Switch to an existing branch
git checkout branch-name

# Stage all your changes
git add -A

# Commit your changes
git commit -m "your message here"

# Push your branch to GitHub
git push origin feat/your-feature-name

# Go back to main after merging
git checkout main
git pull origin main
```

### Ticket stage transitions

```
Backlog ──► To Do        When the team decides to prioritise it
To Do ──► In Progress    When you pick it up and create a branch
In Progress ──► Review   When you open a Pull Request
Review ──► Done          When the PR is approved and merged
```

### Branch naming at a glance

```
feat/what-you-built        New feature
fix/what-you-fixed         Bug fix
infra/what-you-configured  Tooling or config
chore/what-you-cleaned-up  Cleanup or docs
```

### Commit message format

```
[verb] [what] [optional: why or context]

Good examples:
  Add avatar upload to settings screen
  Fix unread count not resetting after opening DM
  Move Supabase client into shared package
  Update gitignore for monorepo structure
```

---

## Got stuck?

1. **Google the error message** — 90% of common Git errors have answered Stack Overflow threads
2. **Ask AI** — paste the error and what you were doing
3. **Ask the team** — no such thing as a dumb question when it comes to Git
4. **Do NOT force push to main** — if something has gone very wrong, stop and ask first

---

*Last updated: 2026-04-26*
*This guide is for the Together team. Keep it updated as our process evolves.*
