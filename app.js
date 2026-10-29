const SUPABASE_URL = "https://whhdlcuuhhwwtojijzdg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoaGRsY3V1aGh3d3RvamlqemRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNTY3OTEsImV4cCI6MjEwNTYzMjc5MX0.o2F738ljCWSVTS9HAMXOgESm49K3U2JTIPMEUn2rmxM";
const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

   
async function signUp() {
   const email = document.getElementById('signup-email').value;
   const password = document.getElementById('signup-password').value;
   const matric = document.getElementById('signup-matric').value.trim();
const matricPattern = /^\d{7}$/;

if (!matricPattern.test(matric)) {
   document.getElementById('auth-output').textContent = "Enter a valid 7-digit matric number.";
   return;
}
const role = 'student';
   const { data, error } = await sbClient.auth.signUp({
      email: email,
      password: password
   });
   
   if (error) {
      document.getElementById('auth-output').textContent = "Signup error: " + error.message;
      console.error(error);
      return;
   }
   
   const userId = data.user.id;
   
   const { error: profileError } = await sbClient
      .from('profiles')
      .insert({ id: userId, email: email, role: role, matric_number: role === 'student' ? matric : null });
   
   if (profileError) {
      document.getElementById('auth-output').textContent = "Profile creation error: " + profileError.message;
      console.error(profileError);
      return;
   }
   
if (data.session) {
   showApp(role);
} else {
   document.getElementById('auth-output').textContent = "Account created. Check your email to confirm, then log in.";
}
}
function showApp(role) {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');

  if (role === 'lecturer') {
    document.getElementById('lecturer-tools').classList.remove('hidden');
  }
  loadFeedItems();
  loadAnnouncements();
}

function showLogin() {
  document.getElementById('signup-box').classList.add('hidden');
  document.getElementById('login-box').classList.remove('hidden');
}

function showSignup() {
  document.getElementById('login-box').classList.add('hidden');
  document.getElementById('signup-box').classList.remove('hidden');
}
async function logIn() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  const { data, error } = await sbClient.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    document.getElementById('login-output').textContent = "Login error: " + error.message;
    console.error(error);
    return;
  }

  const userId = data.user.id;

  const { data: profile, error: profileError } = await sbClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (profileError) {
    document.getElementById('login-output').textContent = "Logged in, but role fetch error: " + profileError.message;
    console.error(profileError);
    return;
  }
  
showApp(profile.role);

  document.getElementById('login-output').textContent = "Logged in as: " + data.user.email + " | Role: " + profile.role;
  document.getElementById('current-user').textContent = "Logged in as: " + data.user.email + " (" + profile.role + ")";
}


async function postAnnouncement() {
  const content = document.getElementById('announcement-content').value.trim();
  const type = document.getElementById('announcement-type').value;
  const eventDate = document.getElementById('announcement-date').value;

  if (!content) {
    document.getElementById('post-output').textContent = "Please write something first.";
    return;
  }

  const { data: userData } = await sbClient.auth.getUser();
  if (!userData.user) {
    document.getElementById('post-output').textContent = "You must be logged in to post.";
    return;
  }

  const { error } = await sbClient
    .from('announcements')
    .insert({
      content: content,
      author_id: userData.user.id,
      type: type,
      event_date: eventDate ? eventDate : null
    });

  if (error) {
    document.getElementById('post-output').textContent = "Post error: " + error.message;
    console.error(error);
    return;
  }

  document.getElementById('post-output').textContent = "Posted successfully!";
  document.getElementById('announcement-content').value = "";
  loadAnnouncements();
}

async function loadAnnouncements() {
  const feedDiv = document.getElementById('announcements-feed');

  const { data, error } = await sbClient
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    feedDiv.textContent = "Error loading feed: " + error.message;
    console.error(error);
    return;
  }

  if (data.length === 0) {
    feedDiv.textContent = "No announcements yet.";
    return;
  }

  feedDiv.innerHTML = data.map(item => {
    const dateText = item.event_date ? new Date(item.event_date).toLocaleString() : "";
    const typeLabel = {
      general: "📢 General",
      class_update: "🔄 Class Update",
      test: "📝 Test",
      deadline: "⏰ Deadline"
    }[item.type] || esc(item.type);

    return `
    <div class="news-card">
        <strong>${typeLabel}</strong>
        ${dateText ? `<br><em>${dateText}</em>` : ""}
         <p>${esc(item.content)}</p>
      </div>
    `;
  }).join('');
}

async function checkSession() {
  const { data } = await sbClient.auth.getSession();
  if (!data.session) return;

  const { data: profile } = await sbClient
    .from('profiles')
    .select('role')
    .eq('id', data.session.user.id)
    .single();

  if (profile) showApp(profile.role);
}

checkSession();

async function logOut() {
   await sbClient.auth.signOut();
   document.getElementById('app-screen').classList.add('hidden');
   document.getElementById('lecturer-tools').classList.add('hidden');
   document.getElementById('auth-screen').classList.remove('hidden');
   document.getElementById('current-user').textContent = "Not logged in";
   document.getElementById('login-output').textContent = "";
}

function esc(text) {
  const d = document.createElement('div');
  d.textContent = text ?? '';
  return d.innerHTML;
}

async function loadFeedItems() {
  const box = document.getElementById('feed-items');
  const banner = document.getElementById('important-banner');
  const today = new Date().toLocaleDateString('en-CA');

  const { data, error } = await sbClient
    .from('feed_items')
    .select('*')
    .lte('publish_date', today)
    .order('publish_date', { ascending: false });

  if (error) {
    box.textContent = "Could not load cards: " + error.message;
    return;
  }

  const pinned = data.find(i => i.pinned);
  if (pinned) {
    document.getElementById('important-text').textContent = pinned.body;
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }

  const items = data.filter(i => !i.pinned);
  if (items.length === 0) {
    box.textContent = "Nothing new yet. Check back soon.";
    return;
  }

  const labels = {
    joke: "😂 Joke of the Day",
    riddle: "🧠 Riddle",
    trivia: "🎯 Trivia",
    education: "📚 Did You Know",
    video: "🎬 Video"
  };

  box.innerHTML = items.map(item => {
    if (item.type === 'news') {
      return `
        <article class="news-card">
          <div class="news-header">
            <div class="avatar">${esc((item.source || 'P').charAt(0))}</div>
            <div class="news-meta">
              <p class="news-name">${esc(item.source || 'FUADSI Pulse')}</p>
              <p class="news-time">${esc(item.publish_date)}</p>
            </div>
          </div>
          <p class="news-text">${esc(item.body)}</p>
        </article>`;
    }
    return `
      <article class="daily-card">
        <p class="daily-label">${labels[item.type] || esc(item.type)}</p>
        <p class="daily-title">${esc(item.body)}</p>
        ${item.answer ? `<details class="reveal"><summary>Tap to reveal</summary><p>${esc(item.answer)}</p></details>` : ""}
      </article>`;
  }).join('');
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  btn.textContent = showing ? '👁' : '🙈';
}
