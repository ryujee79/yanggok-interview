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
