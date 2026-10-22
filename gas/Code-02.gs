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
  const classNo = name === '김소율' ? Number(payload.classNo) : 0;
  if (name === '김소율' && ![2,7].includes(classNo)) throw new Error('김소율 학생은 2반 또는 7반을 선택해 주세요.');
  const userKey = name === '김소율' && classNo === 2 ? '김소율(2반)' : name;
  let user = getUser_(userKey);
  if (!user && name === '김소율' && classNo === 2) {
    // The second student must have independent credentials from the 7th-class student.
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const users = readObjects_('users');
      user = users.find(x => x.name === userKey);
      if (!user) {
        user = { name:userKey, passwordHash:'', updatedAt:new Date().toISOString() };
        users.push(user);
        writeObjects_('users',users);
      }
    } finally { lock.releaseLock(); }
  }
  if (!user) throw new Error('등록된 학생 이름을 찾지 못했습니다. 일정 엑셀을 먼저 업로드해 주세요.');
  const mustChange = !user.passwordHash;
  if (mustChange) {
    if (password !== INITIAL_STUDENT_PASSWORD) throw new Error('학생 이름 또는 비밀번호가 맞지 않습니다.');
  } else if (user.passwordHash !== hash_(password)) {
    throw new Error('학생 이름 또는 비밀번호가 맞지 않습니다.');
  }
  return issueToken_(role, name, mustChange, classNo, userKey);
}

function issueToken_(role, name, mustChange, classNo, userKey) {
  const token = Utilities.getUuid() + '-' + Utilities.getUuid();
  const auth = {role, name, mustChange: !!mustChange};
  if (role === 'student' && name === '김소율') {
    auth.classNo = Number(classNo);
    auth.userKey = userKey;
  }
  CacheService.getScriptCache().put('auth:' + token, JSON.stringify(auth), TOKEN_TTL_SECONDS);
  return Object.assign({token, version: APP_VERSION}, auth);
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
  const idx = users.findIndex(x => x.name === (auth.userKey || auth.name));
  if (idx < 0) throw new Error('학생 정보를 찾지 못했습니다.');
  users[idx].passwordHash = hash_(password);
  users[idx].updatedAt = new Date().toISOString();
  writeObjects_('users', users);
  CacheService.getScriptCache().put('auth:' + String(payload.token), JSON.stringify(Object.assign({},auth,{mustChange:false})), TOKEN_TTL_SECONDS);
  addHistory_(auth.name, '학생 비밀번호 변경', '초기 비밀번호를 개인 비밀번호로 변경했습니다.');
  return { changed: true };
}

function getState_(payload) {
  const auth = requireAuth_(payload);
  const sessionsAll = readObjects_('sessions').map(decodeSession_).map(s => Object.assign({},s,{students:eligibleInterviewStudents_(s.students)}));
  const bookings = readObjects_('bookings').map(normalizeNumbers_);
  const roomUses = readObjects_('roomUses').map(normalizeNumbers_);
  const materials = readObjects_('materials');
  const history = readObjects_('history').slice(-200).reverse();
  if (auth.role === 'student') {
    if (auth.name === '김소율' && ![2,7].includes(Number(auth.classNo))) throw new Error('김소율 학생은 반을 선택하여 다시 로그인해 주세요.');
    const sessions = sessionsAll.filter(s => studentOwnsInterview_(auth,s));
    const sessionIds = new Set(sessions.map(s => s.id));
    const teams = new Set(sessions.map(s => s.team));
    const allowedKinds = new Set(['prompt','solution','reference','recording','usedZip','unusedZip']);
    const visibleMaterials = materials.filter(m => allowedKinds.has(m.kind) && (
      (m.kind === 'recording' && m.student === auth.name && sessionIds.has(m.sessionId)) ||
      (['reference'].includes(m.kind) && sessionIds.has(m.sessionId)) ||
      (['prompt','solution'].includes(m.kind) && teams.has(m.team)) ||
      (['usedZip','unusedZip'].includes(m.kind) && teams.has(m.team))
    ));
    return { auth, sessions, manualBookings: [], roomUses: [], history: [], materials: visibleMaterials, roomChoices: ROOM_CHOICES, version: APP_VERSION };
  }
  return { auth, sessions: sessionsAll, manualBookings: bookings, roomUses, history, materials, roomChoices: ROOM_CHOICES, version: APP_VERSION };
}
