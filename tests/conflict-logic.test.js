const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('gas/Code.gs', 'utf8');
const context = { console, Date, JSON, Set, Map, Math };
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

console.log('conflict logic tests passed');
