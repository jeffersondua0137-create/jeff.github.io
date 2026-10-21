/* Skills matching + employer verification rules (port of matching.py / verification.py) */
const EDU = ["Any","Elementary","High School","Senior High School","Vocational/TESDA","College Undergraduate","Bachelor's Degree","Master's/Doctorate"];
const TIERS = ["local","provincial","national","international"];
const TIER_LABEL = {local:"Local (Bislig City)",provincial:"Provincial (Surigao del Sur)",national:"National (Philippines)",international:"International (DMW)"};
const DOC_TYPES = {MAYOR:"Mayor's / Business Permit",DTI:"DTI Business Name Registration",SEC:"SEC Registration",DMW:"DMW Recruitment / Manning Agency License"};
const TIER_REQ = {local:[["MAYOR"]],provincial:[["MAYOR"],["DTI","SEC"]],national:[["DTI","SEC"]],international:[["DMW"]]}; // any ONE type per group
const REG_LABEL = {match:"Registry record found - name matches",name_mismatch:"Registry record found - business name DIFFERS",expired:"Registry record found - expired / revoked",not_found:"No registry record found"};
const WEIGHTS = {required:.5,preferred:.15,experience:.15,education:.1,tier:.1};
const ALIASES = {"ms excel":"excel","microsoft excel":"excel","spreadsheet":"excel","spreadsheets":"excel","ms word":"word","microsoft word":"word",
 "customer support":"customer service","client service":"customer service","cashiering":"cash handling","cashier":"cash handling",
 "point of sale":"pos","point-of-sale":"pos","pc troubleshooting":"troubleshooting","computer troubleshooting":"troubleshooting",
 "forklift":"forklift operation","forklift operator":"forklift operation","computer skills":"computer literacy","basic computer":"computer literacy",
 "book keeping":"bookkeeping","english proficiency":"english","communication skills":"communication"};

const normSkill = t => { const s=(t||"").toLowerCase().replace(/[^a-z0-9+#.\s/-]/g," ").replace(/\s+/g," ").trim().replace(/^[ .\/-]+|[ .\/-]+$/g,""); return ALIASES[s]||s; };
const parseSkills = t => [...new Set((t||"").split(/[,;\n|]+/).map(normSkill).filter(Boolean))].slice(0,60);

function lev(a,b){ const d=Array.from({length:a.length+1},(_,i)=>[i,...Array(b.length).fill(0)]);
  for(let j=1;j<=b.length;j++)d[0][j]=j;
  for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  return d[a.length][b.length]; }
function skillSim(a,b){
  if(a===b) return 1;
  const ta=a.split(" "), tb=b.split(" "), [s,l]=ta.length<=tb.length?[ta,tb]:[tb,ta];
  if(s.length<l.length && s.every(t=>l.includes(t)) && s.some(t=>t.length>=4)) return .75;
  return 1-lev(a,b)/Math.max(a.length,b.length,1) >= .85 ? .8 : 0; }
const best = (sk,pool) => Math.max(0,...pool.map(p=>skillSim(sk,p)));
const label = s => s>=75?"Strong match":s>=50?"Good match":s>=25?"Fair match":"Low match";

function scoreMatch(sk, job){
  const have=parseSkills(sk.skills), req=parseSkills(job.req), pref=parseSkills(job.pref);
  const matched=[],partial=[],missing=[]; let rs=0;
  req.forEach(s=>{const v=best(s,have); rs+=v; (v>=1?matched:v>0?partial:missing).push(s);});
  const ps=pref.map(s=>best(s,have));
  const parts={required:req.length?rs/req.length:1,
    experience:job.minExp>0?Math.min(1,(sk.years||0)/job.minExp):1,
    education:(()=>{const j=Math.max(0,EDU.indexOf(job.edu)),s=Math.max(0,EDU.indexOf(sk.edu));return s>=j?1:Math.max(0,1-.34*(j-s));})(),
    tier:job.tier===sk.tier?1:.6};
  if(pref.length) parts.preferred=ps.reduce((a,b)=>a+b,0)/ps.length;
  const tw=Object.keys(parts).reduce((a,k)=>a+WEIGHTS[k],0);
  const score=Math.round(1000*Object.keys(parts).reduce((a,k)=>a+WEIGHTS[k]*parts[k],0)/tw)/10;
  const breakdown={}; Object.keys(parts).forEach(k=>breakdown[k]=Math.round(parts[k]*100));
  return {score,label:label(score),matched,partial,missing,breakdown};
}
const rankJobs = (sk,jobs) => jobs.map(j=>[j,scoreMatch(sk,j)]).sort((a,b)=>b[1].score-a[1].score);
