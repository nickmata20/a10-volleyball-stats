<script>
/* Stats imported nightly from each school's stats page + atlantic10.com standings (see scrape.rb). */
const DATA=/*DATA*/;

const TEAMS=[
 {id:'duq',name:'Duquesne',masc:'Dukes',abbr:'DUQ',c1:'#BA0C2F',c2:'#041E42'},
 {id:'gmu',name:'George Mason',masc:'Patriots',abbr:'GMU',c1:'#006633',c2:'#FFCC33'},
 {id:'day',name:'Dayton',masc:'Flyers',abbr:'DAY',c1:'#CE1141',c2:'#004B8D'},
 {id:'slu',name:'Saint Louis',masc:'Billikens',abbr:'SLU',c1:'#003DA5',c2:'#C8C9C7'},
 {id:'gw',name:'George Washington',masc:'Revolutionaries',abbr:'GW',c1:'#033C5A',c2:'#AA9868'},
 {id:'luc',name:'Loyola Chicago',masc:'Ramblers',abbr:'LUC',c1:'#862633',c2:'#FFB81C'},
 {id:'vcu',name:'VCU',masc:'Rams',abbr:'VCU',c1:'#000000',c2:'#FFB300'},
 {id:'dav',name:'Davidson',masc:'Wildcats',abbr:'DAV',c1:'#AC1A2F',c2:'#000000'},
 {id:'for',name:'Fordham',masc:'Rams',abbr:'FOR',c1:'#860038',c2:'#FFFFFF'},
 {id:'uri',name:'Rhode Island',masc:'Rams',abbr:'URI',c1:'#75B2DD',c2:'#002147'},
];
const TM=Object.fromEntries(TEAMS.map(t=>[t.id,t]));

/* ---------- color helpers ---------- */
function hex2rgb(h){h=h.replace('#','');return[0,2,4].map(i=>parseInt(h.substr(i,2),16))}
function lum(h){const c=(Array.isArray(h)?h:hex2rgb(h)).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*c[0]+.7152*c[1]+.0722*c[2]}
function contrast(a,b){const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
TEAMS.forEach(t=>{t.ct=contrast(t.c1,t.c2)>=4.5?t.c2:(contrast(t.c1,'#ffffff')>=contrast(t.c1,'#000000')?'#ffffff':'#000000')});
function isDark(){const m=getComputedStyle(document.body).backgroundColor.match(/\d+/g);return m?lum(m.slice(0,3).map(Number))<.2:false}
function barColor(t){const d=isDark();const l=lum(t.c1);if(d&&l<.05)return t.c2;if(!d&&l>.6)return t.c2;return t.c1}
const tvars=t=>`--c1:${t.c1};--c2:${t.c2};--ct:${t.ct}`;
const badge=t=>`<span class="tb" style="${tvars(t)}">${t.abbr}</span>`;
const tlink=(t,full=true)=>`<button class="tlink" data-go="team-${t.id}">${badge(t)}${full?`<span class="tn">${t.name}</span>`:''}</button>`;

/* ---------- prepare imported data ---------- */
function derive(r){if(!r)return r;const sp=r.sp||0,d=x=>sp&&x!=null?x/sp:null;
  Object.assign(r,{kps:d(r.k),aps:d(r.a),sps:d(r.sa),seps:d(r.se),reps:d(r.re),dps:d(r.dig),bps:d(r.blk),pps:d(r.pts)});return r}
const wl=s=>{const m=(s||'').match(/(\d+)-(\d+)/);return m?[+m[1],+m[2]]:[0,0]};
TEAMS.forEach(t=>{
  const st=DATA.standings[t.id]||{};[t.cw,t.cl]=wl(st.conf);[t.ow,t.ol]=wl(st.overall);t.streak=st.streak||'';
  const d=DATA.teams[t.id]||{};t.source=d.source;t.ok=d.ok;t.stale=d.stale;t.fetched=d.fetched;
  ['all','conf'].forEach(s=>{const x=d[s];if(!x||!x.total){t[s]=null;return}
    x.players.forEach(p=>{derive(p);p.team=t.id;p.numv=p.num===''?999:parseInt(p.num,10)});
    derive(x.total);derive(x.opp);x.total.opct=x.opp?x.opp.pct:null;t[s]=x});
});

/* ---------- state + formatting ---------- */
const S={route:'dashboard',split:'all',mode:'rate',side:'off',sorts:{},pf:{team:'',q:'',qual:true},cmp:['gmu','duq']};
try{const h=location.hash.slice(1);if(h)S.route=h}catch(e){}
const f3=v=>v==null?'—':(v<0?'-':'')+Math.abs(v).toFixed(3).replace(/^0/,'');
const f2=v=>v==null?'—':v.toFixed(2);
const f1=v=>v==null?'—':v.toFixed(1);
const f0=v=>v==null?'—':typeof v!=='number'?v:(Number.isInteger(v)?v:v.toFixed(1));
const ord=n=>n+(['th','st','nd','rd'][(n%100>>3^1&&n%10)]||'th');
const sd=t=>t[S.split];               // a team's current split: {players,total,opp} or null
const tot=t=>sd(t)?sd(t).total:{};    // team totals for current split
const splitName=()=>S.split==='conf'?'A-10 matches only':'All matches';
const fmtDate=iso=>{try{return new Date(iso).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})+' ET'}catch(e){return iso||'an earlier import'}};
const updated=fmtDate(DATA.updated);

