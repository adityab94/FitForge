const express = require('express');
const cors = require('cors');
const { MongoClient, GridFSBucket, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { Readable } = require('stream');
const webpush = require('web-push');
const { v4: uuidv4 } = require('uuid');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024 } });

// Middleware
app.use(cors({
  origin: (process.env.CORS_ORIGINS || '*').split(','),
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// ── MongoDB connection (cached for serverless) ──────────────────────────────
// Accept both MONGO_URL and MONGODB_URI
const MONGO_CONNECTION_STRING = process.env.MONGO_URL || process.env.MONGODB_URI;

let cachedClient = null;
async function getDb() {
  if (!cachedClient) {
    if (!MONGO_CONNECTION_STRING) {
      throw new Error('MongoDB connection string not found. Set MONGO_URL or MONGODB_URI environment variable.');
    }
    cachedClient = new MongoClient(MONGO_CONNECTION_STRING, { maxPoolSize: 10, serverSelectionTimeoutMS: 5000 });
    await cachedClient.connect();
  }
  return cachedClient.db(process.env.DB_NAME);
}

// ── JWT ─────────────────────────────────────────────────────────────────────
function createToken(userId) {
  return jwt.sign(
    { user_id: userId, exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 },
    process.env.JWT_SECRET
  );
}
function verifyToken(token) {
  try { return jwt.verify(token, process.env.JWT_SECRET).user_id; } catch { return null; }
}
async function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ detail: 'Not authenticated' });
  const userId = verifyToken(auth.slice(7));
  if (!userId) return res.status(401).json({ detail: 'Invalid or expired token' });
  req.userId = userId;
  next();
}

