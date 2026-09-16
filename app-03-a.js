function render(){
  if(!state.token||!state.auth) return renderLogin();
  if(!state.data && state.auth.mustChange!==true){ app.innerHTML='<main class="login-wrap"><div class="login-card"><h2>일정을 불러오는 중입니다.</h2></div></main>'; refreshState(true); return; }
  const mine=currentSessions();
  let shown=mine, title='나의 일정';
  if(state.auth.role==='teacher'&&state.studentQuery){ const q=state.studentQuery.trim(); const matches=allStudents().filter(n=>n===q||n.includes(q)); if(matches.length===1){shown=sortSessions(state.data.sessions.filter(s=>s.students.includes(matches[0])));title=`${matches[0]} 학생 일정`;}}
  const resourceTeams=state.auth.role==='teacher'?['natural','humanities']:userTeams();
  app.innerHTML=`<main class="shell"><header class="topbar"><div class="brand"><small>YANGGOK 2027</small><h1>제시문 면접 지도 일정</h1></div><div class="userbox"><span class="pill">${state.auth.role==='teacher'?'교사':'학생'} · ${esc(state.auth.name)}</span><button id="refreshBtn" class="btn">새로고침</button><button id="logoutBtn" class="btn">로그아웃</button></div></header>${state.notice?`<div class="alert success">${esc(state.notice)}</div>`:''}${state.error?`<div class="alert error">${esc(state.error)}</div>`:''}<div class="grid"><section>${state.auth.role==='teacher'?teacherToolbar():''}${state.auth.role==='teacher'?studentFinder():''}<div class="panel"><div class="panel-head"><h2>${esc(title)}</h2><span class="count">${shown.length}건</span></div><div class="cards">${shown.length?shown.map(sessionCard).join(''):'<div class="empty">표시할 일정이 없습니다.</div>'}</div></div></section><aside class="sidebar">${state.auth.role==='teacher'?`<div class="panel"><div class="panel-head"><h2>전체·팀 일정</h2></div><div class="toolbar"><button class="btn" data-view-team="all">전체 일정</button><button class="btn" data-view-team="humanities">인문·연세대팀</button><button class="btn" data-view-team="natural">자연팀</button></div></div>`:''}<div class="panel"><div class="panel-head"><h2>면접 자료</h2></div>${resourceTeams.map(resourceCard).join('')}</div>${state.auth.role==='teacher'?`<div class="panel"><div class="panel-head"><h2>실 예약</h2></div><button class="btn primary" id="roomBtn" style="width:100%">실별 사용 현황·예약</button></div>`:''}<div class="panel"><strong>서버 동기화</strong><p class="muted" style="font-size:12px;margin-bottom:0">${state.lastStateAt?new Date(state.lastStateAt).toLocaleTimeString('ko-KR'):'-'}</p></div></aside></div></main>${renderModal()}`;
  bindMainEvents();
}

function teacherToolbar(){return `<div class="panel"><div class="panel-head"><h2>교사 관리</h2></div><div class="toolbar"><button class="btn primary" id="scheduleUploadBtn">일정 엑셀 업로드</button><button class="btn" id="materialUploadBtn">면접 자료 ZIP 업로드</button><button class="btn" id="roomManageBtn">특별실 관리</button><button class="btn" id="historyBtn">변경 이력</button></div><input id="scheduleFile" type="file" accept=".xlsx,.xls" class="hidden"></div>`;}
function studentFinder(){return `<div class="panel"><div class="panel-head"><h2>학생 찾기</h2></div><div class="searchline"><input id="studentSearch" list="studentNames" value="${esc(state.studentQuery)}" placeholder="학생 이름 검색 · 예: 박예지"><datalist id="studentNames">${allStudents().map(n=>`<option value="${esc(n)}"></option>`).join('')}</datalist><button id="clearStudentSearch" class="btn">검색 해제</button></div></div>`;}

function resourceCard(team){
  const used=zipMaterial(team,'usedZip'), unused=zipMaterial(team,'unusedZip');
  return `<div class="resource-card"><strong>${esc(teamLabel(team))}</strong><p>사용 지문과 미사용 지문을 ZIP으로 내려받습니다.</p><div class="resource-actions"><button class="btn" ${used?'':'disabled'} data-download-material="${used?esc(used.id):''}">사용 지문 ZIP</button><button class="btn" ${unused?'':'disabled'} data-download-material="${unused?esc(unused.id):''}">미사용 지문 ZIP</button></div></div>`;
}

