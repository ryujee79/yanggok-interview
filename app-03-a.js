function render(){
  if(!state.token||!state.auth) return renderLogin();
  if(!state.data && state.auth.mustChange!==true){ app.innerHTML='<main class="login-wrap"><div class="login-card"><h2>일정을 불러오는 중입니다.</h2></div></main>'; refreshState(true); return; }
  const mine=currentSessions();
  let shown=mine, title='나의 일정';
  if(state.auth.role==='teacher'&&state.studentQuery){ const q=state.studentQuery.trim(); const matches=allStudents().filter(n=>n===q||n.includes(q)); if(matches.length===1){shown=sortSessions(state.data.sessions.filter(s=>s.students.includes(matches[0])));title=`${matches[0]} 학생 일정`;}}
  const resourceTeams=state.auth.role==='teacher'?['natural','humanities','yonsei']:userTeams();
  app.innerHTML=`<main class="shell"><header class="topbar"><div class="brand"><small>YANGGOK 2027</small><h1>면접실 관리 프로그램</h1></div><div class="userbox"><span class="pill">${state.auth.role==='teacher'?'교사':'학생'} · ${esc(state.auth.name)}</span><button id="refreshBtn" class="btn">새로고침</button><button id="logoutBtn" class="btn">로그아웃</button></div></header>${state.notice?`<div class="alert success">${esc(state.notice)}</div>`:''}${state.error?`<div class="alert error">${esc(state.error)}</div>`:''}<div class="grid"><section>${state.auth.role==='teacher'?teacherToolbar():''}${state.auth.role==='teacher'?studentFinder():''}<div class="panel"><div class="panel-head"><h2>${esc(title)}</h2><span class="count">${shown.length}건</span></div><div class="cards">${shown.length?shown.map(sessionCard).join(''):'<div class="empty">표시할 일정이 없습니다.</div>'}</div></div>${state.auth.role==='student'?studentBookingPanel():''}</section><aside class="sidebar">${state.auth.role==='teacher'?`<div class="panel"><div class="panel-head"><h2>전체·팀 일정</h2></div><div class="toolbar"><button class="btn" data-view-team="all">전체 일정</button><button class="btn" data-view-team="humanities">고려대(인문)</button><button class="btn" data-view-team="yonsei">연세대</button><button class="btn" data-view-team="natural">고려대(자연)</button></div></div>`:''}<div class="panel"><div class="panel-head"><h2>면접 자료</h2></div>${resourceTeams.map(resourceCard).join('')}</div>${state.auth.role==='teacher'?`<div class="panel"><div class="panel-head"><h2>실 예약</h2></div><button class="btn primary" id="roomBtn" style="width:100%">실별 사용 현황·예약</button></div>`:''}<div class="panel"><strong>서버 동기화</strong><p class="muted" style="font-size:12px;margin-bottom:0">${state.lastStateAt?new Date(state.lastStateAt).toLocaleTimeString('ko-KR'):'-'}</p></div></aside></div></main>${renderModal()}`;
  bindMainEvents();
}

function studentBookingPanel(){
  const bookings=[...(state.data?.manualBookings||[])].sort((a,b)=>String(a.dateKey||'').localeCompare(String(b.dateKey||''))||Number(a.period||0)-Number(b.period||0));
  return '<div class="panel"><div class="panel-head"><h2>나의 일반 면접·상담 예약</h2><span class="count">'+bookings.length+'건</span></div><div class="cards">'+
    (bookings.length?bookings.map(b=>'<article class="session"><div class="date">'+esc(fmtDate(String(b.dateKey||'')))+' · '+esc(b.period||'미정')+'교시</div><div class="meta"><div><span>학생</span><strong>'+esc(b.student||'')+'</strong></div><div><span>담당 교사</span><strong>'+esc(b.teacher||'')+'</strong></div><div><span>장소</span><strong>'+esc(b.room||'미정')+'</strong></div></div></article>').join(''):'<div class="empty">등록된 예약이 없습니다.</div>')+'</div></div>';
}
function teacherToolbar(){return `<div class="panel"><div class="panel-head"><h2>교사 관리</h2></div><div class="toolbar"><button class="btn primary" id="scheduleUploadBtn">일정 엑셀 업로드</button><button class="btn" id="materialUploadBtn">면접 자료 ZIP 업로드</button><button class="btn" id="roomManageBtn">특별실 관리</button><button class="btn" id="historyBtn">변경 이력</button></div><input id="scheduleFile" type="file" accept=".xlsx,.xls" class="hidden"></div>`;}
function studentFinder(){return `<div class="panel"><div class="panel-head"><h2>학생 찾기</h2></div><div class="searchline"><input id="studentSearch" list="studentNames" value="${esc(state.studentQuery)}" placeholder="학생 이름 검색 · 예: 박예지"><datalist id="studentNames">${allStudents().map(n=>`<option value="${esc(n)}"></option>`).join('')}</datalist><button id="clearStudentSearch" class="btn">검색 해제</button></div></div>`;}

