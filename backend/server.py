from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, File, UploadFile, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from bson import ObjectId
import os
import logging
import uuid
import json
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import jwt as pyjwt
import bcrypt
from pywebpush import webpush, WebPushException
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
JWT_SECRET = os.environ['JWT_SECRET']

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- GridFS Storage ---
async def upload_to_gridfs(data: bytes, filename: str, content_type: str) -> str:
    bucket = AsyncIOMotorGridFSBucket(db)
    file_id = await bucket.upload_from_stream(filename, data, metadata={"content_type": content_type})
    return str(file_id)

async def get_from_gridfs(file_id: str):
    bucket = AsyncIOMotorGridFSBucket(db)
    stream = await bucket.open_download_stream(ObjectId(file_id))
    data = await stream.read()
    content_type = (stream.metadata or {}).get("content_type", "application/octet-stream")
    return data, content_type

async def delete_from_gridfs(file_id: str):
    try:
        bucket = AsyncIOMotorGridFSBucket(db)
        await bucket.delete(ObjectId(file_id))
    except Exception as e:
        logger.warning(f"GridFS delete failed for {file_id}: {e}")

# --- VAPID ---
vapid_keys = {"private": None, "public": None}

async def init_vapid():
    existing = await db.settings.find_one({"type": "vapid_keys"}, {"_id": 0})
    if existing:
        vapid_keys["private"] = existing["private_key"]
        vapid_keys["public"] = existing["public_key"]
        return
    key = ec.generate_private_key(ec.SECP256R1())
    priv = base64.urlsafe_b64encode(
        key.private_numbers().private_value.to_bytes(32, 'big')
    ).decode().rstrip('=')
    pub = base64.urlsafe_b64encode(
        key.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    ).decode().rstrip('=')
    await db.settings.insert_one({"type": "vapid_keys", "private_key": priv, "public_key": pub})
    vapid_keys["private"] = priv
    vapid_keys["public"] = pub

# --- Auth ---
def create_token(user_id):
    return pyjwt.encode(
        {"user_id": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=30)},
        JWT_SECRET, algorithm="HS256")

def verify_token(token):
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload.get("user_id")
    except Exception:
        return None

