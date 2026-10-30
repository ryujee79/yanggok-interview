function uploadSchedule_(payload) {
  const auth = requireAuth_(payload, 'teacher');
  const incoming = Array.isArray(payload.sessions) ? payload.sessions : [];
  if (!incoming.length || incoming.length > 300) throw new Error('일정 자료를 확인해 주세요.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const oldMap = {};
    readObjects_('sessions').map(decodeSession_).forEach(s => oldMap[s.id] = s);
    const now = new Date().toISOString();
    const normalized = incoming.map(s => {
      const old = oldMap[String(s.id || '')];
      const teachers = splitTeachers_(s.teacher || (Array.isArray(s.teachers) ? s.teachers.join('·') : ''));
      const students = eligibleInterviewStudents_(Array.isArray(s.students) ? s.students.map(String).map(x => x.trim()).filter(Boolean) : []);
      return {
        id: String(s.id || '').trim(), team: String(s.team || ''), group: String(s.group || ''), dateText: String(s.dateText || ''),
        period: String(s.period || '전체'), slotIndex: Number(s.slotIndex || 0), teacher: teachers.join('·'), teachers, students,
        prompt: String(s.prompt || ''), pdfFile: String(s.pdfFile || ''),
        classPeriod: old && old.classPeriod ? old.classPeriod : '',
        location: old && old.location && old.location !== '미정' ? old.location : '미정', updatedAt: now
      };
    });
    if (normalized.some(s => !s.id || !s.team || !s.group || !s.dateText || !s.teacher || !s.prompt)) throw new Error('일정에 필수 값이 빠져 있습니다.');
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
  const sessions = readObjects_('sessions').map(decodeSession_);
  const idx = sessions.findIndex(s => s.id === String(payload.id || ''));
  if (idx < 0) throw new Error('일정을 찾지 못했습니다.');
  const nextPeriod = payload.classPeriod === '' || payload.classPeriod == null ? '' : Number(payload.classPeriod);
  const nextLocation = String(payload.location == null ? sessions[idx].location : payload.location);
  if (nextPeriod !== '' && (!Number.isInteger(nextPeriod) || nextPeriod < 1 || nextPeriod > 8)) throw new Error('교시는 1~8교시 중에서 선택해 주세요.');
  if (!ROOM_CHOICES.includes(nextLocation)) throw new Error('장소를 확인해 주세요.');
  const candidate = Object.assign({}, sessions[idx], { classPeriod: nextPeriod, location: nextPeriod === '' ? '미정' : nextLocation });
  const conflict = sessionConflict_(candidate, sessions.filter((_, i) => i !== idx), readObjects_('bookings').map(normalizeNumbers_));
  if (conflict) throw new Error(conflict);
  sessions[idx] = candidate;
  writeObjects_('sessions', sessions.map(encodeSession_));
  addHistory_(auth.name, '면접 일정 변경', candidate.dateText + ' ' + candidate.group + ' · ' + (candidate.classPeriod || '교시 미정') + ' · ' + candidate.location);
  return { session: candidate };
}

function validateManualBooking_(payload, teacher, excludeId) {
  const dateKey = String(payload.dateKey || '');
  const period = Number(payload.period);
  const room = String(payload.room || '');
  const student = String(payload.student || '').trim();
  const kind = payload.kind === 'practice' ? 'practice' : 'interview';
  if (!/^2026-\d{2}-\d{2}$/.test(dateKey) || !Number.isInteger(period) || period < 1 || period > 8 ||
      !ROOM_CHOICES.includes(room) || room === '미정' || !student) throw new Error('예약 정보를 확인해 주세요.');
  const classUse = readObjects_('roomUses').map(normalizeNumbers_).find(x => roomUseMatches_(x,dateKey,period,room));
  if (classUse) throw new Error(room + '은 ' + period + '교시에 수업 또는 행사로 사용 중입니다.');
  const students = new Set(bookingStudentNames_(student).map(x => x.replace(/[（(].*[）)]$/, '').trim()));
  const sessions = readObjects_('sessions').map(decodeSession_);
  for (const s of sessions) {
    if (dateKeyForDateText_(s.dateText) !== dateKey || Number(s.classPeriod) !== period) continue;
    if ((s.teachers || []).includes(teacher) || (s.students || []).some(x => students.has(x)) ||
        (s.location && s.location !== '미정' && s.location === room))
      throw new Error('해당 교시에는 기존 제시문 면접의 교사·학생 또는 면접실과 겹칩니다.');
  }
  const bookings = readObjects_('bookings').map(normalizeNumbers_);
  for (const b of bookings) {
    if (b.id === excludeId || b.dateKey !== dateKey || Number(b.period) !== period) continue;
    if (bookingStudentNames_(b.student).some(x => students.has(x.replace(/[（(].*[）)]$/, '').trim())))
      throw new Error('해당 학생에게 같은 교시 예약이 있습니다.');
    // Two independent practices may use the same room, including those scheduled by one teacher.
    if (kind === 'practice' && bookingKind_(b) === 'practice') continue;
    if (b.room === room || b.teacher === teacher)
      throw new Error('선생님과 면접 또는 수업이 있어 중복 예약할 수 없습니다.');
  }
  return {dateKey, period, room, student, kind, bookings};
}

function createManualBooking_(payload) {
  const auth = requireAuth_(payload, 'teacher');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const x = validateManualBooking_(payload, auth.name, '');
    const booking = {
      id:'manual-' + new Date().getTime() + '-' + Math.random().toString(36).slice(2,8),
      dateKey:x.dateKey,period:x.period,room:x.room,teacher:auth.name,
      student:x.student,createdAt:new Date().toISOString(),kind:x.kind
    };
    x.bookings.push(booking);
    writeObjects_('bookings', x.bookings);
    addHistory_(auth.name, '면접실 직접 예약', x.dateKey+' '+x.period+'교시 '+x.room+' · '+(x.kind==='practice'?'개인연습':'선생님과 면접')+' · '+x.student);
    return {booking};
  } finally { lock.releaseLock(); }
}