// ── GridFS ───────────────────────────────────────────────────────────────────
async function uploadToGridFS(db, buffer, filename, contentType) {
  const bucket = new GridFSBucket(db);
  const stream = bucket.openUploadStream(filename, { metadata: { contentType } });
  await new Promise((resolve, reject) => {
    Readable.from(buffer).pipe(stream);
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
  return stream.id.toString();
}
async function getFromGridFS(db, fileId) {
  const bucket = new GridFSBucket(db);
  const files = await bucket.find({ _id: new ObjectId(fileId) }).toArray();
  if (!files.length) throw new Error('File not found');
  const contentType = files[0].metadata?.contentType || 'application/octet-stream';
  const chunks = [];
  const stream = bucket.openDownloadStream(new ObjectId(fileId));
  await new Promise((resolve, reject) => {
    stream.on('data', c => chunks.push(c));
    stream.on('end', resolve);
    stream.on('error', reject);
  });
  return { data: Buffer.concat(chunks), contentType };
}
async function deleteFromGridFS(db, fileId) {
  try { await new GridFSBucket(db).delete(new ObjectId(fileId)); } catch (e) { console.warn('GridFS delete:', e.message); }
}

// ── VAPID ────────────────────────────────────────────────────────────────────
async function getVapidKeys(db) {
  let rec = await db.collection('settings').findOne({ type: 'vapid_keys' });
  if (!rec) {
    const k = webpush.generateVAPIDKeys();
    await db.collection('settings').insertOne({ type: 'vapid_keys', publicKey: k.publicKey, privateKey: k.privateKey });
    return k;
  }
  return { publicKey: rec.publicKey, privateKey: rec.privateKey };
}

// ── Seed data ────────────────────────────────────────────────────────────────
async function seedUserData(db, userId) {
  const weights = [
    { id: uuidv4(), user_id: userId, weight: 92.0, date: '2026-01-15', timestamp: '2026-01-15T08:00:00Z' },
    { id: uuidv4(), user_id: userId, weight: 91.2, date: '2026-01-22', timestamp: '2026-01-22T08:00:00Z' },
    { id: uuidv4(), user_id: userId, weight: 90.5, date: '2026-01-29', timestamp: '2026-01-29T08:00:00Z' },
    { id: uuidv4(), user_id: userId, weight: 90.0, date: '2026-02-05', timestamp: '2026-02-05T08:00:00Z' },
    { id: uuidv4(), user_id: userId, weight: 89.5, date: '2026-02-12', timestamp: '2026-02-12T08:00:00Z' },
    { id: uuidv4(), user_id: userId, weight: 89.0, date: '2026-02-19', timestamp: '2026-02-19T08:00:00Z' },
  ];
  await db.collection('weight_logs').insertMany(weights);
  await db.collection('workouts').insertMany([
    { id: uuidv4(), user_id: userId, type: 'Chest + Triceps', duration: 55, calories: 420, notes: 'Heavy bench day', date: '2026-02-17', timestamp: '2026-02-17T10:00:00Z' },
    { id: uuidv4(), user_id: userId, type: 'HIIT Cardio', duration: 30, calories: 350, notes: 'Sprint intervals', date: '2026-02-18', timestamp: '2026-02-18T07:00:00Z' },
    { id: uuidv4(), user_id: userId, type: 'Back + Biceps', duration: 50, calories: 380, notes: 'Deadlift PR!', date: '2026-02-19', timestamp: '2026-02-19T10:00:00Z' },
  ]);
}

// ── ROUTES ───────────────────────────────────────────────────────────────────

app.get('/api', (req, res) => res.json({ message: 'FitForge API' }));

// Seed test user endpoint - creates a test account
app.get('/api/seed-user', async (req, res) => {
  try {
    const db = await getDb();
    const testEmail = 'adityabhatnagar08@gmail.com';
    const testPassword = 'Asdfghjkl123@';
    
    // Check if user already exists
    const existing = await db.collection('users').findOne({ email: testEmail });
    if (existing) {
      return res.json({ message: 'Test user already exists', email: testEmail, password: testPassword });
    }
    
    const hashed = await bcrypt.hash(testPassword, 10);
    const user = { 
      id: uuidv4(), 
      email: testEmail, 
      name: 'Aditya', 
      password: hashed, 
      avatarUrl: '', 
      createdAt: new Date().toISOString() 
    };
    await db.collection('users').insertOne({ ...user });
    await db.collection('profiles').insertOne({ 
      id: uuidv4(), 
      user_id: user.id, 
      name: 'Aditya', 
      weight: 90.0, 
      heightCm: 175.0, 
      age: 30, 
      gender: 'male', 
      calTarget: 1800, 
      goalKg: 80.0, 
      avatarUrl: '', 
      createdAt: new Date().toISOString() 
    });
    await seedUserData(db, user.id);
    
    res.json({ message: 'Test user created!', email: testEmail, password: testPassword });
  } catch (e) { 
    res.status(500).json({ detail: e.message }); 
  }
});

// Auth
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) return res.status(400).json({ detail: 'Name, email and password required' });
    const db = await getDb();
    if (await db.collection('users').findOne({ email })) return res.status(400).json({ detail: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const user = { id: uuidv4(), email, name, password: hashed, avatarUrl: '', createdAt: new Date().toISOString() };
    await db.collection('users').insertOne({ ...user });
    await db.collection('profiles').insertOne({ id: uuidv4(), user_id: user.id, name, weight: 90.0, heightCm: 175.0, age: 30, gender: 'male', calTarget: 1800, goalKg: 80.0, avatarUrl: '', createdAt: new Date().toISOString() });
    await seedUserData(db, user.id);
    res.json({ token: createToken(user.id), user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
  } catch (e) { res.status(500).json({ detail: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ detail: 'Email and password required' });
    const db = await getDb();
    const user = await db.collection('users').findOne({ email }, { projection: { _id: 0 } });
    if (!user || !user.password) return res.status(401).json({ detail: 'Invalid email or password' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ detail: 'Invalid email or password' });
    res.json({ token: createToken(user.id), user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
  } catch (e) { res.status(500).json({ detail: e.message }); }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const db = await getDb();
  const user = await db.collection('users').findOne({ id: req.userId }, { projection: { _id: 0 } });
  if (!user) return res.status(404).json({ detail: 'User not found' });
  res.json({ id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl });
});

// Profile
app.get('/api/profile', requireAuth, async (req, res) => {
  const db = await getDb();
  const p = await db.collection('profiles').findOne({ user_id: req.userId }, { projection: { _id: 0 } });
  if (!p) return res.status(404).json({ detail: 'Profile not found' });
  res.json(p);
});

app.put('/api/profile', requireAuth, async (req, res) => {
  const db = await getDb();
  const allowed = ['name', 'weight', 'heightCm', 'age', 'gender', 'calTarget', 'goalKg', 'avatarUrl'];
  const upd = Object.fromEntries(Object.entries(req.body).filter(([k, v]) => allowed.includes(k) && v != null));
  if (Object.keys(upd).length) {
    await db.collection('profiles').updateOne({ user_id: req.userId }, { $set: upd });
    if (upd.weight) {
      await db.collection('weight_logs').insertOne({ id: uuidv4(), user_id: req.userId, weight: upd.weight, date: new Date().toISOString().split('T')[0], timestamp: new Date().toISOString() });
    }
  }
  res.json(await db.collection('profiles').findOne({ user_id: req.userId }, { projection: { _id: 0 } }));
});

// Weight logs
app.get('/api/weight-logs', requireAuth, async (req, res) => {
  const db = await getDb();
  res.json(await db.collection('weight_logs').find({ user_id: req.userId }, { projection: { _id: 0 } }).sort({ date: 1 }).toArray());
});
app.post('/api/weight-logs', requireAuth, async (req, res) => {
  const db = await getDb();
  const log = { id: uuidv4(), user_id: req.userId, weight: req.body.weight, date: new Date().toISOString().split('T')[0], timestamp: new Date().toISOString() };
  await db.collection('weight_logs').insertOne({ ...log });
  await db.collection('profiles').updateOne({ user_id: req.userId }, { $set: { weight: req.body.weight } });
  res.json(log);
});

// Workouts
app.get('/api/workouts', requireAuth, async (req, res) => {
  const db = await getDb();
  res.json(await db.collection('workouts').find({ user_id: req.userId }, { projection: { _id: 0 } }).sort({ timestamp: -1 }).toArray());
});
app.post('/api/workouts', requireAuth, async (req, res) => {
  const db = await getDb();
  const doc = { id: uuidv4(), user_id: req.userId, ...req.body, date: new Date().toISOString().split('T')[0], timestamp: new Date().toISOString() };
  await db.collection('workouts').insertOne({ ...doc });
  const { _id, ...result } = doc;
  res.json(result);
});
app.delete('/api/workouts/:id', requireAuth, async (req, res) => {
  const db = await getDb();
  const r = await db.collection('workouts').deleteOne({ id: req.params.id, user_id: req.userId });
  if (!r.deletedCount) return res.status(404).json({ detail: 'Not found' });
  res.json({ message: 'Deleted' });
});

// Measurements
app.get('/api/measurements', requireAuth, async (req, res) => {
  const db = await getDb();
  res.json(await db.collection('measurements').find({ user_id: req.userId }, { projection: { _id: 0 } }).sort({ date: -1 }).toArray());
});
app.post('/api/measurements', requireAuth, async (req, res) => {
  const db = await getDb();
  const doc = { id: uuidv4(), user_id: req.userId, ...req.body, date: new Date().toISOString().split('T')[0] };
  await db.collection('measurements').insertOne({ ...doc });
  const { _id, ...result } = doc;
  res.json(result);
});

// Steps
app.get('/api/steps', requireAuth, async (req, res) => {
  const db = await getDb();
  res.json(await db.collection('steps').find({ user_id: req.userId }, { projection: { _id: 0 } }).sort({ date: -1 }).toArray());
});
app.post('/api/steps', requireAuth, async (req, res) => {
  const db = await getDb();
  const date = req.body.date || new Date().toISOString().split('T')[0];
  const existing = await db.collection('steps').findOne({ user_id: req.userId, date }, { projection: { _id: 0 } });
  if (existing) {
    await db.collection('steps').updateOne({ user_id: req.userId, date }, { $set: { steps: req.body.steps } });
    return res.json({ ...existing, steps: req.body.steps });
  }
  const doc = { id: uuidv4(), user_id: req.userId, steps: req.body.steps, date };
  await db.collection('steps').insertOne({ ...doc });
  res.json(doc);
});

// Water - by date
app.get('/api/water', requireAuth, async (req, res) => {
  const db = await getDb();
  const date = req.query.date || new Date().toISOString().split('T')[0];
  const doc = await db.collection('water').findOne({ user_id: req.userId, date }, { projection: { _id: 0 } });
  res.json(doc || { glasses: 0, date });
});
app.post('/api/water', requireAuth, async (req, res) => {
  const db = await getDb();
  const date = req.body.date || new Date().toISOString().split('T')[0];
  await db.collection('water').updateOne({ user_id: req.userId, date }, { $set: { user_id: req.userId, date, glasses: req.body.glasses } }, { upsert: true });
  res.json({ glasses: req.body.glasses, date });
});

// MFP (mocked)
const mockMeals = () => ['Breakfast', 'Lunch', 'Dinner', 'Snacks'].map(name => ({
  name, calories: Math.floor(Math.random() * 400 + 200),
  carbs: Math.floor(Math.random() * 60 + 20), protein: Math.floor(Math.random() * 40 + 15), fat: Math.floor(Math.random() * 30 + 10)
}));
const sumMeals = meals => meals.reduce((a, m) => ({ calories: a.calories + m.calories, carbs: a.carbs + m.carbs, protein: a.protein + m.protein, fat: a.fat + m.fat }), { calories: 0, carbs: 0, protein: 0, fat: 0 });

app.post('/api/mfp-scrape', requireAuth, async (req, res) => {
  const db = await getDb();
  const meals = mockMeals(); const total = sumMeals(meals);
  const today = new Date().toISOString().split('T')[0];
  await db.collection('nutrition').updateOne({ user_id: req.userId, date: today }, { $set: { id: uuidv4(), user_id: req.userId, date: today, meals, total, username: req.body.username, synced_at: new Date().toISOString() } }, { upsert: true });
  res.json({ meals, total, message: `Synced! ${meals[0].name} ${meals[0].calories}cal` });
});
app.post('/api/mfp', requireAuth, async (req, res) => {
  const db = await getDb();
  const meals = mockMeals(); const total = sumMeals(meals);
  const today = new Date().toISOString().split('T')[0];
  await db.collection('nutrition').updateOne({ user_id: req.userId, date: today }, { $set: { id: uuidv4(), user_id: req.userId, date: today, meals, total, username: req.body.username, synced_at: new Date().toISOString() } }, { upsert: true });
  res.json({ name: req.body.username, ...total, meals, total });
});

// Nutrition - manual log
app.post('/api/nutrition/manual', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const { mode, calories, carbs, protein, fat, date } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];
    let total;
    if (mode === 'macros') {
      const c = parseFloat(carbs) || 0, p = parseFloat(protein) || 0, f = parseFloat(fat) || 0;
      total = { calories: Math.round(c * 4 + p * 4 + f * 9), carbs: c, protein: p, fat: f };
    } else {
      const cal = parseFloat(calories) || 0;
      total = { calories: cal, carbs: 0, protein: 0, fat: 0 };
    }
    const meals = [{ name: 'Manual Entry', calories: total.calories, carbs: total.carbs, protein: total.protein, fat: total.fat }];
    await db.collection('nutrition').updateOne(
      { user_id: req.userId, date: targetDate },
      { $set: { id: uuidv4(), user_id: req.userId, date: targetDate, meals, total, source: 'manual', updated_at: new Date().toISOString() } },
      { upsert: true }
    );
    res.json({ total, date: targetDate, source: 'manual' });
  } catch (e) { res.status(500).json({ detail: e.message }); }
});

// Nutrition - copy from yesterday
app.get('/api/nutrition/copy-yesterday', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];
    const d = new Date(targetDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    const yesterday = d.toISOString().split('T')[0];
    const yesterdayDoc = await db.collection('nutrition').findOne({ user_id: req.userId, date: yesterday }, { projection: { _id: 0 } });
    if (!yesterdayDoc || !yesterdayDoc.total?.calories) return res.status(404).json({ detail: 'No nutrition data found for previous day' });
    const newDoc = { ...yesterdayDoc, id: uuidv4(), date: targetDate, source: 'copied_from_yesterday', updated_at: new Date().toISOString() };
    delete newDoc._id;
    await db.collection('nutrition').updateOne({ user_id: req.userId, date: targetDate }, { $set: newDoc }, { upsert: true });
    res.json({ total: yesterdayDoc.total, date: targetDate, source: 'copied_from_yesterday', from_date: yesterday });
  } catch (e) { res.status(500).json({ detail: e.message }); }
});

