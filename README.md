# What Next — AI Career Guidance for Indian Students

> "That one older cousin everyone wishes they had" — warm, honest, India-aware AI that helps students figure out what to study after 12th grade.

🔗 **Live:** [whatnext-app.vercel.app](https://whatnext-app.vercel.app)

---

## The Problem

Every year, millions of Indian students finish 12th grade and face one of the most important decisions of their life — choosing a bachelor's degree — with almost no real guidance.

Parents give outdated advice. Teachers default to engineering or medicine. Professional career counselors cost ₹5,000–20,000 a session. The result: students choose blindly, regret it, and waste years.

The problem isn't lack of intelligence. It's lack of structured clarity and honest guidance.

---

## What What Next Does

What Next is an AI that has a real conversation with the student — not a quiz, not a chatbot. It figures out who they actually are, then gives them a personalised career recommendation with honest reasoning.

Three student situations are supported, each with a distinct conversation flow:

| Situation | What the student feels | What the AI does |
|---|---|---|
| **No idea** | Completely lost, don't know where to start | Explores personality, interests, strengths, finances, market |
| **Comparing options** | Have 2–4 choices in mind | Goes deep on each option, ends with visual comparison |
| **Chose but unsure** | Has something in mind but needs validation | Validates or honestly challenges the choice with evidence |

At the end, the student gets a structured recommendation: best fit, secondary option, one path to avoid — all personalised to what *they* said, not generic advice.

---

## How the AI Evaluates Students

Every conversation covers 5 dimensions naturally — never as a form or quiz:

- **Interest alignment** — what genuinely excites them (not what they're "supposed" to like)
- **Skill strengths** — what they're naturally good at, uncovered indirectly
- **Lifestyle preferences** — stability vs creativity, solo vs team, metro vs hometown
- **Financial feasibility** — family budget and ROI reality (brought up carefully, not ignored)
- **India job market demand** — real jobs and growth in India right now, not generic global advice

---

## Key Features

- Adaptive AI conversation that mirrors the student's language — English, Hinglish, whatever they use
- Phase 0 onboarding — AI gets to know the student before any career talk begins
- Signal-driven frontend — AI sends `[SHOW_SITUATION_BUTTONS]` and `[RECOMMENDATION_READY]` flags that trigger UI transitions
- Saved chat history — students can return and continue (ChatGPT-style sidebar)
- Google OAuth + email login via Supabase
- Mentor connection — students can request to speak with a young professional in their field *(coming soon)*
- Downloadable career clarity report with personalised reasoning and 3-year roadmap *(coming soon)*

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Auth + Database | Supabase (PostgreSQL, Google OAuth, RLS) |
| AI | Groq API — LLaMA 3.3 70B (conversations) |
| Deployment | Vercel (auto-deploys on push) |

---

## Local Setup

```bash
git clone https://github.com/shishir18ravishankar/what-next
cd what-next
npm install
```

Create `.env.local` — see `.env.example` for required keys (Supabase + Groq).

```bash
npm run dev
# → localhost:3000
```

Database tables (`conversations`, `recommendations`, `mentor_requests`) and RLS policies are in `supabase/migrations/`.

---

## Roadmap

- [x] Auth (email + Google OAuth)
- [x] Onboarding flow
- [x] Phase 0 AI conversation
- [x] Situation selection + distinct conversation flows
- [x] Chat history (Supabase-backed)
- [ ] Results / recommendation page
- [ ] Downloadable clarity report (PDF)
- [ ] Mentor connection feature
- [ ] College navigation (Phase 2)
- [ ] Career development during college (Phase 3)

---

## SDG Alignment

**SDG 4** — Quality Education &nbsp;|&nbsp; **SDG 8** — Decent Work and Economic Growth &nbsp;|&nbsp; **SDG 10** — Reduced Inequalities

---

Built by **Shishir Ravishankar** — AI & Data Science, Presidency University Bangalore  
