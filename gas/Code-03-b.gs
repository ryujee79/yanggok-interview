function addRoomUse_(payload) {
  const auth = requireAuth_(payload, 'teacher');
  const room = String(payload.room || '');
  const period = Number(payload.period);
  const label = String(payload.label || '').trim();
  const dateKey = String(payload.dateKey || '').trim();
  const weekday = payload.weekday ? Number(payload.weekday) : '';
  if (!ROOM_CHOICES.includes(room) || room === '미정' || !Number.isInteger(period) || period < 1 || period > 8 || !label || (!dateKey && !weekday)) throw new Error('특별실 사용 정보를 확인해 주세요.');
  const uses = readObjects_('roomUses').map(normalizeNumbers_);
  const item = { id: 'room-' + Utilities.getUuid(), room, weekday: weekday || '', dateKey, period, label, createdBy: auth.name, updatedAt: new Date().toISOString() };
  uses.push(item);
  writeObjects_('roomUses', uses);
  const sessions = readObjects_('sessions').map(decodeSession_);
  let changed = 0;
  sessions.forEach(s => {
    if (s.classPeriod && s.location === room && roomUseMatches_(item, dateKeyForDateText_(s.dateText), Number(s.classPeriod), room)) {
      s.location = '미정'; changed += 1;
    }
  });
  if (changed) writeObjects_('sessions', sessions.map(encodeSession_));
  const bookings = readObjects_('bookings').map(normalizeNumbers_);
  const kept = bookings.filter(b => !roomUseMatches_(item, b.dateKey, Number(b.period), b.room));
  if (kept.length !== bookings.length) writeObjects_('bookings', kept);
  addHistory_(auth.name, '특별실 사용시간 추가', (dateKey || ('요일 ' + weekday)) + ' ' + period + '교시 ' + room + ' · ' + label);
  return { item, sessionConflictsCleared: changed, bookingsCancelled: bookings.length - kept.length };
}

function deleteRoomUse_(payload) {
  const auth = requireAuth_(payload, 'teacher');
  const id = String(payload.id || '');
  const uses = readObjects_('roomUses').map(normalizeNumbers_);
  const current = uses.find(x => x.id === id);
  if (!current) throw new Error('사용시간을 찾지 못했습니다.');
  writeObjects_('roomUses', uses.filter(x => x.id !== id));
  addHistory_(auth.name, '특별실 사용시간 삭제', current.room + ' ' + current.period + '교시 · ' + current.label);
  return { deleted: true };
}

function swapSessions_(payload) {
  const auth = requireAuth_(payload, 'teacher');
  const sessions = readObjects_('sessions').map(decodeSession_);
  const a = sessions.find(s => s.id === String(payload.aId || ''));
  const b = sessions.find(s => s.id === String(payload.bId || ''));
  const mode = String(payload.mode || '');
  if (!a || !b || a.id === b.id || a.team !== b.team) throw new Error('교환할 일정을 확인해 주세요.');
  if (!['time_and_prompt','time_only'].includes(mode)) throw new Error('교환 방법을 확인해 주세요.');
  if (mode === 'time_and_prompt') {
    const teacher = a.teacher, teachers = a.teachers;
    a.teacher = b.teacher; a.teachers = b.teachers;
    b.teacher = teacher; b.teachers = teachers;
  } else {
    const aa = { teacher: a.teacher, teachers: a.teachers, prompt: a.prompt, pdfFile: a.pdfFile };
    a.teacher = b.teacher; a.teachers = b.teachers; a.prompt = b.prompt; a.pdfFile = b.pdfFile;
    b.teacher = aa.teacher; b.teachers = aa.teachers; b.prompt = aa.prompt; b.pdfFile = aa.pdfFile;
  }
  const bookings = readObjects_('bookings').map(normalizeNumbers_);
  const conflictA = sessionConflict_(a, sessions.filter(s => s.id !== a.id), bookings);
  const conflictB = sessionConflict_(b, sessions.filter(s => s.id !== b.id), bookings);
  if (conflictA || conflictB) throw new Error(conflictA || conflictB);
  writeObjects_('sessions', sessions.map(encodeSession_));
  addHistory_(auth.name, '교사 일정 교환', a.teacher + ' ↔ ' + b.teacher + ' · ' + (mode === 'time_only' ? '시간만 교환' : '시간·지문 함께 교환'));
  return { sessions: [a,b] };
}
