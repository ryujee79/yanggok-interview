function renderSetup(){
  app.innerHTML=`<main class="login-wrap"><section class="login-card"><div class="eyebrow">YANGGOK 2027</div><h1>백엔드 연결 설정</h1><p>Google Apps Script 웹앱 주소를 한 번 입력해 주세요. 주소는 이 기기에 저장됩니다.</p><label class="field"><span>Apps Script 웹앱 URL</span><input id="apiUrl" placeholder="https://script.google.com/macros/s/.../exec" value="${esc(state.apiUrl)}"></label>${state.error?`<div class="alert error">${esc(state.error)}</div>`:''}<button id="saveApi" class="btn primary" style="width:100%">연결 확인 후 저장</button><div class="footer-note">GitHub Pages 주소는 그대로 유지됩니다.</div></section></main>`;
  qs('#saveApi').onclick=async()=>{
    const url=qs('#apiUrl').value.trim();
    if(!/^https:\/\/script\.google\.com\//.test(url)){state.error='Apps Script /exec 주소를 입력해 주세요.';return renderSetup();}
    state.apiUrl=url;state.error='';
    try{ state.busy='health'; qs('#saveApi').disabled=true; qs('#saveApi').textContent='연결 확인 중...'; await apiCall('health'); localStorage.setItem('yi-api-url',url); renderLogin(); }
    catch(e){state.error=e.message;renderSetup();}
    finally{state.busy='';}
  };
}

function renderLogin(){
  if(!state.apiUrl && !CONFIG.apiUrl) return renderSetup();
  app.innerHTML=`<main class="login-wrap"><section class="login-card"><div class="eyebrow">YANGGOK 2027</div><h1>제시문 면접 지도 일정</h1><p>교사는 이름과 개인 4자리 번호, 학생은 이름과 비밀번호로 로그인합니다.</p><div class="role-tabs"><button id="teacherTab" class="${state.role==='teacher'?'active':''}">교사</button><button id="studentTab" class="${state.role==='student'?'active':''}">학생</button></div><label class="field"><span>이름</span><input id="loginName" autocomplete="name" placeholder="${state.role==='teacher'?'교사 이름':'학생 이름'}"></label><label class="field"><span>비밀번호</span><input id="loginPassword" type="password" inputmode="${state.role==='teacher'?'numeric':'text'}" ${state.role==='teacher'?'maxlength="4"':''} placeholder="${state.role==='teacher'?'개인 4자리 번호':'초기 비밀번호 1234'}"></label>${state.error?`<div class="alert error">${esc(state.error)}</div>`:''}<button id="loginBtn" class="btn primary" style="width:100%">로그인</button><button id="changeApi" class="btn" style="width:100%;margin-top:8px">백엔드 주소 변경</button><div class="footer-note">학생은 최초 로그인 후 개인 비밀번호로 변경합니다.</div></section></main>`;
  qs('#teacherTab').onclick=()=>{state.role='teacher';state.error='';localStorage.setItem('yi-role','teacher');renderLogin();};
  qs('#studentTab').onclick=()=>{state.role='student';state.error='';localStorage.setItem('yi-role','student');renderLogin();};
  qs('#changeApi').onclick=()=>{state.apiUrl='';localStorage.removeItem('yi-api-url');renderSetup();};
  qs('#loginBtn').onclick=login;
  qs('#loginPassword').onkeydown=e=>{if(e.key==='Enter')login();};
}

async function login(){
  const name=qs('#loginName').value.trim(), password=qs('#loginPassword').value;
  if(!name||!password){state.error='이름과 비밀번호를 입력해 주세요.';return renderLogin();}
  const btn=qs('#loginBtn');btn.disabled=true;btn.textContent='로그인 중...';state.error='';
  try{
    const res=await apiCall('login',{role:state.role,name,password});
    state.token=res.token;state.auth={role:res.role,name:res.name,mustChange:!!res.mustChange};
    localStorage.setItem('yi-token',state.token);localStorage.setItem('yi-role',res.role);
    if(res.mustChange){state.modal='changePassword';render();return;}
    await refreshState(true);
  }catch(e){state.error=e.message;renderLogin();}
}

function logout(){ localStorage.removeItem('yi-token');state.token='';state.auth=null;state.data=null;state.studentQuery='';state.modal=null;state.notice='';renderLogin(); }

async function refreshState(renderAfter=true){
  if(!state.token) return;
  try{
    const data=await apiCall('getState',{token:state.token});
    state.data=data;state.auth=data.auth||state.auth;state.lastStateAt=Date.now();state.error='';
    if(renderAfter) render();
  }catch(e){ if(/만료/.test(e.message)){logout();return;} state.error=e.message;if(renderAfter)render(); }
}

function allStudents(){ return state.data ? [...new Set(state.data.sessions.flatMap(s=>s.students||[]))].sort((a,b)=>a.localeCompare(b,'ko')) : []; }
function allTeachers(){ return state.data ? [...new Set(state.data.sessions.flatMap(s=>s.teachers||splitTeachers(s.teacher)))].sort((a,b)=>a.localeCompare(b,'ko')) : []; }
function currentSessions(){ if(!state.data||!state.auth)return[]; return sortSessions(state.auth.role==='teacher'?state.data.sessions.filter(s=>(s.teachers||splitTeachers(s.teacher)).includes(state.auth.name)):state.data.sessions.filter(s=>(s.students||[]).includes(state.auth.name))); }
function userTeams(){return [...new Set(currentSessions().map(s=>s.team))];}
function materialList(kind, filter=()=>true){ return (state.data?.materials||[]).filter(m=>m.kind===kind && filter(m)); }
function sessionMaterials(session,kind){
  const mats=state.data?.materials||[];
  if(['prompt','solution'].includes(kind)) return mats.filter(m=>m.kind===kind && m.team===session.team && canonical(m.fileName)===canonical(session.pdfFile));
  return mats.filter(m=>m.kind===kind && m.sessionId===session.id);
}
function zipMaterial(team,kind){ return (state.data?.materials||[]).find(m=>m.team===team && m.kind===kind); }
