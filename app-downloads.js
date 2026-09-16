function bindEvents() {
  document.getElementById('logoutBtn').onclick = logout;
  const search = document.getElementById('studentSearch');
  if (search) {
    search.oninput = (e) => { state.studentQuery = e.target.value; render(); };
    document.getElementById('clearSearch').onclick = () => { state.studentQuery = ''; render(); };
  }
  document.querySelectorAll('[data-team-modal]').forEach((button) => {
    button.onclick = () => { state.teamModal = button.dataset.teamModal; render(); };
  });
  const backdrop = document.getElementById('modalBackdrop');
  if (backdrop) backdrop.onclick = () => { state.teamModal = null; render(); };
  const close = document.getElementById('closeModal');
  if (close) close.onclick = () => { state.teamModal = null; render(); };
  document.querySelectorAll('[data-download-prompt]').forEach((button) => {
    button.onclick = () => downloadPrompt(button.dataset.downloadPrompt, button);
  });
  document.querySelectorAll('[data-download-zip]').forEach((button) => {
    button.onclick = () => {
      const [kind, team] = button.dataset.downloadZip.split(':');
      downloadZip(kind, team, button);
    };
  });
}

async function decryptedAsset(kind, team) {
  const key = `${kind}:${team}`;
  if (!state.zipCache[key]) {
    const path = PATHS[kind][team];
    state.zipCache[key] = fetchEncrypted(path, state.password);
  }
  return state.zipCache[key];
}

function saveBytes(bytes, filename, type) {
  const blob = new Blob([bytes], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function downloadZip(kind, team, button) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = '준비 중...';
  try {
    const bytes = await decryptedAsset(kind, team);
    const prefix = kind === 'used' ? '사용' : '미사용';
    saveBytes(bytes, `${prefix}_${TEAM_LABELS[team]}.zip`, 'application/zip');
  } catch {
    alert('자료가 아직 GitHub에 업로드되지 않았거나 복호화하지 못했습니다.');
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

function basename(path) {
  return path.split(/[\\/]/).pop();
}

async function downloadPrompt(sessionId, button) {
  const session = state.data.sessions.find((s) => s.id === sessionId);
  if (!session) return;
  const original = button.textContent;
  button.disabled = true;
  button.textContent = 'PDF 준비 중...';
  try {
    const bytes = await decryptedAsset('used', session.team);
    const zip = await JSZip.loadAsync(bytes);
    const wanted = session.pdfFile.normalize('NFC');
    const entry = Object.values(zip.files).find((file) => !file.dir && basename(file.name).normalize('NFC') === wanted);
    if (!entry) throw new Error('PDF not found');
    const pdf = await entry.async('uint8array');
    saveBytes(pdf, session.pdfFile, 'application/pdf');
  } catch {
    alert('해당 제시문 PDF를 찾지 못했습니다. 사용 지문 ZIP 업로드 상태를 확인해 주세요.');
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

if (state.password && state.name) {
  loadSchedule(state.password).then((data) => {
    state.data = data;
    const valid = state.role === 'teacher'
      ? data.sessions.some((s) => (s.teachers || []).includes(state.name))
      : data.sessions.some((s) => (s.students || []).includes(state.name));
    if (valid) render();
    else renderLogin();
  }).catch(() => renderLogin());
} else {
  renderLogin();
}