function updateManualBooking_(payload) {
  const auth = requireAuth_(payload, 'teacher');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const id = String(payload.id || '');
    const existing = readObjects_('bookings').map(normalizeNumbers_).find(b => b.id===id);
    if (!existing || existing.teacher !== auth.name) throw new Error('본인의 예약만 수정할 수 있습니다.');
    const x = validateManualBooking_({
      dateKey:payload.dateKey,period:payload.period,room:payload.room,
      student:payload.student,kind:payload.kind == null ? bookingKind_(existing) : payload.kind
    },auth.name,id);
    const booking = Object.assign({},existing,{dateKey:x.dateKey,period:x.period,room:x.room,student:x.student,kind:x.kind});
    const next = x.bookings.map(b => b.id===id ? booking : b);
    writeObjects_('bookings',next);
    addHistory_(auth.name,'면접실 직접 예약 수정',x.dateKey+' '+x.period+'교시 '+x.room+' · '+x.student);
    return {booking};
  } finally { lock.releaseLock(); }
}

function cancelManualBooking_(payload) {
  const auth = requireAuth_(payload, 'teacher');
  const id = String(payload.id || '');
  const bookings = readObjects_('bookings').map(normalizeNumbers_);
  const current = bookings.find(x => x.id === id);
  if (!current) throw new Error('예약을 찾지 못했습니다.');
  writeObjects_('bookings', bookings.filter(x => x.id !== id));
  addHistory_(auth.name, '면접실 직접 예약 취소', current.dateKey + ' ' + current.period + '교시 ' + current.room + ' · ' + current.student);
  return { cancelled: true };
}

// Run once in the deployed GAS editor to apply corrections to existing Sessions rows.
// This does not change Users, passwords, manual bookings or other access rights.
function applyInterviewEligibilityCorrections() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sessions = readObjects_('sessions').map(decodeSession_);
    let removed = 0;
    sessions.forEach(s=>{
      const kept = eligibleInterviewStudents_(s.students);
      removed += s.students.length - kept.length;
      s.students = kept;
    });
    if (removed) writeObjects_('sessions',sessions.map(encodeSession_));
    // Do not call syncStudents_ here: established students keep their login accounts.
    return {removed, sessions:sessions.length, usersUnchanged:true};
  } finally {lock.releaseLock();}
}