/* ---------- sortable table with stat-group header + total rows ---------- */
function table(id,cols,rows,def,opt={}){
  let s=S.sorts[id]; if(!s||!cols.find(c=>c.k===s.key))s=S.sorts[id]={...def};
  const col=cols.find(c=>c.k===s.key), sv=col.sort||col.get;
  rows=[...rows].sort((a,b)=>{const x=sv(a),y=sv(b);if(x==null)return 1;if(y==null)return -1;return (typeof x==='string'?x.localeCompare(y):x-y)*(s.dir==='asc'?1:-1)});
  const best={};cols.forEach(c=>{if(c.lead){const vs=rows.map(c.get).filter(v=>v!=null);if(vs.length)best[c.k]=c.low?Math.min(...vs):Math.max(...vs)}});
  const gs=cols.map((c,i)=>i>0&&c.g&&c.g!==(cols[i-1].g||'')?'gs':'');
  let grp='';
  if(cols.some(c=>c.g)){const spans=[];cols.forEach(c=>{const g=c.g||'';if(spans.length&&spans[spans.length-1][0]===g)spans[spans.length-1][1]++;else spans.push([g,1])});
    grp=`<tr class="grp">${spans.map(([g,n])=>`<th colspan="${n}" class="${g?'gs':''}">${g}</th>`).join('')}</tr>`}
  const th=cols.map((c,i)=>`<th class="${c.l?'l':''} ${gs[i]} ${c.k===s.key?'sorted':''}" data-sort="${id}|${c.k}" title="${c.title||''}" aria-sort="${c.k===s.key?(s.dir==='asc'?'ascending':'descending'):'none'}">${c.label}${c.k===s.key?(s.dir==='asc'?' ▲':' ▼'):''}</th>`).join('');
  const cell=(c,i,r,ri)=>{const v=c.get(r);return `<td class="${c.l?'l':''} ${gs[i]} ${c.k==='_rk'?'rk':''} ${c.lead&&v!=null&&v===best[c.k]?'lead':''} ${c.k===s.key?'sc':''}">${c.k==='_rk'?ri+1:(c.fmt||f0)(v,r)}</td>`};
  const tr=rows.map((r,ri)=>`<tr ${r._row||''}>${cols.map((c,i)=>cell(c,i,r,ri)).join('')}</tr>`).join('');
  const foot=(opt.foot||[]).filter(f=>f.row).map(f=>`<tr class="${f.cls||''}">${cols.map((c,i)=>`<td class="${c.l?'l':''} ${gs[i]}">${c.k==='name'?f.label:(c.foot===false||c.l)?'':(c.fmt||f0)(c.get(f.row))}</td>`).join('')}</tr>`).join('');
  return `<div class="tw"><table><thead>${grp}<tr>${th}</tr></thead><tbody>${tr}</tbody>${foot?`<tfoot>${foot}</tfoot>`:''}</table></div>`;
}
function seg(name,opts,cur){return `<div class="seg" role="group">${opts.map(([v,l])=>`<button aria-pressed="${v===cur}" data-set="${name}|${v}">${l}</button>`).join('')}</div>`}
const splitSeg=()=>seg('split',[['all','Overall'],['conf','Conference']],S.split);

