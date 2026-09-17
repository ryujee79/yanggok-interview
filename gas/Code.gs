const APP_VERSION = '2026-09-17-appdeploy-v42-migration-v3';
const DEFAULT_ALLOWED_ORIGIN = 'https://ryujee79.github.io';
const INITIAL_STUDENT_PASSWORD = '1234';
const TOKEN_TTL_SECONDS = 21600;
const ROOM_CHOICES = ['미정','면접지도실','과학실1','과학실2','특별실1','특별실3','라온실','데이터분석실','해양학습실'];
const SHEETS = {
  sessions: ['id','team','group','dateText','period','slotIndex','teacher','teachers','students','prompt','pdfFile','classPeriod','location','updatedAt'],
  users: ['name','passwordHash','updatedAt'],
  bookings: ['id','dateKey','period','room','teacher','student','createdAt'],
  roomUses: ['id','room','weekday','dateKey','period','label','createdBy','updatedAt'],
  history: ['id','actor','action','detail','createdAt'],
  materials: ['id','sessionId','team','kind','fileName','fileId','mimeType','student','canonical','uploader','createdAt']
};

function setupSystem() {
  const props = PropertiesService.getScriptProperties();
  let spreadsheetId = props.getProperty('DATA_SPREADSHEET_ID');
  if (!spreadsheetId) {
    const ss = SpreadsheetApp.create('양곡고_2027_제시문면접_웹앱_데이터');
    spreadsheetId = ss.getId();
    props.setProperty('DATA_SPREADSHEET_ID', spreadsheetId);
  }
  let folderId = props.getProperty('DATA_FOLDER_ID');
  if (!folderId) {
    const folder = DriveApp.createFolder('양곡고_2027_제시문면접_웹앱_자료');
    folderId = folder.getId();
    props.setProperty('DATA_FOLDER_ID', folderId);
  }
  if (!props.getProperty('ALLOWED_ORIGIN')) props.setProperty('ALLOWED_ORIGIN', DEFAULT_ALLOWED_ORIGIN);
  ensureAllSheets_();
  seedRoomUses_();
  return { spreadsheetId, folderId, version: APP_VERSION };
}

function setTeacherCredentials(jsonText) {
  const parsed = JSON.parse(jsonText);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('교사 비밀번호 JSON 형식을 확인해 주세요.');
  const cleaned = {};
  Object.keys(parsed).forEach(name => {
    const password = String(parsed[name] == null ? '' : parsed[name]).trim();
    if (!name.trim() || !/^\d{4}$/.test(password)) throw new Error(name + ' 교사의 비밀번호는 4자리 숫자여야 합니다.');
    cleaned[name.trim()] = hash_(password);
  });
  PropertiesService.getScriptProperties().setProperty('TEACHER_CREDENTIAL_HASHES_JSON', JSON.stringify(cleaned));
  return { count: Object.keys(cleaned).length };
}

function systemStatus() {
  const props = PropertiesService.getScriptProperties();
  return {
    version: APP_VERSION,
    spreadsheetReady: !!props.getProperty('DATA_SPREADSHEET_ID'),
    folderReady: !!props.getProperty('DATA_FOLDER_ID'),
    teacherCredentialsReady: !!props.getProperty('TEACHER_CREDENTIAL_HASHES_JSON'),
    allowedOrigin: props.getProperty('ALLOWED_ORIGIN') || DEFAULT_ALLOWED_ORIGIN
  };
}