// Nutrition - get by date
app.get('/api/nutrition', requireAuth, async (req, res) => {
  const db = await getDb();
  const date = req.query.date || new Date().toISOString().split('T')[0];
  const doc = await db.collection('nutrition').findOne({ user_id: req.userId, date }, { projection: { _id: 0 } });
  res.json(doc || { meals: [], total: { calories: 0, carbs: 0, protein: 0, fat: 0 } });
});

// Body composition (Navy Method)
app.post('/api/body-composition', requireAuth, async (req, res) => {
  const db = await getDb();
  const profile = await db.collection('profiles').findOne({ user_id: req.userId }, { projection: { _id: 0 } });
  if (!profile) return res.status(404).json({ detail: 'Profile not found' });
  const { waist, neck, hip } = req.body;
  const { heightCm, gender, weight } = profile;
  let bf = gender === 'male'
    ? 86.010 * Math.log10(waist - neck) - 70.041 * Math.log10(heightCm) + 36.76
    : 163.205 * Math.log10(waist + (hip || 0) - neck) - 97.684 * Math.log10(heightCm) - 78.387;
  bf = Math.max(2, Math.min(Math.round(bf * 10) / 10, 60));
  const cats = gender === 'male'
    ? [['Essential', 6], ['Athletic', 14], ['Fitness', 18], ['Average', 25], ['Above Average', Infinity]]
    : [['Essential', 14], ['Athletic', 21], ['Fitness', 25], ['Average', 32], ['Above Average', Infinity]];
  const cat = cats.find(([, max]) => bf < max)[0];
  const doc = { id: uuidv4(), user_id: req.userId, body_fat: bf, category: cat, waist, neck, hip, date: new Date().toISOString().split('T')[0] };
  await db.collection('body_comp').insertOne({ ...doc });
  res.json({ body_fat: bf, category: cat, lean_mass: Math.round(weight * (1 - bf / 100) * 10) / 10, fat_mass: Math.round(weight * (bf / 100) * 10) / 10 });
});
app.get('/api/body-composition', requireAuth, async (req, res) => {
  const db = await getDb();
  res.json(await db.collection('body_comp').find({ user_id: req.userId }, { projection: { _id: 0 } }).sort({ date: -1 }).limit(20).toArray());
});

