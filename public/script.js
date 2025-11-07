
/* --- SERVER SYNC HELPERS --- */
const API_URL = (typeof API_URL !== 'undefined') ? API_URL : (window.API_URL || 'http://localhost:3000');

async function syncFromServer() {
  try {
    const res = await fetch(API_URL + '/api/sync');
    if (!res.ok) throw new Error('no sync');
    const data = await res.json();
    // Only set if local storage empty to avoid overwriting local edits
    if (!localStorage.getItem('users')) localStorage.setItem('users', JSON.stringify(data.users||[]));
    if (!localStorage.getItem('posts')) localStorage.setItem('posts', JSON.stringify(data.posts||[]));
    console.log('Synced from server');
  } catch (e) {
    console.log('Server sync failed', e);
  }
}

// helper to push a post to server (if possible)
async function pushPostToServer(post, filesForm=null) {
  try {
    const form = new FormData();
    form.append('login', post.login);
    form.append('text', post.text||'');
    if (filesForm) {
      for (let f of filesForm) form.append('files', f);
    }
    const res = await fetch(API_URL + '/api/posts', { method: 'POST', body: form });
    if (!res.ok) throw new Error('post failed');
    const data = await res.json();
    return data.post;
  } catch (e) {
    console.log('Push post failed', e);
    return null;
  }
}

// push comment
async function pushCommentToServer(postId, login, text) {
  try {
    const res = await fetch(API_URL + '/api/posts/' + postId + '/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, text })
    });
    if (!res.ok) throw new Error('comment failed');
    return await res.json();
  } catch (e) {
    console.log('Push comment failed', e);
    return null;
  }
}

// push profile update
async function uploadAvatarToServer(login, file) {
  try {
    const form = new FormData();
    form.append('login', login);
    form.append('avatar', file);
    const res = await fetch(API_URL + '/api/upload-avatar', { method: 'POST', body: form });
    if (!res.ok) throw new Error('avatar failed');
    return await res.json();
  } catch (e) {
    console.log('Upload avatar failed', e);
    return null;
  }
}
window.syncFromServer = syncFromServer;
window.pushPostToServer = pushPostToServer;
window.pushCommentToServer = pushCommentToServer;
window.uploadAvatarToServer = uploadAvatarToServer;
/* --- end server helpers --- */


let users = JSON.parse(localStorage.getItem('users') || '[]');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
let posts = JSON.parse(localStorage.getItem('posts') || '[]');

function showRegister() {
  document.getElementById('login-section').classList.add('hidden');
  document.getElementById('register-section').classList.remove('hidden');
}
function showLogin() {
  document.getElementById('register-section').classList.add('hidden');
  document.getElementById('login-section').classList.remove('hidden');
}
function register() {
  const username = document.getElementById('reg-username').value;
  const password = document.getElementById('reg-password').value;
  if (users.find(u => u.username === username)) {
    alert('Пользователь уже существует');
    return;
  }
  users.push({ username, password });
  localStorage.setItem('users', JSON.stringify(users));
  alert('Регистрация успешна');
  showLogin();
}
function login() {
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('profile-container').classList.remove('hidden');
    document.getElementById('welcome').textContent = `Привет, ${user.username}!`;
    renderPosts();
  } else {
    alert('Неверные данные');
  }
}
function logout() {
  localStorage.removeItem('currentUser');
  location.reload();
}
function createPost() {
  const text = document.getElementById('post-text').value;
  if (!text) return;
  const post = { user: currentUser.username, text, likes: 0, comments: [] };
  posts.push(post);
  localStorage.setItem('posts', JSON.stringify(posts));
  document.getElementById('post-text').value = '';
  renderPosts();
}
function renderPosts() {
  const container = document.getElementById('posts');
  container.innerHTML = '';
  posts.forEach((p, i) => {
    const postDiv = document.createElement('div');
    postDiv.classList.add('post');
    postDiv.innerHTML = `<b>${p.user}</b>: ${p.text}
      <div>
        ❤️ ${p.likes} <button onclick="likePost(${i})">Лайк</button>
      </div>
      <div>
        <input id="c${i}" placeholder="Комментарий..." />
        <button onclick="addComment(${i})">Отправить</button>
      </div>
      ${p.comments.map(c => `<div class='comment'>${c}</div>`).join('')}`;
    container.appendChild(postDiv);
  });
}
function likePost(i) {
  posts[i].likes++;
  localStorage.setItem('posts', JSON.stringify(posts));
  renderPosts();
}
function addComment(i) {
  const val = document.getElementById('c'+i).value;
  if (!val) return;
  posts[i].comments.push(val);
  localStorage.setItem('posts', JSON.stringify(posts));
  renderPosts();
}
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(page+'-page').classList.remove('hidden');
}