function doGet(e) {
  const callback = String(e && e.parameter && e.parameter.callback || '');
  const raw = String(e && e.parameter && e.parameter.payload || '');
  if (callback && raw) {
    if (!/^[A-Za-z_$][A-Za-z0-9_$]{0,80}$/.test(callback)) return ContentService.createTextOutput('/* invalid callback */').setMimeType(ContentService.MimeType.JAVASCRIPT);
    let requestId = '';
    try {
      const payload = JSON.parse(raw);
      requestId = String(payload.requestId || '');
      validateOrigin_(String(payload.origin || DEFAULT_ALLOWED_ORIGIN));
      const data = dispatch_(payload);
      return jsonpResponse_(callback, { requestId, ok:true, data });
    } catch (err) {
      return jsonpResponse_(callback, { requestId, ok:false, error:err && err.message ? err.message : String(err) });
    }
  }
  return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><title>양곡고 면접 API</title><body style="font-family:sans-serif;padding:24px"><h2>양곡고 2027 제시문 면접 API</h2><p>GitHub Pages 웹앱에서 사용하는 백엔드입니다.</p><p>버전: ' + APP_VERSION + '</p></body>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function jsonpResponse_(callback, result) {
  const json = JSON.stringify(result).replace(/</g, '\\u003c');
  return ContentService.createTextOutput(callback + '(' + json + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function doPost(e) {
  let requestId = '';
  let origin = DEFAULT_ALLOWED_ORIGIN;
  try {
    const payload = JSON.parse((e && e.parameter && e.parameter.payload) || '{}');
    requestId = String(payload.requestId || '');
    origin = String(payload.origin || DEFAULT_ALLOWED_ORIGIN);
    validateOrigin_(origin);
    const data = dispatch_(payload);
    return iframeResponse_(origin, { requestId, ok: true, data });
  } catch (err) {
    return iframeResponse_(origin, { requestId, ok: false, error: err && err.message ? err.message : String(err) });
  }
}

function dispatch_(payload) {
  const action = String(payload.action || '');
  switch (action) {
    case 'health': return systemStatus();
    case 'login': return login_(payload);
    case 'changeStudentPassword': return changeStudentPassword_(payload);
    case 'getState': return getState_(payload);
    case 'uploadSchedule': return uploadSchedule_(payload);
    case 'changeSession': return changeSession_(payload);
    case 'createManualBooking': return createManualBooking_(payload);
    case 'cancelManualBooking': return cancelManualBooking_(payload);
    case 'addRoomUse': return addRoomUse_(payload);
    case 'deleteRoomUse': return deleteRoomUse_(payload);
    case 'swapSessions': return swapSessions_(payload);
    case 'uploadRecording': return uploadRecording_(payload);
    case 'deleteRecording': return deleteRecording_(payload);
    case 'uploadReference': return uploadReference_(payload);
    case 'deleteReference': return deleteReference_(payload);
    case 'uploadMaterialZip': return uploadMaterialZip_(payload);
    case 'downloadMaterial': return downloadMaterial_(payload);
    default: throw new Error('알 수 없는 요청입니다: ' + action);
  }
}
function login_(payload) {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('DATA_SPREADSHEET_ID') || !props.getProperty('DATA_FOLDER_ID')) setupSystem();
  const role = String(payload.role || '');
  const name = String(payload.name || '').trim();
  const password = String(payload.password || '');
  if (!name || !password || !['teacher','student'].includes(role)) throw new Error('이름과 비밀번호를 확인해 주세요.');
  if (role === 'teacher') {
    const hashes = getTeacherCredentialHashes_();
    if (!hashes[name] || hashes[name] !== hash_(password)) throw new Error('교사 이름 또는 비밀번호가 맞지 않습니다.');
    return issueToken_(role, name, false);
  }
  const user = getUser_(name);
  if (!user) {
    const manual = readObjects_('bookings').some(b => String(b.student || '').trim() === name);
    if (!manual) throw new Error('등록된 학생 이름을 찾지 못했습니다. 일정 엑셀을 먼저 업로드해 주세요.');
  }
  const mustChange = !user || !user.passwordHash;
  if (mustChange) {
    if (password !== INITIAL_STUDENT_PASSWORD) throw new Error('학생 이름 또는 비밀번호가 맞지 않습니다.');
    if (!user) {
      const users = readObjects_('users');
      users.push({ name, passwordHash:'', updatedAt:new Date().toISOString() });
      writeObjects_('users', users);
    }
  } else if (user.passwordHash !== hash_(password)) {
    throw new Error('학생 이름 또는 비밀번호가 맞지 않습니다.');
  }
  return issueToken_(role, name, mustChange);
}

function issueToken_(role, name, mustChange) {
  const token = Utilities.getUuid() + '-' + Utilities.getUuid();
  CacheService.getScriptCache().put('auth:' + token, JSON.stringify({ role, name, mustChange: !!mustChange }), TOKEN_TTL_SECONDS);
  return { token, role, name, mustChange: !!mustChange, version: APP_VERSION };
}

function requireAuth_(payload, requiredRole) {
  const token = String(payload.token || '');
  const raw = token ? CacheService.getScriptCache().get('auth:' + token) : null;
  if (!raw) throw new Error('로그인이 만료되었습니다. 다시 로그인해 주세요.');
  const auth = JSON.parse(raw);
  if (requiredRole && auth.role !== requiredRole) throw new Error('권한이 없습니다.');
  CacheService.getScriptCache().put('auth:' + token, JSON.stringify(auth), TOKEN_TTL_SECONDS);
  return auth;
}

function changeStudentPassword_(payload) {
  const auth = requireAuth_(payload, 'student');
  const password = String(payload.newPassword || '');
  if (password.length < 4 || password === INITIAL_STUDENT_PASSWORD) throw new Error('새 비밀번호는 4자 이상이며 초기 비밀번호와 달라야 합니다.');
  const users = readObjects_('users');
  const idx = users.findIndex(x => x.name === auth.name);
  if (idx < 0) throw new Error('학생 정보를 찾지 못했습니다.');
  users[idx].passwordHash = hash_(password);
  users[idx].updatedAt = new Date().toISOString();
  writeObjects_('users', users);
  CacheService.getScriptCache().put('auth:' + String(payload.token), JSON.stringify({ role: 'student', name: auth.name, mustChange: false }), TOKEN_TTL_SECONDS);
  addHistory_(auth.name, '학생 비밀번호 변경', '초기 비밀번호를 개인 비밀번호로 변경했습니다.');
  return { changed: true };
}

function getState_(payload) {
  const auth = requireAuth_(payload);
  const sessionsAll = readObjects_('sessions').map(decodeSession_);
  const bookings = readObjects_('bookings').map(normalizeNumbers_);
  const roomUses = readObjects_('roomUses').map(normalizeNumbers_);
  const materials = readObjects_('materials');
  const history = readObjects_('history').slice(-200).reverse();
  if (auth.role === 'student') {
    const sessions = sessionsAll.filter(s => s.students.includes(auth.name));
    const ownBookings = bookings.filter(b => b.student === auth.name);
    const sessionIds = new Set(sessions.map(s => s.id));
    const teams = new Set(sessions.map(s => s.team));
    const visibleMaterials = materials.filter(m =>
      (m.kind === 'recording' && m.student === auth.name && sessionIds.has(m.sessionId)) ||
      (['prompt','solution'].includes(m.kind) && teams.has(m.team))
    );
    return { auth, sessions, manualBookings: ownBookings, roomUses: [], history: [], materials: visibleMaterials, roomChoices: ROOM_CHOICES, version: APP_VERSION };
  }
  return { auth, sessions: sessionsAll, manualBookings: bookings, roomUses, history, materials, roomChoices: ROOM_CHOICES, version: APP_VERSION };
}
function uploadSchedule_(payload) {
  const auth = requireAuth_(payload, 'teacher');
  const incoming = Array.isArray(payload.sessions) ? payload.sessions : [];
  if (!incoming.length || incoming.length > 300) throw new Error('일정 자료를 확인해 주세요.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const oldSessions = readObjects_('sessions').map(decodeSession_);
    const oldById = {};
    const oldByKey = {};
    const oldByLoose = {};
    oldSessions.forEach(s => {
      oldById[s.id] = s;
      oldByKey[sessionIdentityKey_(s)] = s;
      const loose = sessionLooseIdentityKey_(s);
      if (!oldByLoose[loose]) oldByLoose[loose] = [];
      oldByLoose[loose].push(s);
    });
    const now = new Date().toISOString();
    const normalized = incoming.map((s, index) => {
      const teachers = splitTeachers_(s.teacher || (Array.isArray(s.teachers) ? s.teachers.join('·') : ''));
      const students = Array.isArray(s.students) ? s.students.map(String).map(x => x.trim()).filter(Boolean) : [];
      const base = {
        id: String(s.id || '').trim(), team: String(s.team || ''), group: String(s.group || ''), dateText: String(s.dateText || ''),
        period: String(s.period || '전체'), slotIndex: Number(s.slotIndex == null ? index : s.slotIndex), teacher: teachers.join('·'), teachers, students,
        prompt: String(s.prompt || ''), pdfFile: String(s.pdfFile || ''), classPeriod:'', location:'미정', updatedAt:now
      };
      const exact = oldById[base.id] || oldByKey[sessionIdentityKey_(base)];
      const looseMatches = oldByLoose[sessionLooseIdentityKey_(base)] || [];
      const old = exact || (looseMatches.length === 1 ? looseMatches[0] : null);
      if (old) {
        base.classPeriod = old.classPeriod || '';
        base.location = old.location && old.location !== '미정' ? old.location : '미정';
      }
      return base;
    });
    if (normalized.some(s => !s.id || !['natural','humanities'].includes(s.team) || !s.group || !s.dateText || !s.teacher || !s.students.length || !s.prompt)) throw new Error('일정에 필수 값이 빠져 있습니다.');
    const keys = normalized.map(sessionIdentityKey_);
    if (new Set(keys).size !== keys.length) throw new Error('같은 팀·날짜·조·학생 일정이 중복되어 있습니다.');
    const bookings = readObjects_('bookings').map(normalizeNumbers_);
    const roomUses = readObjects_('roomUses').map(normalizeNumbers_);
    normalized.forEach(s => {
      if (!s.classPeriod) return;
      const conflict = sessionConflict_(s, normalized.filter(x => x.id !== s.id), bookings, roomUses);
      if (conflict) { s.classPeriod = ''; s.location = '미정'; }
    });
    writeObjects_('sessions', normalized.map(encodeSession_));
    syncStudents_(normalized);
    addHistory_(auth.name, '일정 엑셀 반영', '면접 일정 ' + normalized.length + '건을 반영했습니다.');
    return { count: normalized.length, sessions: normalized };
  } finally {
    lock.releaseLock();
  }
}

function changeSession_(payload) {
  const auth = requireAuth_(payload, 'teacher');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sessions = readObjects_('sessions').map(decodeSession_);
    const idx = sessions.findIndex(s => s.id === String(payload.id || ''));
    if (idx < 0) throw new Error('일정을 찾지 못했습니다.');
    const current = sessions[idx];
    const hasClassPeriod = Object.prototype.hasOwnProperty.call(payload, 'classPeriod');
    const hasLocation = Object.prototype.hasOwnProperty.call(payload, 'location');
    const nextPeriod = hasClassPeriod
      ? (payload.classPeriod === '' || payload.classPeriod == null ? '' : Number(payload.classPeriod))
      : current.classPeriod;
    const nextLocation = hasLocation ? String(payload.location == null ? '미정' : payload.location) : current.location;
    if (nextPeriod !== '' && (!Number.isInteger(nextPeriod) || nextPeriod < 1 || nextPeriod > 8)) throw new Error('교시는 1~8교시 중에서 선택해 주세요.');
    if (nextPeriod !== '' && current.period === '오전' && nextPeriod > 4) throw new Error('오전 일정은 1~4교시에서 선택해 주세요.');
    if (nextPeriod !== '' && current.period === '오후' && nextPeriod < 5) throw new Error('오후 일정은 5~8교시에서 선택해 주세요.');
    if (!ROOM_CHOICES.includes(nextLocation)) throw new Error('장소를 확인해 주세요.');
    const candidate = Object.assign({}, current, { classPeriod: nextPeriod, location: nextPeriod === '' ? '미정' : nextLocation, updatedAt:new Date().toISOString() });
    const bookings = readObjects_('bookings').map(normalizeNumbers_);
    const roomUses = readObjects_('roomUses').map(normalizeNumbers_);
    const conflict = sessionConflict_(candidate, sessions.filter((_, i) => i !== idx), bookings, roomUses);
    if (conflict) throw new Error(conflict);
    sessions[idx] = candidate;
    writeObjects_('sessions', sessions.map(encodeSession_));
    addHistory_(auth.name, '면접 일정 변경', candidate.dateText + ' ' + candidate.group + ' · ' + (candidate.classPeriod || '교시 미정') + ' · ' + candidate.location);
    return { session: candidate };
  } finally {
    lock.releaseLock();
  }
}

function createManualBooking_(payload) {
  const auth = requireAuth_(payload, 'teacher');
  const dateKey = normalizeDateKey_(payload.dateKey);
  const period = Number(payload.period);
  const room = String(payload.room || '');
  const student = String(payload.student || '').trim();
  if (!/^2026-\d{2}-\d{2}$/.test(dateKey) || !Number.isInteger(period) || period < 1 || period > 8 || !ROOM_CHOICES.includes(room) || room === '미정' || !student) throw new Error('예약 정보를 확인해 주세요.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const roomUse = readObjects_('roomUses').map(normalizeNumbers_).find(x => roomUseMatches_(x, dateKey, period, room));
    if (roomUse) throw new Error(room + '은 ' + period + '교시에 ' + roomUse.label + '이 있어 선택할 수 없습니다.');
    const sessions = readObjects_('sessions').map(decodeSession_);
    const sessionConflict = sessions.find(s => dateKeyForDateText_(s.dateText) === dateKey && Number(s.classPeriod) === period && ((s.teachers || splitTeachers_(s.teacher)).includes(auth.name) || s.students.includes(student) || (s.location !== '미정' && s.location === room)));
    if (sessionConflict) throw new Error('해당 교시에는 기존 제시문 면접 일정과 겹치는 교사·학생·장소가 있습니다.');
    const bookings = readObjects_('bookings').map(normalizeNumbers_);
    const exact = bookings.find(b => b.dateKey === dateKey && Number(b.period) === period && b.teacher === auth.name && b.student === student && b.room === room);
    if (exact) return { bookings, booking:exact, duplicate:true };
    const bookingConflict = bookings.find(b => b.dateKey === dateKey && Number(b.period) === period && (b.teacher === auth.name || b.student === student || b.room === room));
    if (bookingConflict) throw new Error('해당 교시에는 이미 직접 예약된 교사·학생·장소가 있습니다.');
    const booking = { id: 'manual-' + new Date().getTime() + '-' + Math.random().toString(36).slice(2,8), dateKey, period, room, teacher: auth.name, student, createdAt: new Date().toISOString() };
    bookings.push(booking);
    writeObjects_('bookings', bookings);
    syncManualStudent_(student);
    addHistory_(auth.name, '면접실 직접 예약', dateKey + ' ' + period + '교시 ' + room + ' · ' + student);
    return { bookings, booking };
  } finally {
    lock.releaseLock();
  }
}

function cancelManualBooking_(payload) {
  const auth = requireAuth_(payload, 'teacher');
  const id = String(payload.id || '');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const bookings = readObjects_('bookings').map(normalizeNumbers_);
    const current = bookings.find(x => x.id === id);
    if (!current) throw new Error('예약을 찾지 못했습니다.');
    const next = bookings.filter(x => x.id !== id);
    writeObjects_('bookings', next);
    addHistory_(auth.name, '면접실 직접 예약 취소', current.dateKey + ' ' + current.period + '교시 ' + current.room + ' · ' + current.student);
    return { bookings: next, cancelled: true };
  } finally {
    lock.releaseLock();
  }
}
function addRoomUse_(payload) {
  const auth = requireAuth_(payload, 'teacher');
  const room = String(payload.room || '');
  const period = Number(payload.period);
  const label = String(payload.label || '').trim();
  const dateKey = String(payload.dateKey || '').trim();
  const weekday = payload.weekday ? Number(payload.weekday) : '';
  if (!ROOM_CHOICES.includes(room) || room === '미정' || !Number.isInteger(period) || period < 1 || period > 8 || !label || (!dateKey && !weekday)) throw new Error('특별실 사용 정보를 확인해 주세요.');
  if (dateKey && !/^2026-\d{2}-\d{2}$/.test(dateKey)) throw new Error('날짜를 확인해 주세요.');
  if (!dateKey && (!Number.isInteger(weekday) || weekday < 1 || weekday > 5)) throw new Error('요일을 확인해 주세요.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const uses = readObjects_('roomUses').map(normalizeNumbers_);
    const duplicate = uses.find(u => u.room === room && Number(u.period) === period && String(u.dateKey || '') === dateKey && Number(u.weekday || 0) === Number(weekday || 0));
    if (duplicate) throw new Error('같은 실·교시에 이미 특별실 사용시간이 등록되어 있습니다.');
    const item = { id: 'room-' + Utilities.getUuid(), room, weekday: weekday || '', dateKey, period, label, createdBy: auth.name, updatedAt: new Date().toISOString() };
    uses.push(item);
    writeObjects_('roomUses', uses);
    const sessions = readObjects_('sessions').map(decodeSession_);
    let changed = 0;
    sessions.forEach(s => {
      if (s.classPeriod && s.location === room && roomUseMatches_(item, dateKeyForDateText_(s.dateText), Number(s.classPeriod), room)) {
        s.location = '미정'; s.updatedAt = new Date().toISOString(); changed += 1;
      }
    });
    if (changed) writeObjects_('sessions', sessions.map(encodeSession_));
    const bookings = readObjects_('bookings').map(normalizeNumbers_);
    const kept = bookings.filter(b => !roomUseMatches_(item, b.dateKey, Number(b.period), b.room));
    if (kept.length !== bookings.length) writeObjects_('bookings', kept);
    addHistory_(auth.name, '특별실 사용시간 추가', (dateKey || ('요일 ' + weekday)) + ' ' + period + '교시 ' + room + ' · ' + label + (changed || bookings.length !== kept.length ? ' · 충돌 자동정리' : ''));
    return { item, sessionConflictsCleared: changed, bookingsCancelled: bookings.length - kept.length };
  } finally {
    lock.releaseLock();
  }
}

