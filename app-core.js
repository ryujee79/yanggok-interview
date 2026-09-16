const app = document.getElementById('app');

const PATHS = {
  schedule: './data/schedule.enc.json',
  used: {
    natural: './assets/used-natural.enc.json',
    humanities: './assets/used-humanities.enc.json',
  },
  unused: {
    natural: './assets/unused-natural.enc.json',
    humanities: './assets/unused-humanities.enc.json',
  },
};

const TEAM_LABELS = {
  natural: '고려대(자연)팀',
  humanities: '고려대(인문)&연세대팀',
};

const state = {
  role: localStorage.getItem('yi-role') || 'teacher',
  name: localStorage.getItem('yi-name') || '',
  password: localStorage.getItem('yi-password') || '',
  remember: Boolean(localStorage.getItem('yi-password')),
  data: null,
  studentQuery: '',
  teamModal: null,
  notice: '',
  zipCache: {},
  busy: '',
};

const normalizeName = (value) => String(value || '').trim();
const firstLine = (value) => String(value || '').split('\n')[0].trim();
const secondLine = (value) => String(value || '').split('\n').slice(1).join(' ').trim();

function b64ToBytes(value) {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function decryptEnvelope(envelope, password) {
  const salt = b64ToBytes(envelope.salt);
  const iv = b64ToBytes(envelope.iv);
  const encrypted = b64ToBytes(envelope.data);
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: envelope.iterations || 160000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
  return new Uint8Array(plain);
}

async function fetchEncrypted(path, password) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error('자료 파일을 찾지 못했습니다.');
  const envelope = await response.json();
  if (!envelope || !envelope.data || !envelope.salt || !envelope.iv) {
    throw new Error('자료 파일이 아직 업로드되지 않았습니다.');
  }
  return decryptEnvelope(envelope, password);
}

async function loadSchedule(password) {
  let envelope = null;
  try {
    const response = await fetch(PATHS.schedule, { cache: 'no-store' });
    if (response.ok) {
      const candidate = await response.json();
      if (candidate?.data && candidate?.salt && candidate?.iv) envelope = candidate;
    }
  } catch {}
  if (!envelope) {
    const manifestResponse = await fetch('./data/schedule.parts.json', { cache: 'no-store' });
    if (!manifestResponse.ok) throw new Error('일정 자료를 찾지 못했습니다.');
    const manifest = await manifestResponse.json();
    const chunks = await Promise.all(
      manifest.parts.map(async (name) => {
        const response = await fetch(`./data/schedule-parts/${name}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('일정 자료 일부를 찾지 못했습니다.');
        return response.text();
      })
    );
    envelope = JSON.parse(chunks.join(''));
  }
  const bytes = await decryptEnvelope(envelope, password);
  return JSON.parse(new TextDecoder().decode(bytes));
}

function dateKey(text) {
  const m = String(text).match(/(\d+)월\s*(\d+)/);
  return m ? Number(m[1]) * 100 + Number(m[2]) : 9999;
}

function sortSessions(items) {
  return [...items].sort((a, b) => dateKey(a.dateText) - dateKey(b.dateText) || a.team.localeCompare(b.team) || a.group.localeCompare(b.group, 'ko'));
}

function allTeachers() {
  return [...new Set(state.data.sessions.flatMap((s) => s.teachers || []))].sort((a, b) => a.localeCompare(b, 'ko'));
}

function allStudents() {
  return [...new Set(state.data.sessions.flatMap((s) => s.students || []))].sort((a, b) => a.localeCompare(b, 'ko'));
}

function currentSessions() {
  if (!state.data) return [];
  if (state.role === 'teacher') {
    return sortSessions(state.data.sessions.filter((s) => (s.teachers || []).includes(state.name)));
  }
  return sortSessions(state.data.sessions.filter((s) => (s.students || []).includes(state.name)));
}

function teamsForCurrentUser() {
  return [...new Set(currentSessions().map((s) => s.team))];
}

function resolveStudent(query) {
  const q = normalizeName(query);
  if (!q) return '';
  const students = allStudents();
  const exact = students.find((name) => name === q);
  if (exact) return exact;
  const matches = students.filter((name) => name.includes(q));
  return matches.length === 1 ? matches[0] : '';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function sessionCard(s) {
  return `
    <article class="session">
      <div class="session-top">
        <div>
          <div class="date">${escapeHtml(s.dateText)} <span class="group">${escapeHtml(s.group)}</span></div>
        </div>
        <span class="team ${s.team}">${escapeHtml(TEAM_LABELS[s.team])}</span>
      </div>
      <div class="meta">
        <div><span>학생</span><strong>${escapeHtml(s.students.join(' · '))}</strong></div>
        <div><span>지도교사</span><strong>${escapeHtml(s.teacher)}</strong></div>
      </div>
      <div class="prompt">
        <strong>${escapeHtml(firstLine(s.prompt))}</strong>
        <small>${escapeHtml(secondLine(s.prompt))}</small>
        <div class="prompt-actions">
          <button class="btn primary" data-download-prompt="${escapeHtml(s.id)}">제시문 PDF 다운로드</button>
        </div>
      </div>
    </article>
  `;
}

function resourceCard(team) {
  const label = TEAM_LABELS[team];
  return `
    <div class="resource-card">
      <strong>${escapeHtml(label)}</strong>
      <p>일정에 사용하는 제시문 ZIP과 미사용 제시문 ZIP입니다.</p>
      <div class="resource-actions">
        <button class="btn" data-download-zip="used:${team}">사용 지문 ZIP</button>
        <button class="btn" data-download-zip="unused:${team}">미사용 지문 ZIP</button>
      </div>
    </div>
  `;
}
