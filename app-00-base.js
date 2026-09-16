// YangGok interview app core
const app = document.getElementById('app');
const CONFIG = window.YANGGOK_CONFIG || { apiUrl:'', pollMs:8000 };
const TEAM_LABELS = { natural:'고려대(자연)팀', humanities:'고려대(인문)&연세대팀' };
const state = {apiUrl:localStorage.getItem('yi-api-url')||CONFIG.apiUrl||'',role:localStorage.getItem('yi-role')||'teacher',token:localStorage.getItem('yi-token')||'',auth:null,data:null,notice:'',error:'',studentQuery:'',modal:null,modalData:null,busy:'',recorder:{},audioUrls:{},lastStateAt:0};
const qs=(s,root=document)=>root.querySelector(s); const qsa=(s,root=document)=>[...root.querySelectorAll(s)];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const firstLine=value=>String(value||'').split('\n')[0].trim(); const secondLine=value=>String(value||'').split('\n').slice(1).join(' ').trim();
const splitTeachers=value=>String(value||'').replace(/,/g,'·').split('·').map(x=>x.trim()).filter(Boolean);
const canonical=value=>String(value||'').normalize('NFC').toLowerCase().replace(/\.pdf$/i,'').replace(/문제만|해설포함|해설포함본/g,'').replace(/[\s_\-()&]/g,'');
const teamLabel=team=>TEAM_LABELS[team]||team;
const dateKeyFromText=text=>{const m=String(text||'').match(/(\d+)월\s*(\d+)/);return m?`2026-${String(+m[1]).padStart(2,'0')}-${String(+m[2]).padStart(2,'0')}`:'';};
const sortSessions=arr=>[...arr].sort((a,b)=>(dateKeyFromText(a.dateText)||'9999').localeCompare(dateKeyFromText(b.dateText)||'9999')||a.team.localeCompare(b.team)||a.group.localeCompare(b.group,'ko'));
const fmtDate=key=>{if(!key)return'';const d=new Date(key+'T00:00:00');return `${d.getMonth()+1}월 ${d.getDate()}일 (${['일','월','화','수','목','금','토'][d.getDay()]})`;};
function uid(){return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;}
