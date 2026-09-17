const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('gas/Code.gs', 'utf8');
const context = {
  console, Date, JSON, Set, Map, Math,
  Session: { getScriptTimeZone: () => 'Asia/Seoul' },
  Utilities: {
    formatDate: (value) => {
      const d = new Date(value);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    },
  },
};
vm.createContext(context);
vm.runInContext(source, context);

const base = {
  id: 'a', team: 'humanities', group: '1조', dateText: '10월 12일 (월)', period: '전체',
  classPeriod: 5, teacher: '윤혜영·유제호', teachers: ['윤혜영','유제호'], students: ['한지민'],
  prompt: '지문', location: '과학실1'
};

let message = context.sessionConflict_(base, [], [], [{room:'과학실1',dateKey:'2026-10-12',period:5,label:'행사'}]);
assert.match(message, /과학실1/);

message = context.sessionConflict_(base, [{...base,id:'b',teacher:'유제호',teachers:['유제호'],students:['다른학생'],location:'과학실2'}], [], []);
assert.match(message, /겹칩니다/);

message = context.sessionConflict_(base, [{...base,id:'b',teacher:'다른교사',teachers:['다른교사'],students:['한지민'],location:'과학실2'}], [], []);
assert.match(message, /겹칩니다/);

message = context.sessionConflict_(base, [], [{dateKey:'2026-10-12',period:5,teacher:'유제호',student:'다른학생',room:'특별실1'}], []);
assert.match(message, /직접 예약/);

message = context.sessionConflict_(base, [], [{dateKey:'2026-10-12',period:5,teacher:'다른교사',student:'한지민',room:'특별실1'}], []);
assert.match(message, /직접 예약/);

message = context.sessionConflict_(base, [], [{dateKey:'2026-10-12',period:5,teacher:'다른교사',student:'다른학생',room:'과학실1'}], []);
assert.match(message, /직접 예약/);

message = context.sessionConflict_(base, [{...base,id:'b',dateText:'10월 13일 (화)',teacher:'유제호',teachers:['유제호']}], [{dateKey:'2026-10-12',period:6,teacher:'유제호',student:'한지민',room:'과학실1'}], []);
assert.strictEqual(message, '');

assert.deepStrictEqual(Array.from(context.splitTeachers_('윤혜영 / 유제호&장현+노석완')), ['윤혜영','유제호','장현','노석완']);
assert.strictEqual(context.sessionLooseIdentityKey_({...base,period:'오전'}), context.sessionLooseIdentityKey_({...base,period:'전체'}));
assert.strictEqual(context.normalizeDateKey_('2026-09-17'), '2026-09-17');
assert.strictEqual(context.normalizeDateKey_('2026-09-17T00:00:00.000Z'), '2026-09-17');

// 장소만 바꿀 때 기존 교시가 사라지면 안 된다.
let sessionRows = [{
  id:'patch', team:'humanities', group:'1조', dateText:'10월 12일 (월)', period:'전체', slotIndex:0,
  classPeriod:7, teacher:'유제호', teachers:JSON.stringify(['유제호']), students:JSON.stringify(['한지민']),
  prompt:'지문', pdfFile:'지문.pdf', location:'미정', updatedAt:''
}];
context.requireAuth_ = () => ({role:'teacher', name:'유제호'});
context.LockService = { getScriptLock: () => ({ waitLock(){}, releaseLock(){} }) };
context.readObjects_ = key => key === 'sessions' ? sessionRows : [];
context.writeObjects_ = (key, rows) => { if (key === 'sessions') sessionRows = rows; };
context.addHistory_ = () => {};
context.sessionConflict_ = () => '';
const changed = context.changeSession_({id:'patch', location:'과학실1'});
assert.strictEqual(changed.session.classPeriod, 7);
assert.strictEqual(changed.session.location, '과학실1');

console.log('conflict logic tests passed');