/* ---------- stat columns, grouped like the schools' stats pages ---------- */
const G=k=>r=>r[k]??null;
const COL={
  sp:{k:'sp',label:'SP',get:G('sp'),title:'Sets played'},
  mp:{k:'mp',label:'MP',get:G('mp'),title:'Matches played'},
  ms:{k:'ms',label:'MS',get:G('ms'),title:'Matches started',foot:false},
  pts:{k:'pts',label:'PTS',get:G('pts'),fmt:f1,title:'Points'},
  pps:{k:'pps',label:'PTS/S',get:G('pps'),fmt:f2,lead:1,title:'Points per set'},
  k:{k:'k',label:'K',g:'Attack',get:G('k'),title:'Kills'},
  kps:{k:'kps',label:'K/S',g:'Attack',get:G('kps'),fmt:f2,lead:1,title:'Kills per set'},
  e:{k:'e',label:'E',g:'Attack',get:G('e'),title:'Attack errors'},
  ta:{k:'ta',label:'TA',g:'Attack',get:G('ta'),title:'Total attack attempts'},
  pct:{k:'pct',label:'PCT',g:'Attack',get:G('pct'),fmt:f3,title:'Hitting percentage'},
  a:{k:'a',label:'A',g:'Set',get:G('a'),title:'Assists'},
  aps:{k:'aps',label:'A/S',g:'Set',get:G('aps'),fmt:f2,lead:1,title:'Assists per set'},
  sa:{k:'sa',label:'SA',g:'Serve',get:G('sa'),title:'Service aces'},
  sps:{k:'sps',label:'SA/S',g:'Serve',get:G('sps'),fmt:f2,lead:1,title:'Aces per set'},
  se:{k:'se',label:'SE',g:'Serve',get:G('se'),title:'Service errors'},
  dig:{k:'dig',label:'DIG',g:'Dig',get:G('dig'),title:'Digs'},
  dps:{k:'dps',label:'DIG/S',g:'Dig',get:G('dps'),fmt:f2,lead:1,title:'Digs per set'},
  re:{k:'re',label:'RE',g:'Recept',get:G('re'),title:'Reception errors'},
  rta:{k:'rta',label:'TA',g:'Recept',get:G('rta'),title:'Reception attempts'},
  recp:{k:'recp',label:'Rec%',g:'Recept',get:G('recp'),fmt:f3,title:'Reception percentage'},
  reps:{k:'reps',label:'RE/S',g:'Recept',get:G('reps'),fmt:f2,title:'Reception errors per set'},
  bs:{k:'bs',label:'BS',g:'Block',get:G('bs'),title:'Block solos'},
  ba:{k:'ba',label:'BA',g:'Block',get:G('ba'),title:'Block assists'},
  blk:{k:'blk',label:'BLK',g:'Block',get:G('blk'),fmt:f1,title:'Total blocks'},
  bps:{k:'bps',label:'BLK/S',g:'Block',get:G('bps'),fmt:f2,lead:1,title:'Blocks per set'},
  be:{k:'be',label:'BE',g:'Block',get:G('be'),title:'Block errors'},
  bhe:{k:'bhe',label:'BHE',g:'Block',get:G('bhe'),title:'Ball-handling errors'},
};
const OFF=['sp','mp','ms','pts','pps','k','kps','e','ta','pct','a','aps','sa','sps','se'];
const DEF=['sp','dig','dps','re','rta','recp','reps','bs','ba','blk','bps','be','bhe'];
const nameCol={k:'name',label:'Player',l:1,get:r=>r.name};
function teamCols(side){return [{k:'num',label:'#',l:1,get:r=>r.num,sort:r=>r.numv,fmt:v=>v},nameCol,...(side==='off'?OFF:DEF).map(k=>COL[k])]}
function leaderCols(side){
  const qpct={...COL.pct,get:r=>r.ta>=10?r.pct:null,lead:1,title:'Hitting percentage (min. 10 attempts)'};
  const qrec={...COL.recp,get:r=>r.rta>=20?r.recp:null,title:'Reception % (min. 20 attempts)'};
  return [{k:'_rk',label:'Rk',get:()=>0},
    {...nameCol,fmt:(v,r)=>`${v} <span style="color:var(--faint)">#${r.num}</span>`},
    {k:'team',label:'Team',l:1,get:r=>TM[r.team].abbr,fmt:(v,r)=>tlink(TM[r.team],false)},
    ...(side==='off'?OFF:DEF).map(k=>k==='pct'?qpct:k==='recp'?qrec:COL[k])];
}
const allPlayers=()=>TEAMS.flatMap(t=>sd(t)?sd(t).players:[]);
const qualifies=p=>p.sp>=.6*(tot(TM[p.team]).sp||0);

