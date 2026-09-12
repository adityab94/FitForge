# FitForge - Personal Fitness Tracking Dashboard

## Overview
Personal PWA fitness tracker (single user). Cloned from https://github.com/adityab94/FitForge and heavily customized. Deploys to Vercel.

## Stack
- **Frontend**: React 19, TailwindCSS, Radix UI, Recharts - deployed to Vercel (frontend/build)
- **Backend**: Node.js Express as Vercel serverless function (`api/index.js`)
- **Database**: MongoDB Atlas (atlas-emerald-apple cluster, db: fitforge)
- **AI**: Google Gemini 2.0 Flash Exp (direct via @google/generative-ai)

## Design
- Warm cream gradient background (#FFFBF5 → #FFEEDC)
- Terracotta accent color (#C7522A) - refined, earthy
- Dark warm text (#3D1F0A)

## Features Implemented
- [x] PIN login (858608) - auto-signs in the personal account
- [x] Weight tracking, workouts, nutrition, steps, water, body composition, progress photos
- [x] BMI, BMR, TDEE, deficit, streak, weight projection, health score
- [x] Light warm theme (cream + terracotta) - Feb 2026
- [x] AI Weekly Coach (Gemini) - analyzes 7-day trends
- [x] AI Plateau Detector (Gemini) - 28-day analysis with causes + fixes
- [x] AI Body Photo Analyzer (Gemini Vision) - compares two progress photos
- [x] Apple Health sync via iOS Shortcuts (POST /api/health-sync with x-sync-token header)

## Env Vars Required (Vercel)
- MONGODB_URI (or MONGO_URL) - MongoDB Atlas connection string
- DB_NAME - fitforge
- JWT_SECRET - random secret
- GEMINI_API_KEY - from aistudio.google.com/apikey
- HEALTH_SYNC_TOKEN (optional) - defaults to `fitforge-health-858608`

## Files of Note
- /app/api/index.js - Node.js Express backend for Vercel
- /app/frontend/src/components/AICoach.jsx - AI features UI (4 tabs)
- /app/frontend/src/components/LoginPage.jsx - PIN login
- /app/vercel.json - Vercel build config

## Backlog / P1
- Actual sleep display on dashboard (data model exists via /api/health-sync, needs UI)
- Resting HR trend chart
- AI Meal Photo Logging (photo → calories/macros)

## Backlog / P2
- Barcode scanner for packaged food
- Auto rest-day detection
- Shareable transformation card
