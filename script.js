const STORAGE_USERS = 'multiRpgUsers';
const STORAGE_TOPICS = 'multiRpgTopics';
const STORAGE_BANNED = 'multiRpgBanned';
const STORAGE_CURRENT_USER = 'multiRpgCurrentUser';

const app = document.getElementById('app');
const userInfo = document.getElementById('user-info');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const categoriesMenu = document.getElementById('categories-menu');

let users = JSON.parse(localStorage.getItem(STORAGE_USERS)) || {};
let topics = JSON.parse(localStorage.getItem(STORAGE_TOPICS)) || [];
let bannedUsers = JSON.parse(localStorage.getItem(STORAGE_BANNED)) || [];
let currentUser = localStorage.getItem(STORAGE_CURRENT_USER) || null;

const categories = ['Tematy', 'Ogłoszenia', 'Serwery'];
let currentCategory = categories[0];

// --- Utility ---

function saveUsers() { localStorage.setItem(STORAGE_USERS, JSON.stringify(users)); }
function saveTopics() { localStorage.setItem(STORAGE_TOPICS, JSON.stringify(topics)); }
function saveBanned() { localStorage.setItem(STORAGE_BANNED, JSON.stringify(bannedUsers)); }
function saveCurrentUser() {
  if(currentUser) localStorage.setItem(STORAGE_CURRENT_USER, currentUser);
  else localStorage.removeItem(STORAGE_CURRENT_USER);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function isBanned(username) {
  return bannedUsers.includes(username);
}

function requireLogin() {
  if(!currentUser) {
    alert('Musisz być zalogowany, aby wykonać tę akcję.');
    return false;
  }
  if(isBanned(currentUser)) {
    alert('Jesteś zbanowany i nie możesz wykonać tej akcji.');
    logout();
    return false;
  }
  return true;
}

function logout() {
  currentUser = null;
  saveCurrentUser();
  updateUserUI();
  location.hash = '#/';
}

function login(username) {
  username = username.trim();
  if(!username) return alert('Podaj nazwę użytkownika.');
  if(!users[username]) {
    // nowy użytkownik
    users[username] = { posts: 0 };
    saveUsers();
  }
  if(isBanned(username)) {
    alert('Ten użytkownik jest zbanowany.');
    return;
  }
  currentUser = username;
  saveCurrentUser();
  updateUserUI();
  location.hash = '#/';
}

function updateUserUI() {
  if(currentUser) {
    userInfo.textContent = `Zalogowany jako: ${currentUser}`;
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
  } else {
    userInfo.textContent = 'Nie zalogowany';
    loginBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'none';
  }
  renderCategoriesMenu();
}

function renderCategoriesMenu() {
  categoriesMenu.innerHTML = '';
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.textContent = cat;
    btn.className = 'category-btn' + (cat === currentCategory ? ' active' : '');
    btn.onclick = () => {
      currentCategory = cat;
      location.hash = '#/';
      renderView();
    };
    categoriesMenu.appendChild(btn);
  });
}

// --- Routing ---

function renderView() {
  const hash = location.hash || '#/';
  if(hash.startsWith('#/topic/')) {
    const id = hash.split('/')[2];
    renderTopicView(id);
  } else if(hash === '#/new-topic') {
    renderNewTopic();
  } else if(hash === '#/admin') {
    renderAdminPanel();
  } else {
    renderTopicList();
  }
}

// --- Topic List ---

function renderTopicList() {
  let filteredTopics = topics.filter(t => t.category === currentCategory);
  let html = `
    <section>
      <h2>Kategoria: ${escapeHtml(currentCategory)}</h2>
      <button onclick="location.hash='#/new-topic'">+ Nowy temat</button>
      <ul class="topic-list" tabindex="0">
  `;

  if(filteredTopics.length === 0) {
    html += '<li>Brak tematów w tej kategorii. Bądź pierwszy!</li>';
  } else {
    filteredTopics.forEach(topic => {
      html += `
      <li tabindex="0" onclick="location.hash='#/topic/${topic.id}'">
        <h3>${escapeHtml(topic.title)}</h3>
        <p>${escapeHtml(topic.posts.length > 0 ? topic.posts[0].content : '')}</p>
        <small>Autor: ${escapeHtml(topic.author)} | Postów: ${topic.posts.length}</small>
      </li>`;
    });
  }
  html += '</ul></section>';
  app.innerHTML = html;
}

// --- New Topic ---

function renderNewTopic() {
  if(!requireLogin()) return location.hash = '#/';
  app.innerHTML = `
    <section>
      <h2>Nowy temat w kategorii ${escapeHtml(currentCategory)}</h2>
      <form id="new-topic-form">
        <input type="text" id="topic-title" placeholder="Tytuł tematu" maxlength="60" required />
        <textarea id="topic-content" placeholder="Treść pierwszego posta" rows="6" maxlength="1000" required></textarea>
        <button type="submit">Utwórz temat</button>
        <button type="button" id="cancel-btn">Anuluj</button>
      </form>
    </section>
  `;
  document.getElementById('cancel-btn').onclick = () => { location.hash = '#/'; };
  document.getElementById('new-topic-form').onsubmit = e => {
    e.preventDefault();
    createTopic();
  };
}

