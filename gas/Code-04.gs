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