/* ---------- views ---------- */
const FRESH=`<div class="fresh"><span class="dot"></span>Updated ${updated} · refreshes nightly at midnight</div>`;
function header(title,sub,extra=''){
  return `<div class="top"><div><h1>${title}</h1>${sub?`<div class="sub">${sub}</div>`:''}</div><div class="ctrls">${extra}${FRESH}</div></div>`;
}
const pctOf=([w,l])=>w+l?w/(w+l):0;
const standings=()=>[...TEAMS].sort((a,b)=>pctOf([b.cw,b.cl])-pctOf([a.cw,a.cl])||b.cw-a.cw||pctOf([b.ow,b.ol])-pctOf([a.ow,a.ol]));

function vDashboard(){
  const A=t=>t.all?t.all.total:{};
  const rows=standings().map(t=>Object.assign({},t,{_row:`class="clickrow" data-go="team-${t.id}"`}));
  const cols=[
    {k:'_rk',label:'#',get:()=>0},
    {k:'name',label:'Team',l:1,get:t=>t.name,fmt:(v,t)=>tlink(TM[t.id])},
    {k:'conf',label:'A-10',get:t=>pctOf([t.cw,t.cl])*100+t.cw,fmt:(v,t)=>`${t.cw}-${t.cl}`},
    {k:'ovr',label:'Overall',get:t=>pctOf([t.ow,t.ol]),fmt:(v,t)=>`${t.ow}-${t.ol}`},
    {k:'strk',label:'Streak',get:t=>t.streak,fmt:v=>v},
    {k:'pct',label:'Hit%',get:t=>A(t).pct,fmt:f3,lead:1},
    {k:'opct',label:'Opp Hit%',get:t=>A(t).opct,fmt:f3,lead:1,low:1},
    {k:'kps',label:'K/S',get:t=>A(t).kps,fmt:f2,lead:1},
    {k:'dps',label:'D/S',get:t=>A(t).dps,fmt:f2,lead:1},
    {k:'bps',label:'B/S',get:t=>A(t).bps,fmt:f2,lead:1},
  ];
  const byHit=TEAMS.filter(t=>t.all).sort((a,b)=>A(b).pct-A(a).pct), mx=.35;
  const bars=byHit.map(t=>`<div class="bar">${badge(t)}<div class="track"><div class="fill" style="width:${Math.max(0,A(t).pct)/mx*100}%;background:${barColor(t)}"></div><div class="opp" style="left:${Math.max(0,A(t).opct)/mx*100}%"></div></div><span>${f3(A(t).pct)}</span></div>`).join('');
  const qual=TEAMS.flatMap(t=>t.all?t.all.players.filter(p=>p.sp>=.6*t.all.total.sp):[]);
  const cats=[['Kills per set','kps',f2],['Assists per set','aps',f2],['Digs per set','dps',f2],['Blocks per set','bps',f2],['Aces per set','sps',f2],['Hitting %','pct',f3,p=>p.ta>=3*TM[p.team].all.total.sp]];
  const leaders=cats.map(([lab,k,fmt,extra])=>{
    const top=qual.filter(extra||(()=>1)).sort((a,b)=>b[k]-a[k]).slice(0,5);
    return `<div class="lcat"><h3>${lab}</h3>${top.map((p,i)=>`<div class="lrow"><span class="n">${i+1}</span>${tlink(TM[p.team],false)}<button class="pname" data-go="team-${p.team}">${p.name}</button><span class="v">${fmt(p[k])}</span></div>`).join('')}</div>`;
  }).join('');
  return header('Conference Dashboard',`All 10 Atlantic 10 programs · ${DATA.season} season`)+
  `<div class="grid2">
    <section class="panel"><div class="ph"><h2>Standings</h2><span class="note">Click a team for its full stats · stats are all matches</span></div>${table('stand',cols,rows,{key:'conf',dir:'desc'})}</section>
    <section class="panel"><div class="ph"><h2>Hitting efficiency</h2><span class="note">All matches</span></div>
      <div class="legend"><span><i></i>Team hitting %</span><span><i class="tick"></i>Opponents' hitting % vs. them</span></div>
      <div class="bars">${bars}</div></section>
  </div>
  <section class="panel"><div class="ph"><h2>Individual leaders</h2><span class="note">Minimum 60% of team sets played · Hit% also min. 3 attempts per team set</span></div><div class="leaders">${leaders}</div></section>`;
}

