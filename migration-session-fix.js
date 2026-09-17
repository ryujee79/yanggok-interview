// Migration preview compatibility patch: keep period/location stable against the currently deployed GAS v5 backend.
changeSession = async function(id, patch) {
  if (!state.data?.sessions) return;
  const current = state.data.sessions.find(s => s.id === id);
  if (!current) return;

  const previous = { ...current };
  const optimistic = { ...current };
  if (Object.prototype.hasOwnProperty.call(patch, 'classPeriod')) {
    optimistic.classPeriod = patch.classPeriod === '' || patch.classPeriod == null ? '' : Number(patch.classPeriod);
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'location')) {
    optimistic.location = String(patch.location || '미정');
  }
  if (optimistic.classPeriod === '') optimistic.location = '미정';

  state.data.sessions = state.data.sessions.map(s => s.id === id ? optimistic : s);
  state.busy = `session:${id}`;
  state.error = '';
  state.notice = '일정을 저장하는 중입니다.';
  render();

  try {
    // v5 treated a missing classPeriod as "미정". Send the complete pair every time so
    // changing only the room cannot clear the already-selected period.
    const res = await apiCall('changeSession', {
      token: state.token,
      id,
      classPeriod: optimistic.classPeriod === '' ? '' : optimistic.classPeriod,
      location: optimistic.location || '미정'
    });
    if (res?.session && state.data?.sessions) {
      state.data.sessions = state.data.sessions.map(s => s.id === id ? res.session : s);
    }
    state.notice = '일정을 변경했습니다.';
    render();
  } catch (e) {
    if (state.data?.sessions) state.data.sessions = state.data.sessions.map(s => s.id === id ? previous : s);
    state.error = e.message;
    state.notice = '';
    render();
  } finally {
    state.busy = '';
  }
};