function sessionCard(s){
  const isTeacher=state.auth.role==='teacher';
  const prompt=sessionMaterials(s,'prompt')[0], solution=sessionMaterials(s,'solution')[0];
  const refs=sessionMaterials(s,'reference');
  const recs=sessionMaterials(s,'recording');
  const rec=state.recorder[s.id]||{};
  const rooms=(state.data?.roomChoices||[]).filter(Boolean);
  return `<article class="session" data-session="${esc(s.id)}"><div class="session-top"><div><div class="date">${esc(s.dateText)} <span class="group">${esc(s.group)}</span></div></div><span class="team ${esc(s.team)}">${esc(teamLabel(s.team))}</span></div><div class="meta"><div><span>학생</span><strong>${esc((s.students||[]).join(' · '))}</strong></div><div><span>지도교사</span><strong>${esc(s.teacher)}</strong></div></div>${isTeacher?`<div class="period-location"><label>교시<select data-period="${esc(s.id)}"><option value="">미정</option>${[1,2,3,4,5,6,7,8].map(n=>`<option value="${n}" ${Number(s.classPeriod)===n?'selected':''}>${n}교시</option>`).join('')}</select></label><label>장소<select data-location="${esc(s.id)}" ${s.classPeriod?'':'disabled'}>${rooms.map(r=>`<option value="${esc(r)}" ${s.location===r?'selected':''}>${esc(r)}</option>`).join('')}</select></label></div>`:''}<div class="prompt"><strong>${esc(firstLine(s.prompt))}</strong><small>${esc(secondLine(s.prompt))}</small><div class="prompt-actions"><button class="btn primary" ${prompt?'':'disabled'} data-download-material="${prompt?esc(prompt.id):''}">제시문 PDF</button>${firstLine(s.prompt).includes('고려대')?`<button class="btn" ${solution?'':'disabled'} data-download-material="${solution?esc(solution.id):''}">해설 포함</button>`:''}${!prompt?'<span class="status-missing">제시문 업로드 안 됨</span>':'<span class="status-ok">제시문 연결됨</span>'}</div></div><div class="reference-box"><h4>참고자료</h4>${refs.length?refs.map(m=>fileRow(m,true)).join(''):'<div class="muted" style="font-size:12px">등록된 참고자료 없음</div>'}${isTeacher?`<label class="btn small" style="display:inline-block;margin-top:7px">참고자료 업로드<input type="file" class="hidden" data-reference-upload="${esc(s.id)}"></label>`:''}</div>${isTeacher?`<div class="record-box"><h4>학생 녹음</h4>${recs.length?recs.map(m=>recordingRow(m,true)).join(''):'<div class="muted" style="font-size:12px">아직 업로드된 녹음 없음</div>'}</div><div class="session-actions"><button class="btn small" data-swap="${esc(s.id)}">일정 교환</button></div>`:studentRecorder(s,rec,recs)}</article>`;
}

function fileRow(m,deleteable){return `<div class="file-row"><span>${esc(m.fileName)}</span><div class="inline"><button class="btn small" data-download-material="${esc(m.id)}">다운로드</button>${deleteable&&state.auth.role==='teacher'?`<button class="btn small danger" data-delete-reference="${esc(m.id)}">삭제</button>`:''}</div></div>`;}
function recordingRow(m,teacherMode){return `<div class="file-row"><span>${esc(m.student||'학생')} · ${esc(m.fileName)}</span><div class="inline"><button class="btn small" data-play-material="${esc(m.id)}">듣기</button>${!teacherMode&&m.student===state.auth.name?`<button class="btn small danger" data-delete-recording="${esc(m.id)}">삭제</button>`:''}</div></div>`;}
function studentRecorder(s,rec,recs){
  const own=recs.filter(m=>m.student===state.auth.name);
  const status=rec.status||'idle';
  let controls='';
  if(status==='idle') controls=`<button class="btn primary small" data-rec-start="${esc(s.id)}">녹음 시작</button>`;
  if(status==='recording') controls=`<button class="btn small" data-rec-pause="${esc(s.id)}">일시정지</button><button class="btn danger small" data-rec-stop="${esc(s.id)}">녹음 종료</button>`;
  if(status==='paused') controls=`<button class="btn small" data-rec-resume="${esc(s.id)}">계속 녹음</button><button class="btn danger small" data-rec-stop="${esc(s.id)}">녹음 종료</button>`;
  if(status==='ready') controls=`<button class="btn primary small" data-rec-upload="${esc(s.id)}">업로드</button><button class="btn small" data-rec-reset="${esc(s.id)}">다시 녹음</button>`;
  return `<div class="record-box"><h4>내 답변 녹음</h4><div class="toolbar">${controls}</div>${rec.url?`<audio class="audio-preview" src="${esc(rec.url)}" controls></audio>`:''}${own.length?`<div style="margin-top:8px">${own.map(m=>recordingRow(m,false)).join('')}</div>`:''}<div class="muted" style="font-size:11px;margin-top:6px">녹음을 업로드하면 담당 교사가 바로 확인하고 들을 수 있습니다.</div></div>`;
}
