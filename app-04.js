function bindMainEvents(){
  qs('#logoutBtn')?.addEventListener('click',logout);
  qs('#refreshBtn')?.addEventListener('click',()=>refreshState(true));
  qs('#studentSearch')?.addEventListener('input',e=>{state.studentQuery=e.target.value;render();});
  qs('#clearStudentSearch')?.addEventListener('click',()=>{state.studentQuery='';render();});
  qsa('[data-view-team]').forEach(b=>b.onclick=()=>{state.modal='team';state.modalData=b.dataset.viewTeam;render();});
  qs('#scheduleUploadBtn')?.addEventListener('click',()=>{state.notice='';state.error='';state.modal='scheduleUpload';state.modalData=null;render();});
  qs('#materialUploadBtn')?.addEventListener('click',()=>{state.modal='materialUpload';state.modalData=null;state.error='';render();});
  qs('#roomManageBtn')?.addEventListener('click',()=>{state.modal='roomManage';state.modalData=null;state.error='';render();});
  qs('#historyBtn')?.addEventListener('click',()=>{state.modal='history';state.modalData=null;render();});
  qs('#roomDate')?.addEventListener('change',e=>{state.usageDate=e.target.value||localTodayDateKey();render();});
  qs('#prevRoomDate')?.addEventListener('click',()=>{state.usageDate=shiftDateKey(state.usageDate,-1);render();});
  qs('#nextRoomDate')?.addEventListener('click',()=>{state.usageDate=shiftDateKey(state.usageDate,1);render();});
  qsa('[data-jump-date]').forEach(b=>b.onclick=()=>{state.usageDate=b.dataset.jumpDate||state.usageDate;render();});
  bindDynamicEvents();
}

function bindDynamicEvents(){
  qs('#modalBackdrop')?.addEventListener('click',()=>{if(state.auth?.mustChange)return;state.modal=null;state.modalData=null;state.error='';render();});
  qs('#closeModal')?.addEventListener('click',()=>{state.modal=null;state.modalData=null;state.error='';render();});
  qs('#closeModal2')?.addEventListener('click',()=>{state.modal=null;state.modalData=null;state.error='';render();});
  qs('#saveNewPassword')?.addEventListener('click',changePassword);
  qs('#scheduleFileModal')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(f)uploadScheduleFile(f);e.target.value='';});
  qsa('[data-download-material]').forEach(b=>b.onclick=()=>b.dataset.downloadMaterial&&downloadMaterial(b.dataset.downloadMaterial,false));
  qsa('[data-play-material]').forEach(b=>b.onclick=()=>downloadMaterial(b.dataset.playMaterial,true));
  qsa('[data-missing-recording]').forEach(b=>b.onclick=()=>{state.notice=`${b.dataset.missingRecording} 학생은 아직 저장된 녹음이 없습니다.`;render();});
  qsa('[data-delete-reference]').forEach(b=>b.onclick=()=>deleteReference(b.dataset.deleteReference));
  qsa('[data-delete-recording]').forEach(b=>b.onclick=()=>deleteRecording(b.dataset.deleteRecording));
  qsa('[data-reference-upload]').forEach(inp=>inp.onchange=e=>{const f=e.target.files?.[0];if(f)uploadReference(inp.dataset.referenceUpload,f);e.target.value='';});
  qsa('[data-period]').forEach(sel=>sel.onchange=()=>changeSession(sel.dataset.period,{classPeriod:sel.value,location:'미정'}));
  qsa('[data-location]').forEach(sel=>sel.onchange=()=>changeSession(sel.dataset.location,{location:sel.value}));
  qsa('[data-swap]').forEach(b=>b.onclick=()=>{state.modal='swap';state.modalData=b.dataset.swap;render();});
  qsa('[data-swap-mode]').forEach(b=>b.onclick=()=>swapSessions(b.dataset.swapMode));
  qsa('[data-rec-start]').forEach(b=>b.onclick=()=>startRecording(b.dataset.recStart));
  qsa('[data-rec-pause]').forEach(b=>b.onclick=()=>pauseRecording(b.dataset.recPause));
  qsa('[data-rec-resume]').forEach(b=>b.onclick=()=>resumeRecording(b.dataset.recResume));
  qsa('[data-rec-restart]').forEach(b=>b.onclick=()=>restartRecording(b.dataset.recRestart));
  qsa('[data-rec-stop]').forEach(b=>b.onclick=()=>stopRecording(b.dataset.recStop));
  qsa('[data-rec-upload]').forEach(b=>b.onclick=()=>uploadRecording(b.dataset.recUpload));
  qs('#uploadMaterialNow')?.addEventListener('click',uploadMaterialZip);
  qsa('[data-room-cell]').forEach(b=>b.onclick=()=>roomCellAction(b));
  qsa('[data-cancel-booking]').forEach(b=>b.onclick=()=>cancelBookingById(b.dataset.cancelBooking));
  qs('#saveBookingNow')?.addEventListener('click',saveBookingFromModal);
  qs('#cancelBookingNow')?.addEventListener('click',cancelBookingFromModal);
  qs('#useMode')?.addEventListener('change',e=>{const date=e.target.value==='date';qs('#dateWrap')?.classList.toggle('hidden',!date);qs('#weeklyWrap')?.classList.toggle('hidden',date);});
  qs('#addRoomUse')?.addEventListener('click',addRoomUse);
  qsa('[data-delete-room-use]').forEach(b=>b.onclick=()=>deleteRoomUse(b.dataset.deleteRoomUse));
}