function publishedFileButton(file,label,primary=false){
 if(!file?.id||!file?.name)return '';
 return `<button type="button" class="btn${primary?' primary':''}" data-published-id="${esc(file.id)}" data-published-name="${esc(file.name)}">${esc(label)}</button>`;
}
function resourceCard(team){
  if(state.auth.role==='student'){
   if(team!=='natural')return '<div class="resource-card"><strong>'+esc(teamLabel(team))+'</strong><p>학생용 문제와 교사용 해설은 나의 면접 일정 카드에서 내려받을 수 있습니다.</p></div>';
   const e=window.YANGGOK_STUDENT_FILES?.extras||{};
   return `<div class="resource-card"><strong>${esc(teamLabel(team))}</strong><p>각 면접 일정에서 기존 자료와 VER2를 모두 다운로드할 수 있습니다.</p><div class="resource-actions">${publishedFileButton(e.naturalStudentArchive,'VER2 학생용 전체 ZIP')}${publishedFileButton(e.naturalTeacherArchive,'VER2 교사용 전체 ZIP')}${publishedFileButton(e.naturalSet08Student,'VER2 8번 학생용')}${publishedFileButton(e.naturalSet08Teacher,'VER2 8번 교사용')}</div></div>`;
  }
  if(team==='humanities'||team==='yonsei')return `<div class="resource-card"><strong>${esc(teamLabel(team))}</strong><p>각 면접 일정의 제시문 PDF 버튼에서 해당 대학의 문제를 내려받을 수 있습니다.</p></div>`;
  const used=zipMaterial(team,'usedZip'), unused=zipMaterial(team,'unusedZip');
  const added=(state.data?.materials||[]).filter(m=>m.team==='natural'&&String(m.fileName||'').includes('_VER2_'));
  const ver2File=(suffix)=>added.find(m=>String(m.fileName||'').endsWith(suffix));
  const studentZip=ver2File('학생용_전체.zip'),teacherZip=ver2File('교사용_전체.zip');
  const lastStudent=ver2File('08번_학생용.pdf'),lastTeacher=ver2File('08번_교사용.pdf');
  const ver2Downloads=team==='natural'&&studentZip?`<div style="margin-top:12px;padding-top:10px;border-top:1px solid #e2e8f0"><strong>VER2 · 1~8번 전체 자료</strong><p>기존 지문은 그대로 유지됩니다. VER2 전 회차를 각각 다운로드할 수 있습니다.</p><div class="resource-actions"><button class="btn" data-download-material="${esc(studentZip.id)}">VER2 학생용 전체 ZIP</button>${teacherZip?`<button class="btn" data-download-material="${esc(teacherZip.id)}">VER2 교사용 전체 ZIP</button>`:''}</div>${lastStudent?`<div class="resource-actions" style="margin-top:6px"><button class="btn small" data-download-material="${esc(lastStudent.id)}">VER2 8번 학생용</button>${lastTeacher?`<button class="btn small" data-download-material="${esc(lastTeacher.id)}">VER2 8번 교사용</button>`:''}</div>`:''}</div>`:'';
  return `<div class="resource-card"><strong>${esc(teamLabel(team))}</strong>${state.auth.role==='teacher'?`<p>사용 지문과 미사용 지문을 ZIP으로 내려받습니다.</p><div class="resource-actions"><button class="btn" ${used?'':'disabled'} data-download-material="${used?esc(used.id):''}">사용 지문 ZIP</button><button class="btn" ${unused?'':'disabled'} data-download-material="${unused?esc(unused.id):''}">미사용 지문 ZIP</button></div>`:'<p>각 면접 일정에서 기존 문제와 교사용 해설을 다운로드할 수 있습니다.</p>'}${ver2Downloads}</div>`;
}