function deleteRoomUse_(payload) {
  const auth = requireAuth_(payload, 'teacher');
  const id = String(payload.id || '');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const uses = readObjects_('roomUses').map(normalizeNumbers_);
    const current = uses.find(x => x.id === id);
    if (!current) throw new Error('사용시간을 찾지 못했습니다.');
    writeObjects_('roomUses', uses.filter(x => x.id !== id));
    addHistory_(auth.name, '특별실 사용시간 삭제', current.room + ' ' + current.period + '교시 · ' + current.label);
    return { deleted: true };
  } finally {
    lock.releaseLock();
  }
}

function swapSessions_(payload) {
  const auth = requireAuth_(payload, 'teacher');
  const mode = String(payload.mode || '');
  if (!['time_and_prompt','time_only'].includes(mode)) throw new Error('교환 방법을 확인해 주세요.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sessions = readObjects_('sessions').map(decodeSession_);
    const a = sessions.find(s => s.id === String(payload.aId || ''));
    const b = sessions.find(s => s.id === String(payload.bId || ''));
    if (!a || !b || a.id === b.id || a.team !== b.team) throw new Error('교환할 일정을 확인해 주세요.');
    if (mode === 'time_and_prompt') {
      const teacher = a.teacher, teachers = a.teachers;
      a.teacher = b.teacher; a.teachers = b.teachers;
      b.teacher = teacher; b.teachers = teachers;
    } else {
      const aa = { teacher: a.teacher, teachers: a.teachers, prompt: a.prompt, pdfFile: a.pdfFile };
      a.teacher = b.teacher; a.teachers = b.teachers; a.prompt = b.prompt; a.pdfFile = b.pdfFile;
      b.teacher = aa.teacher; b.teachers = aa.teachers; b.prompt = aa.prompt; b.pdfFile = aa.pdfFile;
    }
    a.updatedAt = b.updatedAt = new Date().toISOString();
    const bookings = readObjects_('bookings').map(normalizeNumbers_);
    const roomUses = readObjects_('roomUses').map(normalizeNumbers_);
    const conflictA = sessionConflict_(a, sessions.filter(s => s.id !== a.id), bookings, roomUses);
    const conflictB = sessionConflict_(b, sessions.filter(s => s.id !== b.id), bookings, roomUses);
    if (conflictA || conflictB) throw new Error(conflictA || conflictB);
    writeObjects_('sessions', sessions.map(encodeSession_));
    addHistory_(auth.name, '교사 일정 교환', a.teacher + ' ↔ ' + b.teacher + ' · ' + (mode === 'time_only' ? '시간만 교환' : '시간·지문 함께 교환'));
    return { sessions: [a,b] };
  } finally {
    lock.releaseLock();
  }
}
function uploadRecording_(payload) {
  const auth = requireAuth_(payload, 'student');
  const sessionId = String(payload.sessionId || '');
  const sessions = readObjects_('sessions').map(decodeSession_);
  const session = sessions.find(s => s.id === sessionId && s.students.includes(auth.name));
  if (!session) throw new Error('학생 본인의 일정만 녹음을 저장할 수 있습니다.');
  const mimeType = String(payload.mimeType || 'audio/webm');
  if (!/^audio\//i.test(mimeType)) throw new Error('오디오 파일만 저장할 수 있습니다.');
  const rawBase64 = String(payload.base64 || '');
  if (!rawBase64 || rawBase64.length > 20 * 1024 * 1024) throw new Error('녹음 파일이 너무 큽니다. 15MB 이하로 저장해 주세요.');
  const fileName = safeFileName_((payload.fileName || (auth.name + '_' + sessionId + '.webm')));
  const folder = ensureSubfolder_(getRootFolder_(), 'recordings');
  const file = saveBase64File_(folder, fileName, mimeType, rawBase64);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const materials = readObjects_('materials');
    const old = materials.filter(m => m.kind === 'recording' && m.sessionId === sessionId && m.student === auth.name);
    old.forEach(m => trashFile_(m.fileId));
    const kept = materials.filter(m => !(m.kind === 'recording' && m.sessionId === sessionId && m.student === auth.name));
    const row = materialRow_({ sessionId, team: session.team, kind: 'recording', fileName: file.getName(), fileId: file.getId(), mimeType, student: auth.name, canonical: '', uploader: auth.name });
    kept.push(row);
    writeObjects_('materials', kept);
    addHistory_(auth.name, '면접 답변 녹음 저장', session.dateText + ' ' + session.group + ' · ' + firstLine_(session.prompt));
    return { material: row };
  } finally {
    lock.releaseLock();
  }
}

