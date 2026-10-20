/* Non-invasive dashboard enhancement for migration-preview.html. Existing API and student view remain intact. */
(function () {
'use strict';
const lessonsSeed={"고승":[[1,3,5,6],[3,4],[2,4,5,7],[5,6],[1,4]],"권혁":[[1,3,4,6],[2,5],[4,5,7],[2,5,6],[4]],"기윤":[[1,3,4,6],[2,4,6],[3,4,6,7],[2,5,6],[1,3,4]],"김계":[[1,2,4,5],[3,4],[1,4,6,7],[1,3,4,6],[3,4]],"김낙":[[2,5],[1,3,4,6],[4,6],[4,5],[1,4]],"김대":[[1,4,6],[4,5],[3,4,7],[3,5,6],[3,4]],"김병":[[3,4,6],[1,2,5,6],[2,3,5,6],[1,2,4],[2,4]],"김영":[[2,3,5],[4,6],[2,3,5,7],[2,3,5],[2,3]],"김점":[[3,4],[1,5],[1,3,4,7],[1,3,5,6],[2,4]],"김중":[[1,3,4,6],[2,4,5],[1,3,4,6],[1,3,4],[1,4]],"김지":[[1,2,5,6],[2,3,5,6],[1,2,3,5,6],[1,3,4,6],[1,2,4]],"김진":[[3,5,6],[1,2,4,6],[1,4,5,7],[2,3,6],[2,4]],"김희":[[2,4],[1,6],[2,5,6],[1,4,5],[2]],"노석":[[2,3],[1,4,6],[2,4,5,6],[1,2,4,5],[2,4]],"박문":[[2,3,5],[3,4,6],[2,3,5],[1,2,5],[1,2,3]],"박윤":[[1,2,4],[1,2,5,6],[2,3,5],[1,2,4,6],[1,3]],"손유":[[2,4,6],[2,3],[2,3,5,7],[2,4,6],[1,3]],"송대":[[2,4,5],[3,4],[3,4,6,7],[1,2,4,5,6],[2,4]],"신연":[[2,5],[1,3,4,6],[2,4,6],[1,4,5],[1,2,4]],"신해":[[3,5,6],[2,3,5],[1,3,4],[3,4],[3]],"안진":[[1,2,5],[1,3,4,6],[2,3,5,6],[2,4,6],[2,3]],"오중":[[1,3,4,6],[1,2,5],[1,3,5,7],[2,3,6],[2,3]],"유미":[[1,3,4,6],[2,4,5],[1,3,4,5,7],[2,3,5,6],[3,4]],"유은":[[1,2,4,5],[1,2,5,6],[1,3,6,7],[3,6],[1,2]],"유제":[[1,3,5,6],[2,3,5,6],[1,2],[3,4],[1,2]],"유종":[[1,3,5,6],[2,3,5,6],[3,5,7],[2,4,6],[2,3]],"유지":[[1,2,4],[1,2,4,5],[4,5,7],[2,3,5],[1,3,4]],"윤혜":[[1,3,4,6],[2,5],[1,3,5,7],[2,3,6],[3]],"이경":[[2,5],[1,2,4,6],[1,2,4,6],[1,4,5],[1,4]],"이기":[[3,4,6],[3,4],[1,2,4,6],[2,3,5],[3]],"이나":[[1,3,4,6],[3,4,6],[1,3,5,7],[1,2,4,6],[2,3]],"이병":[[2,4,5],[1,3,5],[3,4,6,7],[2,3,5,6],[2,4]],"이석":[[1,5,6],[1,3,4,5],[2,4,6],[1,3,4],[1,2,4]],"이수":[[1,2,3,5,6],[2,3,4,5,6],[1,2,3,5,6,7],[1,2,3,5,6],[1,3,4]],"이주":[[3,5],[1,3],[1,2,6,7],[1,2,4],[1,2]],"이진":[[3,4],[1,4,6],[2,4,5,7],[5,6],[1,3,4]],"인상":[[1,2,5],[1,3,5],[1,2,4,6],[1,3,5],[1,4]],"장덕":[[2,5,6],[1,2,5,6],[1,2,6],[1,3,4],[1,2]],"장현":[[1,2,4],[1,2,5],[1,3,5,7],[2,3,6],[3]],"정수":[[1,2,4,6],[1,2,3],[1,3,5,6],[1,3,4],[2,3]],"조현":[[2,3,5,6],[1,3,5],[1,3,4,7],[1,5],[1,3]],"천세":[[2,4,6],[1,3,4,6],[1,2,5,6],[1,4,6],[2,3]],"최성":[[1,3,4],[2,4,6],[2,4,5,7],[1,2,5,6],[1,3,4]],"홍상":[[2,5],[1,3,4,6],[2,4,6],[1,4,5],[1,2,4]],"황혜":[[1,3,5,6],[2,3,5,6],[1,2,6],[1,3,4],[1,2]]};
const kstToday=()=>{const f=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const p=k=>f.find(x=>x.type===k).value;return p('year')+'-'+p('month')+'-'+p('day');};
const ui={scope:'mine',past:false,date:kstToday(),focus:'',notice:'',noticeTimeout:null};
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
function matchesScope(s){return ui.scope==='all'||ui.scope==='mine'&&isMineSession(s)||ui.scope===s.team;}
function allEntries(){
  const ss=(state.data?.sessions||[]).filter(s=>state.studentQuery?.trim()?true:matchesScope(s)).map(data=>({type:'session',data}));
  const bb=(state.data?.manualBookings||[]).filter(b=>state.studentQuery?.trim()||ui.scope==='all'||ui.scope==='mine'&&b.teacher===state.auth.name).map(data=>({type:'manual',data}));
  let out=[...ss,...bb].filter(x=>ui.past?dateKey(x)<kstToday():dateKey(x)>=kstToday());
  if(state.studentQuery){const q=state.studentQuery.trim();out=out.filter(e=>(e.type==='session'?(e.data.students||[]).join(' '):e.data.student||'').includes(q));}
  return out.sort(itemSort);
}
function weekDates(date){const ix=dayIndex(date),offset=ix<0?(new Date(date+'T12:00:00').getDay()===0?-6:-5): -ix;const first=dateOffset(date,offset);return Array.from({length:5},(_,i)=>dateOffset(first,i));}
function atSlot(date,p){
 const sessions=(state.data?.sessions||[]).filter(s=>dateKeyFromText(s.dateText)===date&&sessionPeriod(s)===p&&isMineSession(s));
 const manuals=mineBookings().filter(b=>b.dateKey===date&&Number(b.period)===p);
 const allNames=[...sessions.flatMap(s=>s.students||[]),...manuals.map(b=>b.student)].filter(Boolean);
 return {hasInterview:sessions.length+manuals.length>0,hasManual:manuals.length>0,names:[...new Set(allNames)]};
}
function renderTimetable(){
 const lesson=activeLessons[state.auth.name.slice(0,2)];
 const week=weekDates(ui.date),currDay=dayIndex(ui.date);
 const head=week.map((d,i)=>'<th class="'+(i===currDay?'yg-current':'')+'">'+['월','화','수','목','금'][i]+'<br>'+d.slice(5)+'</th>').join('');
 const cells=Array.from({length:8},(_,i)=>i+1).map(p=>'<tr><th>'+p+'교시</th>'+week.map((d,i)=>{
  const cls=Boolean(lesson?.[i]?.includes(p)),a=atSlot(d,p);
  const label=a.hasInterview?'면접('+a.names.join('·')+')':'';
  const text=cls?(label?'수업 & '+label:'수업'):(label||'');
  const color=cls&&label?'yg-clash':cls?'yg-class':a.hasManual?'yg-manual-lesson':label?'yg-interview':'';
  return '<td class="'+color+' '+(d===ui.date?'yg-current':'')+'" title="'+esc(text)+'">'+(text?esc(text):'')+'</td>';
 }).join('')+'</tr>').join('');
 return (lesson?'':'<div class="yg-missing">이 교사의 수업 시간표가 없습니다. 전체 시간표에서 교사 약칭을 확인해 주세요.</div>')+
  '<table class="yg-timetable"><thead><tr><th>교시</th>'+head+'</tr></thead><tbody>'+cells+'</tbody></table>'+
  '<div class="yg-calendar-note">파랑: 수업 · 연두: 면접 · 빨강: 수업과 면접 중복 · 노랑: 직접 예약</div>';
}
function renderRooms(){
 const day=ui.date,rooms=(state.data?.roomChoices||[]).filter(x=>x&&x!=='미정');
 if(!rooms.length)return '<div class="empty">등록된 면접실이 없습니다.</div>';
 const head=rooms.map(r=>'<th class="yg-room-name">'+esc(r)+'</th>').join('');
 const rows=Array.from({length:8},(_,i)=>i+1).map(p=>'<tr><th>'+p+'교시</th>'+rooms.map(r=>{
  const info=usageInfo(day,p,r),kind=info.kind==='class'?'classuse':info.kind==='interview'?'session':info.kind,mine=kind==='manual'&&info.booking.teacher===state.auth.name;
  const canAct=kind==='free'||mine;
  const tag=kind==='free'?'예약':kind==='manual'?'직접 예약':kind==='session'?'제시문 면접':'수업';
  const detail=kind==='free'?'':kind==='classuse'?(info.label||info.text||''):(kind==='manual'?info.booking.student:(info.session?.students||[]).join('·'));
  return '<td><button class="yg-room-btn '+kind+'" '+(canAct?'data-yg-book="'+esc(encodeURIComponent(r))+'|'+p+'"':'disabled')+' title="'+esc(info.label||info.text||'')+'"><strong>'+tag+'</strong>'+esc(detail)+'</button></td>';
 }).join('')+'</tr>').join('');
 return '<div style="overflow:auto"><table class="yg-rooms"><thead><tr><th>교시</th>'+head+'</tr></thead><tbody>'+rows+'</tbody></table></div><div class="yg-room-legend"><span>예약 가능</span><span class="manual">직접 예약</span><span class="session">제시문</span><span class="classuse">수업</span></div>';
}
function itemHtml(entry){
 const s=entry.data;
 if(entry.type==='manual'){
  return '<div class="yg-session yg-manual"><div class="yg-manual-actions"><div><div class="yg-s-title">'+esc(fmtDate(s.dateKey))+' · '+esc(s.period)+'교시 · 직접 예약</div><div class="yg-s-meta">'+esc(s.student||'')+' · '+esc(s.room||'')+' · '+esc(s.teacher||'')+'</div></div>'+
  (s.teacher===state.auth.name?'<button class="btn small danger" data-yg-cancel="'+esc(s.id)+'">예약 취소</button>':'')+'</div></div>';
 }
 const st=s.students||[],sub=firstLine(s.prompt);
 const safe=String(s.id).replace(/"/g,'&quot;');
 let detail=legacySessionCard(s);
 detail=detail.replace(/<label class="btn small" style="display:inline-block;margin-top:7px">참고자료 업로드<input[^>]*><\/label>/g,'').replace(/<label class="material-button upload">[\s\S]*?<\/label>/g,'');
 return '<details class="yg-session" data-yg-detail="'+esc(safe)+'"><summary><div class="yg-s-title">'+esc(s.dateText)+' · '+(sessionPeriod(s)===99?'교시 미정':sessionPeriod(s)+'교시')+' · '+esc(st.join('·'))+'</div><div class="yg-s-meta">'+esc(s.teacher)+' · '+esc(sub)+' · '+esc(s.location||'미정')+'</div></summary><div class="yg-detail">'+detail+'</div></details>';
}
function dashboardRender(){
 if(!state.token||!state.auth||state.auth.role!=='teacher'||!state.data||state.auth.mustChange)return legacyRender();
 const expanded=new Set(qsa('details[data-yg-detail][open]').map(n=>n.dataset.ygDetail));
 const searching=document.activeElement?.id==='studentSearch',cursor=searching?document.activeElement.selectionStart:null;
 const entries=allEntries(),today=kstToday(),todayCount=(state.data?.sessions||[]).length;
 const scopeLabel={mine:'나의 일정',all:'전체 일정',humanities:'고려대(인문)&연세대팀',natural:'고려대(자연)팀'}[ui.scope];
 const search='<div class="yg-search"><input id="studentSearch" list="studentNames" placeholder="학생 찾기" value="'+esc(state.studentQuery)+'"><datalist id="studentNames">'+allStudents().map(n=>'<option value="'+esc(n)+'"></option>').join('')+'</datalist><button class="btn small" id="clearStudentSearch">지우기</button></div>';
 app.innerHTML='<main class="shell yg-dashboard"><header class="topbar"><div class="brand"><small>YANGGOK 2027</small><h1>제시문 면접 지도</h1></div><div class="userbox"><span class="pill">교사 · '+esc(state.auth.name)+'</span><button class="btn" id="refreshBtn">새로고침</button><button class="btn" id="logoutBtn">로그아웃</button></div></header>'+
 '<nav class="yg-nav"><label for="ygScope" class="label" style="margin:0">일정 보기</label><select id="ygScope" style="width:auto;padding:6px 24px 6px 9px;font-size:12px"><option value="mine"'+(ui.scope==='mine'?' selected':'')+'>나의 일정</option><option value="all"'+(ui.scope==='all'?' selected':'')+'>전체 일정</option><option value="humanities"'+(ui.scope==='humanities'?' selected':'')+'>고려대(인문)&연세대팀</option><option value="natural"'+(ui.scope==='natural'?' selected':'')+'>고려대(자연)팀</option></select>'+
 '<button id="ygNow" class="'+(!ui.past?'active':'')+'">오늘 이후 일정</button><button id="ygPast" class="'+(ui.past?'active':'')+'">면접 이력 보기</button><button id="ygTimetableBtn">내 시간표 보기</button><button id="ygRoomsBtn">실별 사용 현황</button></nav>'+
 '<div class="yg-tools"><button class="btn primary" id="scheduleUploadBtn">일정 업로드</button><button class="btn" id="materialUploadBtn">제시문 업로드</button><button class="btn" id="ygUploadBtn">전체 교사 시간표 업로드</button><button class="btn" id="roomManageBtn">특별실 관리</button><button class="btn" id="historyBtn">변경 이력</button><input id="scheduleFile" type="file" accept=".xlsx,.xls" class="hidden"><input id="ygTimetableFile" type="file" accept=".hwpx,.xlsx,.xls" class="hidden">'+search+'</div>'+
 (state.notice?'<div class="alert success yg-flash">'+esc(state.notice)+'</div>':'')+(state.error?'<div class="alert error">'+esc(state.error)+'</div>':'')+
 '<div class="yg-workspace">'+
 '<section class="yg-panel" id="ygPanelMine"><div class="yg-panel-head"><h2>'+esc(ui.past?'면접 이력':scopeLabel)+'</h2><span class="count">'+entries.length+'건 · '+(ui.past?'지난 일정':'오늘 이후')+'</span></div><div class="yg-panel-body"><div class="yg-summary-list">'+(entries.length?entries.map(itemHtml).join(''):'<div class="empty">표시할 일정이 없습니다.</div>')+'</div></div></section>'+
 '<section class="yg-panel" id="ygPanelTimetable"><div class="yg-panel-head"><h2>내 시간표 보기</h2><span class="count">'+esc(state.auth.name)+'</span></div><div class="yg-panel-body">'+renderTimetable()+'</div></section>'+
 '<section class="yg-panel" id="ygPanelRooms"><div class="yg-panel-head"><h2>실별 사용 현황</h2><div class="yg-date-tools"><button class="btn" id="ygPrev" aria-label="전날">‹</button><input id="ygDate" type="date" value="'+esc(ui.date)+'"><button class="btn" id="ygNext" aria-label="다음날">›</button></div></div><div class="yg-panel-body">'+renderRooms()+'</div></section>'+
 '</div></main>'+renderModal();
 qsa('details[data-yg-detail]').forEach(n=>{if(expanded.has(n.dataset.ygDetail))n.open=true;});
 bindMainEvents();bindDashEvents();
 if(searching){const searchInput=qs('#studentSearch');searchInput?.focus();if(cursor!==null)try{searchInput?.setSelectionRange(cursor,cursor);}catch(_){}}
 if(state.notice&&/완료|예약했습니다|취소했습니다|변경했습니다|삭제했습니다|추가했습니다|반영했습니다|업로드했습니다/.test(state.notice)){
  if(ui.notice!==state.notice){ui.notice=state.notice;if(ui.noticeTimeout)clearTimeout(ui.noticeTimeout);ui.noticeTimeout=setTimeout(()=>{if(state.notice===ui.notice){state.notice='';ui.notice='';render();}},3500);}
 }else if(!state.notice){ui.notice='';}
}
async function bookRoom(room,p){
 const date=ui.date,info=usageInfo(date,p,room);
 if(info.kind==='free'){
  const student=prompt(fmtDate(date)+' '+p+'교시 '+room+'\n면접 학생 이름을 입력하세요.');
  if(!student?.trim())return;
  try{await apiCall('createManualBooking',{token:state.token,dateKey:date,period:p,room,student:student.trim()});state.notice='직접 예약했습니다.';await refreshState(true);}
  catch(e){state.error=e.message;render();}
 }else if(info.kind==='manual'&&info.booking.teacher===state.auth.name)await cancelBooking(info.booking.id);
}
async function cancelBooking(id){
 if(!confirm('이 직접 예약을 취소하시겠습니까?'))return;
 try{await apiCall('cancelManualBooking',{token:state.token,id});state.notice='직접 예약을 취소했습니다.';await refreshState(true);}
 catch(e){state.error=e.message;render();}
}
function bindDashEvents(){
 qs('#ygScope')?.addEventListener('change',e=>{ui.scope=e.target.value;render();});
 qs('#ygNow')?.addEventListener('click',()=>{ui.past=false;render();});
 qs('#ygPast')?.addEventListener('click',()=>{ui.past=true;render();});
 qs('#ygTimetableBtn')?.addEventListener('click',()=>qs('#ygPanelTimetable')?.scrollIntoView({behavior:'smooth',block:'nearest'}));
 qs('#ygRoomsBtn')?.addEventListener('click',()=>qs('#ygPanelRooms')?.scrollIntoView({behavior:'smooth',block:'nearest'}));
 qs('#ygPrev')?.addEventListener('click',()=>{ui.date=dateOffset(ui.date,-1);render();});
 qs('#ygNext')?.addEventListener('click',()=>{ui.date=dateOffset(ui.date,1);render();});
 qs('#ygDate')?.addEventListener('change',e=>{if(/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)){ui.date=e.target.value;render();}});
 qsa('[data-yg-book]').forEach(btn=>btn.addEventListener('click',()=>{const [room,p]=btn.dataset.ygBook.split('|');bookRoom(decodeURIComponent(room),Number(p));}));
 qsa('[data-yg-cancel]').forEach(btn=>btn.addEventListener('click',()=>cancelBooking(btn.dataset.ygCancel)));
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
  const isHwpx=/\.hwpx$/i.test(file.name);
  const book=isHwpx?null:XLSX.read(await file.arrayBuffer(),{type:'array'});
  const rows=isHwpx?await extractHwpx(file):XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1,defval:''});
  const parsed=lessonsFromGrid(rows);
  localStorage.setItem('yi-class-timetable-v1',JSON.stringify(parsed));activeLessons=parsed;
  state.notice='시간표를 이 기기에 적용했습니다. 전체 교사 공유 저장은 서버 기능 연결이 필요합니다.';
  render();
 }catch(e){state.error='시간표 업로드 실패: '+e.message;render();}
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