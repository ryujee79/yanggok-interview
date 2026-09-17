const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('app-07.js', 'utf8');
let currentRows = [];
const context = {
  console,
  firstLine: value => String(value || '').split('\n')[0].trim(),
  teamLabel: team => team === 'natural' ? '고려대(자연)팀' : '고려대(인문)&연세대팀',
  splitTeachers: value => String(value || '').replace(/[,\/&+]/g, '·').split('·').map(x => x.trim()).filter(Boolean),
  XLSX: { utils: { sheet_to_json: () => currentRows }, read: () => ({}) },
  state: { apiUrl: 'test', token: '', auth: null, recorder: {} },
  CONFIG: { apiUrl: 'test', pollMs: 8000 },
  setInterval: () => 0,
  renderSetup: () => {}, renderLogin: () => {}, refreshState: async () => {}, render: () => {}, apiCall: async () => ({}),
};
vm.createContext(context);
vm.runInContext(source, context);

assert.strictEqual(context.parseScheduleTime('10월 12(월)').dateKey, '2026-10-12');
assert.strictEqual(context.parseScheduleTime('10월 12일 (월) 오전').period, '오전');
assert.strictEqual(context.parseScheduleTime('2026-10-23 오후').period, '오후');

function prompt(label) { return `${label}\n(준비 12분 + 면접 6분)`; }

const naturalHeader = ['시간', '천사랑', '이승호', '소유나(연세)', '담당교사', '김소율', '박서원', '담당교사'];
currentRows = [
  naturalHeader,
  ['조', '1조', '', '', '', '2조', '', ''],
  ['10월 12(월)', prompt('2026 고려대 고른기회전형 자연'), prompt('2026 고려대 고른기회전형 자연'), prompt('2026 고려대 고른기회전형 자연'), '김희정', prompt('2025 고려대 계열적합전형 자연'), prompt('2025 고려대 계열적합전형 자연'), '고승범'],
];
let parsed = context.parseTeamSheet({}, 'natural');
assert.strictEqual(parsed.length, 2);
assert.deepStrictEqual(Array.from(parsed[0].students), ['천사랑','이승호','소유나']);
assert.deepStrictEqual(Array.from(parsed[1].students), ['김소율','박서원']);

// 열이 이동하고 빈 열이 끼어도 담당교사/학생/제시문 내용을 보고 읽어야 한다.
currentRows = [
  ['메모', '', '시간', '', '한지민', '박서원', '김지호', '', '담당교사', '', '박소정', '최희주', '김지후', '담당교사', '', '박예지', '오성민', '권지언', '', '담당교사'],
  ['', '', '조', '', '1조', '', '', '', '', '', '2조', '', '', '', '', '3조', '', '', '', ''],
  ['', '', '10월 13(화)', '', prompt('2026 고려대 고른기회전형 인문'), prompt('2026 고려대 고른기회전형 인문'), prompt('2026 고려대 고른기회전형 인문'), '', '윤혜영·유제호', '', prompt('2024 연세대 활동우수형 인문통합계열'), prompt('2024 연세대 활동우수형 인문통합계열'), prompt('2024 연세대 활동우수형 인문통합계열'), '장현', '', prompt('2025 고려대 계열적합전형 인문'), prompt('2025 고려대 계열적합전형 인문'), prompt('2025 고려대 계열적합전형 인문'), '', '노석완'],
];
parsed = context.parseTeamSheet({}, 'humanities');
assert.strictEqual(parsed.length, 3);
assert.deepStrictEqual(Array.from(parsed[0].students), ['한지민','박서원','김지호']);
assert.deepStrictEqual(Array.from(parsed[0].teachers), ['윤혜영','유제호']);
assert.strictEqual(parsed[2].group, '3조');

// 최종 형식의 14일 x 자연 2조, 인문·연세 3조 수를 검증한다.
const dates = ['10월 12(월)','10월 13(화)','10월 14(수)','10월 15(목)','10월 16(금)','10월 19(월)','10월 21(수)','10월 22(목)','10월 23(금)','10월 26(월)','10월 27(화)','10월 28(수)','10월 29(목)','10월 30(금)'];
currentRows = [naturalHeader, ['조','1조','','','','2조','',''], ...dates.map((d,i)=>[d,prompt(`자연1-${i}`),prompt(`자연1-${i}`),prompt(`자연1-${i}`),'김희정',prompt(`자연2-${i}`),prompt(`자연2-${i}`),'고승범'])];
assert.strictEqual(context.parseTeamSheet({}, 'natural').length, 28);
const hHeader = ['시간','한지민','박서원','김지호','담당교사','박소정','최희주','김지후','담당교사','박예지','오성민','권지언','담당교사'];
currentRows = [hHeader,['조','1조','','','','2조','','','','3조','','',''],...dates.map((d,i)=>[d,prompt(`인문1-${i}`),prompt(`인문1-${i}`),prompt(`인문1-${i}`),'윤혜영',prompt(`인문2-${i}`),prompt(`인문2-${i}`),prompt(`인문2-${i}`),'장현',prompt(`인문3-${i}`),prompt(`인문3-${i}`),prompt(`인문3-${i}`),'노석완'])];
assert.strictEqual(context.parseTeamSheet({}, 'humanities').length, 42);

console.log('schedule parser tests passed');