function deleteRecording_(payload) {
  const auth = requireAuth_(payload);
  const id = String(payload.id || '');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const materials = readObjects_('materials');
    const current = materials.find(m => m.id === id && m.kind === 'recording');
    if (!current) throw new Error('녹음 파일을 찾지 못했습니다.');
    if (auth.role === 'student' && current.student !== auth.name) throw new Error('본인의 녹음만 삭제할 수 있습니다.');
    trashFile_(current.fileId);
    writeObjects_('materials', materials.filter(m => m.id !== id));
    addHistory_(auth.name, '면접 답변 녹음 삭제', current.fileName);
    return { deleted: true };
  } finally {
    lock.releaseLock();
  }
}

function uploadReference_(payload) {
  const auth = requireAuth_(payload, 'teacher');
  const sessionId = String(payload.sessionId || '');
  const session = readObjects_('sessions').map(decodeSession_).find(s => s.id === sessionId);
  if (!session) throw new Error('일정을 찾지 못했습니다.');
  const rawBase64 = String(payload.base64 || '');
  if (!rawBase64 || rawBase64.length > 28 * 1024 * 1024) throw new Error('참고자료는 20MB 이하로 올려 주세요.');
  const fileName = safeFileName_(String(payload.fileName || '참고자료'));
  const mimeType = String(payload.mimeType || 'application/octet-stream');
  const folder = ensureSubfolder_(getRootFolder_(), 'references');
  const file = saveBase64File_(folder, fileName, mimeType, rawBase64);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const materials = readObjects_('materials');
    const row = materialRow_({ sessionId, team: session.team, kind: 'reference', fileName: file.getName(), fileId: file.getId(), mimeType, student: '', canonical: '', uploader: auth.name });
    materials.push(row);
    writeObjects_('materials', materials);
    addHistory_(auth.name, '참고자료 업로드', session.dateText + ' ' + session.group + ' · ' + file.getName());
    return { material: row };
  } finally {
    lock.releaseLock();
  }
}

