// YangGok interview app core
const app = document.getElementById('app');
const CONFIG = window.YANGGOK_CONFIG || { apiUrl:'', pollMs:8000 };
const TEAM_LABELS = { natural:'고려대(자연)팀', humanities:'고려대(인문)&연세대팀' };
const state = {
  apiUrl: CONFIG.apiUrl || localStorage.getItem('yi-api-url') || '',
  role: localStorage.getItem('yi-role') || 'teacher',
  token: localStorage.getItem('yi-token') || '',
  auth:null,data:null,notice:'',error:'',studentQuery:'',modal:null,modalData:null,busy:'',
  recorder:{},audioUrls:{},lastStateAt:0,usageDate:localTodayDateKey(),selectedTeam:null
};
const qs=(s,root=document)=>root.querySelector(s);
const qsa=(s,root=document)=>[...root.querySelectorAll(s)];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const firstLine=value=>String(value||'').split('\n')[0].trim();
const secondLine=value=>String(value||'').split('\n').slice(1).join(' ').trim();
const splitTeachers=value=>String(value||'').replace(/[,/&+]/g,'·').split('·').map(x=>x.trim()).filter(Boolean);
const canonical=value=>String(value||'').normalize('NFC').toLowerCase().replace(/\.pdf$/i,'').replace(/문제만|해설포함|해설포함본/g,'').replace(/[\s_\-()&]/g,'');
const teamLabel=team=>TEAM_LABELS[team]||team;
const dateKeyFromText=text=>{const m=String(text||'').match(/(\d+)월\s*(\d+)/);return m?`2026-${String(+m[1]).padStart(2,'0')}-${String(+m[2]).padStart(2,'0')}`:'';};
const fmtDate=key=>{if(!key)return'';const d=new Date(key+'T00:00:00');return `${d.getMonth()+1}월 ${d.getDate()}일 (${['일','월','화','수','목','금','토'][d.getDay()]})`;};
function uid(){return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;}
function localTodayDateKey(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function shiftDateKey(key,days){const d=new Date((key||localTodayDateKey())+'T00:00:00');d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function sessionDateMs(s){const key=dateKeyFromText(s.dateText);return key?new Date(key+'T00:00:00').getTime():Number.MAX_SAFE_INTEGER;}
function isArchivedSession(s){const today=new Date();today.setHours(0,0,0,0);const cutoff=new Date(today);cutoff.setDate(cutoff.getDate()-2);return sessionDateMs(s)<cutoff.getTime();}
function sortSessions(arr){return [...arr].sort((a,b)=>Number(isArchivedSession(a))-Number(isArchivedSession(b))||sessionDateMs(a)-sessionDateMs(b)||(Number(a.classPeriod)||99)-(Number(b.classPeriod)||99)||(Number(a.slotIndex)||0)-(Number(b.slotIndex)||0)||String(a.team).localeCompare(String(b.team))||String(a.group).localeCompare(String(b.group),'ko'));}
function resolveUnique(query,names){const q=String(query||'').replace(/\s+/g,'').trim();if(!q)return'';const norm=n=>String(n||'').replace(/\s+/g,'');const exact=names.filter(n=>norm(n)===q);if(exact.length===1)return exact[0];const pref=names.filter(n=>norm(n).startsWith(q));return pref.length===1?pref[0]:'';}
function periodOptionsFor(s){if(s.period==='오전')return[1,2,3,4];if(s.period==='오후')return[5,6,7,8];return[1,2,3,4,5,6,7,8];}
function manualSort(arr){return [...arr].sort((a,b)=>String(a.dateKey).localeCompare(String(b.dateKey))||Number(a.period)-Number(b.period)||String(a.room).localeCompare(String(b.room),'ko'));}
