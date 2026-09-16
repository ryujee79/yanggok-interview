function sessionConflict_(candidate, otherSessions, bookings) {
  if (!candidate.classPeriod) return '';
  const dateKey = dateKeyForDateText_(candidate.dateText);
  const roomUses = readObjects_('roomUses').map(normalizeNumbers_);
  if (candidate.location !== '미정') {
    const use = roomUses.find(x => roomUseMatches_(x, dateKey, Number(candidate.classPeriod), candidate.location));
    if (use) return candidate.location + '은 ' + candidate.classPeriod + '교시에 ' + use.label + '이 있어 선택할 수 없습니다.';
  }
  const other = otherSessions.find(s => s.dateText === candidate.dateText && Number(s.classPeriod) === Number(candidate.classPeriod) && (
    overlap_((s.teachers || []), (candidate.teachers || [])) || overlap_(s.students || [], candidate.students || []) ||
    (candidate.location !== '미정' && s.location === candidate.location)
  ));
  if (other) return candidate.dateText + ' ' + candidate.classPeriod + '교시에 교사·학생·장소 일정이 겹칩니다.';
  const booking = bookings.find(b => b.dateKey === dateKey && Number(b.period) === Number(candidate.classPeriod) && (
    (candidate.teachers || []).includes(b.teacher) || (candidate.students || []).includes(b.student) ||
    (candidate.location !== '미정' && candidate.location === b.room)
  ));
  if (booking) return candidate.dateText + ' ' + candidate.classPeriod + '교시에 직접 예약된 면접과 겹칩니다.';
  return '';
}

function syncStudents_(sessions) {
  const current = readObjects_('users');
  const map = {};
  current.forEach(u => map[u.name] = u);
  const names = Array.from(new Set(sessions.reduce((acc, s) => acc.concat(s.students || []), []))).filter(Boolean).sort();
  const now = new Date().toISOString();
  const next = names.map(name => map[name] || { name, passwordHash:'', updatedAt:now });
  writeObjects_('users', next);
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
  return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><script>parent.postMessage(' + json + ',' + target + ');</script>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