function vTeams(){
  const rate=S.mode==='rate', T=k=>t=>tot(t)[k]??null;
  const c=(k,label,rk,title,low)=>({k:rate?rk:k,label:rate?label+'/S':label,get:T(rate?rk:k),fmt:rate?f2:f0,lead:1,low,title});
  const cols=[
    {k:'_rk',label:'#',get:()=>0},
    {k:'name',label:'Team',l:1,get:t=>t.name,fmt:(v,t)=>tlink(t)},
    {k:'sp',label:'Sets',get:T('sp')},
    {k:'pct',label:'Hit%',get:T('pct'),fmt:f3,lead:1},
    {k:'opct',label:'Opp Hit%',get:T('opct'),fmt:f3,lead:1,low:1},
    c('k','K','kps','Kills'),
    ...(rate?[]:[{k:'e',label:'E',get:T('e'),lead:1,low:1},{k:'ta',label:'TA',get:T('ta')}]),
    c('a','A','aps','Assists'), c('sa','SA','sps','Service aces'), c('se','SE','seps','Service errors',1),
    {k:'recp',label:'Rec%',get:T('recp'),fmt:f3,lead:1},
    c('re','RE','reps','Reception errors',1), c('dig','Dig','dps','Digs'), c('blk','Blk','bps','Blocks'), c('pts','Pts','pps','Points'),
  ];
  return header('Team Stats','Every program side by side · sortable · bold = conference best',splitSeg()+seg('mode',[['rate','Per set'],['total','Totals']],S.mode))+
  `<section class="panel"><div class="ph"><h2>${splitName()}</h2><span class="note">Click any column to sort · lower is better for Opp Hit%, E, SE, RE</span></div>${table('teams',cols,TEAMS,{key:'pct',dir:'desc'})}</section>`;
}

