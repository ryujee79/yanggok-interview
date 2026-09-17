function ensureAllSheets_() {
  const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('DATA_SPREADSHEET_ID'));
  Object.keys(SHEETS).forEach(key => {
    const name = sheetName_(key);
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    const headers = SHEETS[key];
    if (sheet.getLastRow() === 0) sheet.getRange(1,1,1,headers.length).setValues([headers]);
    else sheet.getRange(1,1,1,headers.length).setValues([headers]);
  });
  SpreadsheetApp.flush();
}

function sheetName_(key) {
  return ({sessions:'Sessions',users:'Users',bookings:'ManualBookings',roomUses:'RoomUses',history:'History',materials:'Materials'})[key];
}

function getSheet_(key) {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('DATA_SPREADSHEET_ID');
  if (!spreadsheetId) throw new Error('데이터 스프레드시트가 설정되지 않았습니다. setupSystem()을 실행해 주세요.');
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const name = sheetName_(key);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    const headers = SHEETS[key];
    sheet.getRange(1,1,1,headers.length).setValues([headers]);
    SpreadsheetApp.flush();
  }
  return sheet;
}

function readObjects_(key) {
  const sheet = getSheet_(key);
  const headers = SHEETS[key];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2,1,lastRow-1,headers.length).getValues();
  return values.filter(row => row.some(v => v !== '')).map(row => {
    const obj = {};
    headers.forEach((h,i) => obj[h] = row[i]);
    return obj;
  });
}

function writeObjects_(key, objects) {
  const sheet = getSheet_(key);
  const headers = SHEETS[key];
  if (sheet.getLastRow() > 1) sheet.getRange(2,1,sheet.getLastRow()-1,headers.length).clearContent();
  if (!objects.length) {
    SpreadsheetApp.flush();
    return;
  }
  const rows = objects.map(obj => headers.map(h => obj[h] == null ? '' : obj[h]));
  const dateKeyIndex = headers.indexOf('dateKey');
  if (dateKeyIndex >= 0) sheet.getRange(2,dateKeyIndex+1,rows.length,1).setNumberFormat('@');
  sheet.getRange(2,1,rows.length,headers.length).setValues(rows);
  SpreadsheetApp.flush();
}

function encodeSession_(s) {
  return Object.assign({}, s, { teachers: JSON.stringify(s.teachers || []), students: JSON.stringify(s.students || []) });
}

function decodeSession_(s) {
  return Object.assign({}, s, {
    slotIndex: Number(s.slotIndex || 0),
    classPeriod: s.classPeriod === '' ? '' : Number(s.classPeriod || 0) || '',
    teachers: parseJsonArray_(s.teachers),
    students: parseJsonArray_(s.students),
    location: s.location || '미정'
  });
}

function parseJsonArray_(value) {
  if (Array.isArray(value)) return value;
  try { const a = JSON.parse(String(value || '[]')); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}

function normalizeDateKey_(value) {
  if (value === '' || value == null) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone() || 'Asia/Seoul', 'yyyy-MM-dd');
  }
  const text = String(value).trim();
  const direct = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (direct) return direct[1] + '-' + direct[2] + '-' + direct[3];
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];
  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) return Utilities.formatDate(parsed, Session.getScriptTimeZone() || 'Asia/Seoul', 'yyyy-MM-dd');
  return text;
}

function normalizeNumbers_(obj) {
  const out = Object.assign({}, obj);
  ['period','weekday'].forEach(k => { if (out[k] !== '' && out[k] != null) out[k] = Number(out[k]); });
  if (Object.prototype.hasOwnProperty.call(out, 'dateKey')) out.dateKey = normalizeDateKey_(out.dateKey);
  return out;
}

function splitTeachers_(value) {
  return String(value || '').replace(/[,\/&+]/g,'·').split('·').map(x => x.trim()).filter(Boolean);
}

function getRootFolder_() {
  const id = PropertiesService.getScriptProperties().getProperty('DATA_FOLDER_ID');
  if (!id) throw new Error('자료 폴더가 설정되지 않았습니다. setupSystem()을 실행해 주세요.');
  return DriveApp.getFolderById(id);
}

function ensureSubfolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function saveBase64File_(folder, fileName, mimeType, base64) {
  const bytes = Utilities.base64Decode(base64);
  if (!bytes.length) throw new Error('업로드할 파일이 비어 있습니다.');
  return folder.createFile(Utilities.newBlob(bytes, mimeType, fileName));
}

function materialRow_(x) {
  return {
    id: 'mat-' + Utilities.getUuid(), sessionId: x.sessionId || '', team: x.team || '', kind: x.kind || '', fileName: x.fileName || '',
    fileId: x.fileId || '', mimeType: x.mimeType || '', student: x.student || '', canonical: x.canonical || '', uploader: x.uploader || '', createdAt: new Date().toISOString()
  };
}

function trashFile_(id) {
  if (!id) return;
  try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {}
}

function canonical_(value) {
  return String(value || '').normalize('NFC').toLowerCase().replace(/\.pdf$/i,'').replace(/문제만|해설포함|해설포함본/g,'').replace(/[\s_\-()&]/g,'');
}

function safeFileName_(value) {
  return String(value || 'file').replace(/[\\/:*?"<>|]/g,'_').trim() || 'file';
}

function hash_(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8);
  return bytes.map(b => ('0' + ((b < 0 ? b + 256 : b).toString(16))).slice(-2)).join('');
}

function addHistory_(actor, action, detail) {
  const rows = readObjects_('history');
  rows.push({ id:'hist-' + Utilities.getUuid(), actor:actor || '시스템', action, detail, createdAt:new Date().toISOString() });
  writeObjects_('history', rows.slice(-500));
}

function overlap_(a,b) { return a.some(x => b.includes(x)); }
function firstLine_(s) { return String(s || '').split('\n')[0].trim(); }

function dateKeyForDateText_(text) {
  const m = String(text || '').match(/(\d+)월\s*(\d+)/);
  if (!m) return '';
  return '2026-' + String(Number(m[1])).padStart(2,'0') + '-' + String(Number(m[2])).padStart(2,'0');
}

function roomUseMatches_(use, dateKey, period, room) {
  if (use.room !== room || Number(use.period) !== Number(period)) return false;
  const useDateKey = normalizeDateKey_(use.dateKey);
  const targetDateKey = normalizeDateKey_(dateKey);
  if (useDateKey) return useDateKey === targetDateKey;
  if (!use.weekday) return false;
  return new Date(targetDateKey + 'T00:00:00').getDay() === Number(use.weekday);
}
