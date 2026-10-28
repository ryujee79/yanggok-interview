function bindMainEvents(){
  qs('#logoutBtn')?.addEventListener('click',logout);qs('#refreshBtn')?.addEventListener('click',()=>refreshState(true));
  qs('#studentSearch')?.addEventListener('input',e=>{state.studentQuery=e.target.value;render();});qs('#clearStudentSearch')?.addEventListener('click',()=>{state.studentQuery='';render();});
  qsa('[data-view-team]').forEach(b=>b.onclick=()=>{state.modal='team';state.modalData=b.dataset.viewTeam;render();});
  qs('#scheduleUploadBtn')?.addEventListener('click',()=>qs('#scheduleFile').click());qs('#scheduleFile')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(f)uploadScheduleFile(f);e.target.value='';});
  qs('#materialUploadBtn')?.addEventListener('click',()=>{state.modal='materialUpload';state.modalData=null;render();});
  qs('#roomBtn')?.addEventListener('click',()=>{state.modal='rooms';state.modalData={date:'2026-10-12'};render();});
  qs('#roomManageBtn')?.addEventListener('click',()=>{state.modal='roomManage';state.modalData={date:'2026-10-12'};render();});
  qs('#historyBtn')?.addEventListener('click',()=>{state.modal='history';render();});
  bindDynamicEvents();
}

function bindDynamicEvents(){
  qs('#modalBackdrop')?.addEventListener('click',()=>{ if(state.auth?.mustChange)return; state.modal=null;state.modalData=null;render();});
  qs('#closeModal')?.addEventListener('click',()=>{state.modal=null;state.modalData=null;render();});
  qs('#saveNewPassword')?.addEventListener('click',changePassword);
  qsa('[data-download-material]').forEach(b=>b.onclick=()=>b.dataset.downloadMaterial&&downloadMaterial(b.dataset.downloadMaterial,false));
  // Student resource links use Drive IDs instead of material IDs; bind them as well.
  qsa('[data-published-id]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.publishedId, name=b.dataset.publishedName||'면접 자료';
    if(!/^[A-Za-z0-9_-]{15,}$/.test(id||'')){state.error='다운로드할 파일 정보를 찾지 못했습니다.';render();return;}
    const material=(state.data?.materials||[]).find(m=>m.fileId===id);
    if(material){downloadMaterial(material.id,false);return;}
    // For resources not returned in a student session payload, open the Drive file.
    const url='https://drive.google.com/file/d/'+encodeURIComponent(id)+'/view';
    const link=document.createElement('a');
    link.href=url;link.target='_blank';link.rel='noopener noreferrer';
    link.setAttribute('download',name);
    document.body.appendChild(link);link.click();link.remove();
  });
  qsa('[data-delete-reference]').forEach(b=>b.onclick=()=>deleteReference(b.dataset.deleteReference));
  qsa('[data-reference-upload]').forEach(inp=>inp.onchange=e=>{const f=e.target.files?.[0];if(f)uploadReference(inp.dataset.referenceUpload,f);e.target.value='';});
  qsa('[data-teacher-upload]').forEach(inp=>inp.onchange=e=>{
    const file=e.target.files?.[0];if(!file)return;
    if(!/\.pdf$/i.test(file.name)){state.error='교사용 자료는 PDF만 업로드할 수 있습니다.';render();return;}
    const session=(state.data?.sessions||[]).find(s=>s.id===inp.dataset.teacherUpload);
    if(!session){state.error='면접 일정을 찾지 못했습니다.';render();return;}
    const fileName=String(session.pdfFile||'면접제시문').replace(/\.pdf$/i,'')+'(교사용).pdf';
    uploadReference(session.id,new File([file],fileName,{type:'application/pdf'}));
    inp.value='';
  });
  qsa('[data-period]').forEach(sel=>sel.onchange=()=>changeSession(sel.dataset.period,{classPeriod:sel.value,location:'미정'}));
  qsa('[data-location]').forEach(sel=>sel.onchange=()=>changeSession(sel.dataset.location,{location:sel.value}));
  qsa('[data-swap]').forEach(b=>b.onclick=()=>{state.modal='swap';state.modalData=b.dataset.swap;render();});
  qsa('[data-swap-mode]').forEach(b=>b.onclick=()=>swapSessions(b.dataset.swapMode));
  qs('#uploadMaterialNow')?.addEventListener('click',uploadMaterialZip);
  qs('#roomDate')?.addEventListener('change',e=>{state.modalData={date:e.target.value};render();});
  qsa('[data-room-cell]').forEach(b=>b.onclick=()=>roomCellAction(b));
  qs('#useMode')?.addEventListener('change',e=>{qs('#useDate').classList.toggle('hidden',e.target.value!=='date');qs('#useWeekday').classList.toggle('hidden',e.target.value!=='weekly');});
  qs('#addRoomUse')?.addEventListener('click',addRoomUse);
  qsa('[data-delete-room-use]').forEach(b=>b.onclick=()=>deleteRoomUse(b.dataset.deleteRoomUse));
}
