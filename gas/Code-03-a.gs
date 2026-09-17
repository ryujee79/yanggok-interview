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
    oldSessions.forEach(s => { oldById[s.id] = s; oldByKey[sessionIdentityKey_(s)] = s; });
    const now = new Date().toISOString();
    const normalized = incoming.map((s, index) => {
      const teachers = splitTeachers_(s.teacher || (Array.isArray(s.teachers) ? s.teachers.join('·') : ''));
      const students = Array.isArray(s.students) ? s.students.map(String).map(x => x.trim()).filter(Boolean) : [];
      const base = {
        id: String(s.id || '').trim(), team: String(s.team || ''), group: String(s.group || ''), dateText: String(s.dateText || ''),
        period: String(s.period || '전체'), slotIndex: Number(s.slotIndex == null ? index : s.slotIndex), teacher: teachers.join('·'), teachers, students,
        prompt: String(s.prompt || ''), pdfFile: String(s.pdfFile || ''), classPeriod:'', location:'미정', updatedAt:now
      };
      const old = oldById[base.id] || oldByKey[sessionIdentityKey_(base)];
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
    const nextPeriod = payload.classPeriod === '' || payload.classPeriod == null ? '' : Number(payload.classPeriod);
    const nextLocation = String(payload.location == null ? current.location : payload.location);
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
  const dateKey = String(payload.dateKey || '');
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
    if (exact) return { booking:exact, duplicate:true };
    const bookingConflict = bookings.find(b => b.dateKey === dateKey && Number(b.period) === period && (b.teacher === auth.name || b.student === student || b.room === room));
    if (bookingConflict) throw new Error('해당 교시에는 이미 직접 예약된 교사·학생·장소가 있습니다.');
    const booking = { id: 'manual-' + new Date().getTime() + '-' + Math.random().toString(36).slice(2,8), dateKey, period, room, teacher: auth.name, student, createdAt: new Date().toISOString() };
    bookings.push(booking);
    writeObjects_('bookings', bookings);
    syncManualStudent_(student);
    addHistory_(auth.name, '면접실 직접 예약', dateKey + ' ' + period + '교시 ' + room + ' · ' + student);
    return { booking };
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
    writeObjects_('bookings', bookings.filter(x => x.id !== id));
    addHistory_(auth.name, '면접실 직접 예약 취소', current.dateKey + ' ' + current.period + '교시 ' + current.room + ' · ' + current.student);
    return { cancelled: true };
  } finally {
    lock.releaseLock();
  }
}