async def get_current_user(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    uid = verify_token(auth[7:])
    if not uid:
        raise HTTPException(401, "Invalid or expired token")
    return uid

# --- Models ---
class GoogleAuthRequest(BaseModel):
    credential: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    weight: Optional[float] = None
    heightCm: Optional[float] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    calTarget: Optional[int] = None
    goalKg: Optional[float] = None
    avatarUrl: Optional[str] = None

class WorkoutCreate(BaseModel):
    type: str
    duration: int
    calories: int
    notes: str = ""

class WeightLogCreate(BaseModel):
    weight: float

class MeasurementCreate(BaseModel):
    waist: Optional[float] = None
    chest: Optional[float] = None
    hips: Optional[float] = None
    arms: Optional[float] = None

class StepsCreate(BaseModel):
    steps: int
    date: Optional[str] = None

class MfpScrapeRequest(BaseModel):
    username: str
    password: str = ""

class MfpRequest(BaseModel):
    username: str = "adityabhatnagar1994"

class BodyCompRequest(BaseModel):
    waist: float
    neck: float
    hip: Optional[float] = None  # Required for female

class ProgressPhotoCreate(BaseModel):
    label: str = ""
    date: Optional[str] = None

class PushSubRequest(BaseModel):
    endpoint: str
    keys: dict

class WaterUpdate(BaseModel):
    glasses: int
    date: Optional[str] = None

class NutritionManualCreate(BaseModel):
    mode: str  # 'total' or 'macros'
    calories: Optional[float] = None
    carbs: Optional[float] = None
    protein: Optional[float] = None
    fat: Optional[float] = None
    date: Optional[str] = None

    @field_validator('calories', 'carbs', 'protein', 'fat', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if v == '' or v is None:
            return None
        return v

# --- Seed ---
async def seed_user_data(user_id):
    weights = [
        {"id": str(uuid.uuid4()), "user_id": user_id, "weight": 92.0, "date": "2026-01-15", "timestamp": "2026-01-15T08:00:00+00:00"},
        {"id": str(uuid.uuid4()), "user_id": user_id, "weight": 91.2, "date": "2026-01-22", "timestamp": "2026-01-22T08:00:00+00:00"},
        {"id": str(uuid.uuid4()), "user_id": user_id, "weight": 90.5, "date": "2026-01-29", "timestamp": "2026-01-29T08:00:00+00:00"},
        {"id": str(uuid.uuid4()), "user_id": user_id, "weight": 90.0, "date": "2026-02-05", "timestamp": "2026-02-05T08:00:00+00:00"},
        {"id": str(uuid.uuid4()), "user_id": user_id, "weight": 89.5, "date": "2026-02-12", "timestamp": "2026-02-12T08:00:00+00:00"},
        {"id": str(uuid.uuid4()), "user_id": user_id, "weight": 89.0, "date": "2026-02-19", "timestamp": "2026-02-19T08:00:00+00:00"},
    ]
    for w in weights:
        await db.weight_logs.insert_one({**w})
    workouts = [
        {"id": str(uuid.uuid4()), "user_id": user_id, "type": "Chest + Triceps", "duration": 55, "calories": 420, "notes": "Heavy bench day", "date": "2026-02-17", "timestamp": "2026-02-17T10:00:00+00:00"},
        {"id": str(uuid.uuid4()), "user_id": user_id, "type": "HIIT Cardio", "duration": 30, "calories": 350, "notes": "Sprint intervals", "date": "2026-02-18", "timestamp": "2026-02-18T07:00:00+00:00"},
        {"id": str(uuid.uuid4()), "user_id": user_id, "type": "Back + Biceps", "duration": 50, "calories": 380, "notes": "Deadlift PR!", "date": "2026-02-19", "timestamp": "2026-02-19T10:00:00+00:00"},
    ]
    for w in workouts:
        await db.workouts.insert_one({**w})

# --- Routes ---
@api_router.get("/")
async def root():
    return {"message": "FitForge API"}

# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
@api_router.post("/auth/google")
async def google_auth(body: GoogleAuthRequest):
    async with httpx.AsyncClient() as hc:
        resp = await hc.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={body.credential}")
    if resp.status_code != 200:
        raise HTTPException(401, "Invalid Google token")
    gdata = resp.json()
    if gdata.get("aud") != GOOGLE_CLIENT_ID:
        raise HTTPException(401, "Token audience mismatch")
    email = gdata.get("email")
    name = gdata.get("name", "Athlete")
    picture = gdata.get("picture", "")
    google_id = gdata.get("sub")
    user = await db.users.find_one({"google_id": google_id}, {"_id": 0})
    if not user:
        user = {"id": str(uuid.uuid4()), "google_id": google_id, "email": email,
                "name": name, "avatarUrl": picture, "createdAt": datetime.now(timezone.utc).isoformat()}
        await db.users.insert_one({**user})
        profile = {"id": str(uuid.uuid4()), "user_id": user["id"], "name": name,
                   "weight": 90.0, "heightCm": 175.0, "age": 30, "gender": "male",
                   "calTarget": 1800, "goalKg": 80.0, "avatarUrl": picture,
                   "createdAt": datetime.now(timezone.utc).isoformat()}
        await db.profiles.insert_one({**profile})
        await seed_user_data(user["id"])
    token = create_token(user["id"])
    return {"token": token, "user": {"id": user["id"], "name": user.get("name", ""),
            "email": user.get("email", ""), "avatarUrl": user.get("avatarUrl", "")}}

@api_router.post("/auth/register")
async def register(body: RegisterRequest):
    if not body.email or not body.password or not body.name:
        raise HTTPException(400, "Name, email and password required")
    existing = await db.users.find_one({"email": body.email})
    if existing:
        raise HTTPException(400, "Email already registered")
    hashed = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    user = {"id": str(uuid.uuid4()), "email": body.email, "name": body.name,
            "password": hashed, "avatarUrl": "", "createdAt": datetime.now(timezone.utc).isoformat()}
    await db.users.insert_one({**user})
    profile = {"id": str(uuid.uuid4()), "user_id": user["id"], "name": body.name,
               "weight": 90.0, "heightCm": 175.0, "age": 30, "gender": "male",
               "calTarget": 1800, "goalKg": 80.0, "avatarUrl": "",
               "createdAt": datetime.now(timezone.utc).isoformat()}
    await db.profiles.insert_one({**profile})
    await seed_user_data(user["id"])
    token = create_token(user["id"])
    return {"token": token, "user": {"id": user["id"], "name": user["name"], "email": user["email"], "avatarUrl": user["avatarUrl"]}}

@api_router.post("/auth/login")
async def login(body: LoginRequest):
    if not body.email or not body.password:
        raise HTTPException(400, "Email and password required")
    user = await db.users.find_one({"email": body.email}, {"_id": 0})
    if not user or not user.get("password"):
        raise HTTPException(401, "Invalid email or password")
    valid = bcrypt.checkpw(body.password.encode(), user["password"].encode())
    if not valid:
        raise HTTPException(401, "Invalid email or password")
    token = create_token(user["id"])
    return {"token": token, "user": {"id": user["id"], "name": user.get("name", ""), "email": user.get("email", ""), "avatarUrl": user.get("avatarUrl", "")}}

@api_router.get("/auth/me")
async def get_me(user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(404, "User not found")
    return {"id": user["id"], "name": user.get("name", ""), "email": user.get("email", ""), "avatarUrl": user.get("avatarUrl", "")}

@api_router.get("/profile")
async def get_profile(user_id: str = Depends(get_current_user)):
    profile = await db.profiles.find_one({"user_id": user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(404, "Profile not found")
    return profile

@api_router.put("/profile")
async def update_profile(update: ProfileUpdate, user_id: str = Depends(get_current_user)):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data:
        await db.profiles.update_one({"user_id": user_id}, {"$set": update_data})
        if "weight" in update_data:
            wl = {"id": str(uuid.uuid4()), "user_id": user_id, "weight": update_data["weight"],
                  "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "timestamp": datetime.now(timezone.utc).isoformat()}
            await db.weight_logs.insert_one(wl)
    return await db.profiles.find_one({"user_id": user_id}, {"_id": 0})

@api_router.get("/weight-logs")
async def get_weight_logs(user_id: str = Depends(get_current_user)):
    return await db.weight_logs.find({"user_id": user_id}, {"_id": 0}).sort("date", 1).to_list(1000)

@api_router.post("/weight-logs")
async def add_weight_log(entry: WeightLogCreate, user_id: str = Depends(get_current_user)):
    log = {"id": str(uuid.uuid4()), "user_id": user_id, "weight": entry.weight,
           "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "timestamp": datetime.now(timezone.utc).isoformat()}
    await db.weight_logs.insert_one({**log})
    await db.profiles.update_one({"user_id": user_id}, {"$set": {"weight": entry.weight}})
    return log

@api_router.get("/workouts")
async def get_workouts(user_id: str = Depends(get_current_user)):
    return await db.workouts.find({"user_id": user_id}, {"_id": 0}).sort("timestamp", -1).to_list(100)

@api_router.post("/workouts")
async def add_workout(entry: WorkoutCreate, user_id: str = Depends(get_current_user)):
    doc = {"id": str(uuid.uuid4()), "user_id": user_id, **entry.model_dump(),
           "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "timestamp": datetime.now(timezone.utc).isoformat()}
    await db.workouts.insert_one({**doc})
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.delete("/workouts/{workout_id}")
async def delete_workout(workout_id: str, user_id: str = Depends(get_current_user)):
    result = await db.workouts.delete_one({"id": workout_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Workout not found")
    return {"message": "Deleted"}

@api_router.get("/measurements")
async def get_measurements(user_id: str = Depends(get_current_user)):
    return await db.measurements.find({"user_id": user_id}, {"_id": 0}).sort("date", -1).to_list(100)

@api_router.post("/measurements")
async def add_measurement(entry: MeasurementCreate, user_id: str = Depends(get_current_user)):
    doc = {"id": str(uuid.uuid4()), "user_id": user_id, **entry.model_dump(),
           "date": datetime.now(timezone.utc).strftime("%Y-%m-%d")}
    await db.measurements.insert_one({**doc})
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.get("/steps")
async def get_steps(user_id: str = Depends(get_current_user)):
    return await db.steps.find({"user_id": user_id}, {"_id": 0}).sort("date", -1).to_list(100)

@api_router.post("/steps")
async def add_steps(entry: StepsCreate, user_id: str = Depends(get_current_user)):
    date = entry.date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    existing = await db.steps.find_one({"user_id": user_id, "date": date}, {"_id": 0})
    if existing:
        await db.steps.update_one({"user_id": user_id, "date": date}, {"$set": {"steps": entry.steps}})
        return {**existing, "steps": entry.steps}
    doc = {"id": str(uuid.uuid4()), "user_id": user_id, "steps": entry.steps, "date": date}
    await db.steps.insert_one({**doc})
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.post("/water")
async def update_water(entry: WaterUpdate, user_id: str = Depends(get_current_user)):
    date = entry.date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    await db.water.update_one({"user_id": user_id, "date": date},
        {"$set": {"user_id": user_id, "date": date, "glasses": entry.glasses}}, upsert=True)
    return {"glasses": entry.glasses, "date": date}

@api_router.get("/water")
async def get_water(date: Optional[str] = None, user_id: str = Depends(get_current_user)):
    target_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    doc = await db.water.find_one({"user_id": user_id, "date": target_date}, {"_id": 0})
    return doc or {"glasses": 0, "date": target_date}

# MFP Scrape (MOCKED - MFP has no public API)
@api_router.post("/mfp-scrape")
async def mfp_scrape(body: MfpScrapeRequest, user_id: str = Depends(get_current_user)):
    import random
    meals = [
        {"name": "Breakfast", "calories": random.randint(300, 500), "carbs": random.randint(30, 60), "protein": random.randint(15, 30), "fat": random.randint(10, 20)},
        {"name": "Lunch", "calories": random.randint(400, 700), "carbs": random.randint(40, 80), "protein": random.randint(25, 45), "fat": random.randint(15, 30)},
        {"name": "Dinner", "calories": random.randint(500, 800), "carbs": random.randint(50, 90), "protein": random.randint(30, 50), "fat": random.randint(20, 35)},
        {"name": "Snacks", "calories": random.randint(100, 300), "carbs": random.randint(10, 30), "protein": random.randint(5, 15), "fat": random.randint(5, 15)},
    ]
    total = {"calories": sum(m["calories"] for m in meals), "carbs": sum(m["carbs"] for m in meals),
             "protein": sum(m["protein"] for m in meals), "fat": sum(m["fat"] for m in meals)}
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    doc = {"id": str(uuid.uuid4()), "user_id": user_id, "date": today, "meals": meals, "total": total,
           "username": body.username, "synced_at": datetime.now(timezone.utc).isoformat()}
    await db.nutrition.update_one({"user_id": user_id, "date": today}, {"$set": doc}, upsert=True)
    return {"meals": meals, "total": total, "message": f"Synced! {meals[0]['name']} {meals[0]['calories']}cal"}

# Sync My Diary endpoint (MOCKED)
@api_router.post("/mfp")
async def sync_diary(body: MfpRequest, user_id: str = Depends(get_current_user)):
    import random
    name = body.username
    meals = [
        {"name": "Breakfast", "calories": random.randint(300, 500), "carbs": random.randint(30, 60), "protein": random.randint(15, 30), "fat": random.randint(10, 20)},
        {"name": "Lunch", "calories": random.randint(400, 700), "carbs": random.randint(40, 80), "protein": random.randint(25, 45), "fat": random.randint(15, 30)},
        {"name": "Dinner", "calories": random.randint(500, 800), "carbs": random.randint(50, 90), "protein": random.randint(30, 50), "fat": random.randint(20, 35)},
        {"name": "Snacks", "calories": random.randint(100, 300), "carbs": random.randint(10, 30), "protein": random.randint(5, 15), "fat": random.randint(5, 15)},
    ]
    total = {"calories": sum(m["calories"] for m in meals), "carbs": sum(m["carbs"] for m in meals),
             "protein": sum(m["protein"] for m in meals), "fat": sum(m["fat"] for m in meals)}
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    doc = {"id": str(uuid.uuid4()), "user_id": user_id, "date": today, "meals": meals, "total": total,
           "username": name, "synced_at": datetime.now(timezone.utc).isoformat()}
    await db.nutrition.update_one({"user_id": user_id, "date": today}, {"$set": doc}, upsert=True)
    return {"name": name, "calories": total["calories"], "protein": total["protein"],
            "carbs": total["carbs"], "fat": total["fat"], "meals": meals, "total": total}

# Body Composition (Navy Method)
@api_router.post("/body-composition")
async def calc_body_comp(body: BodyCompRequest, user_id: str = Depends(get_current_user)):
    import math
    profile = await db.profiles.find_one({"user_id": user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(404, "Profile not found")
    height_cm = profile["heightCm"]
    gender = profile["gender"]
    if gender == "male":
        bf = 86.010 * math.log10(body.waist - body.neck) - 70.041 * math.log10(height_cm) + 36.76
    else:
        hip = body.hip or 0
        bf = 163.205 * math.log10(body.waist + hip - body.neck) - 97.684 * math.log10(height_cm) - 78.387
    bf = max(2, min(round(bf, 1), 60))
    # Categorize
    if gender == "male":
        cat = "Essential" if bf < 6 else "Athletic" if bf < 14 else "Fitness" if bf < 18 else "Average" if bf < 25 else "Above Average"
    else:
        cat = "Essential" if bf < 14 else "Athletic" if bf < 21 else "Fitness" if bf < 25 else "Average" if bf < 32 else "Above Average"
    # Store
    doc = {"id": str(uuid.uuid4()), "user_id": user_id, "body_fat": bf, "category": cat,
           "waist": body.waist, "neck": body.neck, "hip": body.hip,
           "date": datetime.now(timezone.utc).strftime("%Y-%m-%d")}
    await db.body_comp.insert_one({**doc})
    lean_mass = round(profile["weight"] * (1 - bf / 100), 1)
    fat_mass = round(profile["weight"] * (bf / 100), 1)
    return {"body_fat": bf, "category": cat, "lean_mass": lean_mass, "fat_mass": fat_mass}

@api_router.get("/body-composition")
async def get_body_comp(user_id: str = Depends(get_current_user)):
    docs = await db.body_comp.find({"user_id": user_id}, {"_id": 0}).sort("date", -1).to_list(20)
    return docs

# Workout Heatmap (last 12 weeks)
@api_router.get("/workout-heatmap")
async def get_workout_heatmap(user_id: str = Depends(get_current_user)):
    from datetime import timedelta
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(weeks=12)
    workouts = await db.workouts.find(
        {"user_id": user_id, "date": {"$gte": start.isoformat()}}, {"_id": 0}
    ).to_list(1000)
    # Group by date
    heatmap = {}
    for w in workouts:
        d = w.get("date", "")
        if d not in heatmap:
            heatmap[d] = {"count": 0, "calories": 0, "duration": 0}
        heatmap[d]["count"] += 1
        heatmap[d]["calories"] += w.get("calories", 0)
        heatmap[d]["duration"] += w.get("duration", 0)
    # Build 84-day grid (12 weeks)
    grid = []
    for i in range(84):
        d = (start + timedelta(days=i)).isoformat()
        entry = heatmap.get(d, {"count": 0, "calories": 0, "duration": 0})
        grid.append({"date": d, **entry})
    return grid

# Progress Photos
@api_router.post("/progress-photos")
async def upload_progress_photo(file: UploadFile = File(...), user_id: str = Depends(get_current_user)):
    data = await file.read()
    file_id = await upload_to_gridfs(data, file.filename or "photo.png", file.content_type or "image/png")
    doc = {"id": str(uuid.uuid4()), "user_id": user_id, "file_id": file_id,
           "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
           "timestamp": datetime.now(timezone.utc).isoformat()}
    await db.progress_photos.insert_one({**doc})
    return {"id": doc["id"], "file_id": file_id, "url": f"/api/files/{file_id}", "date": doc["date"]}

@api_router.get("/progress-photos")
async def get_progress_photos(user_id: str = Depends(get_current_user)):
    photos = await db.progress_photos.find({"user_id": user_id}, {"_id": 0}).sort("timestamp", 1).to_list(100)
    for p in photos:
        p["url"] = f"/api/files/{p.get('file_id', p.get('storage_path', ''))}"
    return photos

@api_router.delete("/progress-photos/{photo_id}")
async def delete_progress_photo(photo_id: str, user_id: str = Depends(get_current_user)):
    doc = await db.progress_photos.find_one({"id": photo_id, "user_id": user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Photo not found")
    if doc.get("file_id"):
        await delete_from_gridfs(doc["file_id"])
    await db.progress_photos.delete_one({"id": photo_id, "user_id": user_id})
    return {"message": "Deleted"}

@api_router.get("/nutrition/copy-yesterday")
async def copy_nutrition_from_yesterday(date: Optional[str] = None, user_id: str = Depends(get_current_user)):
    target_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    d = datetime.strptime(target_date, "%Y-%m-%d")
    yesterday = (d - timedelta(days=1)).strftime("%Y-%m-%d")
    yesterday_doc = await db.nutrition.find_one({"user_id": user_id, "date": yesterday}, {"_id": 0})
    if not yesterday_doc or not yesterday_doc.get("total", {}).get("calories"):
        raise HTTPException(404, "No nutrition data found for previous day")
    new_doc = {**yesterday_doc, "id": str(uuid.uuid4()), "date": target_date,
               "source": "copied_from_yesterday", "updated_at": datetime.now(timezone.utc).isoformat()}
    new_doc.pop("_id", None)
    await db.nutrition.update_one({"user_id": user_id, "date": target_date}, {"$set": new_doc}, upsert=True)
    return {"total": yesterday_doc["total"], "date": target_date, "source": "copied_from_yesterday", "from_date": yesterday}

@api_router.post("/nutrition/manual")
async def log_nutrition_manual(entry: NutritionManualCreate, user_id: str = Depends(get_current_user)):
    target_date = entry.date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if entry.mode == 'macros':
        c = entry.carbs or 0
        p = entry.protein or 0
        f = entry.fat or 0
        total = {"calories": round(c * 4 + p * 4 + f * 9), "carbs": c, "protein": p, "fat": f}
    else:
        cal = entry.calories or 0
        total = {"calories": cal, "carbs": 0, "protein": 0, "fat": 0}
    meals = [{"name": "Manual Entry", "calories": total["calories"], "carbs": total["carbs"],
              "protein": total["protein"], "fat": total["fat"]}]
    doc = {"id": str(uuid.uuid4()), "user_id": user_id, "date": target_date, "meals": meals,
           "total": total, "source": "manual", "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.nutrition.update_one({"user_id": user_id, "date": target_date}, {"$set": doc}, upsert=True)
    return {"total": total, "date": target_date, "source": "manual"}

@api_router.get("/nutrition")
async def get_nutrition(date: Optional[str] = None, user_id: str = Depends(get_current_user)):
    target_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    doc = await db.nutrition.find_one({"user_id": user_id, "date": target_date}, {"_id": 0})
    return doc or {"meals": [], "total": {"calories": 0, "carbs": 0, "protein": 0, "fat": 0}}

@api_router.post("/upload/avatar")
async def upload_avatar(file: UploadFile = File(...), user_id: str = Depends(get_current_user)):
    data = await file.read()
    file_id = await upload_to_gridfs(data, file.filename or "avatar.png", file.content_type or "image/png")
    avatar_url = f"/api/files/{file_id}"
    await db.users.update_one({"id": user_id}, {"$set": {"avatarUrl": avatar_url}})
    await db.profiles.update_one({"user_id": user_id}, {"$set": {"avatarUrl": avatar_url}})
    return {"file_id": file_id, "url": avatar_url}

@api_router.get("/files/{file_id:path}")
async def serve_file(file_id: str):
    try:
        data, content_type = await get_from_gridfs(file_id)
        return Response(content=data, media_type=content_type)
    except Exception:
        raise HTTPException(404, "File not found")

@api_router.get("/push/vapid-key")
async def get_vapid_key():
    if not vapid_keys["public"]:
        await init_vapid()
    return {"publicKey": vapid_keys["public"]}

@api_router.post("/push/subscribe")
async def push_subscribe(sub: PushSubRequest, user_id: str = Depends(get_current_user)):
    doc = {"user_id": user_id, "endpoint": sub.endpoint, "keys": sub.keys,
           "created_at": datetime.now(timezone.utc).isoformat()}
    await db.push_subs.update_one({"user_id": user_id}, {"$set": doc}, upsert=True)
    return {"message": "Subscribed"}

@api_router.post("/push/send-checkin")
async def send_checkin(user_id: str = Depends(get_current_user)):
    sub = await db.push_subs.find_one({"user_id": user_id}, {"_id": 0})
    if not sub:
        raise HTTPException(404, "No push subscription")
    if not vapid_keys["private"]:
        await init_vapid()
    try:
        webpush(subscription_info={"endpoint": sub["endpoint"], "keys": sub["keys"]},
            data=json.dumps({"title": "FitTrack Pro", "body": "Sunday Check-in! Plan your week ahead and log your weight."}),
            vapid_private_key=vapid_keys["private"],
            vapid_claims={"sub": "mailto:admin@fittrackpro.com"})
        return {"message": "Notification sent"}
    except WebPushException as e:
        raise HTTPException(500, f"Push failed: {str(e)}")

@api_router.get("/stats")
async def get_stats(date: Optional[str] = None, user_id: str = Depends(get_current_user)):
    profile = await db.profiles.find_one({"user_id": user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(404, "Profile not found")
    weight = profile["weight"]
    height_cm = profile["heightCm"]
    age = profile["age"]
    gender = profile["gender"]
    cal_target = profile["calTarget"]
    goal_kg = profile["goalKg"]
    height_m = height_cm / 100

    # BMI: weight(kg) / height(m)^2
    bmi = round(weight / (height_m ** 2), 1)

    # BMR: Mifflin-St Jeor equation
    bmr = round(10 * weight + 6.25 * height_cm - 5 * age + (5 if gender == "male" else -161))

    # TDEE: BMR * activity factor (1.2 = sedentary base)
    tdee = round(bmr * 1.2)

    # BMI categories
    if bmi < 18.5:
        bmi_category, bmi_color = "Underweight", "blue"
    elif bmi < 25:
        bmi_category, bmi_color = "Normal", "green"
    elif bmi < 30:
        bmi_category, bmi_color = "Overweight", "orange"
    else:
        bmi_category, bmi_color = "Obese", "red"

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    target_date = date or today

    # Burned from workouts on target date
    today_workouts = await db.workouts.find({"user_id": user_id, "date": target_date}, {"_id": 0}).to_list(100)
    burned_workouts = sum(w.get("calories", 0) for w in today_workouts)

    # Precise steps calories: stride = height × 0.413, MET 3.5 moderate walking
    steps_doc = await db.steps.find_one({"user_id": user_id, "date": target_date}, {"_id": 0})
    steps = steps_doc["steps"] if steps_doc else 0
    stride_m = height_cm * 0.413 / 100
    distance_km = steps * stride_m / 1000
    walking_time_h = distance_km / 4.8
    steps_calories = round(3.5 * weight * walking_time_h)
    burned_today = burned_workouts + steps_calories

    # Nutrition
    nutrition = await db.nutrition.find_one({"user_id": user_id, "date": target_date}, {"_id": 0})
    has_nutrition = bool(nutrition and nutrition.get("total") and nutrition["total"].get("calories"))
    eaten = nutrition["total"]["calories"] if has_nutrition else 0

    if has_nutrition:
        deficit = (tdee + burned_today) - eaten
    else:
        deficit = (tdee + burned_today) - cal_target

    # Weight logs (sorted ascending by date)
    weight_logs = await db.weight_logs.find({"user_id": user_id}, {"_id": 0}).sort("date", 1).to_list(1000)

    # Streak: count consecutive days with weight log entries (backward from today)
    streak = 0
    if weight_logs:
        from datetime import date as date_cls
        unique_dates = sorted(set(log["date"] for log in weight_logs), reverse=True)
        today_date = date_cls.fromisoformat(today)
        prev = None
        for d_str in unique_dates:
            try:
                d = date_cls.fromisoformat(d_str)
                if prev is None:
                    # First date: must be today or yesterday to count
                    diff_from_today = (today_date - d).days
                    if diff_from_today <= 1:
                        streak = 1
                        prev = d
                    else:
                        break
                elif (prev - d).days == 1:
                    streak += 1
                    prev = d
                else:
                    break
            except Exception:
                break

    # Weight to lose
    weight_to_lose = max(weight - goal_kg, 0)

    # Projection: based on actual TDEE vs calTarget
    # Daily planned deficit = TDEE - calTarget (positive means caloric deficit)
    planned_daily_deficit = max(tdee - cal_target, 0)
    # weekly_loss in kg: (daily_deficit * 7) / 7700 cal per kg of body fat
    weekly_loss = (planned_daily_deficit * 7) / 7700 if planned_daily_deficit > 0 else 0
    weeks_to_goal = round(weight_to_lose / weekly_loss) if weekly_loss > 0 else 0
    days_to_goal = weeks_to_goal * 7

    # Build projection array (24 weeks)
    projection = []
    actual_weights = weight_logs[-6:] if len(weight_logs) >= 6 else weight_logs
    for i, log in enumerate(actual_weights):
        projection.append({"week": i + 1, "actual": log["weight"], "projected": None,
                          "bmi_actual": round(log["weight"] / (height_m ** 2), 1)})
    start_week = len(actual_weights) + 1
    current_projected = weight
    for i in range(start_week, 25):
        current_projected = max(current_projected - weekly_loss, goal_kg)
        projection.append({"week": i, "actual": None, "projected": round(current_projected, 1),
                          "bmi_projected": round(current_projected / (height_m ** 2), 1)})

    # "Add gym" estimate: how many days faster with 300cal daily exercise
    gym_bonus_deficit = planned_daily_deficit + 300
    gym_weekly_loss = (gym_bonus_deficit * 7) / 7700 if gym_bonus_deficit > 0 else 0
    gym_weeks = round(weight_to_lose / gym_weekly_loss) if gym_weekly_loss > 0 else 0
    gym_days_saved = max(days_to_goal - (gym_weeks * 7), 0)

    # Water intake for target date
    water_doc = await db.water.find_one({"user_id": user_id, "date": target_date}, {"_id": 0})
    water_glasses = water_doc["glasses"] if water_doc else 0

    # Health Score (0-100)
    # BMI score (25 pts): 25 if normal, scaled down for over/underweight
    bmi_score = 25 if 18.5 <= bmi < 25 else max(0, 25 - abs(bmi - 22) * 2)
    # Activity score (25 pts): based on steps (10k = max) and burned cals
    steps_score = min(steps / 10000, 1) * 15
    burn_score = min(burned_today / 500, 1) * 10
    activity_score = steps_score + burn_score
    # Nutrition score (25 pts): adherence to calTarget (closer = better)
    if has_nutrition:
        cal_diff = abs(eaten - cal_target)
        nutrition_score = max(0, 25 - (cal_diff / cal_target) * 25)
    else:
        nutrition_score = 12  # Partial if not tracking
    # Streak score (25 pts): 7+ days = full
    streak_score = min(streak / 7, 1) * 25
    health_score = round(min(bmi_score + activity_score + nutrition_score + streak_score, 100))

    return {"bmi": bmi, "bmi_category": bmi_category, "bmi_color": bmi_color, "bmr": bmr,
            "tdee": tdee, "deficit": round(deficit), "burned_today": burned_today,
            "burned_workouts": burned_workouts, "steps_calories": steps_calories,
            "eaten": eaten, "has_nutrition": has_nutrition, "streak": streak,
            "weight_to_lose": round(weight_to_lose, 1), "days_to_goal": days_to_goal,
            "weeks_to_goal": weeks_to_goal, "weekly_loss": round(weekly_loss, 2),
            "projection": projection, "goal_kg": goal_kg, "current_weight": weight,
            "steps_today": steps, "gym_days_saved": gym_days_saved,
            "water_glasses": water_glasses, "health_score": health_score,
            "planned_daily_deficit": planned_daily_deficit, "date": target_date}

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
async def startup():
    try:
        await init_vapid()
        logger.info("VAPID keys initialized")
    except Exception as e:
        logger.error(f"VAPID init failed: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
