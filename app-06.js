async function uploadMaterialZip(){const kind=qs('#materialKind').value,team=qs('#materialTeam').value,file=qs('#materialFile').files?.[0];if(!file)return;if(file.size>30*1024*1024){qs('#materialProgress').textContent='ZIP 파일은 30MB 이하로 올려 주세요.';return;}state.busy='material-upload';try{qs('#uploadMaterialNow').disabled=true;qs('#materialProgress').textContent='파일 읽는 중...';const base64=await blobToBase64(file);qs('#materialProgress').textContent='서버에 업로드 중...';const res=await apiCall('uploadMaterialZip',{token:state.token,kind,team,fileName:file.name,base64},150000);qs('#materialProgress').textContent=`업로드 완료${res.pdfCount?` · PDF ${res.pdfCount}개`:''}`;state.notice='면접 자료를 업로드했습니다.';await refreshState(false);setTimeout(()=>{state.modal=null;state.modalData=null;render();},500);}catch(e){qs('#materialProgress').textContent=e.message;}finally{state.busy='';if(qs('#uploadMaterialNow'))qs('#uploadMaterialNow').disabled=false;}}

function roomCellAction(btn){const [room,p]=btn.dataset.roomCell.split('|'),period=Number(p),date=state.usageDate||localTodayDateKey(),info=usageInfo(date,period,room);if(info.kind==='free'){state.error='';state.modal='booking';state.modalData={dateKey:date,period,room};render();}else if(info.kind==='manual'){state.error='';state.modal='booking';state.modalData={dateKey:date,period,room,booking:info.booking};render();}}
async function saveBookingFromModal(){
  const d=state.modalData||{},student=qs('#bookingStudent')?.value.trim();
  if(!student){state.error='면접 학생 이름을 입력해 주세요.';return render();}
  const previous=state.data?.manualBookings?[...state.data.manualBookings]:[];
  const pending={id:`pending-${uid()}`,dateKey:d.dateKey,period:Number(d.period),room:d.room,teacher:state.auth.name,student,createdAt:new Date().toISOString()};
  if(state.data)state.data.manualBookings=manualSort([...previous,pending]);
  state.usageDate=d.dateKey;state.modal=null;state.modalData=null;state.error='';state.notice='면접실 예약을 저장하는 중입니다.';state.busy='booking-save';render();
  try{
    const res=await apiCall('createManualBooking',{token:state.token,dateKey:d.dateKey,period:Number(d.period),room:d.room,student});
    if(state.data)state.data.manualBookings=Array.isArray(res.bookings)?manualSort(res.bookings):manualSort([...previous,res.booking].filter(Boolean));
    state.notice=`${fmtDate(d.dateKey)} ${d.period}교시 ${d.room} 면접을 예약했습니다.`;render();
  }catch(e){
    if(state.data)state.data.manualBookings=previous;
    state.modal='booking';state.modalData=d;state.error=e.message;state.notice='';render();
  }finally{state.busy='';}
}
async function cancelBookingFromModal(){
  const b=state.modalData?.booking;if(!b)return;
  const previous=state.data?.manualBookings?[...state.data.manualBookings]:[];
  if(state.data)state.data.manualBookings=previous.filter(x=>x.id!==b.id);
  state.busy='booking-cancel';state.modal=null;state.modalData=null;state.error='';state.notice='면접 예약을 취소하는 중입니다.';render();
  try{const res=await apiCall('cancelManualBooking',{token:state.token,id:b.id});if(state.data&&Array.isArray(res.bookings))state.data.manualBookings=manualSort(res.bookings);state.notice='면접 예약을 취소했습니다.';render();}
  catch(e){if(state.data)state.data.manualBookings=previous;state.error=e.message;state.notice='';render();}
  finally{state.busy='';}
}
async function cancelBookingById(id){
  const b=(state.data?.manualBookings||[]).find(x=>x.id===id);if(!b)return;if(!confirm(`${fmtDate(b.dateKey)} ${b.period}교시 ${b.room} · ${b.student}\n예약을 취소할까요?`))return;
  const previous=[...(state.data?.manualBookings||[])];if(state.data)state.data.manualBookings=previous.filter(x=>x.id!==id);state.busy='booking-cancel';state.notice='면접 예약을 취소하는 중입니다.';render();
  try{const res=await apiCall('cancelManualBooking',{token:state.token,id});if(state.data&&Array.isArray(res.bookings))state.data.manualBookings=manualSort(res.bookings);state.notice='면접 예약을 취소했습니다.';render();}
  catch(e){if(state.data)state.data.manualBookings=previous;state.error=e.message;state.notice='';render();}
  finally{state.busy='';}
}

async function addRoomUse(){const mode=qs('#useMode').value,teacher=qs('#useTeacher').value.trim(),subject=qs('#useSubject').value.trim();if(!teacher||!subject){state.error='교사명과 수업·사용 내용을 입력해 주세요.';return render();}const payload={token:state.token,room:qs('#useRoom').value,period:Number(qs('#usePeriod').value),label:`수업 · ${teacher} · ${subject}`};if(mode==='date')payload.dateKey=qs('#useDate').value;else payload.weekday=Number(qs('#useWeekday').value);state.busy='room-use-save';try{const res=await apiCall('addRoomUse',payload);state.notice=`특별실 사용시간을 저장했습니다.${res.sessionConflictsCleared?` 겹치던 제시문 면접 ${res.sessionConflictsCleared}건의 장소를 미정으로 변경했습니다.`:''}${res.bookingsCancelled?` 직접 예약 ${res.bookingsCancelled}건을 취소했습니다.`:''}`;state.error='';await refreshState(false);render();}catch(e){state.error=e.message;render();}finally{state.busy='';}}
async function deleteRoomUse(id){if(!confirm('이 특별실 사용시간을 삭제할까요?'))return;state.busy='room-use-delete';try{await apiCall('deleteRoomUse',{token:state.token,id});state.notice='특별실 사용시간을 삭제했습니다.';await refreshState(false);render();}catch(e){state.error=e.message;render();}finally{state.busy='';}}