// Workout heatmap
app.get('/api/workout-heatmap', requireAuth, async (req, res) => {
  const db = await getDb();
  const start = new Date(); start.setDate(start.getDate() - 84);
  const startStr = start.toISOString().split('T')[0];
  const workouts = await db.collection('workouts').find({ user_id: req.userId, date: { $gte: startStr } }, { projection: { _id: 0 } }).toArray();
  const heatmap = {};
  workouts.forEach(w => {
    if (!heatmap[w.date]) heatmap[w.date] = { count: 0, calories: 0, duration: 0 };
    heatmap[w.date].count++; heatmap[w.date].calories += w.calories || 0; heatmap[w.date].duration += w.duration || 0;
  });
  const grid = [];
  for (let i = 0; i < 84; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i);
    const dStr = d.toISOString().split('T')[0];
    grid.push({ date: dStr, ...(heatmap[dStr] || { count: 0, calories: 0, duration: 0 }) });
  }
  res.json(grid);
});

// Progress photos
app.post('/api/progress-photos', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: 'No file uploaded' });
  const db = await getDb();
  const fileId = await uploadToGridFS(db, req.file.buffer, req.file.originalname, req.file.mimetype);
  const doc = { id: uuidv4(), user_id: req.userId, file_id: fileId, date: new Date().toISOString().split('T')[0], timestamp: new Date().toISOString() };
  await db.collection('progress_photos').insertOne({ ...doc });
  res.json({ id: doc.id, file_id: fileId, url: `/api/files/${fileId}`, date: doc.date });
});
app.get('/api/progress-photos', requireAuth, async (req, res) => {
  const db = await getDb();
  const photos = await db.collection('progress_photos').find({ user_id: req.userId }, { projection: { _id: 0 } }).sort({ timestamp: 1 }).toArray();
  res.json(photos.map(p => ({ ...p, url: `/api/files/${p.file_id || p.storage_path}` })));
});
app.delete('/api/progress-photos/:photoId', requireAuth, async (req, res) => {
  const db = await getDb();
  const doc = await db.collection('progress_photos').findOne({ id: req.params.photoId, user_id: req.userId }, { projection: { _id: 0 } });
  if (!doc) return res.status(404).json({ detail: 'Not found' });
  if (doc.file_id) await deleteFromGridFS(db, doc.file_id);
  await db.collection('progress_photos').deleteOne({ id: req.params.photoId, user_id: req.userId });
  res.json({ message: 'Deleted' });
});