function vPlayers(){
  const f=S.pf;
  const rows=allPlayers().filter(p=>(!f.team||p.team===f.team)&&(!f.q||p.name.toLowerCase().includes(f.q.toLowerCase()))&&(!f.qual||qualifies(p)));
  const filters=`<div class="ctrls">
    ${seg('side',[['off','Offensive'],['def','Defensive']],S.side)}
    <select id="pf-team" data-pf="team" aria-label="Team"><option value="">All teams</option>${TEAMS.map(t=>`<option value="${t.id}" ${t.id===f.team?'selected':''}>${t.name}</option>`).join('')}</select>
    <input type="search" id="pf-q" data-pf="q" placeholder="Search player" value="${f.q}">
    <label class="chk"><input type="checkbox" id="pf-qual" data-pf="qual" ${f.qual?'checked':''}> Qualified only (60% of team sets)</label>
  </div>`;
  return header('Player Leaders','Individual season stats for every A-10 player',splitSeg())+
  `<section class="panel"><div class="ph">${filters}<span class="note">${rows.length} players</span></div>${table('players-'+S.side,leaderCols(S.side),rows,S.side==='off'?{key:'kps',dir:'desc'}:{key:'dps',dir:'desc'})}</section>`;
}

/* Team page: team statistics + offensive + defensive, laid out like the schools' own stats pages */
const TS_GROUPS=[
  ['Attack',[['Kills','K','k',f0],['Errors','E','e',f0],['Attempts','TA','ta',f0],['Percent','PCT','pct',f3],['Kills per set','K/S','kps',f2]]],
  ['Set',[['Assists','A','a',f0],['Assists per set','A/S','aps',f2],['Ball-handling errors','BHE','bhe',f0]]],
  ['Serve',[['Aces','SA','sa',f0],['Errors','SE','se',f0],['Aces per set','SA/S','sps',f2]]],
  ['Reception',[['Errors','RE','re',f0],['Attempts','TA','rta',f0],['Percent','Rec%','recp',f3],['Errors per set','RE/S','reps',f2]]],
  ['Defense',[['Digs','DIG','dig',f0],['Digs per set','DIG/S','dps',f2]]],
  ['Blocking',[['Solo','BS','bs',f0],['Assists','BA','ba',f0],['Errors','BE','be',f0],['Blocks','BLK','blk',f1],['Blocks per set','BLK/S','bps',f2]]],
  ['Scoring',[['Sets played','SP','sp',f0],['Points','PTS','pts',f1],['Points per set','PTS/S','pps',f2]]],
];
function teamStatsPanel(t,x){
  const groups=TS_GROUPS.map(([g,rows])=>`<table class="tsg"><thead><tr><th class="l">${g}</th><th>${t.abbr}</th><th>OPP</th></tr></thead><tbody>${rows.map(([lab,ab,k,fmt])=>`<tr><td class="l">${lab} <span class="ab">${ab}</span></td><td>${fmt(x.total[k]??null)}</td><td>${x.opp?fmt(x.opp[k]??null):'—'}</td></tr>`).join('')}</tbody></table>`).join('');
  return `<section class="panel teamtbl" style="${tvars(t)}"><div class="stath"><h2>Team Statistics</h2><span class="note">${t.name} vs. opponents · ${splitName()}</span></div><div class="tsgrid">${groups}</div></section>`;
}
function statTable(t,x,side){
  return `<section class="panel teamtbl" style="${tvars(t)}"><div class="stath"><h2>${side==='off'?'Offensive':'Defensive'}</h2><span class="note">${splitName()} · click a column to sort · bold = team best per set</span></div>
  ${table(`${side}-${t.id}`,teamCols(side),x.players,{key:'num',dir:'asc'},{foot:[{label:'Total',row:x.total},{label:'Opponents',cls:'oppr',row:x.opp}]})}</section>`;
}
function vTeam(id){
  const t=TM[id]; if(!t)return vDashboard();
  const x=sd(t), host=t.source?new URL(t.source).host:'';
  const body=x?`${teamStatsPanel(t,x)}${statTable(t,x,'off')}${statTable(t,x,'def')}`
    :`<section class="panel"><div class="phase2">${S.split==='conf'?`No A-10 match stats yet for ${t.name}.`:`Stats couldn't be read from ${host} in the last refresh. They'll return after the next successful nightly import.`}</div></section>`;
  return `<div class="band" style="${tvars(t)}"><div class="mono">${t.abbr}</div><div><h1>${t.name}</h1><div class="masc">${t.masc} · ${DATA.season} season</div></div>
    <div class="recs"><div><b>${t.cw}-${t.cl}</b><span>A-10</span></div><div><b>${t.ow}-${t.ol}</b><span>Overall</span></div><div><b>${t.streak||'—'}</b><span>Streak</span></div><div><b>${ord(standings().indexOf(t)+1)}</b><span>Standings</span></div></div></div>
  <div class="top"><div class="sub">Source: <a href="${t.source}" target="_blank" rel="noopener" style="color:inherit">${host} cumulative stats</a></div><div class="ctrls">${splitSeg()}<button class="tlink" data-go="compare" data-cmp="${id}" style="font-size:12.5px;text-decoration:underline">Compare with another team →</button>${FRESH}</div></div>
  ${t.stale?`<div class="banner"><b>Not refreshed last night.</b> ${host} couldn't be read, so these are the stats from ${fmtDate(t.fetched)}. They'll update after the next successful nightly import.</div>`:''}
  <div class="stack">${body}
    <section class="panel"><div class="phase2"><span class="tb" style="--c1:var(--chip);--c2:var(--rule);--ct:var(--muted)">P2</span><div><b>Match log &amp; box scores</b> come in phase 2. The same stats pages already carry match-by-match numbers, so they can be added without redesigning this page.</div></div></section>
  </div>`;
}