function deleteReference_(payload) {
  const auth = requireAuth_(payload, 'teacher');
  const id = String(payload.id || '');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const materials = readObjects_('materials');
    const current = materials.find(m => m.id === id && m.kind === 'reference');
    if (!current) throw new Error('참고자료를 찾지 못했습니다.');
    trashFile_(current.fileId);
    writeObjects_('materials', materials.filter(m => m.id !== id));
    addHistory_(auth.name, '참고자료 삭제', current.fileName);
    return { deleted: true };
  } finally {
    lock.releaseLock();
  }
}

function uploadMaterialZip_(payload) {
  const auth = requireAuth_(payload, 'teacher');
  const team = String(payload.team || '');
  const kind = String(payload.kind || '');
  if (!['natural','humanities'].includes(team) || !['promptZip','solutionZip','unusedZip'].includes(kind)) throw new Error('자료 종류와 팀을 확인해 주세요.');
  const fileName = safeFileName_(String(payload.fileName || '자료.zip'));
  const base64 = String(payload.base64 || '');
  if (!base64 || base64.length > 42 * 1024 * 1024) throw new Error('ZIP 파일은 30MB 이하로 올려 주세요.');
  const raw = Utilities.base64Decode(base64);
  if (!raw.length) throw new Error('ZIP 파일이 비어 있습니다.');
  const zipBlob = Utilities.newBlob(raw, 'application/zip', fileName);
  const root = getRootFolder_();
  const zipFolder = ensureSubfolder_(root, 'zips-' + team);
  const zipFile = zipFolder.createFile(zipBlob);
  const extracted = [];
  let pdfCount = 0;
  if (kind !== 'unusedZip') {
    const pdfKind = kind === 'promptZip' ? 'prompt' : 'solution';
    const pdfFolder = ensureSubfolder_(root, pdfKind + '-' + team);
    const blobs = Utilities.unzip(zipBlob);
    blobs.forEach(blob => {
      const name = safeFileName_(blob.getName().split('/').pop());
      if (!name || !/\.pdf$/i.test(name)) return;
      const isSolution = /해설[\s_-]*포함/i.test(name);
      if (kind === 'solutionZip' && !isSolution) return;
      if (kind === 'promptZip' && isSolution) return;
      blob.setName(name);
      const file = pdfFolder.createFile(blob);
      extracted.push(materialRow_({ sessionId:'', team, kind:pdfKind, fileName:file.getName(), fileId:file.getId(), mimeType:'application/pdf', student:'', canonical:canonical_(file.getName()), uploader:auth.name }));
      pdfCount += 1;
    });
    if (!pdfCount) throw new Error(kind === 'solutionZip' ? 'ZIP 안에 해설포함 PDF가 없습니다.' : 'ZIP 안에 제시문 PDF가 없습니다.');
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const materials = readObjects_('materials');
    const clearKinds = kind === 'promptZip' ? ['prompt','usedZip'] : kind === 'solutionZip' ? ['solution','solutionZip'] : ['unusedZip'];
    const kept = [];
    materials.forEach(m => { if (m.team === team && clearKinds.includes(m.kind)) trashFile_(m.fileId); else kept.push(m); });
    const zipKind = kind === 'promptZip' ? 'usedZip' : kind;
    kept.push(materialRow_({ sessionId:'', team, kind:zipKind, fileName:zipFile.getName(), fileId:zipFile.getId(), mimeType:'application/zip', student:'', canonical:'', uploader:auth.name }));
    extracted.forEach(row => kept.push(row));
    writeObjects_('materials', kept);
    addHistory_(auth.name, '면접 자료 ZIP 업로드', team + ' · ' + kind + ' · ' + fileName + (pdfCount ? ' · PDF ' + pdfCount + '개' : ''));
    return { team, kind, pdfCount, fileName };
  } finally {
    lock.releaseLock();
  }
}

