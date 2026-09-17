function sessionConflict_(candidate, otherSessions, bookings, roomUses) {
  if (!candidate.classPeriod) return '';
  const dateKey = dateKeyForDateText_(candidate.dateText);
  const uses = roomUses || readObjects_('roomUses').map(normalizeNumbers_);
  const candidateTeachers = candidate.teachers && candidate.teachers.length ? candidate.teachers : splitTeachers_(candidate.teacher);
  if (candidate.location !== '미정') {
    const use = uses.find(x => roomUseMatches_(x, dateKey, Number(candidate.classPeriod), candidate.location));
    if (use) return candidate.location + '은 ' + candidate.classPeriod + '교시에 ' + use.label + '이 있어 선택할 수 없습니다.';
  }
  const other = otherSessions.find(s => dateKeyForDateText_(s.dateText) === dateKey && Number(s.classPeriod) === Number(candidate.classPeriod) && (
    overlap_((s.teachers && s.teachers.length ? s.teachers : splitTeachers_(s.teacher)), candidateTeachers) || overlap_(s.students || [], candidate.students || []) ||
    (candidate.location !== '미정' && s.location === candidate.location)
  ));
  if (other) return candidate.dateText + ' ' + candidate.classPeriod + '교시에 교사·학생·장소 일정이 겹칩니다.';
  const booking = bookings.find(b => normalizeDateKey_(b.dateKey) === dateKey && Number(b.period) === Number(candidate.classPeriod) && (
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
  current.forEach(u => { if (u.name) map[String(u.name).trim()] = u; });
  const manualNames = readObjects_('bookings').map(b => String(b.student || '').trim()).filter(Boolean);
  const activeNames = Array.from(new Set(sessions.reduce((acc, s) => acc.concat(s.students || []), []).concat(manualNames))).filter(Boolean);
  const now = new Date().toISOString();
  activeNames.forEach(name => { if (!map[name]) map[name] = { name, passwordHash:'', updatedAt:now }; });
  const next = Object.keys(map).sort((a,b) => a.localeCompare(b,'ko')).map(name => map[name]);
  writeObjects_('users', next);
}

function syncManualStudent_(name) {
  const student = String(name || '').trim();
  if (!student) return;
  const users = readObjects_('users');
  if (users.some(u => u.name === student)) return;
  users.push({ name:student, passwordHash:'', updatedAt:new Date().toISOString() });
  users.sort((a,b) => String(a.name || '').localeCompare(String(b.name || ''),'ko'));
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