function vCompare(){
  const [a,b]=S.cmp.map(i=>TM[i]), A=tot(a), B=tot(b);
  const sel=(side,cur)=>`<select id="cmp-${side}" data-cmp-side="${side}" aria-label="Team ${side+1}">${TEAMS.map(t=>`<option value="${t.id}" ${t.id===cur?'selected':''}>${t.name}</option>`).join('')}</select>`;
  const rows=[['Hitting %','pct',f3],['Opp. hitting %','opct',f3,1],['Kills / set','kps',f2],['Assists / set','aps',f2],['Aces / set','sps',f2],['Service errors / set','seps',f2,1],['Reception %','recp',f3],['Reception errors / set','reps',f2,1],['Digs / set','dps',f2],['Blocks / set','bps',f2],['Points / set','pps',f2]].map(([lab,k,fmt,low])=>{
    const va=A[k]??0,vb=B[k]??0,mx=Math.max(va,vb,.001)*1.1,aw=low?va<vb:va>vb,bw=low?vb<va:vb>va;
    return `<div class="crow"><span class="val l ${aw?'win':''}">${aw?'<span class="win-mark"></span>':''}${fmt(A[k]??null)}</span><div class="half l"><div class="fill" style="width:${Math.max(0,va)/mx*100}%;background:${barColor(a)}"></div></div><span class="lab">${lab}${low?'<small>lower is better</small>':''}</span><div class="half"><div class="fill" style="width:${Math.max(0,vb)/mx*100}%;background:${barColor(b)}"></div></div><span class="val ${bw?'win':''}">${fmt(B[k]??null)}${bw?'<span class="win-mark"></span>':''}</span></div>`}).join('');
  const lead=t=>{const ps=sd(t)?sd(t).players.filter(qualifies):[];return [['Kills / set','kps'],['Assists / set','aps'],['Digs / set','dps'],['Blocks / set','bps'],['Aces / set','sps']].map(([l,k])=>{const p=[...ps].sort((x,y)=>y[k]-x[k])[0];return p?`<div class="lrow"><span class="n"></span><span class="pos">#${p.num}</span><span>${p.name} <span style="color:var(--faint)">· ${l}</span></span><span class="v">${f2(p[k])}</span></div>`:''}).join('')};
  return header('Compare','Pick any two programs · green dot marks the better number',splitSeg())+
  `<div class="cmphead"><div class="cside" style="${tvars(a)}">${sel(0,a.id)}<span class="cr">${a.cw}-${a.cl} A-10 · ${a.ow}-${a.ol} overall</span></div><div class="vs">VS</div><div class="cside r" style="${tvars(b)}">${sel(1,b.id)}<span class="cr">${b.cw}-${b.cl} A-10 · ${b.ow}-${b.ol} overall</span></div></div>
  <div class="stack"><section class="panel"><div class="ph"><h2>Head to head</h2><span class="note">${splitName()}</span></div>${rows}</section>
  <section class="panel"><div class="ph"><h2>Top performers</h2><span class="note">Qualified players only</span></div><div class="cleaders"><div>${tlink(a)}${lead(a)}</div><div>${tlink(b)}${lead(b)}</div></div></section></div>`;
}

