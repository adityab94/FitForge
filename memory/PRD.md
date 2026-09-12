# FitForge - Personal Fitness Tracking Dashboard

## Overview
Personal PWA fitness tracker (single user, PIN 858608). Cloned from https://github.com/adityab94/FitForge and heavily customized. Deploys to Vercel.

## Stack
- **Frontend**: React 19, TailwindCSS, Radix UI, Recharts, framer-motion, html5-qrcode - Vercel
- **Backend**: Node.js Express (Vercel serverless at `api/index.js`)
- **Database**: MongoDB Atlas
- **AI**: Google Gemini 2.0 Flash Exp (`@google/generative-ai`)
- **External APIs**: Open Food Facts (free, no key)

## Design
- Cream gradient background (#FFFBF5 → #FFEEDC)
- Terracotta accent (#C7522A)
- Dark warm text (#3D1F0A)

## Features
- [x] PIN login (858608)
- [x] Weight, workouts, nutrition, steps, water tracking
- [x] BMI, BMR, TDEE, deficit, streak, weight projection, health score
- [x] AI Weekly Coach + Plateau Detector + Body Photo Analyzer (Gemini)
- [x] Apple Health sync via iOS Shortcut
- [x] Sleep & Recovery card + Sleep vs Weight overlay chart with correlation insight
- [x] Tabbed navigation: Today | Trends | AI | History
- [x] DailyFocus smart nudge (time-aware)
- [x] Weekly weight delta badge
- [x] "Same as yesterday" for nutrition + workouts
- [x] Auto rest day after 10 PM
- [x] Animated StreakFlame widget with 6 tiers (cold → legendary)
- [x] BarcodeScanner: camera + Open Food Facts lookup + one-tap log
- [x] VoiceLog: Web Speech API + Gemini parses "logged 30 min bench + 400 cal chicken bowl" into multi-action logs
- [x] Sunday 8 PM Coach Push: Vercel cron (30 14 * * 0 UTC = 8PM IST) auto-generates Weekly Coach + pushes via web-push with tone emoji + one-line headline
- [x] AskCoach: mic + Gemini + browser TTS - ask "how am I doing this week" and hear a spoken answer, embedded on AI tab (full) and Trends tab (compact)
- [x] Removed bloat: MotivationalQuote, BodyComposition

## Env Vars (Vercel)
- `MONGODB_URI` - Atlas connection
- `DB_NAME` - fitforge
- `JWT_SECRET` - random
- `GEMINI_API_KEY` - Google AI Studio
- `HEALTH_SYNC_TOKEN` (optional, defaults to `fitforge-health-858608`)

## Backlog
- Widget for iOS home screen (via PWA shortcut icons)
- Recipe library
- Shareable transformation card