// Avatar upload
app.post('/api/upload/avatar', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: 'No file uploaded' });
  const db = await getDb();
  const fileId = await uploadToGridFS(db, req.file.buffer, req.file.originalname, req.file.mimetype);
  const avatarUrl = `/api/files/${fileId}`;
  await db.collection('users').updateOne({ id: req.userId }, { $set: { avatarUrl } });
  await db.collection('profiles').updateOne({ user_id: req.userId }, { $set: { avatarUrl } });
  res.json({ file_id: fileId, url: avatarUrl });
});

// File serving
app.get('/api/files/:fileId', async (req, res) => {
  try {
    const db = await getDb();
    const { data, contentType } = await getFromGridFS(db, req.params.fileId);
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(data);
  } catch { res.status(404).json({ detail: 'File not found' }); }
});

// Push notifications
app.get('/api/push/vapid-key', async (req, res) => {
  const db = await getDb();
  const keys = await getVapidKeys(db);
  res.json({ publicKey: keys.publicKey });
});
app.post('/api/push/subscribe', requireAuth, async (req, res) => {
  const db = await getDb();
  await db.collection('push_subs').updateOne({ user_id: req.userId }, { $set: { user_id: req.userId, endpoint: req.body.endpoint, keys: req.body.keys, created_at: new Date().toISOString() } }, { upsert: true });
  res.json({ message: 'Subscribed' });
});
app.post('/api/push/send-checkin', requireAuth, async (req, res) => {
  const db = await getDb();
  const sub = await db.collection('push_subs').findOne({ user_id: req.userId }, { projection: { _id: 0 } });
  if (!sub) return res.status(404).json({ detail: 'No push subscription' });
  const keys = await getVapidKeys(db);
  webpush.setVapidDetails('mailto:admin@fitforge.app', keys.publicKey, keys.privateKey);
  await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify({ title: 'FitForge', body: 'Sunday Check-in! Log your weight and plan your week.' }));
  res.json({ message: 'Notification sent' });
});