function downloadMaterial_(payload) {
  const auth = requireAuth_(payload);
  const id = String(payload.id || '');
  const materials = readObjects_('materials');
  const current = materials.find(m => m.id === id);
  if (!current) throw new Error('파일을 찾지 못했습니다.');
  if (auth.role === 'student') {
    const sessions = readObjects_('sessions').map(decodeSession_).filter(s => s.students.includes(auth.name));
    const sessionIds = new Set(sessions.map(s => s.id));
    const teams = new Set(sessions.map(s => s.team));
    const allowed = (current.kind === 'recording' && current.student === auth.name && sessionIds.has(current.sessionId)) ||
      (['prompt','solution'].includes(current.kind) && teams.has(current.team));
    if (!allowed) throw new Error('이 자료를 내려받을 권한이 없습니다.');
  }
  const file = DriveApp.getFileById(current.fileId);
  const blob = file.getBlob();
  return { id: current.id, fileName: current.fileName, mimeType: current.mimeType || blob.getContentType(), base64: Utilities.base64Encode(blob.getBytes()) };
}
function sessionConflict_(candidate, otherSessions, bookings, roomUses) {
  if (!candidate.classPeriod) return '';
  const dateKey = dateKeyForDateText_(candidate.dateText);
  const uses = roomUses || readObjects_('roomUses').map(normalizeNumbers_);
  const candidateTeachers = candidate.teachers && candidate.teachers.length ? candidate.teachers : splitTeachers_(candidate.teacher);
  if (candidate.location !== '미정') {
    const use = uses.find(x => roomUseMatches_(x, dateKey, Number(candidate.classPeriod), candidate.location));
    if (use) return candidate.location + '은 ' + candidate.classPeriod + '교시에 ' + use.label + '이 있어 선택할 수 없습니다.';
  }
  const other = otherSessions.find(s => s.dateText === candidate.dateText && Number(s.classPeriod) === Number(candidate.classPeriod) && (
    overlap_((s.teachers && s.teachers.length ? s.teachers : splitTeachers_(s.teacher)), candidateTeachers) || overlap_(s.students || [], candidate.students || []) ||
    (candidate.location !== '미정' && s.location === candidate.location)
  ));
  if (other) return candidate.dateText + ' ' + candidate.classPeriod + '교시에 교사·학생·장소 일정이 겹칩니다.';
  const booking = bookings.find(b => b.dateKey === dateKey && Number(b.period) === Number(candidate.classPeriod) && (
    candidateTeachers.includes(b.teacher) || (candidate.students || []).includes(b.student) ||
    (candidate.location !== '미정' && candidate.location === b.room)
  ));
  if (booking) return candidate.dateText + ' ' + candidate.classPeriod + '교시에 직접 예약된 면접과 겹칩니다.';
  return '';
}

function sessionIdentityKey_(s) {
  return [String(s.team || ''), String(s.dateText || ''), String(s.period || '전체'), String(s.group || ''), (s.students || []).map(String).map(x=>x.trim()).sort().join('|')].join('::');
}

function sessionLooseIdentityKey_(s) {
  return [String(s.team || ''), String(s.dateText || ''), String(s.group || ''), (s.students || []).map(String).map(x=>x.trim()).sort().join('|')].join('::');
}

function syncStudents_(sessions) {
  const current = readObjects_('users');
  const map = {};
  current.forEach(u => map[u.name] = u);
  const manualNames = readObjects_('bookings').map(b => String(b.student || '').trim()).filter(Boolean);
  const names = Array.from(new Set(sessions.reduce((acc, s) => acc.concat(s.students || []), []).concat(manualNames))).filter(Boolean).sort();
  const now = new Date().toISOString();
  const next = names.map(name => map[name] || { name, passwordHash:'', updatedAt:now });
  writeObjects_('users', next);
}