function createTopic() {
  const title = document.getElementById('topic-title').value.trim();
  const content = document.getElementById('topic-content').value.trim();
  if(!title || !content) return alert('Wypełnij tytuł i treść.');
  const id = Date.now().toString(36);
  const newTopic = {
    id,
    category: currentCategory,
    title,
    author: currentUser,
    posts: [{
      author: currentUser,
      content,
      createdAt: new Date().toISOString()
    }]
  };
  topics.unshift(newTopic);
  users[currentUser].posts++;
  saveTopics();
  saveUsers();
  location.hash = `#/topic/${id}`;
}

// --- Topic View ---

function renderTopicView(id) {
  const topic = topics.find(t => t.id === id);
  if(!topic) {
    app.innerHTML = `<section><h2>Temat nie istnieje</h2><button onclick="location.hash='#/'">Wróć do listy</button></section>`;
    return;
  }
  let html = `
    <section>
      <h2>${escapeHtml(topic.title)}</h2>
      <button onclick="location.hash='#/'">← Wróć do listy</button>
      <div id="posts">
  `;
  topic.posts.forEach(post => {
    html += `
      <div class="comment" tabindex="0">
        <strong>${escapeHtml(post.author)}</strong> <em>(${new Date(post.createdAt).toLocaleString()})</em>
        <p>${escapeHtml(post.content)}</p>
      </div>
    `;
  });
  html += `</div>`;

  if(requireLogin() && !isBanned(currentUser)) {
    html += `
      <form id="reply-form">
        <textarea id="reply-content" placeholder="Napisz odpowiedź..." rows="4" maxlength="1000" required></textarea>
        <button type="submit">Dodaj odpowiedź</button>
      </form>
    `;
  } else if(isBanned(currentUser)) {
    html += `<p><em>Jesteś zbanowany i nie możesz pisać postów.</em></p>`;
  } else {
    html += `<p><em>Zaloguj się, aby pisać posty.</em></p>`;
  }

  html += `</section>`;
  app.innerHTML = html;

  if(requireLogin() && !isBanned(currentUser)) {
    document.getElementById('reply-form').onsubmit = e => {
      e.preventDefault();
      addReply(id);
    };
  }
}

function addReply(topicId) {
  const content = document.getElementById('reply-content').value.trim();
  if(!content) return alert('Napisz treść odpowiedzi.');
  const topic = topics.find(t => t.id === topicId);
  if(!topic) return alert('Temat nie znaleziony.');
  topic.posts.push({
    author: currentUser,
    content,
    createdAt: new Date().toISOString()
  });
  users[currentUser].posts++;
  saveUsers();
  saveTopics();
  renderTopicView(topicId);
}

// --- Admin Panel ---

function renderAdminPanel() {
  if(currentUser !== 'Admin') {
    app.innerHTML = `<section><h2>Panel Admina</h2><p>Brak dostępu. Zaloguj się jako Admin.</p></section>`;
    return;
  }

  let bannedListHTML = bannedUsers.length === 0 ? '<em>Brak zbanowanych użytkowników.</em>' :
    `<ul>${bannedUsers.map(u => `<li>${escapeHtml(u)}</li>`).join('')}</ul>`;

  app.innerHTML = `
    <section>
      <h2>Panel Admina</h2>
      <p>Zarządzaj użytkownikami</p>

      <div>
        <input type="text" id="ban-username" placeholder="Nazwa użytkownika do bana" />
        <button id="ban-btn">Zbanuj</button>
        <button id="unban-btn">Odbanuj</button>
      </div>

      <h3>Zbanowani użytkownicy</h3>
      ${bannedListHTML}
    </section>
  `;

  document.getElementById('ban-btn').onclick = () => {
    const username = document.getElementById('ban-username').value.trim();
    if(!username) return alert('Podaj nazwę użytkownika.');
    if(username === 'Admin') return alert('Nie możesz zbanować Admina.');
    if(isBanned(username)) return alert('Użytkownik już jest zbanowany.');
    bannedUsers.push(username);
    saveBanned();
    if(currentUser === username) logout();
    renderAdminPanel();
  };

  document.getElementById('unban-btn').onclick = () => {
    const username = document.getElementById('ban-username').value.trim();
    if(!username) return alert('Podaj nazwę użytkownika.');
    if(!isBanned(username)) return alert('Użytkownik nie jest zbanowany.');
    bannedUsers = bannedUsers.filter(u => u !== username);
    saveBanned();
    renderAdminPanel();
  };
}

// --- Login modal ---

loginBtn.onclick = () => {
  let username = prompt('Podaj nazwę użytkownika (Admin - admin):');
  if(username && username.toLowerCase() === 'admin') username = 'Admin';
  if(username) login(username);
};

logoutBtn.onclick = () => logout();

window.addEventListener('hashchange', renderView);
window.addEventListener('load', () => {
  updateUserUI();
  renderView();
});
