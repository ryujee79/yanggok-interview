function recordLines(text) {
  const raw = text.replace(/\r/g,'\n').split(/\n+|(?<=[.!?])\s+/).map(x=>x.replace(/\s+/g,' ').trim());
  const seen = new Set(), rows=[];
  for (const x of raw) {
    if (x.length < 20 || x.length > 330) continue;
    if (/^(페이지|출결상황|인적사항|학적사항|수상경력|자격증|독서활동상황)$/.test(x)) continue;
    const key=norm(x); if(seen.has(key)) continue; seen.add(key);
    const score = [...KEY.academic,...KEY.career,...KEY.community].filter(k=>x.includes(k)).length;
    if (score || /했다|함|보임|기재|탐구|발표|참여|제작|조사|읽고|분석/.test(x)) rows.push(x);
  }
  return rows.slice(0,450);
}
function bucketScore(line, category) {
  const words = KEY[category] || [];
  return words.reduce((n,w)=>n+(line.includes(w)?1:0),0);
}
function topRecordLines(lines, category, count=6) {
  return [...lines].map((line,i)=>({line,score:bucketScore(line,category)*5 + Math.min(line.length,140)/70 - i/1000}))
    .filter(x=>x.score>0.5).sort((a,b)=>b.score-a.score).slice(0,count).map(x=>x.line);
}
function pastPool(sel) {
  let rows = STATE.questions.filter(q => !(sel.type === '학생부종합' && isCommonUniversity(q.u)));
  const exactU = rows.filter(q => univNorm(q.u) === univNorm(sel.u));
  if (exactU.length >= 10) rows = exactU;
  rows = rows.filter(q => sel.type === '미상' || q.t === sel.type || q.t === '미상');
  if (rows.length < 12) rows = STATE.questions.filter(q => univNorm(q.u) === univNorm(sel.u));
  return rows;
}
function qCategory(q) {
  const s=q.q;
  const scores = {
    academic: bucketScore(s,'academic'),
    career: bucketScore(s,'career'),
    community: bucketScore(s,'community')
  };
  return Object.entries(scores).sort((a,b)=>b[1]-a[1])[0][1] ? Object.entries(scores).sort((a,b)=>b[1]-a[1])[0][0] : 'academic';
}
function referenceFor(line, category, sel, used=new Set()) {
  const lt = tokenize(line), ls = new Set(lt), pool = pastPool(sel);
  const desiredGroup = deptGroup(sel.dept);
  let best=null,bestScore=-Infinity,bestIndex=-1;
  for (const q of pool) {
    const qi=q._i;
    if (used.has(qi)) continue;
    let score=0;
    if (univNorm(q.u)===univNorm(sel.u)) score+=90;
    if (cleanDept(q.d)===sel.dept) score+=45;
    else if (desiredGroup!=='기타'&&deptGroup(q.d)===desiredGroup) score+=18;
    if (q.t===sel.type) score+=25;
    if (sel.ad!=='전체'&&cleanAdmission(q.a)===sel.ad) score+=18;
    if (qCategory(q)===category) score+=18;
    const qt=STATE.qTokens[qi] || tokenize(q.q);
    let overlap=0; for(const t of qt) if(ls.has(t)) overlap++;
    score += overlap*7;
    if(q.k==='대학공개'||q.k==='대학기출') score+=8;
    if(score>bestScore){bestScore=score;best=q;bestIndex=qi;}
  }
  if(bestIndex>=0) used.add(bestIndex);
  return best;
}
function snippet(line) {
  let s = String(line||'').replace(/^\d+\.\s*/,'').replace(/\s+/g,' ').trim();
  s = s.replace(/(세부능력 및 특기사항|행동특성 및 종합의견|창의적 체험활동|진로활동|자율활동|동아리활동)\s*[:：-]?/g,'').trim();
  if(s.length>72) s=s.slice(0,72).replace(/\s+\S*$/,'')+'…';
  return s;
}
function tailorQuestion(category, line, dept, ref) {
  const s = snippet(line);
  const r = ref?.q || '';
  if (category === 'academic') {
    if (/이유|왜/.test(r)) return `생활기록부의 “${s}” 활동을 선택한 이유와 탐구 과정에서 가장 중요하게 판단한 점을 설명해 주세요.`;
    if (/한계|보완|개선/.test(r)) return `“${s}” 활동의 결과와 한계를 설명하고, 다시 진행한다면 무엇을 보완하겠습니까?`;
    if (/원리|개념|정의/.test(r)) return `“${s}” 활동에서 사용한 핵심 개념이나 원리를 본인의 말로 설명해 주세요.`;
    return `“${s}” 활동에서 무엇을 탐구했고 어떤 방법으로 결론에 도달했는지 구체적으로 설명해 주세요.`;
  }
  if (category === 'career') {
    if (/지원|동기|이유/.test(r)) return `“${s}” 경험이 ${dept===UNKNOWN_DEPT?'지원 전공':dept}에 지원하게 된 과정과 어떻게 연결되는지 설명해 주세요.`;
    if (/변화|배운|느낀/.test(r)) return `“${s}” 활동 전후로 진로에 대한 생각이 어떻게 달라졌는지 말해 주세요.`;
    return `“${s}” 활동에서 확인한 자신의 강점이 ${dept===UNKNOWN_DEPT?'지원 전공':dept}에서 어떻게 활용될 수 있다고 생각하나요?`;
  }
  if (/갈등|의견|소통/.test(r)) return `“${s}” 활동에서 다른 사람과 의견이 달랐던 상황이 있었다면 어떻게 조정했는지 설명해 주세요.`;
  if (/역할|기여/.test(r)) return `“${s}” 활동에서 본인이 맡은 역할과 실제로 기여한 부분을 구체적으로 말해 주세요.`;
  if (/배려|협력|봉사/.test(r)) return `“${s}” 활동에서 다른 구성원을 배려하거나 협력하기 위해 한 행동과 그 결과를 설명해 주세요.`;
  return `“${s}” 활동에서 함께한 사람들과 목표를 이루기 위해 본인이 한 행동과 배운 점을 말해 주세요.`;
}
function commonQuestionsForGeneration(sel) {
  const rows = STATE.common.length ? STATE.common : FALLBACK_COMMON;
  return rows.slice(0,4).map(x => ({
    question: x.q.replace(/우리 대학/g, sel.u).replace(/이 학과/g, sel.dept===UNKNOWN_DEPT?'지원 학과':sel.dept),
    why: STATE.common.length ? `선생님이 등록한 공통질문 · ${x.category||'공통'}` : '공통질문 파일 미등록 시 사용하는 기본 공통질문',
    ref: null
  }));
}
function generateQuestions() {
  const sel={...STATE.selection}, lines=recordLines(STATE.recordText), used=new Set();
  const result={common:commonQuestionsForGeneration(sel),academic:[],career:[],community:[],selection:sel};
  for(const category of ['academic','career','community']){
    let ls=topRecordLines(lines,category,7);
    if(ls.length<4) ls=[...ls,...lines.filter(x=>!ls.includes(x)).slice(0,4-ls.length)];
    for(const line of ls.slice(0,4)){
      const ref=referenceFor(line,category,sel,used);
      result[category].push({
        question: tailorQuestion(category,line,sel.dept,ref),
        why: `생활기록부 근거: ${snippet(line)}`,
        ref
      });
    }
  }
  return result;
}
function refHtml(ref) {
  if(!ref) return '';
  const [label,cls]=sourceLabel(ref.k);
  return `<div class="why"><b>가까운 기출 경향</b> · <span class="badge ${cls}">${esc(label)}</span> ${esc(ref.u)} · ${esc(cleanDept(ref.d))}${ref.y?' · '+esc(ref.y)+'학년도':''}<br>${esc(ref.q)}</div>`;
}
function generatedHtml(g) {
  const cats=[['common','공통질문'],['academic','학업역량'],['career','진로역량'],['community','공동체역량']];
  return `<div class="panel"><h2>${esc(g.selection.u)} · ${esc(g.selection.dept)} 맞춤 면접</h2>
    <p class="muted">생성된 문항은 실제 기출 자체가 아니라, 생활기록부 기록과 선택 조건의 기출 경향을 결합한 연습문항입니다. 아래에 참고한 가까운 기출을 함께 표시합니다.</p></div>
    ${cats.map(([key,title])=>`<section class="category"><h2>${title}<span>${g[key].length}문항</span></h2><div class="qcards">${g[key].map((x,i)=>`<article class="qcard"><div class="source"><span class="badge generated">맞춤 생성</span><span class="badge">${title}</span></div><p class="q">Q${i+1}. ${esc(x.question)}</p><div class="why">${esc(x.why)}</div>${refHtml(x.ref)}</article>`).join('')}</div></section>`).join('')}`;
}
function pastRows() {
  const sel=STATE.selection;
  let rows=STATE.questions.filter(q=>univNorm(q.u)===univNorm(sel.u));
  if(sel.dept!==UNKNOWN_DEPT){
    const exact=rows.filter(q=>cleanDept(q.d)===sel.dept);
    if(exact.length) rows=exact;
  }
  if(sel.type && sel.type!=='미상'){
    const exact=rows.filter(q=>q.t===sel.type);
    if(exact.length) rows=exact;
  }
  if(sel.ad!=='전체'){
    const exact=rows.filter(q=>cleanAdmission(q.a)===sel.ad);
    if(exact.length) rows=exact;
  }
  if(!STATE.includeReviews) rows=rows.filter(q=>q.k!=='후기·기출');
  const n=norm(STATE.pastSearch);
  if(n) rows=rows.filter(q=>norm([q.q,q.u,q.d,q.t,q.a,q.c,...q.s].join(' ')).includes(n));
  return rows.sort((a,b)=>Number(b.y||0)-Number(a.y||0) || (a.k==='후기·기출')-(b.k==='후기·기출'));
}
function pastCard(q) {
  const [label,cls]=sourceLabel(q.k);
  return `<article class="past"><div class="source"><span class="badge ${cls}">${esc(label)}</span><span class="badge">${esc(q.y?q.y+'학년도':'연도 미상')}</span><span class="badge">${esc(cleanDept(q.d))}</span>${q.t&&q.t!=='미상'?`<span class="badge">${esc(niceType(q.t))}</span>`:''}</div><p>${esc(q.q)}</p><small>${esc(q.s.join(' · ')||'출처 미상')}${q.n>1?' · 동일 문항 '+q.n+'회 확인':''}</small></article>`;
}
function renderPast() {
  const rows=pastRows();
  $('#app').innerHTML=`<section class="page">${pageHead('대학별 기출','2026학년도 이전 대학 공개문항·실제 기출·면접 후기만 제공합니다. 2027 예상·예시문항과 제시문은 제외했습니다.')}
    <div class="panel">${selectorHtml(STATE.selection,true)}
      <div class="search"><b>검색</b><input id="pastSearch" value="${esc(STATE.pastSearch)}" placeholder="질문 내용·출처 검색"></div>
      <label class="check"><input id="includeReviews" type="checkbox" ${STATE.includeReviews?'checked':''}>수험생 면접 후기·교육청 후기 자료도 포함</label>
    </div>
    <div class="resultbar"><b>${esc(STATE.selection.u)} ${rows.length.toLocaleString()}문항</b><span>공식 공개와 실제 후기의 출처를 구분해 표시합니다.</span></div>
    <div class="pastlist">${rows.slice(0,STATE.pastLimit).map(pastCard).join('')||'<div class="empty">현재 조건에서 확인되는 기출 질문이 없습니다.</div>'}</div>
    ${rows.length>STATE.pastLimit?`<button id="morePast" class="primary">더 보기 (${Math.min(200,rows.length-STATE.pastLimit)}문항)</button>`:''}
  </section>`;
  bindSelectors($('#app'),()=>{STATE.pastLimit=100;renderPast();});
  $('#pastSearch').oninput=e=>{STATE.pastSearch=e.target.value;STATE.pastLimit=100;renderPast();};
  $('#includeReviews').onchange=e=>{STATE.includeReviews=e.target.checked;STATE.pastLimit=100;renderPast();};
  if($('#morePast')) $('#morePast').onclick=()=>{STATE.pastLimit+=200;renderPast();};
}
function commonRows() {
  return STATE.common.length ? STATE.common : FALLBACK_COMMON;
}
function renderCommon() {
  const custom=STATE.common.length>0, rows=commonRows();
  $('#app').innerHTML=`<section class="page">${pageHead('공통질문','선생님이 작성한 공통질문 파일을 불러와 사용할 수 있습니다. 답변·예시답안은 저장하지 않습니다.')}
    <div class="panel"><div class="commonToolbar"><div><h2>공통질문 파일</h2><p class="muted">${custom?`현재 이 브라우저에 ${STATE.common.length}문항이 저장되어 있습니다.`:'아직 선생님 공통질문 파일이 등록되지 않아 기본 4문항을 표시합니다.'}</p></div>
      ${custom?'<button id="clearCommon" class="danger tiny">등록 질문 지우기</button>':''}</div>
      <label class="filebox"><input id="commonFile" type="file" accept=".hwpx,.pdf,.txt,text/plain,application/pdf"><b>공통질문 파일 불러오기</b><span>HWPX · PDF · TXT 지원 / 구형 HWP는 HWPX로 다시 저장해 주세요.</span></label>
      <div id="commonStatus"></div>
      <div class="warning">이 무료 정적 버전에서 앱 안의 업로드는 <b>현재 브라우저에 저장</b>됩니다. 선생님이 최종 HWPX 파일을 이 대화에 보내주시면 제가 사이트 기본 공통질문으로 넣어 모든 학생에게 동일하게 보이도록 무료 재배포할 수 있습니다.</div>
    </div>
    <div class="resultbar"><b>${rows.length}문항</b><span>${custom?'선생님 등록 공통질문':'기본 공통질문'}</span></div>
    <div class="commonList">${rows.map((x,i)=>`<article><small>${esc(x.category||'공통')}</small><p>${i+1}. ${esc(x.q)}</p></article>`).join('')}</div>
  </section>`;
  $('#commonFile').onchange=e=>handleCommonFile(e.target.files[0]);
  if($('#clearCommon')) $('#clearCommon').onclick=()=>{localStorage.removeItem('yanggok_common_questions_v1');STATE.common=[];renderCommon();};
}
async function handleCommonFile(file) {
  if(!file)return;
  const status=$('#commonStatus');status.innerHTML='<div class="muted">질문을 추출하는 중입니다.</div>';
  try{
    const text=await readDocument(file);
    const rows=parseCommonQuestions(text);
    if(!rows.length)throw new Error('질문 문장을 찾지 못했습니다. 질문별로 줄을 나누거나 물음표·“설명해 보세요” 같은 문장 형태로 작성해 주세요.');
    saveCommon(rows);
    renderCommon();
    $('#commonStatus').innerHTML=`<div class="ok">${rows.length}개의 공통질문을 등록했습니다.</div>`;
  }catch(e){status.innerHTML=`<div class="error">${esc(e.message||e)}</div>`;}
}
function parseCommonQuestions(text) {
  const lines=String(text||'').replace(/\r/g,'\n').split(/\n+/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
  let cat='공통',out=[],seen=new Set();
  const questionLike=/(\?|무엇|어떤|어떻게|왜|설명해|말해|이야기해|생각합니까|생각하나요|입니까|나요|까요|습니까|하세요|해 보세요|해보세요)/;
  for(let line of lines){
    if(line.length<=28&&!questionLike.test(line)&&!/^\d+[.)]/.test(line)){cat=line.replace(/[:：]$/,'');continue;}
    line=line.replace(/^[\s□■●○•\-–—]+/,'').replace(/^\d+\s*[.)]\s*/,'').trim();
    const chunks=line.split(/(?<=\?)\s+(?=\d*[.)]?\s*[가-힣A-Z])/);
    for(let q of chunks){
      q=q.trim();if(q.length<8||!questionLike.test(q))continue;
      const key=norm(q);if(seen.has(key))continue;seen.add(key);out.push({category:cat||'공통',q});
    }
  }
  return out.slice(0,300);
}
document.addEventListener('click', e => {
  const tab=e.target.closest('[data-tab]');if(tab){STATE.tab=tab.dataset.tab;render();}
  const home=e.target.closest('[data-go="home"]');if(home){STATE.tab='home';render();}
});
loadData().then(render).catch(e=>{
  $('#app').innerHTML=`<section class="page"><div class="error"><b>기출 자료를 불러오지 못했습니다.</b><br>${esc(e.message||e)}</div></section>`;
});