function syncManualStudent_(name) {
  const student = String(name || '').trim();
  if (!student) return;
  const users = readObjects_('users');
  if (users.some(u => u.name === student)) return;
  users.push({ name:student, passwordHash:'', updatedAt:new Date().toISOString() });
  writeObjects_('users', users);
}

function getUser_(name) {
  return readObjects_('users').find(u => u.name === name) || null;
}

function getTeacherCredentialHashes_() {
  const raw = PropertiesService.getScriptProperties().getProperty('TEACHER_CREDENTIAL_HASHES_JSON');
  if (!raw) throw new Error('교사 비밀번호가 아직 설정되지 않았습니다. Apps Script에서 초기 설정을 먼저 실행해 주세요.');
  return JSON.parse(raw);
}

function validateOrigin_(origin) {
  const allowed = PropertiesService.getScriptProperties().getProperty('ALLOWED_ORIGIN') || DEFAULT_ALLOWED_ORIGIN;
  if (origin !== allowed && origin !== allowed + '/') throw new Error('허용되지 않은 웹앱 주소입니다.');
}

function iframeResponse_(origin, result) {
  const json = JSON.stringify(result).replace(/</g, '\\u003c');
  const target = JSON.stringify(origin || DEFAULT_ALLOWED_ORIGIN);
  const html = '<!doctype html><html><head><meta charset="utf-8"></head><body><script>' +
    '(function(){var msg=' + json + ';var target=' + target + ';' +
    'try{window.top.postMessage(msg,target);}catch(e){}' +
    'try{if(window.parent!==window.top){window.parent.postMessage(msg,target);}}catch(e){}' +
    '})();' +
    '</script></body></html>';
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function ensureAllSheets_() {
  const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('DATA_SPREADSHEET_ID'));
  Object.keys(SHEETS).forEach(key => {
    const name = sheetName_(key);
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    const headers = SHEETS[key];
    if (sheet.getLastRow() === 0) sheet.getRange(1,1,1,headers.length).setValues([headers]);
    else sheet.getRange(1,1,1,headers.length).setValues([headers]);
  });
}

function sheetName_(key) {
  return ({sessions:'Sessions',users:'Users',bookings:'ManualBookings',roomUses:'RoomUses',history:'History',materials:'Materials'})[key];
}

function getSheet_(key) {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('DATA_SPREADSHEET_ID');
  if (!spreadsheetId) throw new Error('데이터 스프레드시트가 설정되지 않았습니다. setupSystem()을 실행해 주세요.');
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const name = sheetName_(key);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    const headers = SHEETS[key];
    sheet.getRange(1,1,1,headers.length).setValues([headers]);
  }
  return sheet;
}

function readObjects_(key) {
  const sheet = getSheet_(key);
  const headers = SHEETS[key];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2,1,lastRow-1,headers.length).getValues();
  return values.filter(row => row.some(v => v !== '')).map(row => {
    const obj = {};
    headers.forEach((h,i) => obj[h] = row[i]);
    return obj;
  });
}

function writeObjects_(key, objects) {
  const sheet = getSheet_(key);
  const headers = SHEETS[key];
  if (sheet.getLastRow() > 1) sheet.getRange(2,1,sheet.getLastRow()-1,headers.length).clearContent();
  if (!objects.length) return;
  const rows = objects.map(obj => headers.map(h => obj[h] == null ? '' : obj[h]));
  sheet.getRange(2,1,rows.length,headers.length).setValues(rows);
}

function encodeSession_(s) {
  return Object.assign({}, s, { teachers: JSON.stringify(s.teachers || []), students: JSON.stringify(s.students || []) });
}

function decodeSession_(s) {
  return Object.assign({}, s, {
    slotIndex: Number(s.slotIndex || 0),
    classPeriod: s.classPeriod === '' ? '' : Number(s.classPeriod || 0) || '',
    teachers: parseJsonArray_(s.teachers),
    students: parseJsonArray_(s.students),
    location: s.location || '미정'
  });
}

