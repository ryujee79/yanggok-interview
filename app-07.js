function promptPdf(prompt){const line=firstLine(prompt).replace(/\s+/g,'_');return `${line}${line.includes('고려대')?'_문제만':''}.pdf`;}
function cleanStudentName(v){return String(v??'').replace(/\([^)]*\)/g,'').trim();}
function parseWorkbook(book){
  const natural=book.Sheets['고려대(자연)팀'];
  const humanities=book.Sheets['고려대(인문)&연세대팀']||book.Sheets['고려대(인문)&연세기균팀'];
  if(!natural||!humanities)throw new Error('고려대(자연)팀, 고려대(인문)&연세대팀 탭을 찾지 못했습니다.');
  const parse=(sheet,team,specs)=>{
    const rows=XLSX.utils.sheet_to_json(sheet,{header:1,raw:false,defval:null});const header=rows[0]||[];const out=[];
    rows.slice(2).forEach((row,offset)=>{const m=String(row[0]||'').match(/(\d+)월\s*(\d+)\((.)\)/);if(!m)return;const dateText=`${m[1]}월 ${m[2]}일 (${m[3]})`;const dateKey=`${String(+m[1]).padStart(2,'0')}${String(+m[2]).padStart(2,'0')}`;specs.forEach((sp,gidx)=>{const prompt=row[sp.promptCol];if(typeof prompt!=='string'||!prompt.includes('(준비'))return;const teacher=String(row[sp.teacherCol]||'').trim();const students=sp.studentCols.map(c=>cleanStudentName(header[c])).filter(Boolean);out.push({id:`${team}-${dateKey}-g${gidx+1}`,team,group:sp.group,students,dateText,period:'전체',slotIndex:offset,teacher,teachers:splitTeachers(teacher),prompt,location:'미정',pdfFile:promptPdf(prompt)});});});return out;
  };
  const n=parse(natural,'natural',[{group:'1조',studentCols:[1,2,3],promptCol:1,teacherCol:4},{group:'2조',studentCols:[5,6],promptCol:5,teacherCol:7}]);
  const h=parse(humanities,'humanities',[{group:'1조',studentCols:[1,2,3],promptCol:1,teacherCol:4},{group:'2조',studentCols:[5,6,7],promptCol:5,teacherCol:8},{group:'3조',studentCols:[9,10,11],promptCol:9,teacherCol:12}]);
  if(n.length!==28||h.length!==42)throw new Error(`최종 양식과 일정 수가 맞지 않습니다. 자연 ${n.length}건, 인문·연세 ${h.length}건을 읽었습니다.`);
  return [...n,...h];
}
async function uploadScheduleFile(file){try{state.notice='일정 엑셀을 읽는 중입니다.';render();const book=XLSX.read(await file.arrayBuffer(),{type:'array'});const sessions=parseWorkbook(book);state.notice='70개 일정을 서버에 반영하는 중입니다.';render();const res=await apiCall('uploadSchedule',{token:state.token,sessions},120000);state.notice=`업로드 완료 · 총 ${res.count}건`;await refreshState(true);}catch(e){state.error=e.message;state.notice='';render();}}

setInterval(()=>{if(state.token&&state.auth&&!Object.values(state.recorder).some(r=>['recording','paused'].includes(r.status))){refreshState(false).then(()=>{if(!state.modal)render();}).catch(()=>{});}},CONFIG.pollMs||8000);

(async function boot(){
  if(!state.apiUrl&&!CONFIG.apiUrl){renderSetup();return;}
  if(state.token){try{await refreshState(false);if(state.data){render();return;}}catch(e){} }
  renderLogin();
})();
