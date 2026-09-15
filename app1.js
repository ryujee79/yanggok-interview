
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const UNKNOWN_DEPT = '학과·모집단위 미상';
const UNKNOWN_AD = '세부전형 미상';
const FALLBACK_COMMON = [
  { category: '기본 공통', q: '30초에서 40초 동안 자신을 소개해 보세요.' },
  { category: '기본 공통', q: '우리 대학과 이 학과에 지원한 이유는 무엇입니까?' },
  { category: '기본 공통', q: '본인의 가장 큰 장점과 이를 보여 주는 경험을 말해 보세요.' },
  { category: '기본 공통', q: '마지막으로 면접위원에게 꼭 하고 싶은 말이 있다면 해 보세요.' }
];
const STATE = {
  tab: 'home',
  raw: null,
  questions: [],
  admissions: [],
  qTokens: [],
  recordText: '',
  recordName: '',
  common: loadCommon(),
  selection: { u: '', dept: '', type: '학생부종합', ad: '전체' },
  generated: null,
  pastLimit: 100,
  pastSearch: '',
  includeReviews: true
};

function loadCommon() {
  try {
    const v = JSON.parse(localStorage.getItem('yanggok_common_questions_v1') || 'null');
    if (Array.isArray(v) && v.length) return v;
  } catch {}
  return [];
}
function saveCommon(rows) {
  STATE.common = rows;
  localStorage.setItem('yanggok_common_questions_v1', JSON.stringify(rows));
}
function norm(v) {
  return String(v || '').toLowerCase().replace(/대학교/g, '대').replace(/[\s·&()\-_/.,:【】\[\]"'’‘]/g, '');
}
function univNorm(v) {
  return norm(v).replace(/서울캠퍼스|세종캠퍼스|미래캠퍼스|글로벌캠퍼스/g, '');
}
function isCommonUniversity(v) {
  return !v || /대학\s*공통|대학\s*미상|학교\s*미상/.test(v);
}
const DEPT_GROUPS = {
  '경영·경제': ['경영','경제','무역','회계','금융','국제통상','산업경영','경영정보'],
  '인문': ['국어','영어','언어','문학','사학','철학','인문','문화'],
  '사회': ['사회','행정','정치','외교','법','미디어','언론','심리','복지','교육'],
  '컴퓨터·AI': ['컴퓨터','소프트웨어','인공지능','ai','데이터','정보보호'],
  '공학': ['전자','전기','기계','화학공학','신소재','건축','반도체','로봇','산업공학','토목','환경공학'],
  '자연': ['수학','물리','화학','생명','지구','과학','통계','식품','농업'],
  '의약학': ['의예','의학','치의','한의','약학','수의','간호','보건','응급구조'],
  '예체능': ['디자인','미술','체육','음악','연극','영화','스포츠']
};
function deptGroup(v) {
  const n = norm(v);
  for (const [g, words] of Object.entries(DEPT_GROUPS)) if (words.some(w => n.includes(norm(w)))) return g;
  return '기타';
}
function cleanDept(v) {
  let x = String(v || '').replace(/\s+/g, ' ').trim();
  if (!x || /^(all|전체|대상학과|지원학과|대학\/계열|모집단위\(?학과?|학과)$/i.test(x)) return UNKNOWN_DEPT;
  x = x.replace(/^[가-힣A-Za-z]+대학교\s*/, '').replace(/^[가-힣A-Za-z]+대\s+/, '').trim();
  x = x.replace(/^\(?[^)]*전형[^)]*\)?\s*/, '').trim();
  if (/문제지|기출문제|면접\s*\(|평가요소|전형유형|서류\s*\d|단계형|일괄합산|대상학과$/.test(x)) return UNKNOWN_DEPT;
  if (x.length > 45 || /[?]|입니다|하십시오|설명|지원자가|학생부|면접일|준비시간/.test(x)) return UNKNOWN_DEPT;
  const m = x.match(/([가-힣A-Za-z0-9·\s]+?(?:학과|학부|계열|전공|대학))(?=\s|$|\)|,)/);
  if (m) x = m[1].trim();
  x = x.replace(/^\(+|\)+$/g, '').trim();
  return !x || x.length > 35 ? UNKNOWN_DEPT : x;
}
function cleanAdmission(v) {
  const x = String(v || '').replace(/\s+/g, ' ').trim();
  if (!x) return UNKNOWN_AD;
  const known = ['활동우수형','추천형','기회균형','학교추천','학업우수형','계열적합형','계열적합전형','일반전형','지역균형전형','가천의약학전형','미래인재전형','탐구형인재','다빈치형인재','고른기회전형','Do Dream','불교추천인재'];
  for (const k of known) if (x.includes(k)) return k;
  if (x.length <= 32 && /전형$/.test(x)) return x;
  if (x.length <= 24 && !/[【】]|서류\s*\d|면접\s*\d|단계형|일괄합산|%/.test(x)) return x;
  return UNKNOWN_AD;
}
function similarDept(a, b) {
  const aa = cleanDept(a), bb = cleanDept(b);
  if (aa === UNKNOWN_DEPT || bb === UNKNOWN_DEPT) return false;
  const na = norm(aa), nb = norm(bb);
  return na === nb || na.includes(nb) || nb.includes(na) || (deptGroup(aa) !== '기타' && deptGroup(aa) === deptGroup(bb));
}
function niceType(v) {
  return v === '학생부교과' ? '교과' : v === '학생부종합' ? '종합' : v;
}
function sourceLabel(k) {
  if (k === '대학공개') return ['대학 공식 공개', 'official'];
  if (k === '대학기출') return ['대학별 실제 기출', 'official'];
  return ['면접 후기·기출', 'review'];
}
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function decode(raw) {
  const p = raw.p;
  const questions = raw.q.map((r, i) => ({
    u: p.u[r[0]] || '',
    d: p.d[r[1]] || UNKNOWN_DEPT,
    t: p.t[r[2]] || '미상',
    a: p.a[r[3]] || '',
    y: p.y[r[4]] || '',
    c: p.c[r[5]] || '',
    q: r[6],
    s: (r[7] || []).map(i => raw.s[i]).filter(Boolean),
    g: p.g[r[8]] || '',
    k: p.k[r[9]] || '',
    n: r[10] || 1,
    _i: i
  }));
  const admissions = raw.admissions.map(r => ({
    u: p.u[r[0]] || '', d: p.d[r[1]] || UNKNOWN_DEPT, t: p.t[r[2]] || '미상',
    a: p.a[r[3]] || '', i: r[4], r: r[5], m: r[6], ratio: r[7], field: r[8], note: r[9]
  }));
  return { questions, admissions, stats: raw.stats };
}
async function loadData() {
  const files = Array.from({length:16}, (_,i) => `./data/data-${String(i+1).padStart(2,'0')}.b64`);
  const parts = await Promise.all(files.map(async f => {
    const res = await fetch(f, { cache: 'no-store' });
    if (!res.ok) throw new Error('기출 데이터 파일을 불러오지 못했습니다. (' + res.status + ')');
    return (await res.text()).trim();
  }));
  const bin = atob(parts.join(''));
  const bytes = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  if (!('DecompressionStream' in window)) throw new Error('현재 브라우저가 압축 데이터 읽기를 지원하지 않습니다. 최신 Chrome 또는 Edge에서 열어 주세요.');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const text = await new Response(stream).text();
  const d = decode(JSON.parse(text));
  STATE.questions = d.questions;
  STATE.admissions = d.admissions;
  STATE.raw = { stats: { pastQuestions: STATE.questions.length, excluded2027: 0 } };
  STATE.qTokens = STATE.questions.map(x => tokenize(x.q));
  STATE.questions.forEach((q,i) => { q._i = i; });
  initSelection();
}

function universityOptions() {
  return [...new Set([...STATE.questions.map(q => q.u), ...STATE.admissions.map(a => a.u)])]
    .filter(u => u && !isCommonUniversity(u) && u.length < 35)
    .sort((a,b) => a.localeCompare(b, 'ko'));
}
function departmentOptions(u) {
  const vals = [
    ...STATE.questions.filter(q => univNorm(q.u) === univNorm(u)).map(q => cleanDept(q.d)),
    ...STATE.admissions.filter(a => univNorm(a.u) === univNorm(u)).map(a => cleanDept(a.d))
  ];
  const uniq = [...new Set(vals)].filter(Boolean);
  return uniq.sort((a,b) => a === UNKNOWN_DEPT ? 1 : b === UNKNOWN_DEPT ? -1 : a.localeCompare(b, 'ko'));
}
function typeOptions(u, d) {
  const vals = [
    ...STATE.questions.filter(q => univNorm(q.u) === univNorm(u) && (cleanDept(q.d) === d || d === UNKNOWN_DEPT)).map(q => q.t),
    ...STATE.admissions.filter(a => univNorm(a.u) === univNorm(u) && (cleanDept(a.d) === d || cleanDept(a.d) === UNKNOWN_DEPT)).map(a => a.t)
  ];
  const preferred = ['학생부종합','학생부교과','논술','특기자','정시','기타','미상'];
  return preferred.filter(x => vals.includes(x) || x === '학생부종합');
}
function admissionOptions(sel) {
  const vals = [];
  for (const q of STATE.questions) {
    if (univNorm(q.u) !== univNorm(sel.u) || q.t !== sel.type) continue;
    const d = cleanDept(q.d);
    if (d === sel.dept || d === UNKNOWN_DEPT) vals.push(cleanAdmission(q.a));
  }
  for (const a of STATE.admissions) {
    if (univNorm(a.u) !== univNorm(sel.u) || a.t !== sel.type) continue;
    const d = cleanDept(a.d);
    if (d === sel.dept || d === UNKNOWN_DEPT) vals.push(cleanAdmission(a.a));
  }
  return ['전체', ...new Set(vals.filter(x => x !== UNKNOWN_AD)), UNKNOWN_AD];
}
function initSelection() {
  const us = universityOptions();
  const u = us.includes('연세대학교') ? '연세대학교' : us[0] || '';
  const ds = departmentOptions(u);
  const dept = ds.includes('경영학과') ? '경영학과' : ds[0] || UNKNOWN_DEPT;
  const ts = typeOptions(u, dept);
  STATE.selection = { u, dept, type: ts.includes('학생부종합') ? '학생부종합' : ts[0] || '학생부종합', ad: '전체' };
}
function selectorHtml(sel, compact = false) {
  const us = universityOptions();
  const ds = departmentOptions(sel.u);
  const ts = typeOptions(sel.u, sel.dept);
  const ads = admissionOptions(sel);
  return `<div class="${compact ? 'filters' : 'grid'}">
    <label class="field">대학<select data-select="u">${us.map(x => `<option ${x===sel.u?'selected':''}>${esc(x)}</option>`).join('')}</select></label>
    <label class="field">학과·모집단위<select data-select="dept">${ds.map(x => `<option ${x===sel.dept?'selected':''}>${esc(x)}</option>`).join('')}</select></label>
    <label class="field">전형유형<select data-select="type">${ts.map(x => `<option value="${esc(x)}" ${x===sel.type?'selected':''}>${esc(niceType(x))}</option>`).join('')}</select></label>
    <label class="field">세부전형<select data-select="ad">${ads.map(x => `<option ${x===sel.ad?'selected':''}>${esc(x)}</option>`).join('')}</select></label>
  </div>`;
}
function bindSelectors(root, rerender) {
  $$('[data-select]', root).forEach(el => el.addEventListener('change', e => {
    const key = e.target.dataset.select;
    STATE.selection[key] = e.target.value;
    if (key === 'u') {
      STATE.selection.dept = departmentOptions(STATE.selection.u)[0] || UNKNOWN_DEPT;
      STATE.selection.type = typeOptions(STATE.selection.u, STATE.selection.dept)[0] || '학생부종합';
      STATE.selection.ad = '전체';
    } else if (key === 'dept') {
      STATE.selection.type = typeOptions(STATE.selection.u, STATE.selection.dept)[0] || '학생부종합';
      STATE.selection.ad = '전체';
    } else if (key === 'type') {
      STATE.selection.ad = '전체';
    }
    rerender();
  }));
}
function pageHead(title, sub) {
  return `<div class="head"><span class="eyebrow">양곡고등학교 대입 면접</span><h1>${esc(title)}</h1><p>${esc(sub)}</p></div>`;
}