function parseJsonArray_(value) {
  if (Array.isArray(value)) return value;
  try { const a = JSON.parse(String(value || '[]')); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}

function normalizeNumbers_(obj) {
  const out = Object.assign({}, obj);
  ['period','weekday'].forEach(k => { if (out[k] !== '' && out[k] != null) out[k] = Number(out[k]); });
  return out;
}

function splitTeachers_(value) {
  return String(value || '').replace(/[,\/&+]/g,'·').split('·').map(x => x.trim()).filter(Boolean);
}

function getRootFolder_() {
  const id = PropertiesService.getScriptProperties().getProperty('DATA_FOLDER_ID');
  if (!id) throw new Error('자료 폴더가 설정되지 않았습니다. setupSystem()을 실행해 주세요.');
  return DriveApp.getFolderById(id);
}

function ensureSubfolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function saveBase64File_(folder, fileName, mimeType, base64) {
  const bytes = Utilities.base64Decode(base64);
  if (!bytes.length) throw new Error('업로드할 파일이 비어 있습니다.');
  return folder.createFile(Utilities.newBlob(bytes, mimeType, fileName));
}

function materialRow_(x) {
  return {
    id: 'mat-' + Utilities.getUuid(), sessionId: x.sessionId || '', team: x.team || '', kind: x.kind || '', fileName: x.fileName || '',
    fileId: x.fileId || '', mimeType: x.mimeType || '', student: x.student || '', canonical: x.canonical || '', uploader: x.uploader || '', createdAt: new Date().toISOString()
  };
}

function trashFile_(id) {
  if (!id) return;
  try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {}
}

function canonical_(value) {
  return String(value || '').normalize('NFC').toLowerCase().replace(/\.pdf$/i,'').replace(/문제만|해설포함|해설포함본/g,'').replace(/[\s_\-()&]/g,'');
}

function safeFileName_(value) {
  return String(value || 'file').replace(/[\\/:*?"<>|]/g,'_').trim() || 'file';
}

function hash_(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8);
  return bytes.map(b => ('0' + ((b < 0 ? b + 256 : b).toString(16))).slice(-2)).join('');
}

function addHistory_(actor, action, detail) {
  const rows = readObjects_('history');
  rows.push({ id:'hist-' + Utilities.getUuid(), actor:actor || '시스템', action, detail, createdAt:new Date().toISOString() });
  writeObjects_('history', rows.slice(-500));
}

function overlap_(a,b) { return a.some(x => b.includes(x)); }
function firstLine_(s) { return String(s || '').split('\n')[0].trim(); }

function dateKeyForDateText_(text) {
  const m = String(text || '').match(/(\d+)월\s*(\d+)/);
  if (!m) return '';
  return '2026-' + String(Number(m[1])).padStart(2,'0') + '-' + String(Number(m[2])).padStart(2,'0');
}

function roomUseMatches_(use, dateKey, period, room) {
  if (use.room !== room || Number(use.period) !== Number(period)) return false;
  if (use.dateKey) return use.dateKey === dateKey;
  if (!use.weekday) return false;
  return new Date(dateKey + 'T00:00:00').getDay() === Number(use.weekday);
}
function seedRoomUses_() {
  const existing = readObjects_('roomUses');
  if (existing.length) return;
  const weekly = [
    ['데이터분석실',1,2,'수업 · 조현정 · 1-2 정보'],['라온실',1,2,'수업 · 노석완 · 3-3 인공지능수학'],['특별실3',1,2,'수업 · 홍상호 · 3-8 동아시아사'],
    ['데이터분석실',1,3,'수업 · 조현정 · 1-3 정보'],['라온실',1,3,'수업 · 노석완 · 2-4 인공지능수학'],['특별실3',1,3,'수업 · 이수현 · 2-6 물질과에너지'],['해양학습실',1,3,'수업 · 박문영 · 2-8 지구시스템과학'],
    ['특별실3',1,4,'수업 · 최성호 · 2-1 세계시민과지리'],['데이터분석실',1,5,'수업 · 조현정 · 1-5 정보'],['특별실3',1,5,'수업 · 홍상호 · 3-3 동아시아사'],['데이터분석실',1,6,'수업 · 조현정 · 1-4 정보'],
    ['데이터분석실',2,1,'수업 · 조현정 · 1-2 정보'],['특별실1',2,2,'수업 · 연극'],['데이터분석실',2,3,'수업 · 조현정 · 1-5 정보'],['특별실1',2,3,'수업 · 연극'],['특별실3',2,3,'수업 · 홍상호 · 3-3 동아시아사'],
    ['라온실',2,4,'수업 · 노석완 · 3-8 인공지능수학'],['특별실3',2,4,'수업 · 이수현 · 2-8 물질과에너지'],['해양학습실',2,4,'수업 · 박문영 · 2-7 지구시스템과학'],['데이터분석실',2,5,'수업 · 조현정 · 1-1 정보'],['라온실',2,6,'수업 · 노석완 · 3-3 인공지능수학'],['특별실3',2,6,'수업 · 홍상호 · 3-8 동아시아사'],
    ['데이터분석실',3,1,'수업 · 조현정 · 1-2 정보'],['라온실',3,2,'수업 · 노석완 · 3-4 실용통계'],['데이터분석실',3,3,'수업 · 조현정 · 1-1 정보'],['특별실3',3,3,'수업 · 이수현 · 2-8 물질과에너지'],['해양학습실',3,3,'수업 · 박문영 · 2-7 지구시스템과학'],
    ['데이터분석실',3,4,'수업 · 조현정 · 1-3 정보'],['라온실',3,4,'수업 · 노석완 · 3-8 인공지능수학'],['해양학습실',3,4,'수업 · 인상욱 · 2-1 미디어영어'],['라온실',3,5,'수업 · 노석완 · 2-4 인공지능수학'],['특별실3',3,5,'수업 · 이수현 · 2-6 물질과에너지'],['해양학습실',3,5,'수업 · 박문영 · 2-8 지구시스템과학'],['특별실1',3,6,'수업 · 연극'],['데이터분석실',3,7,'수업 · 조현정 · 1-4 정보'],['특별실3',3,7,'수업 · 최성호 · 2-1 세계시민과지리'],
    ['데이터분석실',4,1,'수업 · 조현정 · 1-5 정보'],['라온실',4,1,'수업 · 노석완 · 3-4 실용통계'],['라온실',4,2,'수업 · 노석완 · 2-4 인공지능수학'],['특별실3',4,2,'수업 · 이수현 · 2-6 물질과에너지'],['해양학습실',4,2,'수업 · 박문영 · 2-8 지구시스템과학'],
    ['데이터분석실',4,5,'수업 · 조현정 · 1-1 정보'],['라온실',4,5,'수업 · 노석완 · 3-3 인공지능수학'],['특별실3',4,5,'수업 · 홍상호 · 3-8 동아시아사'],['해양학습실',4,5,'수업 · 인상욱 · 2-1 미디어영어'],['특별실3',4,6,'수업 · 최성호 · 2-1 세계시민과지리'],
    ['데이터분석실',5,1,'수업 · 조현정 · 1-3 정보'],['특별실3',5,1,'수업 · 홍상호 · 3-3 동아시아사'],['라온실',5,2,'수업 · 노석완 · 3-4 실용통계'],['데이터분석실',5,3,'수업 · 조현정 · 1-4 정보'],['특별실3',5,3,'수업 · 이수현 · 2-8 물질과에너지'],['해양학습실',5,3,'수업 · 박문영 · 2-7 지구시스템과학'],['라온실',5,4,'수업 · 노석완 · 3-8 인공지능수학'],['해양학습실',5,4,'수업 · 인상욱 · 2-1 미디어영어']
  ];
  const now = new Date().toISOString();
  const rows = weekly.map((x,i) => ({ id:'base-'+(i+1), room:x[0], weekday:x[1], dateKey:'', period:x[2], label:x[3], createdBy:'기본', updatedAt:now }));
  ['2026-10-23','2026-11-06'].forEach(dateKey => ['과학실1','과학실2'].forEach(room => [5,6,7].forEach(period => rows.push({ id:'club-'+dateKey+'-'+room+'-'+period, room, weekday:'', dateKey, period, label:'동아리 · 사용 불가', createdBy:'기본', updatedAt:now }))));
  writeObjects_('roomUses', rows);
}