/* ---------- shell ---------- */
const VIEWS=[['dashboard','Dashboard'],['teams','Team Stats'],['players','Player Leaders'],['compare','Compare']];
function render(){
  document.getElementById('brandsub').textContent=`Stat Hub · ${DATA.season} season`;
  const r=S.route;
  document.getElementById('mainnav').innerHTML=VIEWS.map(([k,l])=>`<button data-go="${k}" ${r===k?'aria-current="page"':''}>${l}</button>`).join('')+`<button disabled>Box Scores<span class="soon">Phase 2</span></button>`;
  document.getElementById('teamnav').innerHTML=standings().map(t=>`<button data-go="team-${t.id}" ${r==='team-'+t.id?'aria-current="page"':''}>${badge(t)}<span>${t.name}</span><span class="rec">${t.cw}-${t.cl}</span></button>`).join('');
  const m=document.getElementById('main');
  m.innerHTML=r.startsWith('team-')?vTeam(r.slice(5)):r==='teams'?vTeams():r==='players'?vPlayers():r==='compare'?vCompare():vDashboard();
  m.insertAdjacentHTML('beforeend',`<p class="foot">Stats come from each school's official athletics stats page; standings from atlantic10.com. Last import: ${updated}.</p>`);
}
function go(route){S.route=route;try{history.replaceState(null,'','#'+route)}catch(e){}render();window.scrollTo(0,0)}
document.addEventListener('click',e=>{
  const g=e.target.closest('[data-go]');
  if(g){if(g.dataset.cmp&&g.dataset.cmp!==S.cmp[0])S.cmp=[g.dataset.cmp,S.cmp[0]===g.dataset.cmp?S.cmp[1]:S.cmp[0]];go(g.dataset.go);return}
  const th=e.target.closest('[data-sort]');
  if(th){const[id,key]=th.dataset.sort.split('|'),s=S.sorts[id];
    if(s&&s.key===key)s.dir=s.dir==='asc'?'desc':'asc';else{const low=['opct','e','se','re','seps','reps','be','bhe','name','team','num','strk'].includes(key);S.sorts[id]={key,dir:low?'asc':'desc'}}
    render();return}
  const sb=e.target.closest('[data-set]');
  if(sb){const[k,v]=sb.dataset.set.split('|');S[k]=v;render()}
});
document.addEventListener('change',e=>{
  const el=e.target;
  if(el.dataset.pf){S.pf[el.dataset.pf]=el.type==='checkbox'?el.checked:el.value;render()}
  if(el.dataset.cmpSide){S.cmp[+el.dataset.cmpSide]=el.value;render()}
});
document.addEventListener('input',e=>{
  if(e.target.id==='pf-q'){S.pf.q=e.target.value;render();const i=document.getElementById('pf-q');i.focus();i.setSelectionRange(i.value.length,i.value.length)}
});
try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',render)}catch(e){}
new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
render();
</script>
