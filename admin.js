const $ = (id) => document.getElementById(id);

function bytesToB64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return btoa(binary);
}

async function encryptBytes(bytes, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 160000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes));
  return JSON.stringify({
    v: 1,
    alg: 'AES-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: 160000,
    salt: bytesToB64(salt),
    iv: bytesToB64(iv),
    data: bytesToB64(encrypted),
  });
}

function downloadText(text, name) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function cleanName(value) {
  return String(value ?? '').replace(/\([^)]*\)/g, '').trim();
}

function promptPdf(prompt) {
  const first = String(prompt).split('\n')[0].trim().replace(/\s+/g, '_');
  return `${first}${first.includes('고려대') ? '_문제만' : ''}.pdf`;
}

function splitTeachers(value) {
  return String(value || '').split(/[·,/&+]+/).map((v) => v.trim()).filter(Boolean);
}

function parseWorkbook(book) {
  const natural = book.Sheets['고려대(자연)팀'];
  const humanities = book.Sheets['고려대(인문)&연세대팀'] || book.Sheets['고려대(인문)&연세기균팀'];
  if (!natural || !humanities) throw new Error('두 일정 탭을 모두 찾지 못했습니다.');
  const specs = [
    { team: 'natural', sheet: natural, groups: [
      { group: '1조', studentCols: [1,2,3], promptCol: 1, teacherCol: 4 },
      { group: '2조', studentCols: [5,6], promptCol: 5, teacherCol: 7 },
    ]},
    { team: 'humanities', sheet: humanities, groups: [
      { group: '1조', studentCols: [1,2,3], promptCol: 1, teacherCol: 4 },
      { group: '2조', studentCols: [5,6,7], promptCol: 5, teacherCol: 8 },
      { group: '3조', studentCols: [9,10,11], promptCol: 9, teacherCol: 12 },
    ]},
  ];
  const sessions = [];
  for (const spec of specs) {
    const rows = XLSX.utils.sheet_to_json(spec.sheet, { header: 1, raw: false, defval: null });
    const header = rows[0] || [];
    rows.slice(2).forEach((row, offset) => {
      const dateText = String(row[0] || '').trim();
      if (!dateText) return;
      spec.groups.forEach((g, index) => {
        const prompt = String(row[g.promptCol] || '').trim();
        if (!prompt) return;
        const teacher = String(row[g.teacherCol] || '').trim();
        const students = g.studentCols.map((col) => cleanName(header[col])).filter(Boolean);
        sessions.push({
          id: `${spec.team}-${offset + 3}-g${index + 1}`,
          team: spec.team,
          group: g.group,
          students,
          dateText,
          teacher,
          teachers: splitTeachers(teacher),
          prompt,
          pdfFile: promptPdf(prompt),
        });
      });
    });
  }
  const naturalCount = sessions.filter((s) => s.team === 'natural').length;
  const humanitiesCount = sessions.filter((s) => s.team === 'humanities').length;
  if (naturalCount !== 28 || humanitiesCount !== 42) {
    throw new Error(`일정 건수가 다릅니다. 자연 ${naturalCount}건, 인문·연세 ${humanitiesCount}건`);
  }
  return {
    title: '2027 제시문 면접 지도 일정',
    updatedAt: new Date().toISOString().slice(0,10),
    sessions,
    teamLabels: { natural: '고려대(자연)팀', humanities: '고려대(인문)&연세대팀' },
    counts: { natural: naturalCount, humanities: humanitiesCount, total: sessions.length },
  };
}

$('makeSchedule').onclick = async () => {
  const file = $('xlsx').files[0];
  const password = $('pw').value;
  if (!file || !password) return $('scheduleMsg').textContent = '접속암호와 엑셀 파일을 확인해 주세요.';
  try {
    $('scheduleMsg').textContent = '엑셀을 읽는 중...';
    const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const data = parseWorkbook(book);
    const encrypted = await encryptBytes(new TextEncoder().encode(JSON.stringify(data)), password);
    downloadText(encrypted, 'schedule.enc.json');
    $('scheduleMsg').textContent = `완료 · 자연 ${data.counts.natural}건 + 인문·연세 ${data.counts.humanities}건 = ${data.counts.total}건`;
  } catch (error) {
    $('scheduleMsg').textContent = error.message || '변환에 실패했습니다.';
  }
};

$('makeZip').onclick = async () => {
  const file = $('zip').files[0];
  const password = $('pw').value;
  if (!file || !password) return $('zipMsg').textContent = '접속암호와 ZIP 파일을 확인해 주세요.';
  try {
    $('zipMsg').textContent = 'ZIP을 암호화하는 중...';
    const encrypted = await encryptBytes(new Uint8Array(await file.arrayBuffer()), password);
    const name = `${$('kind').value}-${$('team').value}.enc.json`;
    downloadText(encrypted, name);
    $('zipMsg').textContent = `${name} 생성 완료`;
  } catch (error) {
    $('zipMsg').textContent = error.message || '암호화에 실패했습니다.';
  }
};
