const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

// Data storage
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8') || 'null') || [];
  } catch (e) {
    return [];
  }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// Ensure files exist
if (!fs.existsSync(USERS_FILE)) writeJSON(USERS_FILE, []);
if (!fs.existsSync(POSTS_FILE)) writeJSON(POSTS_FILE, []);
if (!fs.existsSync(MESSAGES_FILE)) writeJSON(MESSAGES_FILE, []);

// Uploads
const UPLOADS = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS);
app.use('/uploads', express.static(UPLOADS));
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2,8) + ext);
  }
});
const upload = multer({ storage });

// Simple auth: returns user object if found
app.post('/api/register', (req, res) => {
  const { login, password, displayName } = req.body;
  if (!login || !password) return res.status(400).json({ error: 'login/password required' });
  const users = readJSON(USERS_FILE);
  if (users.find(u => u.login === login)) return res.status(400).json({ error: 'login exists' });
  const user = { id: uuidv4(), login, password, displayName: displayName||login, bio: '', avatar: '', friends: [], createdAt: Date.now() };
  users.push(user);
  writeJSON(USERS_FILE, users);
  res.json({ ok: true, user });
});

app.post('/api/login', (req, res) => {
  const { login, password } = req.body;
  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.login === login && u.password === password);
  if (!user) return res.status(401).json({ error: 'invalid credentials' });
  // Return user without password
  const safe = Object.assign({}, user); delete safe.password;
  res.json({ ok: true, user: safe });
});

app.get('/api/users', (req, res) => {
  const users = readJSON(USERS_FILE).map(u => {
    const copy = Object.assign({}, u); delete copy.password; return copy;
  });
  res.json(users);
});

app.get('/api/user/:login', (req, res) => {
  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.login === req.params.login);
  if (!user) return res.status(404).json({ error: 'not found' });
  const copy = Object.assign({}, user); delete copy.password;
  res.json(copy);
});

app.post('/api/upload-avatar', upload.single('avatar'), (req, res) => {
  const { login } = req.body;
  if (!req.file) return res.status(400).json({ error: 'no file' });
  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.login === login);
  if (!user) return res.status(404).json({ error: 'user not found' });
  user.avatar = '/uploads/' + req.file.filename;
  writeJSON(USERS_FILE, users);
  const copy = Object.assign({}, user); delete copy.password;
  res.json({ ok: true, user: copy });
});

app.post('/api/update-profile', (req, res) => {
  const { login, bio, displayName } = req.body;
  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.login === login);
  if (!user) return res.status(404).json({ error: 'user not found' });
  if (bio !== undefined) user.bio = bio;
  if (displayName !== undefined) user.displayName = displayName;
  writeJSON(USERS_FILE, users);
  const copy = Object.assign({}, user); delete copy.password;
  res.json({ ok: true, user: copy });
});

app.post('/api/add-friend', (req, res) => {
  const { login, friendLogin } = req.body;
  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.login === login);
  const friend = users.find(u => u.login === friendLogin);
  if (!user || !friend) return res.status(404).json({ error: 'user not found' });
  if (!user.friends.includes(friendLogin)) user.friends.push(friendLogin);
  writeJSON(USERS_FILE, users);
  res.json({ ok: true, friends: user.friends });
});

app.post('/api/remove-friend', (req, res) => {
  const { login, friendLogin } = req.body;
  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.login === login);
  if (!user) return res.status(404).json({ error: 'user not found' });
  user.friends = user.friends.filter(f => f !== friendLogin);
  writeJSON(USERS_FILE, users);
  res.json({ ok: true, friends: user.friends });
});

// Search friends / users
app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  const users = readJSON(USERS_FILE);
  const results = users.filter(u => u.login.toLowerCase().includes(q) || (u.displayName||'').toLowerCase().includes(q));
  const safe = results.map(u => { const c = Object.assign({}, u); delete c.password; return c; });
  res.json(safe);
});

// Posts
app.get('/api/posts', (req, res) => {
  const posts = readJSON(POSTS_FILE);
  res.json(posts);
});

app.post('/api/posts', upload.array('files', 6), (req, res) => {
  const { login, text } = req.body;
  const posts = readJSON(POSTS_FILE);
  const id = uuidv4();
  const files = (req.files || []).map(f => '/uploads/' + f.filename);
  const post = { id, login, text: text||'', files, comments: [], createdAt: Date.now() };
  posts.unshift(post);
  writeJSON(POSTS_FILE, posts);
  res.json({ ok: true, post });
});

app.post('/api/posts/:id/comment', (req, res) => {
  const { login, text } = req.body;
  const posts = readJSON(POSTS_FILE);
  const post = posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'post not found' });
  post.comments.push({ id: uuidv4(), login, text, createdAt: Date.now() });
  writeJSON(POSTS_FILE, posts);
  res.json({ ok: true, comment: post.comments[post.comments.length-1] });
});

// Messages (simple)
app.post('/api/messages/send', (req, res) => {
  const { from, to, text } = req.body;
  const messages = readJSON(MESSAGES_FILE);
  const msg = { id: uuidv4(), from, to, text, createdAt: Date.now() };
  messages.push(msg);
  writeJSON(MESSAGES_FILE, messages);
  res.json({ ok: true, msg });
});

app.get('/api/messages/:login', (req, res) => {
  const login = req.params.login;
  const messages = readJSON(MESSAGES_FILE);
  const conv = messages.filter(m => m.from === login || m.to === login);
  res.json(conv);
});

// Sync endpoint (front-end can fetch initial state)
app.get('/api/sync', (req, res) => {
  const users = readJSON(USERS_FILE).map(u => { const c = Object.assign({}, u); delete c.password; return c; });
  const posts = readJSON(POSTS_FILE);
  res.json({ users, posts });
});

// Serve static (optional)
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server started on', PORT));