// Stats - with date support + precise steps calories
app.get('/api/stats', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const profile = await db.collection('profiles').findOne({ user_id: req.userId }, { projection: { _id: 0 } });
    if (!profile) return res.status(404).json({ detail: 'Profile not found' });
    const { weight, heightCm, age, gender, calTarget, goalKg } = profile;
    const heightM = heightCm / 100;
    const bmi = Math.round(weight / (heightM ** 2) * 10) / 10;
    const bmr = Math.round(10 * weight + 6.25 * heightCm - 5 * age + (gender === 'male' ? 5 : -161));
    const tdee = Math.round(bmr * 1.2);
    const bmiCat = bmi < 18.5 ? ['Underweight', 'blue'] : bmi < 25 ? ['Normal', 'green'] : bmi < 30 ? ['Overweight', 'orange'] : ['Obese', 'red'];
    const todayWorkouts = await db.collection('workouts').find({ user_id: req.userId, date }, { projection: { _id: 0 } }).toArray();
    const burnedWorkouts = todayWorkouts.reduce((s, w) => s + (w.calories || 0), 0);
    // Precise steps calories: stride = height × 0.413, MET 3.5 moderate walking
    const stepsDoc = await db.collection('steps').findOne({ user_id: req.userId, date }, { projection: { _id: 0 } });
    const steps = stepsDoc?.steps || 0;
    const strideLengthM = heightCm * 0.413 / 100;
    const distanceKm = steps * strideLengthM / 1000;
    const walkingTimeH = distanceKm / 4.8;
    const stepsCalories = Math.round(3.5 * weight * walkingTimeH);
    const burnedToday = burnedWorkouts + stepsCalories;
    const nutrition = await db.collection('nutrition').findOne({ user_id: req.userId, date }, { projection: { _id: 0 } });
    const hasNutrition = !!(nutrition?.total?.calories);
    const eaten = hasNutrition ? nutrition.total.calories : 0;
    const deficit = hasNutrition ? (tdee + burnedToday) - eaten : (tdee + burnedToday) - calTarget;
    const weightLogs = await db.collection('weight_logs').find({ user_id: req.userId }, { projection: { _id: 0 } }).sort({ date: 1 }).toArray();
    // Streak
    let streak = 0;
    if (weightLogs.length) {
      const today = new Date().toISOString().split('T')[0];
      const uniqueDates = [...new Set(weightLogs.map(l => l.date))].sort().reverse();
      const todayMs = new Date(today).getTime();
      let prev = null;
      for (const dStr of uniqueDates) {
        const dMs = new Date(dStr).getTime();
        if (!prev) { if ((todayMs - dMs) / 86400000 <= 1) { streak = 1; prev = dMs; } else break; }
        else { if ((prev - dMs) / 86400000 === 1) { streak++; prev = dMs; } else break; }
      }
    }
    const weightToLose = Math.max(weight - goalKg, 0);
    const plannedDailyDeficit = Math.max(tdee - calTarget, 0);
    const weeklyLoss = plannedDailyDeficit > 0 ? (plannedDailyDeficit * 7) / 7700 : 0;
    const weeksToGoal = weeklyLoss > 0 ? Math.round(weightToLose / weeklyLoss) : 0;
    const daysToGoal = weeksToGoal * 7;
    const actualWeights = weightLogs.slice(-6);
    const projection = actualWeights.map((log, i) => ({ week: i + 1, actual: log.weight, projected: null, bmi_actual: Math.round(log.weight / (heightM ** 2) * 10) / 10 }));
    let currentProjected = weight;
    for (let i = actualWeights.length + 1; i <= 24; i++) {
      currentProjected = Math.max(currentProjected - weeklyLoss, goalKg);
      projection.push({ week: i, actual: null, projected: Math.round(currentProjected * 10) / 10, bmi_projected: Math.round(currentProjected / (heightM ** 2) * 10) / 10 });
    }
    const gymWeeklyLoss = (plannedDailyDeficit + 300) > 0 ? ((plannedDailyDeficit + 300) * 7) / 7700 : 0;
    const gymWeeks = gymWeeklyLoss > 0 ? Math.round(weightToLose / gymWeeklyLoss) : 0;
    const gymDaysSaved = Math.max(daysToGoal - gymWeeks * 7, 0);
    const waterDoc = await db.collection('water').findOne({ user_id: req.userId, date }, { projection: { _id: 0 } });
    const waterGlasses = waterDoc?.glasses || 0;
    const bmiScore = (bmi >= 18.5 && bmi < 25) ? 25 : Math.max(0, 25 - Math.abs(bmi - 22) * 2);
    const healthScore = Math.round(Math.min(bmiScore + Math.min(steps / 10000, 1) * 15 + Math.min(burnedToday / 500, 1) * 10 + (hasNutrition ? Math.max(0, 25 - (Math.abs(eaten - calTarget) / calTarget) * 25) : 12) + Math.min(streak / 7, 1) * 25, 100));
    res.json({ bmi, bmi_category: bmiCat[0], bmi_color: bmiCat[1], bmr, tdee, deficit: Math.round(deficit), burned_today: burnedToday, burned_workouts: burnedWorkouts, steps_calories: stepsCalories, eaten, has_nutrition: hasNutrition, streak, weight_to_lose: Math.round(weightToLose * 10) / 10, days_to_goal: daysToGoal, weeks_to_goal: weeksToGoal, weekly_loss: Math.round(weeklyLoss * 100) / 100, projection, goal_kg: goalKg, current_weight: weight, steps_today: steps, gym_days_saved: gymDaysSaved, water_glasses: waterGlasses, health_score: healthScore, planned_daily_deficit: plannedDailyDeficit, date });
  } catch (e) { console.error('Stats error:', e); res.status(500).json({ detail: e.message }); }
});

module.exports = app;
