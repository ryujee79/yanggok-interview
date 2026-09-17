const APP_VERSION = '2026-09-17-appdeploy-v42-migration-v6';
const DEFAULT_ALLOWED_ORIGIN = 'https://ryujee79.github.io';
const INITIAL_STUDENT_PASSWORD = '1234';
const TOKEN_TTL_SECONDS = 21600;
const ROOM_CHOICES = ['미정','면접지도실','과학실1','과학실2','특별실1','특별실3','라온실','데이터분석실','해양학습실'];
const SHEETS = {
  sessions: ['id','team','group','dateText','period','slotIndex','teacher','teachers','students','prompt','pdfFile','classPeriod','location','updatedAt'],
  users: ['name','passwordHash','updatedAt'],
  bookings: ['id','dateKey','period','room','teacher','student','createdAt'],
  roomUses: ['id','room','weekday','dateKey','period','label','createdBy','updatedAt'],
  history: ['id','actor','action','detail','createdAt'],
  materials: ['id','sessionId','team','kind','fileName','fileId','mimeType','student','canonical','uploader','createdAt']
};

function setupSystem() {
  const props = PropertiesService.getScriptProperties();
  let spreadsheetId = props.getProperty('DATA_SPREADSHEET_ID');
  if (!spreadsheetId) {
    const ss = SpreadsheetApp.create('양곡고_2027_제시문면접_웹앱_데이터');
    spreadsheetId = ss.getId();
    props.setProperty('DATA_SPREADSHEET_ID', spreadsheetId);
  }
  let folderId = props.getProperty('DATA_FOLDER_ID');
  if (!folderId) {
    const folder = DriveApp.createFolder('양곡고_2027_제시문면접_웹앱_자료');
    folderId = folder.getId();
    props.setProperty('DATA_FOLDER_ID', folderId);
  }
  if (!props.getProperty('ALLOWED_ORIGIN')) props.setProperty('ALLOWED_ORIGIN', DEFAULT_ALLOWED_ORIGIN);
  ensureAllSheets_();
  seedRoomUses_();
  return { spreadsheetId, folderId, version: APP_VERSION };
}

function setTeacherCredentials(jsonText) {
  const parsed = JSON.parse(jsonText);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('교사 비밀번호 JSON 형식을 확인해 주세요.');
  const cleaned = {};
  Object.keys(parsed).forEach(name => {
    const password = String(parsed[name] == null ? '' : parsed[name]).trim();
    if (!name.trim() || !/^\d{4}$/.test(password)) throw new Error(name + ' 교사의 비밀번호는 4자리 숫자여야 합니다.');
    cleaned[name.trim()] = hash_(password);
  });
  PropertiesService.getScriptProperties().setProperty('TEACHER_CREDENTIAL_HASHES_JSON', JSON.stringify(cleaned));
  return { count: Object.keys(cleaned).length };
}

function systemStatus() {
  const props = PropertiesService.getScriptProperties();
  return {
    version: APP_VERSION,
    spreadsheetReady: !!props.getProperty('DATA_SPREADSHEET_ID'),
    folderReady: !!props.getProperty('DATA_FOLDER_ID'),
    teacherCredentialsReady: !!props.getProperty('TEACHER_CREDENTIAL_HASHES_JSON'),
    allowedOrigin: props.getProperty('ALLOWED_ORIGIN') || DEFAULT_ALLOWED_ORIGIN
  };
}

function doGet(e) {
  const callback = String(e && e.parameter && e.parameter.callback || '');
  const raw = String(e && e.parameter && e.parameter.payload || '');
  if (callback && raw) {
    if (!/^[A-Za-z_$][A-Za-z0-9_$]{0,80}$/.test(callback)) return ContentService.createTextOutput('/* invalid callback */').setMimeType(ContentService.MimeType.JAVASCRIPT);
    let requestId = '';
    try {
      const payload = JSON.parse(raw);
      requestId = String(payload.requestId || '');
      validateOrigin_(String(payload.origin || DEFAULT_ALLOWED_ORIGIN));
      const data = dispatch_(payload);
      return jsonpResponse_(callback, { requestId, ok:true, data });
    } catch (err) {
      return jsonpResponse_(callback, { requestId, ok:false, error:err && err.message ? err.message : String(err) });
    }
  }
  return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><title>양곡고 면접 API</title><body style="font-family:sans-serif;padding:24px"><h2>양곡고 2027 제시문 면접 API</h2><p>GitHub Pages 웹앱에서 사용하는 백엔드입니다.</p><p>버전: ' + APP_VERSION + '</p></body>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function jsonpResponse_(callback, result) {
  const json = JSON.stringify(result).replace(/</g, '\\u003c');
  return ContentService.createTextOutput(callback + '(' + json + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function doPost(e) {
  let requestId = '';
  let origin = DEFAULT_ALLOWED_ORIGIN;
  try {
    const payload = JSON.parse((e && e.parameter && e.parameter.payload) || '{}');
    requestId = String(payload.requestId || '');
    origin = String(payload.origin || DEFAULT_ALLOWED_ORIGIN);
    validateOrigin_(origin);
    const data = dispatch_(payload);
    return iframeResponse_(origin, { requestId, ok: true, data });
  } catch (err) {
    return iframeResponse_(origin, { requestId, ok: false, error: err && err.message ? err.message : String(err) });
  }
}

function dispatch_(payload) {
  const action = String(payload.action || '');
  switch (action) {
    case 'health': return systemStatus();
    case 'login': return login_(payload);
    case 'changeStudentPassword': return changeStudentPassword_(payload);
    case 'getState': return getState_(payload);
    case 'uploadSchedule': return uploadSchedule_(payload);
    case 'changeSession': return changeSession_(payload);
    case 'createManualBooking': return createManualBooking_(payload);
    case 'cancelManualBooking': return cancelManualBooking_(payload);
    case 'addRoomUse': return addRoomUse_(payload);
    case 'deleteRoomUse': return deleteRoomUse_(payload);
    case 'swapSessions': return swapSessions_(payload);
    case 'uploadReference': return uploadReference_(payload);
    case 'deleteReference': return deleteReference_(payload);
    case 'uploadMaterialZip': return uploadMaterialZip_(payload);
    case 'downloadMaterial': return downloadMaterial_(payload);
    default: throw new Error('알 수 없는 요청입니다: ' + action);
  }
}
