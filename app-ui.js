function renderLogin(error = '') {
  app.innerHTML = `
    <main class="login-wrap">
      <section class="login-card">
        <div class="eyebrow">YANGGOK 2027</div>
        <h1>제시문 면접 지도 일정</h1>
        <p>교사 또는 학생을 선택하고 이름과 접속암호를 입력하세요.</p>
        <div class="role-tabs">
          <button id="roleTeacher" class="${state.role === 'teacher' ? 'active' : ''}">교사</button>
          <button id="roleStudent" class="${state.role === 'student' ? 'active' : ''}">학생</button>
        </div>
        <label class="field"><span>이름</span><input id="loginName" autocomplete="name" value="${escapeHtml(state.name)}" placeholder="${state.role === 'teacher' ? '교사 이름' : '학생 이름'}"></label>
        <label class="field"><span>접속암호</span><input id="loginPassword" type="password" value="${escapeHtml(state.password)}" autocomplete="current-password" placeholder="공용 접속암호"></label>
        <label class="remember"><input id="rememberPassword" type="checkbox" ${state.remember ? 'checked' : ''}> 이 기기에서 접속암호 기억</label>
        ${error ? `<div class="alert error">${escapeHtml(error)}</div>` : ''}
        <button id="loginButton" class="btn primary" style="width:100%">일정 열기</button>
        <div class="footer-note">일정과 자료는 암호화되어 저장됩니다.</div>
      </section>
    </main>
  `;
  document.getElementById('roleTeacher').onclick = () => { state.role = 'teacher'; renderLogin(); };
  document.getElementById('roleStudent').onclick = () => { state.role = 'student'; renderLogin(); };
  document.getElementById('loginButton').onclick = login;
  document.getElementById('loginPassword').onkeydown = (e) => { if (e.key === 'Enter') login(); };
}

async function login() {
  const button = document.getElementById('loginButton');
  const name = normalizeName(document.getElementById('loginName').value);
  const password = document.getElementById('loginPassword').value;
  const remember = document.getElementById('rememberPassword').checked;
  if (!name || !password) return renderLogin('이름과 접속암호를 입력해 주세요.');
  button.disabled = true;
  button.textContent = '자료 확인 중...';
  try {
    const data = await loadSchedule(password);
    state.data = data;
    const names = state.role === 'teacher'
      ? [...new Set(data.sessions.flatMap((s) => s.teachers || []))]
      : [...new Set(data.sessions.flatMap((s) => s.students || []))];
    if (!names.includes(name)) throw new Error(state.role === 'teacher' ? '등록된 교사 이름을 찾지 못했습니다.' : '등록된 학생 이름을 찾지 못했습니다.');
    state.name = name;
    state.password = password;
    state.remember = remember;
    localStorage.setItem('yi-role', state.role);
    localStorage.setItem('yi-name', state.name);
    if (remember) localStorage.setItem('yi-password', password);
    else localStorage.removeItem('yi-password');
    render();
  } catch (error) {
    state.data = null;
    renderLogin(error && error.message && !error.message.includes('operation-specific') ? error.message : '접속암호가 맞지 않거나 일정 자료를 열 수 없습니다.');
  }
}

function logout() {
  state.data = null;
  state.zipCache = {};
  state.studentQuery = '';
  localStorage.removeItem('yi-name');
  state.name = '';
  if (!state.remember) state.password = '';
  renderLogin();
}

function render() {
  if (!state.data) return renderLogin();
  const mine = currentSessions();
  const queryStudent = state.role === 'teacher' ? resolveStudent(state.studentQuery) : '';
  const shown = queryStudent
    ? sortSessions(state.data.sessions.filter((s) => s.students.includes(queryStudent)))
    : mine;
  const resourceTeams = state.role === 'teacher' ? ['natural', 'humanities'] : teamsForCurrentUser();
  app.innerHTML = `
    <main class="shell">
      <header class="topbar">
        <div class="brand"><small>YANGGOK 2027</small><h1>제시문 면접 지도 일정</h1></div>
        <div class="userbox"><span class="pill">${state.role === 'teacher' ? '교사' : '학생'} · ${escapeHtml(state.name)}</span><button id="logoutBtn" class="btn">로그아웃</button></div>
      </header>
      ${state.notice ? `<div class="alert">${escapeHtml(state.notice)}</div>` : ''}
      <div class="grid">
        <section>
          ${state.role === 'teacher' ? `
            <div class="panel">
              <div class="panel-head"><h2>학생 찾기</h2></div>
              <div class="searchline">
                <input id="studentSearch" list="studentNames" value="${escapeHtml(state.studentQuery)}" placeholder="학생 이름 검색 · 예: 박예지">
                <datalist id="studentNames">${allStudents().map((n) => `<option value="${escapeHtml(n)}"></option>`).join('')}</datalist>
                <button id="clearSearch" class="btn">검색 해제</button>
              </div>
              ${state.studentQuery && !queryStudent ? '<div class="alert error">학생을 한 명으로 특정하지 못했습니다.</div>' : ''}
            </div>
          ` : ''}
          <div class="panel">
            <div class="panel-head"><h2>${queryStudent ? `${escapeHtml(queryStudent)} 학생 일정` : '나의 일정'}</h2><span class="count">${shown.length}건</span></div>
            <div class="cards">${shown.length ? shown.map(sessionCard).join('') : '<div class="empty">표시할 일정이 없습니다.</div>'}</div>
          </div>
        </section>
        <aside class="sidebar">
          ${state.role === 'teacher' ? `
            <div class="panel">
              <div class="panel-head"><h2>전체·팀 일정</h2></div>
              <div class="toolbar">
                <button class="btn" data-team-modal="all">전체 일정</button>
                <button class="btn" data-team-modal="humanities">인문·연세대팀</button>
                <button class="btn" data-team-modal="natural">자연팀</button>
              </div>
            </div>
          ` : ''}
          <div class="panel">
            <div class="panel-head"><h2>면접 자료</h2></div>
            ${resourceTeams.map(resourceCard).join('')}
          </div>
          <div class="panel">
            <strong>현재 일정</strong>
            <p class="muted" style="font-size:13px;margin-bottom:0">자연 28건 + 인문·연세 42건 = 총 70건</p>
          </div>
        </aside>
      </div>
      <div class="footer-note">GitHub Pages 정적 앱 · 일정/자료는 브라우저에서 복호화됩니다.</div>
    </main>
    ${state.teamModal ? renderTeamModal() : ''}
  `;
  bindEvents();
}

function renderTeamModal() {
  const items = state.teamModal === 'all'
    ? sortSessions(state.data.sessions)
    : sortSessions(state.data.sessions.filter((s) => s.team === state.teamModal));
  const title = state.teamModal === 'all' ? '전체 일정' : TEAM_LABELS[state.teamModal];
  return `
    <div class="modal-backdrop" id="modalBackdrop">
      <section class="modal" onclick="event.stopPropagation()">
        <div class="modal-head"><div><h2>${escapeHtml(title)}</h2><span class="muted">${items.length}건</span></div><button id="closeModal" class="btn">닫기</button></div>
        <div class="cards">${items.map(sessionCard).join('')}</div>
      </section>
    </div>
  `;
}
