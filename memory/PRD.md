# FitForge - Personal Fitness Tracking Dashboard

## Overview
Personal PWA fitness tracker (single user). Cloned from https://github.com/adityab94/FitForge, heavily customized. Deploys to Vercel.

## Stack
- **Frontend**: React 19, TailwindCSS, Radix UI, Recharts, framer-motion — Vercel
- **Backend**: Node.js Express (Vercel serverless at `api/index.js`)
- **Database**: MongoDB Atlas
- **AI**: Google Gemini 2.0 Flash Exp (`@google/generative-ai`)

## Design
- Cream gradient background (#FFFBF5 → #FFEEDC)
- Terracotta accent (#C7522A)
- Dark warm text (#3D1F0A)

## Implemented Features
- [x] PIN login (858608) auto-signs in single user
- [x] Weight, workouts, nutrition, steps, water tracking
- [x] BMI, BMR, TDEE, deficit, streak, weight projection, health score
- [x] Light warm theme with terracotta accent
- [x] AI Weekly Coach (Gemini)
- [x] AI Plateau Detector (Gemini)
- [x] AI Body Photo Analyzer (Gemini Vision)
- [x] Apple Health sync via iOS Shortcut (POST /api/health-sync)
- [x] Sleep & Recovery card with 7-night bar chart + resting HR
- [x] Tabbed navigation: Today | Trends | AI | History
- [x] DailyFocus smart nudge card (time-of-day aware)
- [x] Weekly weight delta badge on goal banner
- [x] "Same as yesterday" one-tap for nutrition and workouts
- [x] Auto-log rest day after 10 PM if no workout logged
- [x] Removed: MotivationalQuote, BodyComposition modal

## Env Vars (Vercel)
- `MONGODB_URI` or `MONGO_URL` - MongoDB Atlas connection
- `DB_NAME` - fitforge
- `JWT_SECRET` - random secret
- `GEMINI_API_KEY` - Google AI Studio key
- `HEALTH_SYNC_TOKEN` (optional) - defaults to `fitforge-health-858608`

## Backlog
- Streak widget with Duolingo-style flame
- AI Meal Photo Logging
- Barcode scanner
- Full-width sleep + weight correlation chart
