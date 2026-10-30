/* Non-invasive dashboard enhancement for migration-preview.html. Existing API and student view remain intact. */
(function () {
'use strict';
const lessonsSeed={"고승":[[1,3,5,6],[3,4],[2,4,5,7],[5,6],[1,4]],"권혁":[[1,3,4,6],[2,5],[4,5,7],[2,5,6],[4]],"기윤":[[1,3,4,6],[2,4,6],[3,4,6,7],[2,5,6],[1,3,4]],"김계":[[1,2,4,5],[3,4],[1,4,6,7],[1,3,4,6],[3,4]],"김낙":[[2,5],[1,3,4,6],[4,6],[4,5],[1,4]],"김대":[[1,4,6],[4,5],[3,4,7],[3,5,6],[3,4]],"김병":[[3,4,6],[1,2,5,6],[2,3,5,6],[1,2,4],[2,4]],"김영":[[2,3,5],[4,6],[2,3,5,7],[2,3,5],[2,3]],"김점":[[3,4],[1,5],[1,3,4,7],[1,3,5,6],[2,4]],"김중":[[1,3,4,6],[2,4,5],[1,3,4,6],[1,3,4],[1,4]],"김지":[[1,2,5,6],[2,3,5,6],[1,2,3,5,6],[1,3,4,6],[1,2,4]],"김진":[[3,5,6],[1,2,4,6],[1,4,5,7],[2,3,6],[2,4]],"김희":[[2,4],[1,6],[2,5,6],[1,4,5],[2]],"노석":[[2,3],[1,4,6],[2,4,5,6],[1,2,4,5],[2,4]],"박문":[[2,3,5],[3,4,6],[2,3,5],[1,2,5],[1,2,3]],"박윤":[[1,2,4],[1,2,5,6],[2,3,5],[1,2,4,6],[1,3]],"손유":[[2,4,6],[2,3],[2,3,5,7],[2,4,6],[1,3]],"송대":[[2,4,5],[3,4],[3,4,6,7],[1,2,4,5,6],[2,4]],"신연":[[2,5],[1,3,4,6],[2,4,6],[1,4,5],[1,2,4]],"신해":[[3,5,6],[2,3,5],[1,3,4],[3,4],[3]],"안진":[[1,2,5],[1,3,4,6],[2,3,5,6],[2,4,6],[2,3]],"오중":[[1,3,4,6],[1,2,5],[1,3,5,7],[2,3,6],[2,3]],"유미":[[1,3,4,6],[2,4,5],[1,3,4,5,7],[2,3,5,6],[3,4]],"유은":[[1,2,4,5],[1,2,5,6],[1,3,6,7],[3,6],[1,2]],"유제":[[1,3,5,6],[2,3,5,6],[1,2],[3,4],[1,2]],"유종":[[1,3,5,6],[2,3,5,6],[3,5,7],[2,4,6],[2,3]],"유지":[[1,2,4],[1,2,4,5],[4,5,7],[2,3,5],[1,3,4]],"윤혜":[[1,3,4,6],[2,5],[1,3,5,7],[2,3,6],[3]],"이경":[[2,5],[1,2,4,6],[1,2,4,6],[1,4,5],[1,4]],"이기":[[3,4,6],[3,4],[1,2,4,6],[2,3,5],[3]],"이나":[[1,3,4,6],[3,4,6],[1,3,5,7],[1,2,4,6],[2,3]],"이병":[[2,4,5],[1,3,5],[3,4,6,7],[2,3,5,6],[2,4]],"이석":[[1,5,6],[1,3,4,5],[2,4,6],[1,3,4],[1,2,4]],"이수":[[1,2,3,5,6],[2,3,4,5,6],[1,2,3,5,6,7],[1,2,3,5,6],[1,3,4]],"이주":[[3,5],[1,3],[1,2,6,7],[1,2,4],[1,2]],"이진":[[3,4],[1,4,6],[2,4,5,7],[5,6],[1,3,4]],"인상":[[1,2,5],[1,3,5],[1,2,4,6],[1,3,5],[1,4]],"장덕":[[2,5,6],[1,2,5,6],[1,2,6],[1,3,4],[1,2]],"장현":[[1,2,4],[1,2,5],[1,3,5,7],[2,3,6],[3]],"정수":[[1,2,4,6],[1,2,3],[1,3,5,6],[1,3,4],[2,3]],"조현":[[2,3,5,6],[1,3,5],[1,3,4,7],[1,5],[1,3]],"천세":[[2,4,6],[1,3,4,6],[1,2,5,6],[1,4,6],[2,3]],"최성":[[1,3,4],[2,4,6],[2,4,5,7],[1,2,5,6],[1,3,4]],"홍상":[[2,5],[1,3,4,6],[2,4,6],[1,4,5],[1,2,4]],"황혜":[[1,3,5,6],[2,3,5,6],[1,2,6],[1,3,4],[1,2]]};
const kstToday=()=>{const f=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const p=k=>f.find(x=>x.type===k).value;return p('year')+'-'+p('month')+'-'+p('day');};
const ui={scope:'mine',past:false,date:kstToday(),focus:'',searchDraft:'',soyulSearchClass:'',editBookingId:'',editDraft:null,editError:'',editSaving:false,newBooking:null,bookingError:'',bookingSaving:false,studentDate:kstToday(),notice:'',noticeTimeout:null};
let activeLessons=lessonsSeed;
try{const s=JSON.parse(localStorage.getItem('yi-class-timetable-v1')||'null');if(s&&typeof s==='object'&&Object.keys(s).length)activeLessons=s;}catch(_){}
const legacyRender=render,legacySessionCard=sessionCard;
const dayIndex=date=>{const d=new Date(date+'T12:00:00').getDay();return d>=1&&d<=5?d-1:-1;};
const dateOffset=(date,n)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
const sessionPeriod=s=>{const n=Number(s.classPeriod);return n>=1&&n<=8?n:99;};
const dateKey=item=>item.type==='manual'?item.data.dateKey:dateKeyFromText(item.data.dateText);
const period=item=>item.type==='manual'?Number(item.data.period):sessionPeriod(item.data);
const itemSort=(a,b)=>dateKey(a).localeCompare(dateKey(b))||period(a)-period(b)||String(a.data.id).localeCompare(String(b.data.id));
const isMineSession=s=>(s.teachers||splitTeachers(s.teacher)).includes(state.auth.name);
const mineBookings=()=> (state.data?.manualBookings||[]).filter(b=>b.teacher===state.auth.name);
function matchesScope(s){return ui.scope==='all'||ui.scope==='mine'&&isMineSession(s)||ui.scope===displayTeam(s);}
function allEntries(){
  const ss=(state.data?.sessions||[]).filter(s=>state.studentQuery?.trim()?true:matchesScope(s)).map(data=>({type:'session',data}));
  const bb=(state.data?.manualBookings||[]).filter(b=>state.studentQuery?.trim()||ui.scope==='all'||ui.scope==='mine'&&b.teacher===state.auth.name).map(data=>({type:'manual',data}));
  let out=[...ss,...bb].filter(x=>ui.past?dateKey(x)<kstToday():dateKey(x)>=kstToday());
  if(state.studentQuery){
    const q=state.studentQuery.trim();
    out=out.filter(e=>(e.type==='session'?(e.data.students||[]).join(' '):e.data.student||'').includes(q));
    if(q==='김소율'){
      // The interview roster's 김소율 is always the seventh-class student.
      if(ui.soyulSearchClass==='7') out=out.filter(e=>e.type==='session'?(e.data.students||[]).includes('김소율'):(e.data.student||'').includes('7반'));
      else if(ui.soyulSearchClass==='2') out=out.filter(e=>e.type==='manual'&&(e.data.student||'').includes('2반'));
      else out=[];
    }
  }
  return out.sort(itemSort);
}
function weekDates(date){const ix=dayIndex(date),offset=ix<0?(new Date(date+'T12:00:00').getDay()===0?-6:-5): -ix;const first=dateOffset(date,offset);return Array.from({length:5},(_,i)=>dateOffset(first,i));}
function atSlot(date,p){
 const sessions=(state.data?.sessions||[]).filter(s=>dateKeyFromText(s.dateText)===date&&sessionPeriod(s)===p&&isMineSession(s));
 const manuals=mineBookings().filter(b=>b.dateKey===date&&Number(b.period)===p);
 const allNames=[...sessions.flatMap(s=>s.students||[]),...manuals.flatMap(b=>uiStudentNames(b.student))].filter(Boolean);
 const allRooms=[...sessions.map(s=>s.location),...manuals.map(b=>b.room)].map(r=>String(r||'').trim()).filter(Boolean);
 return {hasInterview:sessions.length+manuals.length>0,hasSession:sessions.length>0,hasManual:manuals.length>0,hasPractice:manuals.some(b=>b.kind==='practice'),names:[...new Set(allNames)],rooms:[...new Set(allRooms)]};
}
function teacherT(name){
 return String(name||'').split(/[·,/&+]/).map(n=>n.trim()).filter(Boolean).map(n=>n.replace(/T$/i,'')+'T').join('·');
}
function teacherStudents(teacher,studentNames){
 const list=(Array.isArray(studentNames)?studentNames:uiStudentNames(studentNames)).map(n=>String(n||'').trim()).filter(Boolean);
 return teacherT(teacher)+'\n('+list.join(',')+')';
}
function renderTimetable(){
 const lesson=activeLessons[state.auth.name.slice(0,2)];
 const week=weekDates(ui.date),currDay=dayIndex(ui.date);
 const head=week.map((d,i)=>'<th class="'+(i===currDay?'yg-current':'')+'">'+['월','화','수','목','금'][i]+'<br>'+d.slice(5)+'</th>').join('');
 const cells=Array.from({length:8},(_,i)=>i+1).map(p=>'<tr><th>'+p+'교시</th>'+week.map((d,i)=>{
  const cls=Boolean(lesson?.[i]?.includes(p)),a=atSlot(d,p);
  const interviewKind=a.hasSession?'제시문면접':a.hasManual?'일반면접':'';
  const heading=interviewKind?(cls?'수업&':'')+interviewKind:(cls?'수업':'');
  const text=interviewKind?heading+'\n('+a.names.join(',')+')'+(a.rooms.length?'\n'+a.rooms.join(','):''):heading;
  const color=a.hasSession?'yg-interview':a.hasPractice?'yg-practice-lesson':a.hasManual?'yg-manual-lesson':cls?'yg-class':'';
  return '<td class="'+color+' '+(d===ui.date?'yg-current':'')+'" title="'+esc(text)+'">'+(text?esc(text):'')+'</td>';
 }).join('')+'</tr>').join('');
 return (lesson?'':'<div class="yg-missing">이 교사의 수업 시간표가 없습니다. 전체 시간표에서 교사 약칭을 확인해 주세요.</div>')+
  '<table class="yg-timetable"><thead><tr><th>교시</th>'+head+'</tr></thead><tbody>'+cells+'</tbody></table>'+
  '<div class="yg-calendar-note">회색: 수업 · 초록: 제시문 면접 · 노랑: 직접 예약 (수업과 면접이 겹치면 면접 종류의 색상 적용)</div>';
}
function teacherBusyAt(date,p){
 return (state.data?.sessions||[]).some(s=>dateKeyFromText(s.dateText)===date&&sessionPeriod(s)===p&&isMineSession(s))||
        mineBookings().some(b=>b.dateKey===date&&Number(b.period)===p);
}
function classTeacherLabel(label){
 const str=String(label||'').trim(),parts=str.split('·').map(x=>x.trim()).filter(Boolean);
 if(/연극/.test(str) && !/^수업\s*·\s*[가-힣]{2,5}\s*·/.test(str))return '연극';
 if(!/^수업/.test(str))return parts[0]||'';
 // "수업 · 연극" and similar subject-only entries do not identify a teacher.
 const name=parts[1]||'';
 if(parts.length<3||!/^[가-힣]{2,5}T?$/.test(name))return '수업';
 return teacherT(name)+'\n(수업)';
}
function roomWeekday(date){
 const day=new Date(date+'T12:00:00').getDay();
 return '('+['일','월','화','수','목','금','토'][day]+')';
}
function renderRooms(){
 const day=ui.date,rooms=(state.data?.roomChoices||[]).filter(x=>x&&x!=='미정');
 if(!rooms.length)return '<div class="empty">등록된 면접실이 없습니다.</div>';
 const head=rooms.map(r=>'<th class="yg-room-name">'+esc(r)+'</th>').join('');
 const rows=Array.from({length:8},(_,i)=>i+1).map(p=>'<tr><th>'+p+'교시</th>'+rooms.map(r=>{
  const info=usageInfo(day,p,r),kind=info.kind==='class'?'classuse':info.kind==='interview'?'session':info.kind;
  const mine=kind==='manual'?info.booking?.teacher===state.auth.name:
             kind==='practice'?(info.bookings||[]).some(b=>b.teacher===state.auth.name):
             kind==='session'?(info.session?.teacher===state.auth.name||(info.session?.teachers||[]).includes(state.auth.name)):false;
  const busy=kind==='free'&&teacherBusyAt(day,p);
  const canAct=(kind==='free'&&!busy)||(kind==='manual'&&mine)||kind==='practice';
  const emptyDueToBusy=kind==='free'&&busy;
  const tag=kind==='free'&&!emptyDueToBusy?'예약 가능':kind==='practice'?'개인연습 · 중복 가능':'';
  const detail=emptyDueToBusy?'':kind==='free'?'':kind==='classuse'?classTeacherLabel(info.label||info.text):
     kind==='manual'?teacherStudents(info.booking.teacher,info.booking.student):
     kind==='practice'?(info.bookings||[]).map(b=>teacherStudents(b.teacher,b.student)).join('\n'):
     teacherStudents(info.session?.teacher,info.session?.students||[]);
  const detailLines=String(detail||'').split('\n');
  const hasTeacher=detailLines.length>1&&/T$/.test(detailLines[0]);
  const detailHtml=hasTeacher?'<strong class="yg-room-teacher">'+esc(detailLines[0])+'</strong>'+esc(detailLines.slice(1).join('\n')):esc(detail);
  const cssKind=kind+(emptyDueToBusy?' busy-self':'')+(mine?' is-mine':'');
  const kindLabel=kind==='manual'?'선생님과 면접':kind==='practice'?'개인연습':kind==='session'?'제시문 면접':'';
  const title=emptyDueToBusy?'':[kindLabel,tag,detail].filter(Boolean).join(' · ');
  return '<td><button class="yg-room-btn '+cssKind+'" '+(canAct?'data-yg-book="'+esc(encodeURIComponent(r))+'|'+p+'"':'disabled')+' title="'+esc(title)+'" aria-label="'+esc(emptyDueToBusy?'빈 칸':title||'예약 가능')+'">'+(tag?'<strong>'+esc(tag)+'</strong>':'')+(detail?'<span class="yg-room-detail">'+detailHtml+'</span>':'')+'</button></td>';
 }).join('')+'</tr>').join('');
 return '<div style="overflow:auto"><table class="yg-rooms"><thead><tr><th>교시</th>'+head+'</tr></thead><tbody>'+rows+'</tbody></table></div><div class="yg-room-legend"><span>예약 가능</span><span class="manual">선생님과 면접</span><span class="practice">개인연습</span><span class="session">제시문</span><span class="classuse">수업</span><span class="mine">내 면접 일정</span></div>';
}
function itemHtml(entry){
 const s=entry.data;
 if(entry.type==='manual'){
  return '<div class="yg-session yg-manual"><div class="yg-manual-actions"><div><div class="yg-s-title">'+esc(fmtDate(s.dateKey))+' · '+esc(s.period)+'교시 · '+(s.kind==='practice'?'개인연습':'선생님과 면접')+'</div><div class="yg-s-meta">'+esc(s.student||'')+' · '+esc(s.room||'')+' · '+esc(s.teacher||'')+'</div></div>'+
  (s.teacher===state.auth.name?'<div class="yg-manual-buttons"><button type="button" class="btn small" data-yg-edit="'+esc(s.id)+'">예약 수정</button><button type="button" class="btn small danger" data-yg-cancel="'+esc(s.id)+'">예약 취소</button></div>':'')+'</div></div>';
 }
 const st=s.students||[],sub=firstLine(s.prompt);
 const safe=String(s.id).replace(/"/g,'&quot;');
 let detail=legacySessionCard(s);
 detail=detail.replace(/<label class="btn small" style="display:inline-block;margin-top:7px">참고자료 업로드<input[^>]*><\/label>/g,'').replace(/<label class="material-button upload">[\s\S]*?<\/label>/g,'');
 return '<details class="yg-session" data-yg-detail="'+esc(safe)+'"><summary><div class="yg-s-title">'+esc(s.dateText)+' · '+(sessionPeriod(s)===99?'교시 미정':sessionPeriod(s)+'교시')+' · '+esc(st.join('·'))+'</div><div class="yg-s-meta">'+esc(s.teacher)+' · '+esc(sub)+' · '+esc(s.location||'미정')+'</div></summary><div class="yg-detail">'+detail+'</div></details>';
}
function dashboardRender(){
 if(!state.token||!state.auth||state.auth.role!=='teacher'||!state.data||state.auth.mustChange)return legacyRender();
 if(state.data.teacherTimetables && Object.keys(state.data.teacherTimetables).length) activeLessons=state.data.teacherTimetables;
 const expanded=new Set(qsa('details[data-yg-detail][open]').map(n=>n.dataset.ygDetail));
 // Save independent scroll positions before rebuilding any dashboard HTML.
 const panelScroll=new Map(qsa('.yg-panel[id]').map(panel=>{
   const body=panel.querySelector('.yg-panel-body');
   return [panel.id,body?{top:body.scrollTop,left:body.scrollLeft}:null];
 }));
 const viewportScroll={top:window.scrollY,left:window.scrollX};

 const entries=allEntries(),today=kstToday(),todayCount=(state.data?.sessions||[]).length;
 const scopeLabel={mine:'나의 일정',all:'전체 일정',humanities:'고려대(인문)',yonsei:'연세대',natural:'고려대(자연)팀'}[ui.scope];
 const search='<div class="yg-head-search"><label for="ygStudentSearch">학생 찾기</label><input id="ygStudentSearch" list="studentNames" value="'+esc(ui.searchDraft)+'" placeholder="학생 이름 입력" autocomplete="off"><datalist id="studentNames">'+allStudents().map(n=>'<option value="'+esc(n)+'"></option>').join('')+'</datalist><button type="button" class="btn" id="ygSearchBtn">조회</button><button type="button" class="btn" id="ygResetSearchBtn">초기화</button></div>';
 app.innerHTML='<main class="shell yg-dashboard"><header class="topbar"><div class="brand"><small>YANGGOK 2027</small><h1>제시문 면접 지도</h1></div><div class="userbox"><span class="pill">교사 · '+esc(state.auth.name)+'</span><button class="btn" id="refreshBtn">새로고침</button><button class="btn" id="logoutBtn">로그아웃</button></div></header>'+
 '<nav class="yg-head-menu" aria-label="면접 일정 관리 메뉴">'+
 '<button type="button" id="ygNow" class="yg-menu-switch '+(!ui.past?'active':'')+'">오늘 이후 일정</button>'+
 '<button type="button" id="ygPast" class="yg-menu-switch '+(ui.past?'active':'')+'">면접 이력 보기</button>'+
 '<button type="button" class="btn primary" id="scheduleUploadBtn">일정 업로드</button>'+
 '<button type="button" class="btn" id="materialUploadBtn">제시문 업로드</button>'+
 (state.auth.name==='유제호'?'<button type="button" class="btn" id="ygUploadBtn">전체 교사 시간표 업로드</button>':'')+
 '<button type="button" class="btn" id="roomManageBtn">특별실 관리</button>'+
 '<button type="button" class="btn" id="historyBtn">변경 이력</button>'+
 search+
 '<input id="scheduleFile" type="file" accept=".xlsx,.xls" class="hidden">'+
 '<input id="ygTimetableFile" type="file" accept=".hwpx,.xlsx,.xls" class="hidden">'+
 '</nav>'+
 (state.notice?'<div class="alert success yg-flash">'+esc(state.notice)+'</div>':'')+(state.error?'<div class="alert error">'+esc(state.error)+'</div>':'')+
 '<div class="yg-workspace">'+
 '<section class="yg-panel" id="ygPanelMine"><div class="yg-panel-head"><h2>'+esc(ui.past?'면접 이력':scopeLabel)+'</h2><div class="yg-panel-context"><select id="ygScope" aria-label="일정 범위 선택"><option value="mine"'+(ui.scope==='mine'?' selected':'')+'>나의 일정</option><option value="all"'+(ui.scope==='all'?' selected':'')+'>전체 일정</option><option value="humanities"'+(ui.scope==='humanities'?' selected':'')+'>고려대(인문)</option><option value="yonsei"'+(ui.scope==='yonsei'?' selected':'')+'>연세대</option><option value="natural"'+(ui.scope==='natural'?' selected':'')+'>고려대(자연)팀</option></select><span class="count">'+entries.length+'건 · '+(ui.past?'지난 일정':'오늘 이후')+'</span></div></div><div class="yg-panel-body"><div class="yg-summary-list">'+(entries.length?entries.map(itemHtml).join(''):'<div class="empty">표시할 일정이 없습니다.</div>')+'</div></div></section>'+
 '<section class="yg-panel" id="ygPanelTimetable"><div class="yg-panel-head"><h2>내 시간표 보기</h2><span class="count">'+esc(state.auth.name)+'</span></div><div class="yg-panel-body">'+renderTimetable()+'</div></section>'+
 '<section class="yg-panel" id="ygPanelRooms"><div class="yg-panel-head"><h2>실별 사용 현황</h2><div class="yg-date-tools"><button class="btn" id="ygPrev" aria-label="전날">‹</button><input id="ygDate" type="date" value="'+esc(ui.date)+'"><span id="ygRoomWeekday" class="yg-room-weekday">'+roomWeekday(ui.date)+'</span><button class="btn" id="ygNext" aria-label="다음날">›</button></div></div><div class="yg-panel-body">'+renderRooms()+'</div></section>'+
 '</div></main>'+renderModal()+renderEditBookingModal()+renderNewBookingModal();
 qsa('details[data-yg-detail]').forEach(n=>{if(expanded.has(n.dataset.ygDetail))n.open=true;});
 bindMainEvents();bindDashEvents();
 panelScroll.forEach((position,id)=>{
   const body=qs('#'+id+' .yg-panel-body');
   if(body&&position){body.scrollTop=position.top;body.scrollLeft=position.left;}
 });
 if(window.scrollY!==viewportScroll.top||window.scrollX!==viewportScroll.left){
   window.scrollTo(viewportScroll.left,viewportScroll.top);
 }

 if(state.notice&&/완료|예약했습니다|취소했습니다|변경했습니다|삭제했습니다|추가했습니다|반영했습니다|업로드했습니다/.test(state.notice)){
  if(ui.notice!==state.notice){ui.notice=state.notice;if(ui.noticeTimeout)clearTimeout(ui.noticeTimeout);ui.noticeTimeout=setTimeout(()=>{if(state.notice===ui.notice){state.notice='';ui.notice='';render();}},3500);}
 }else if(!state.notice){ui.notice='';}
}

function openBookingEditor(id){
 const b=(state.data?.manualBookings||[]).find(x=>x.id===id&&x.teacher===state.auth?.name);
 if(!b){state.error='본인이 등록한 예약만 수정할 수 있습니다.';render();return;}
 ui.editBookingId=id;
 ui.editDraft={dateKey:b.dateKey,period:Number(b.period),room:b.room,student:b.student};
 ui.editError='';ui.editSaving=false;state.error='';
 render();
 qs('#ygEditStudent')?.focus();
}
function closeBookingEditor(){
 if(ui.editSaving)return;
 ui.editBookingId='';ui.editDraft=null;ui.editError='';
 render();
}
function renderEditBookingModal(){
 const b=(state.data?.manualBookings||[]).find(x=>x.id===ui.editBookingId&&x.teacher===state.auth?.name);
 if(!b)return '';
 const draft=ui.editDraft||b;
 const rooms=(state.data?.roomChoices||[]).filter(r=>r&&r!=='미정');
 const periods=Array.from({length:8},(_,i)=>i+1);
 const choices=(values,selected)=>values.map(v=>'<option value="'+esc(v)+'"'+(String(v)===String(selected)?' selected':'')+'>'+esc(v)+'</option>').join('');
 return '<div id="ygEditOverlay" class="yg-edit-overlay">'+
 '<section class="yg-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="ygEditTitle">'+
 '<form id="ygEditBookingForm"><h2 id="ygEditTitle">직접 예약 수정</h2>'+
 '<p>기존 예약을 유지하면서 학생·날짜·교시·면접실을 변경합니다. 중복 일정은 저장되지 않습니다.</p>'+
 '<div class="yg-edit-fields">'+
 '<label>면접 학생<input id="ygEditStudent" name="student" type="text" required maxlength="300" value="'+esc(draft.student||'')+'" placeholder="학생 이름을 쉼표로 구분"></label>'+
 '<label>날짜<input id="ygEditDate" name="dateKey" type="date" required value="'+esc(draft.dateKey||'')+'"></label>'+
 '<label>교시<select id="ygEditPeriod" name="period">'+choices(periods,draft.period)+'</select></label>'+
 '<label>면접실<select id="ygEditRoom" name="room">'+choices(rooms,draft.room)+'</select></label>'+
 '</div>'+
 (ui.editError?'<div role="alert" class="yg-edit-error">'+esc(ui.editError)+'</div>':'')+
 '<div class="yg-edit-actions">'+
 '<button type="submit" class="btn primary"'+(ui.editSaving?' disabled':'')+'>'+(ui.editSaving?'수정 중…':'수정 저장')+'</button>'+
 '<button type="button" id="ygEditClose" class="btn"'+(ui.editSaving?' disabled':'')+'>닫기</button>'+
 '<button type="button" id="ygEditDelete" class="btn danger"'+(ui.editSaving?' disabled':'')+'>예약 취소</button>'+
 '</div></form></section></div>';
}
function confirmStudentClassesInText(value){
  let text=String(value||'').trim();
  const duplicates=state.data?.duplicateStudentOptions||{};
  for(const [name,options] of Object.entries(duplicates)){
    const pattern=new RegExp('(^|[\\s,，、·\\/＆&+])('+name+')(?!\\s*[（(]\\s*(?:\\d+반|3\\d{3})\\s*[）)])(?=$|[\\s,，、·\\/＆&+])','g');
    if(!pattern.test(text))continue;
    const labels=options.map(o=>o.classNo+'반 '+o.studentNo);
    const picked=window.prompt(name+' 학생은 동명이인입니다.\n해당 학생의 반 또는 학번을 입력하세요.\n'+labels.join(' / '),'');
    if(picked===null)return null;
    const typed=picked.trim().replace(/반/g,'');
    const byNo=options.find(o=>o.studentNo===typed);
    const byClass=options.filter(o=>String(o.classNo)===typed);
    const selected=byNo||(byClass.length===1?byClass[0]:null);
    if(!selected){alert('반이 같은 동명이인은 학번 4자리로 구분해 주세요.');return null;}
    const classCount=options.filter(o=>o.classNo===selected.classNo).length;
    const suffix=classCount>1?selected.studentNo:selected.classNo+'반';
    text=text.replace(pattern,(_,before,student)=>before+student+'('+suffix+')');
  }
  return text;
}
async function saveBookingEdit(){
 if(ui.editSaving)return;
 const orig=(state.data?.manualBookings||[]).find(x=>x.id===ui.editBookingId&&x.teacher===state.auth?.name);
 if(!orig){ui.editError='수정할 예약을 찾지 못했습니다. 새로고침해 주세요.';render();return;}
 const payload={
  id:orig.id,dateKey:qs('#ygEditDate')?.value||'',
  period:Number(qs('#ygEditPeriod')?.value),
  room:qs('#ygEditRoom')?.value||'',
  student:(qs('#ygEditStudent')?.value||'').trim()
 };
 const confirmedStudent=confirmStudentClassesInText(payload.student);
 if(confirmedStudent===null)return;
 payload.student=confirmedStudent;
 ui.editDraft=payload;
 if(!payload.student){ui.editError='면접 학생을 입력해 주세요.';render();return;}
 if(!payload.dateKey||!Number.isInteger(payload.period)||!payload.room){ui.editError='날짜, 교시, 면접실을 확인해 주세요.';render();return;}
 const conflict=bookingConflictUI(payload.dateKey,payload.period,payload.room,payload.student,orig.id);
 if(conflict){ui.editError=conflict+' 기존 예약은 유지됩니다.';render();return;}
 ui.editSaving=true;ui.editError='';
 const saveBtn=qs('#ygEditBookingForm button[type="submit"]');
 if(saveBtn){saveBtn.disabled=true;saveBtn.textContent='수정 중…';}
 try{
  await apiCall('updateManualBooking',{token:state.token,...payload});
  ui.editBookingId='';ui.editDraft=null;ui.editError='';ui.editSaving=false;
  state.notice='직접 예약을 수정했습니다.';
  await refreshState(true);
 }catch(e){
  ui.editSaving=false;
  ui.editError=/알 수 없는 요청.*updateManualBooking/.test(String(e.message||''))?
   '서버에 예약 수정 기능이 아직 반영되지 않았습니다. Apps Script 최신 코드로 기존 배포를 업데이트해 주세요.' :
   String(e.message||'예약 수정에 실패했습니다.');
  render();
 }
}
function uiStudentNames(value){
 return String(value||'').replace(/\([^)]*\)|（[^）]*）/g,'').split(/[,，、·\/＆&+\n]+|\s+(?=[가-힣]{2,4}(?:\s|$))/).map(x=>x.trim().replace(/\s+/g,'')).filter(Boolean);
}
function bookingConflictUI(date,period,room,student,excludeBookingId){
 const name=state.auth?.name||'',studentSet=new Set(uiStudentNames(student));
 for(const use of state.data?.roomUses||[]){
  if(roomUseMatches(use,date,period,room))return '해당 면접실은 수업 또는 행사로 사용 중입니다.';
 }
 for(const s of state.data?.sessions||[]){
  if(dateKeyFromText(s.dateText)!==date||sessionPeriod(s)!==period)continue;
  if((s.teachers||splitTeachers(s.teacher)).includes(name))return '같은 교시에 이미 제시문 면접이 있습니다. 직접 예약할 수 없습니다.';
  if((s.students||[]).some(n=>studentSet.has(n)))return '해당 학생에게 같은 교시 제시문 면접이 이미 있습니다.';
  if(s.location===room)return '면접실이 같은 교시 제시문 면접으로 사용 중입니다.';
 }
 for(const b of state.data?.manualBookings||[]){
  if(b.id===excludeBookingId||b.dateKey!==date||Number(b.period)!==period)continue;
  if(b.teacher===name)return '같은 교시에 이미 직접 예약한 면접이 있습니다.';
  if(uiStudentNames(b.student).some(n=>studentSet.has(n)))return '해당 학생에게 같은 교시 다른 직접 예약이 이미 있습니다.';
  if(b.room===room)return '같은 면접실에 다른 직접 예약이 이미 있습니다.';
 }
 return '';
}
async function bookRoom(room,p){
 const date=ui.date,info=usageInfo(date,p,room);
 if(info.kind==='free'){
  const entered=prompt(fmtDate(date)+' '+p+'교시 '+room+'\n면접 학생 이름을 입력하세요.');
  if(!entered?.trim())return;
  const student=confirmStudentClassesInText(entered);
  if(!student)return;
  const conflict=bookingConflictUI(date,p,room,student.trim());
  if(conflict){state.error=conflict;render();return;}
  try{await apiCall('createManualBooking',{token:state.token,dateKey:date,period:p,room,student:student.trim()});state.notice='직접 예약했습니다.';await refreshState(true);}
  catch(e){state.error=e.message;render();}
 }else if(info.kind==='manual'&&info.booking.teacher===state.auth.name)openBookingEditor(info.booking.id);
}
async function cancelBooking(id){
 if(!confirm('이 직접 예약을 취소하시겠습니까?'))return;
 try{await apiCall('cancelManualBooking',{token:state.token,id});if(ui.editBookingId===id){ui.editBookingId='';ui.editDraft=null;ui.editError='';}state.notice='직접 예약을 취소했습니다.';await refreshState(true);}
 catch(e){state.error=e.message;render();}
}
// A clicked interview determines the date shown by the room and timetable calendars.
function selectInterviewDate(sessionId){
 const session=(state.data?.sessions||[]).find(s=>s.id===sessionId);
 const nextDate=session?dateKeyFromText(session.dateText):'';
 if(!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(nextDate)||ui.date===nextDate)return;
 ui.date=nextDate;
 const dateInput=qs('#ygDate');if(dateInput)dateInput.value=nextDate;
 const weekday=qs('#ygRoomWeekday');if(weekday)weekday.textContent=roomWeekday(nextDate);
 const timetable=qs('#ygPanelTimetable .yg-panel-body');
 if(timetable)timetable.innerHTML=renderTimetable();
 const roomBody=qs('#ygPanelRooms .yg-panel-body');
 if(roomBody){
   const top=roomBody.scrollTop,left=roomBody.scrollLeft;
   roomBody.innerHTML=renderRooms();
   roomBody.scrollTop=top;roomBody.scrollLeft=left;
   qsa('[data-yg-book]',roomBody).forEach(btn=>btn.addEventListener('click',()=>{
     const [room,p]=btn.dataset.ygBook.split('|');
     bookRoom(decodeURIComponent(room),Number(p));
   }));
 }
}
function bindDashEvents(){
 qs('#ygScope')?.addEventListener('change',e=>{ui.scope=e.target.value;render();});
 qsa('details[data-yg-detail] > summary').forEach(summary=>summary.addEventListener('click',()=>{
   selectInterviewDate(summary.parentElement.dataset.ygDetail);
 }));
 qsa('details[data-yg-detail] [data-period],details[data-yg-detail] [data-location]').forEach(field=>
   field.addEventListener('focus',()=>selectInterviewDate(field.closest('details').dataset.ygDetail))
 );
 qs('#ygStudentSearch')?.addEventListener('input',e=>{ui.searchDraft=e.target.value;});
 const applyStudentSearch=()=>{
    ui.searchDraft=(qs('#ygStudentSearch')?.value||'').trim();
    if(ui.searchDraft==='김소율'){
      const selected=window.prompt('김소율 학생은 동명이인입니다.\n2반 김소율은 2, 7반 김소율은 7을 입력해 주세요.\n제시문 면접 대상자는 7반 김소율입니다.','');
      if(selected===null)return;
      if(!['2','7'].includes(selected.trim())){alert('2 또는 7을 입력해 주세요.');return;}
      ui.soyulSearchClass=selected.trim();
    }else ui.soyulSearchClass='';
    state.studentQuery=ui.searchDraft;render();
  };
 qs('#ygSearchBtn')?.addEventListener('click',applyStudentSearch);
 qs('#ygStudentSearch')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applyStudentSearch();}});
 qs('#ygResetSearchBtn')?.addEventListener('click',()=>{ui.searchDraft='';state.studentQuery='';ui.soyulSearchClass='';ui.scope='mine';ui.past=false;ui.date=kstToday();render();});
 qs('#ygNow')?.addEventListener('click',()=>{ui.past=false;render();});
 qs('#ygPast')?.addEventListener('click',()=>{ui.past=true;render();});
 qs('#ygTimetableBtn')?.addEventListener('click',()=>qs('#ygPanelTimetable')?.scrollIntoView({behavior:'smooth',block:'nearest'}));
 qs('#ygRoomsBtn')?.addEventListener('click',()=>qs('#ygPanelRooms')?.scrollIntoView({behavior:'smooth',block:'nearest'}));
 qs('#ygPrev')?.addEventListener('click',()=>{ui.date=dateOffset(ui.date,-1);render();});
 qs('#ygNext')?.addEventListener('click',()=>{ui.date=dateOffset(ui.date,1);render();});
 qs('#ygDate')?.addEventListener('change',e=>{if(/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)){ui.date=e.target.value;render();}});
 qsa('[data-yg-book]').forEach(btn=>btn.addEventListener('click',()=>{const [room,p]=btn.dataset.ygBook.split('|');bookRoom(decodeURIComponent(room),Number(p));}));
 qsa('[data-yg-cancel]').forEach(btn=>btn.addEventListener('click',()=>cancelBooking(btn.dataset.ygCancel)));
 qsa('[data-yg-edit]').forEach(btn=>btn.addEventListener('click',()=>openBookingEditor(btn.dataset.ygEdit)));
 qs('#ygEditBookingForm')?.addEventListener('submit',e=>{e.preventDefault();saveBookingEdit();});
 qs('#ygEditClose')?.addEventListener('click',closeBookingEditor);
 qs('#ygEditDelete')?.addEventListener('click',()=>{if(ui.editBookingId)cancelBooking(ui.editBookingId);});
 qs('#ygEditOverlay')?.addEventListener('click',e=>{if(e.target.id==='ygEditOverlay')closeBookingEditor();});
 qs('#ygUploadBtn')?.addEventListener('click',()=>qs('#ygTimetableFile')?.click());
 qs('#ygTimetableFile')?.addEventListener('change',async e=>{const f=e.target.files?.[0];if(f)await uploadClassTimetable(f);e.target.value='';});
}
function lessonsFromGrid(rows){
 const range=[[2,8],[8,14],[14,21],[21,27],[27,31]],found={};
 for(const row of rows.slice(2))for(let d=0;d<5;d++)for(let c=range[d][0];c<range[d][1];c++){
  const words=String(row[c]||'').trim().split(/\s+/);const teacher=words.at(-1);
  if(words.length<2||!(/^[가-힣]{2}$/.test(teacher)))continue;
  if(!found[teacher])found[teacher]=[[],[],[],[],[]];
  const p=c-range[d][0]+1;if(!found[teacher][d].includes(p))found[teacher][d].push(p);
 }
 if(Object.keys(found).length<5)throw Error('시간표 구조를 확인할 수 없습니다.');
 return found;
}
async function extractHwpx(file){
 if(!window.JSZip)throw Error('HWPX 읽기 모듈을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.');
 const z=await JSZip.loadAsync(file),xmlfile=z.file('Contents/section0.xml');
 if(!xmlfile)throw Error('HWPX 시간표 본문을 찾을 수 없습니다.');
 const doc=new DOMParser().parseFromString(await xmlfile.async('string'),'application/xml');
 if(doc.querySelector('parsererror'))throw Error('HWPX를 분석하지 못했습니다.');
 const table=Array.from(doc.getElementsByTagName('*')).find(n=>n.localName==='tbl');
 if(!table)throw Error('시간표 표가 없습니다.');
 return Array.from(table.children).filter(n=>n.localName==='tr').map(tr=>{
  const arr=Array(31).fill('');
  Array.from(tr.children).filter(n=>n.localName==='tc').forEach(tc=>{
   const addr=Array.from(tc.getElementsByTagName('*')).find(n=>n.localName==='cellAddr');
   const col=Number(addr?.getAttribute('colAddr'));
   const txt=Array.from(tc.getElementsByTagName('*')).filter(n=>n.localName==='t').map(n=>n.textContent.trim()).filter(Boolean);
   if(Number.isInteger(col)&&col<31)arr[col]=txt.join(' ');
  });return arr;
 });
}
async function uploadClassTimetable(file){
 try{
  if(state.auth?.name!=='유제호')throw Error('전체 교사 시간표 업로드 권한이 없습니다.');
  state.notice='시간표를 분석하고 있습니다.';state.error='';render();
  const isHwpx=/\.hwpx$/i.test(file.name);
  const book=isHwpx?null:XLSX.read(await file.arrayBuffer(),{type:'array'});
  const rows=isHwpx?await extractHwpx(file):XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1,defval:''});
  const parsed=lessonsFromGrid(rows);
  state.notice=Object.keys(parsed).length+'명 교사 시간표를 서버에 저장하고 있습니다.';render();
  const saved=await apiCall('uploadTeacherTimetable',{token:state.token,timetable:parsed},120000);
  if(!saved?.saved)throw Error('서버 저장이 확인되지 않았습니다.');
  await refreshState(false);
  if(!state.data?.teacherTimetables||Object.keys(state.data.teacherTimetables).length!==Object.keys(parsed).length)throw Error('공유 시간표를 다시 읽는 데 실패했습니다. 새로고침해 주세요.');
  activeLessons=state.data.teacherTimetables;
  state.notice='전체 교사 '+saved.count+'명의 시간표가 서버에 저장되었습니다.';
  render();
 }catch(e){state.error='시간표 업로드 실패: '+e.message;state.notice='';render();}
}
function normalizeStudentView(){
 const panel=qs('.results-panel'),list=panel?.querySelector('.card-list');
 if(!panel||!list)return;
 const sessions=currentSessions(),bookings=currentBookings(),nodes=[...list.querySelectorAll(':scope > article.session-card')];
 if(nodes.length!==sessions.length+bookings.length)return;
 const items=nodes.map((node,i)=>{
  const session=i<sessions.length,rec=session?sessions[i]:bookings[i-sessions.length];
  return {node,day:session?dateKeyFromText(rec.dateText):rec.dateKey,period:session?sessionPeriod(rec):Number(rec.period),index:i};
 });
 const shown=items.filter(x=>ui.past?x.day<kstToday():x.day>=kstToday()).sort((a,b)=>a.day.localeCompare(b.day)||a.period-b.period||a.index-b.index);
 list.replaceChildren(...shown.map(x=>x.node));
 const count=panel.querySelector('.panel-title span');if(count)count.textContent=shown.length+'건';
 const nav=document.createElement('div');nav.className='yg-nav';nav.style.marginBottom='10px';
 const future=document.createElement('button');future.textContent='오늘 이후 일정';future.className=ui.past?'':'active';
 const past=document.createElement('button');past.textContent='면접 이력 보기';past.className=ui.past?'active':'';
 future.onclick=()=>{ui.past=false;render();};past.onclick=()=>{ui.past=true;render();};
 nav.append(future,past);panel.prepend(nav);
}
render=function(){try{
 if(state.auth?.role==='student'&&state.data&&!state.auth.mustChange){legacyRender();return normalizeStudentView();}
 return dashboardRender();
}catch(e){console.error('Dashboard fallback:',e);return legacyRender();}};
})();