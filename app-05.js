async function changePassword(){ const a=qs('#newPassword').value,b=qs('#newPassword2').value;if(a!==b){state.error='새 비밀번호 확인이 일치하지 않습니다.';return render();}state.busy='password';try{await apiCall('changeStudentPassword',{token:state.token,newPassword:a});state.auth.mustChange=false;state.modal=null;state.notice='비밀번호를 변경했습니다.';await refreshState(true);}catch(e){state.error=e.message;render();}finally{state.busy='';} }

async function changeSession(id,patch){
  if(!state.data?.sessions)return;
  const current=state.data.sessions.find(s=>s.id===id);
  if(!current)return;
  const previous={...current};
  const optimistic={...current};
  if(Object.prototype.hasOwnProperty.call(patch,'classPeriod')) optimistic.classPeriod=patch.classPeriod===''||patch.classPeriod==null?'':Number(patch.classPeriod);
  if(Object.prototype.hasOwnProperty.call(patch,'location')) optimistic.location=String(patch.location||'미정');
  if(optimistic.classPeriod==='') optimistic.location='미정';
  state.data.sessions=state.data.sessions.map(s=>s.id===id?optimistic:s);
  state.busy=`session:${id}`;
  state.error='';
  state.notice='일정을 저장하는 중입니다.';
  render();
  try{
    const res=await apiCall('changeSession',{token:state.token,id,...patch});
    if(res?.session&&state.data?.sessions)state.data.sessions=state.data.sessions.map(s=>s.id===id?res.session:s);
    state.notice='일정을 변경했습니다.';
    render();
  }catch(e){
    if(state.data?.sessions)state.data.sessions=state.data.sessions.map(s=>s.id===id?previous:s);
    state.error=e.message;
    state.notice='';
    render();
  }finally{state.busy='';}
}
async function swapSessions(mode){const target=qs('#swapTarget')?.value;if(!target)return;state.busy='swap';try{await apiCall('swapSessions',{token:state.token,aId:state.modalData,bId:target,mode});state.modal=null;state.notice='일정 교환을 반영했습니다.';await refreshState(true);}catch(e){state.error=e.message;render();}finally{state.busy='';}}

async function downloadMaterial(id){state.busy=`download:${id}`;try{state.notice='자료를 불러오는 중입니다.';render();const res=await apiCall('downloadMaterial',{token:state.token,id},120000);const blob=base64ToBlob(res.base64,res.mimeType);state.notice='';downloadBlob(blob,res.fileName);render();}catch(e){state.error=e.message;state.notice='';render();}finally{state.busy='';} }

async function uploadReference(sessionId,file){if(file.size>20*1024*1024){state.error='참고자료는 20MB 이하로 올려 주세요.';return render();}state.busy='reference-upload';try{state.notice='참고자료 업로드 중...';render();const base64=await blobToBase64(file);await apiCall('uploadReference',{token:state.token,sessionId,fileName:file.name,mimeType:file.type||'application/octet-stream',base64},120000);state.notice='참고자료를 업로드했습니다.';await refreshState(true);}catch(e){state.error=e.message;state.notice='';render();}finally{state.busy='';}}
async function deleteReference(id){if(!confirm('이 참고자료를 삭제할까요?'))return;state.busy='reference-delete';try{await apiCall('deleteReference',{token:state.token,id});state.notice='참고자료를 삭제했습니다.';await refreshState(true);}catch(e){state.error=e.message;render();}finally{state.busy='';}}