function sessionCard(s){
  const isTeacher=state.auth.role==='teacher';
  const studentFiles=!isTeacher?window.YANGGOK_STUDENT_FILES?.sessions?.[s.id]||null:null;
  const prompt=sessionMaterials(s,'prompt')[0], solution=sessionMaterials(s,'solution')[0];
  const refs=sessionMaterials(s,'reference');
  const ver2Files=s.team==='natural'?(state.data?.materials||[]).filter(m=>m.sessionId===s.id&&m.team==='natural'&&/^고려대_고른기회_자연_VER2_\d{2}번_(학생용|교사용)\.pdf$/.test(String(m.fileName||''))):[];
  const ver2Student=ver2Files.find(m=>m.kind==='prompt'&&String(m.fileName||'').endsWith('_학생용.pdf'));
  const ver2Teacher=ver2Files.find(m=>m.kind==='reference'&&String(m.fileName||'').endsWith('_교사용.pdf'));
  const studentVer2=studentFiles?.ver2Student||null,studentVer2Teacher=studentFiles?.ver2Teacher||null;
  const ver2ForDisplay=isTeacher?ver2Student:studentVer2;
  const ver2Match=(ver2ForDisplay?.fileName||ver2ForDisplay?.name||'').match(/VER2_(\d{2})번/);
  const ver2Option=ver2ForDisplay?`<div class="ver2-choice" style="margin-top:8px;padding:9px;border:1px solid #bbd5f3;border-radius:7px;background:#f0f6ff"><strong>VER2 ${ver2Match?Number(ver2Match[1]):''}번 · 추가 선택지</strong><div class="prompt-actions" style="margin-top:6px">${isTeacher?`<button class="btn primary" data-download-material="${esc(ver2Student.id)}">VER2 학생용 다운로드</button>${ver2Teacher?`<button class="btn" data-download-material="${esc(ver2Teacher.id)}">VER2 교사용 다운로드</button>`:''}`:`${publishedFileButton(studentVer2,'VER2 학생용 다운로드',true)}${publishedFileButton(studentVer2Teacher,'VER2 교사용 다운로드')}`}</div></div>`:'';
  const isCustom=String(s.pdfFile||'').includes('(학생용).pdf');
  const isUniversity=displayTeam(s)==='humanities'||displayTeam(s)==='yonsei';
  const teacherRefs=isUniversity?refs.filter(m=>/\(교사용\)\.pdf$/i.test(String(m.fileName||''))):[];
  const teacherPdf=isCustom?refs.find(m=>String(m.fileName||'').includes('(교사용).pdf')):(teacherRefs[teacherRefs.length-1]||null);
  const extraRefs=refs.filter(m=>m!==teacherPdf&&!teacherRefs.includes(m)&&!ver2Files.includes(m));
  const primaryButton=isTeacher?
    `<button class="btn primary" ${prompt?'':'disabled'} data-download-material="${prompt?esc(prompt.id):''}">${ver2Student?'기존 학생용 다운로드':isCustom?'학생용 다운로드':'제시문 PDF'}</button>`:
    (studentFiles?.primaryStudent?publishedFileButton(studentFiles.primaryStudent,'학생용 다운로드',true):`<button class="btn primary" ${prompt?'':'disabled'} data-download-material="${prompt?esc(prompt.id):''}">제시문 PDF</button>`);
  const teacherButton=isTeacher?
    (isCustom?`<button class="btn" ${teacherPdf?'':'disabled'} data-download-material="${teacherPdf?esc(teacherPdf.id):''}">${ver2Student?'기존 교사용 다운로드':'교사용 다운로드'}</button>`:isUniversity?`<button class="btn" ${teacherPdf?'':'disabled'} data-download-material="${teacherPdf?esc(teacherPdf.id):''}">교사용 다운로드</button>`:firstLine(s.prompt).includes('고려대')?`<button class="btn" ${solution?'':'disabled'} data-download-material="${solution?esc(solution.id):''}">해설 포함</button>`:''):
    (studentFiles?.primaryTeacher?publishedFileButton(studentFiles.primaryTeacher,'교사용 해설 다운로드'):teacherPdf?`<button class="btn" data-download-material="${esc(teacherPdf.id)}">교사용 해설 다운로드</button>`:'');
  const rooms=(state.data?.roomChoices||[]).filter(Boolean);
  return `<article class="session" data-session="${esc(s.id)}"><div class="session-top"><div><div class="date">${esc(s.dateText)} <span class="group">${esc(s.group)}</span></div></div><span class="team ${esc(displayTeam(s))}">${esc(sessionTeamLabel(s))}</span></div><div class="meta"><div><span>학생</span><strong>${esc((s.students||[]).join(' · '))}</strong></div><div><span>지도교사</span><strong>${esc(s.teacher)}</strong></div>${isTeacher?'':`<div><span>면접 교시</span><strong>${Number(s.classPeriod)?esc(s.classPeriod)+'교시':'미정'}</strong></div><div><span>면접실</span><strong>${esc(s.location&&s.location!=='미정'?s.location:'미정')}</strong></div>`}</div>${isTeacher?`<div class="period-location"><label>교시<select data-period="${esc(s.id)}"><option value="">미정</option>${[1,2,3,4,5,6,7,8].map(n=>`<option value="${n}" ${Number(s.classPeriod)===n?'selected':''}>${n}교시</option>`).join('')}</select></label><label>장소<select data-location="${esc(s.id)}" ${s.classPeriod?'':'disabled'}>${rooms.map(r=>`<option value="${esc(r)}" ${s.location===r?'selected':''}>${esc(r)}</option>`).join('')}</select></label></div>`:''}<div class="prompt"><strong>${esc(firstLine(s.prompt))}</strong><small>${esc(secondLine(s.prompt))}</small><div class="prompt-actions">${primaryButton}${teacherButton}${isTeacher&&isUniversity?`<label class="btn" style="display:inline-block;cursor:pointer">교사용 자료 업로드<input type="file" class="hidden" accept=".pdf,application/pdf" data-teacher-upload="${esc(s.id)}"></label>`:''}${!prompt?'<span class="status-missing">제시문 업로드 안 됨</span>':'<span class="status-ok">제시문 연결됨</span>'}</div>${ver2ForDisplay?'<div style="margin-top:6px;font-size:12px;color:#334155">기존 자료와 VER2 중 선택해 사용할 수 있으며, 둘 다 다운로드할 수 있습니다.</div>':''}${ver2Option}</div><div class="reference-box"><h4>참고자료</h4>${extraRefs.length?extraRefs.map(m=>fileRow(m,true)).join(''):'<div class="muted" style="font-size:12px">등록된 참고자료 없음</div>'}${isTeacher?`<label class="btn small" style="display:inline-block;margin-top:7px">참고자료 업로드<input type="file" class="hidden" data-reference-upload="${esc(s.id)}"></label>`:''}</div>${isTeacher?`<div class="session-actions"><button class="btn small" data-swap="${esc(s.id)}">일정 교환</button></div>`:''}</article>`;
}

function fileRow(m,deleteable){return `<div class="file-row"><span>${esc(m.fileName)}</span><div class="inline"><button class="btn small" data-download-material="${esc(m.id)}">다운로드</button>${deleteable&&state.auth.role==='teacher'?`<button class="btn small danger" data-delete-reference="${esc(m.id)}">삭제</button>`:''}</div></div>`;}
