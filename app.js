/* Router, views and page handlers (port of web.py + views.py). */
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const STATUSES=["Submitted","Under review","Shortlisted","Interview","Hired","Rejected"];
const KIND={approved:"green",verified:"green",Hired:"green",Shortlisted:"green","Strong match":"green",pending:"amber","Under review":"amber",Interview:"blue","Good match":"blue",rejected:"red",Rejected:"red",unverified:"red","Low match":"red","Fair match":"amber"};
const badge=(t,k="gray")=>`<span class="badge ${k}">${esc(t)}</span>`, sb=t=>badge(t,KIND[t]||"gray");
const tb=t=>badge(TIER_LABEL[t].split(" (")[0],"tier");
const chips=(a,c="chip")=>a.map(s=>`<span class="${c}">${esc(s)}</span>`).join("")||'<span class="muted">none listed</span>';
const opts=(items,sel="")=>items.map(i=>{const[v,l]=Array.isArray(i)?i:[i,i];return`<option value="${esc(v)}"${v==sel?" selected":""}>${esc(l)}</option>`}).join("");
const tierItems=()=>TIERS.map(t=>[t,TIER_LABEL[t]]);
const inp=(l,n,v="",t="text",x="")=>`<label for="${n}">${l}</label><input type="${t}" id="${n}" name="${n}" value="${esc(v)}" ${x}>`;
const ta=(l,n,v="",x="")=>`<label for="${n}">${l}</label><textarea id="${n}" name="${n}" ${x}>${esc(v)}</textarea>`;
const sel=(l,n,items,s)=>`<label for="${n}">${l}</label><select id="${n}" name="${n}">${opts(items,s)}</select>`;
const errs=e=>e.length?`<div class="errors"><strong>Please fix the following:</strong><ul>${e.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`:"";
const hbars=(p,empty="No data yet.")=>{p=[...p];if(!p.length)return`<p class="muted">${empty}</p>`;const top=Math.max(...p.map(x=>x[1]))||1;
  return p.map(([k,n])=>`<div class="hbar"><span class="name">${esc(k)}</span><span class="fill" style="width:${Math.max(2,180*n/top|0)}px"></span><b>${n}</b></div>`).join("");};
const countBy=a=>{const m={};a.forEach(k=>m[k]=(m[k]||0)+1);return Object.entries(m).sort((x,y)=>y[1]-x[1]);};

/* ---- state, router ---- */
let U=null,Q={},FLASH=[];const R=[];
class Redirect{constructor(u){this.url=u}} class HttpErr{constructor(s,m){this.s=s;this.m=m}}
const route=(m,p,f)=>R.push([m,new RegExp("^"+p+"$"),f]);
const flash=(m,k="info")=>FLASH.push([k,m]);
const need=(...roles)=>{if(!U){flash("Please log in to continue.","warn");throw new Redirect("/login");}if(roles.length&&!roles.includes(U.role))throw new HttpErr(403,"You do not have access to this page.");};
const home=u=>({seeker:"/recommendations",employer:"/employer",admin:"/admin"})[u.role];
const clean=(v,n=200)=>(v||"").trim().slice(0,n);
const mySeeker=()=>U&&U.role==="seeker"?DB.seekers[U.id]:null;
const nav=()=>!U?[["/jobs","Browse jobs"],["/login","Log in"],["/register","Register"]]:U.role==="seeker"?[["/jobs","Browse jobs"],["/recommendations","Recommended"],["/applications","My applications"],["/profile","Profile"]]:U.role==="employer"?[["/employer","Dashboard"],["/employer/jobs/new","Post a job"],["/employer/verification","Verification"],["/profile","Profile"]]:[["/admin","Dashboard"],["/admin/verifications","Verifications"],["/admin/users","Users"],["/jobs","All jobs"]];
function layout(title,body){
  const msgs=FLASH.splice(0).map(([k,m])=>`<div class="flash ${k}">${esc(m)}</div>`).join("");
  const cur=(location.hash.slice(1)||"/").split("?")[0];
  const links=nav().map(([u,t])=>`<a href="#${u}"${cur===u?' class="active"':""}>${t}</a>`).join("");
  const who=U?`<span class="who">${esc(U.name)} (${U.role})</span> <button class="link" data-logout>Log out</button>`:"";
  document.title=title+" - Smart Employment Portal";
  return`<header class="top"><div class="wrap row between"><a class="brand" href="#/">Smart Employment Portal <small>Bislig City Pilot</small></a><nav>${links}</nav><div>${who}</div></div></header>
<main class="wrap">${msgs}${body}</main><footer class="wrap muted">Capstone prototype - Andres Soriano Colleges of Bislig. All sample data is fictional. Runs entirely in your browser (data stays in localStorage). <a href="#/privacy">Privacy notice</a></footer>`;}

async function run(method,path,form={}){
  let html;
  try{ const[p,qs]=path.split("?"); Q=Object.fromEntries(new URLSearchParams(qs||""));
    for(const[m,rx,fn]of R){const x=rx.exec(p);if(x&&m===method){html=await fn(form,...x.slice(1));break;}}
    if(html===undefined)throw new HttpErr(404,"The page you are looking for does not exist.");
  }catch(e){
    if(e instanceof Redirect)return go(e.url);
    html=layout("Error",e instanceof HttpErr?`<section class="card"><h1>${e.s}</h1><p>${esc(e.m)}</p><p><a class="btn" href="#/">Back to home</a></p></section>`:(console.error(e),"<h1>Something went wrong</h1>"));
  }
  document.getElementById("app").innerHTML=html; scrollTo(0,0);
}
const go=u=>location.hash==="#"+u?render():(location.hash=u);
async function render(){ try{await refreshDb();}catch(e){return fail(e);} U=DB.users.find(u=>u.id==localStorage.sep_uid&&u.active)||null; return run("GET",location.hash.slice(1)||"/"); }
document.addEventListener("submit",e=>{const f=e.target,d=Object.fromEntries(new FormData(f));
  if(f.dataset.post){e.preventDefault();if(e.submitter&&e.submitter.name)d[e.submitter.name]=e.submitter.value;U=DB.users.find(u=>u.id==localStorage.sep_uid&&u.active)||null;run("POST",f.dataset.post,d);}
  else if(f.dataset.get){e.preventDefault();go(f.dataset.get+"?"+new URLSearchParams(d));}});
document.addEventListener("click",e=>{if(e.target.matches("[data-logout]")){delete localStorage.sep_uid;flash("You have been logged out.");go("/");}});
window.addEventListener("hashchange",render);

/* ---- jobs ---- */
const dec=j=>({...j,company:DB.employers[j.eid].company,verified:verifiedTiers(j.eid).includes(j.tier),reqList:parseSkills(j.req)});
function jobRows(inc=false,q="",tier="",admin=false){
  return DB.jobs.filter(j=>j.status==="open"&&DB.users.find(u=>u.id==j.eid).active).map(dec).reverse().filter(j=>
    (j.verified||admin||(inc&&j.tier!=="international"))&&(!TIERS.includes(tier)||j.tier===tier)&&
    (!q||[j.title,j.desc,j.company,j.req,j.loc].join(" ").toLowerCase().includes(q.toLowerCase())));}
function getJob(id){const j=DB.jobs.find(x=>x.id==id);if(!j)throw new HttpErr(404,"That job posting does not exist.");return dec(j);}
const scoreBar=r=>`<div class="score"><div class="bar"><span style="width:${r.score}%"></span></div><strong>${r.score}%</strong> ${sb(r.label)}</div>`;
function matchDetail(r){const n={required:"Required skills",preferred:"Preferred skills",experience:"Experience",education:"Education",tier:"Market level"};
  return(r.matched.length?`<p><span class="lbl">Skills you match:</span> ${chips(r.matched,"chip ok")}</p>`:"")+(r.partial.length?`<p><span class="lbl">Partly matched:</span> ${chips(r.partial,"chip part")}</p>`:"")+
  (r.missing.length?`<p><span class="lbl">Missing required skills:</span> ${chips(r.missing,"chip miss")}</p>`:"")+`<ul class="breakdown">${Object.entries(r.breakdown).map(([k,v])=>`<li><span>${n[k]}</span><strong>${v}%</strong></li>`).join("")}</ul>`;}
const jobCard=(j,r,detail)=>`<article class="card job"><div class="row between"><h3><a href="#/jobs/${j.id}">${esc(j.title)}</a></h3><div>${j.verified?badge("Verified employer","green"):badge("Not verified for this level","red")} ${tb(j.tier)}</div></div>
<p class="muted">${esc(j.company)} &middot; ${esc(j.loc)}${j.salary?" &middot; "+esc(j.salary):""}</p><p><span class="lbl">Requires:</span> ${chips(j.reqList)}</p>${r?scoreBar(r):""}${r&&detail?matchDetail(r):""}</article>`;

route("GET","/",()=>{const jobs=jobRows();
  const st=[[jobs.length,"verified open jobs"],[DB.users.filter(u=>u.role==="seeker"&&u.active).length,"job seekers"],[Object.keys(DB.employers).filter(id=>verifiedTiers(id).length).length,"employers with approved documents"],[DB.apps.length,"applications sent"]];
  return layout("Home",`<section class="hero"><h1>Find work that fits your skills - from verified employers.</h1><p>A job portal for Bislig City, built to grow to provincial, national and international job markets. Jobs are ranked by how well your skills fit, and employers are checked before they earn a verification badge.</p>${U?`<a class="btn" href="#${home(U)}">Go to my dashboard</a>`:'<a class="btn" href="#/register">Create a free account</a> <a class="btn sec" href="#/jobs">Browse jobs</a>'}</section>
<div class="grid g4">${st.map(([n,t])=>`<div class="stat"><b>${n}</b><span>${t}</span></div>`).join("")}</div><h2>Latest verified jobs</h2>${jobs.slice(0,4).map(j=>jobCard(j)).join("")}`);});
route("GET","/privacy",()=>layout("Privacy notice",`<section class="card narrow"><h1>Privacy notice</h1><p>Designed around the principles of the Data Privacy Act of 2012 (RA 10173). This is a student prototype, not certified for compliance. All data stays in this browser's localStorage; you can view, correct and permanently delete it on the Profile page.</p></section>`));
route("GET","/jobs",()=>{const inc=Q.unverified==="1",q=clean(Q.q,80),tier=Q.tier||"",sk=mySeeker();
  const jobs=jobRows(inc,q,tier,U&&U.role==="admin");
  const cards=sk?rankJobs(sk,jobs).map(([j,r])=>jobCard(j,r)).join(""):jobs.map(j=>jobCard(j)).join("");
  return layout("Browse jobs",`<h1>Browse jobs</h1><p class="muted">${sk?"Sorted by how well each job matches your profile.":"Log in as a job seeker to see how well each job matches your skills."} ${jobs.length} result(s).</p>
<form data-get="/jobs" class="card filters"><div>${inp("Search","q",q,"text",'placeholder="title, skill, company"')}</div><div>${sel("Market level","tier",[["","All levels"],...tierItems()],tier)}</div>
<label class="check"><input type="checkbox" name="unverified" value="1"${inc?" checked":""}> Include unverified employers</label><button type="submit">Filter</button></form>${cards||'<p class="muted">No jobs match your filters.</p>'}`);});
route("GET","/jobs/(\\d+)",(f,id)=>{const j=getJob(id),own=U&&U.id===j.eid,adm=U&&U.role==="admin";
  if(!own&&!adm&&j.tier==="international"&&!j.verified)throw new HttpErr(404,"That job posting does not exist.");
  const sk=mySeeker();let panel="";
  if(sk){const r=scoreMatch(sk,j),ap=DB.apps.find(a=>a.jid==j.id&&a.sid==U.id);
    panel=`<section class="card"><h2>Your match</h2>${scoreBar(r)}${matchDetail(r)}${ap?`<p>You applied to this job. Status: ${sb(ap.status)}</p>`:j.status==="open"?`<form data-post="/jobs/${j.id}/apply">${ta("Cover note (optional)","cover_note","","maxlength=1000")}<p><button type="submit">Apply now</button></p></form>`:""}</section>`;}
  else if(!U)panel='<section class="card"><p><a href="#/login">Log in</a> as a job seeker to see your match score and apply.</p></section>';
  else if(own)panel=`<section class="card"><a class="btn" href="#/employer/jobs/${j.id}/applicants">View applicants</a></section>`;
  return layout(j.title,`<p><a href="#/jobs">&larr; All jobs</a></p><section class="card"><div class="row between"><h1>${esc(j.title)}</h1><div>${j.verified?badge("Verified employer","green"):badge("Not verified","red")} ${tb(j.tier)}</div></div>
<p class="muted">${esc(j.company)} &middot; ${esc(j.loc)} &middot; ${esc(j.salary||"Salary not stated")}</p>${j.verified?"":`<div class="warnbox"><strong>Caution:</strong> this employer has not been verified for the ${j.tier} level. Never pay placement or "processing" fees before a verified contract.</div>`}
<p style="white-space:pre-wrap">${esc(j.desc)}</p><p><span class="lbl">Required skills:</span> ${chips(j.reqList)}</p><p><span class="lbl">Preferred skills:</span> ${chips(parseSkills(j.pref))}</p>
<p><span class="lbl">Experience:</span> ${j.minExp?j.minExp+" year(s)":"None"} &middot; <span class="lbl">Education:</span> ${esc(j.edu)}</p></section>${panel}`);});
route("GET","/recommendations",()=>{need("seeker");const sk=mySeeker();
  if(!parseSkills(sk.skills).length){flash("Add at least one skill to your profile to get recommendations.","warn");throw new Redirect("/profile");}
  const inc=Q.unverified==="1";
  return layout("Recommended jobs",`<h1>Recommended for you</h1><p class="muted">Ranked by skills, experience, education and market level. ${inc?'<a href="#/recommendations">Hide unverified employers</a>':'<a href="#/recommendations?unverified=1">Include unverified employers</a>'}</p>${rankJobs(sk,jobRows(inc)).slice(0,20).map(([j,r])=>jobCard(j,r,true)).join("")||'<p class="muted">No open jobs yet.</p>'}`);});
route("POST","/jobs/(\\d+)/apply",(f,id)=>{need("seeker");const j=getJob(id),sk=mySeeker();
  if(j.tier==="international"&&!j.verified)throw new HttpErr(404,"That job posting does not exist.");
  if(j.status!=="open"){flash("This job is closed.","warn");throw new Redirect("/jobs/"+id);}
  if(!parseSkills(sk.skills).length){flash("Add your skills to your profile before applying.","warn");throw new Redirect("/profile");}
  if(DB.apps.some(a=>a.jid==j.id&&a.sid==U.id)){flash("You already applied to this job.");throw new Redirect("/applications");}
  DB.apps.push({id:nid("a"),jid:j.id,sid:U.id,score:scoreMatch(sk,j).score,status:"Submitted",note:clean(f.cover_note,1000),created:new Date().toISOString()});save();
  flash("Application sent for "+j.title+".","ok");throw new Redirect("/applications");});
route("GET","/applications",()=>{need("seeker");const rows=DB.apps.filter(a=>a.sid==U.id).reverse().map(a=>({a,j:getJob(a.jid)}));
  return layout("My applications",`<h1>My applications</h1>${rows.length?`<div class="tablewrap"><table><tr><th>Job</th><th>Employer</th><th>Level</th><th>Match</th><th>Status</th><th>Applied</th></tr>${rows.map(({a,j})=>`<tr><td><a href="#/jobs/${j.id}">${esc(j.title)}</a></td><td>${esc(j.company)}</td><td>${tb(j.tier)}</td><td>${a.score}%</td><td>${sb(a.status)}</td><td>${a.created.slice(0,10)}</td></tr>`).join("")}</table></div>`:'<p class="muted">You have not applied to any jobs yet. <a href="#/recommendations">See recommendations</a>.</p>'}`);});

/* ---- auth ---- */
const regForm=(v,e)=>layout("Register",`<section class="card narrow"><h1>Create an account</h1>${errs(e)}<form data-post="/register"><label>I am a</label>
<label class="check"><input type="radio" name="role" value="seeker"${v.role!=="employer"?" checked":""}> Job seeker</label><label class="check"><input type="radio" name="role" value="employer"${v.role==="employer"?" checked":""}> Employer</label>
${inp("Full name","full_name",v.full_name,"text","required maxlength=100")}${inp("Email","email",v.email,"email","required")}${inp("Company name (employers only)","company",v.company)}
${inp("Password","password","","password","required")}<div class="hint">At least 8 characters, with a letter and a number.</div>${inp("Confirm password","confirm","","password","required")}
<label class="check"><input type="checkbox" name="consent" value="1"${v.consent?" checked":""}><span>I have read the <a href="#/privacy">privacy notice</a> and agree to the processing of my data.</span></label>
<p><button type="submit">Register</button> <a href="#/login">I already have an account</a></p></form></section>`);
route("GET","/register",()=>{if(U)throw new Redirect(home(U));return regForm({},[]);});
route("POST","/register",async f=>{const e=[],email=clean(f.email,150).toLowerCase(),name=clean(f.full_name,100),co=clean(f.company,150),pw=f.password||"";
  if(!["seeker","employer"].includes(f.role))e.push("Choose whether you are a job seeker or an employer.");
  if(!name)e.push("Full name is required.");if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))e.push("Enter a valid email address.");
  if(pw.length<8||!/[A-Za-z]/.test(pw)||!/\d/.test(pw))e.push("Password must be at least 8 characters and contain a letter and a number.");
  if(pw!==f.confirm)e.push("The two passwords do not match.");if(f.role==="employer"&&!co)e.push("Company name is required for employers.");
  if(!f.consent)e.push("You must agree to the privacy notice to register.");if(DB.users.some(u=>u.email===email))e.push("An account with that email already exists.");
  if(e.length)return regForm(f,e);
  const u=await addUser(email,pw,f.role,name);
  if(f.role==="seeker")DB.seekers[u.id]={barangay:"",phone:"",edu:"High School",years:0,skills:"",summary:"",tier:"local"};else DB.employers[u.id]={company:co,industry:"",address:"",description:""};
  save();localStorage.sep_uid=u.id;
  flash(f.role==="seeker"?"Welcome! Add your skills so we can match you with jobs.":"Welcome! Upload your business documents to get verified, then post your first job.","ok");
  throw new Redirect(f.role==="seeker"?"/profile":"/employer/verification");});
const loginForm=(err="")=>layout("Log in",`<section class="card narrow"><h1>Log in</h1>${errs(err?[err]:[])}<form data-post="/login">${inp("Email","email","","email","required")}${inp("Password","password","","password","required")}
<p><button type="submit">Log in</button> <a href="#/register">Create an account</a></p></form><p class="muted">Demo: admin@peso-bislig.test / Admin@123, hr@bisligtimber.test / Employer@123, maria.santos@example.test / Seeker@123</p></section>`);
route("GET","/login",()=>{if(U)throw new Redirect(home(U));return loginForm();});
const FAILS={};
route("POST","/login",async f=>{const email=clean(f.email,150).toLowerCase(),now=Date.now();FAILS[email]=(FAILS[email]||[]).filter(t=>now-t<3e5);
  if(FAILS[email].length>=5)return loginForm("Too many failed attempts. Please wait 5 minutes and try again.");
  const u=DB.users.find(x=>x.email===email);
  if(!u||await hashPw(f.password||"",u.salt)!==u.pw){FAILS[email].push(now);return loginForm("Incorrect email or password.");}
  if(!u.active)return loginForm("This account has been deactivated. Contact the PESO administrator.");
  localStorage.sep_uid=u.id;flash("Welcome back, "+u.name+".","ok");throw new Redirect(home(u));});

/* ---- profile ---- */
const profileForm=(v,e)=>{const r=U.role;let fields=inp("Full name","full_name",v.full_name,"text","required");
  if(r==="seeker")fields+=`<div class="formcols"><div>${inp("Phone","phone",v.phone)}</div><div>${inp("Barangay","barangay",v.barangay)}</div><div>${sel("Highest education","edu",EDU.slice(1),v.edu)}</div><div>${inp("Years of experience","years",v.years||0,"number",'min="0" max="60" step="0.5"')}</div></div>${ta("Skills","skills",v.skills,'maxlength=600')}<div class="hint">Separate with commas, e.g. customer service, excel, forklift operation.</div><p><span class="lbl">Recognised skills:</span> ${chips(parseSkills(v.skills))}</p>${sel("Preferred job market level","tier",tierItems(),v.tier)}${ta("Short summary","summary",v.summary)}`;
  if(r==="employer")fields+=inp("Company name","company",v.company,"text","required")+inp("Industry","industry",v.industry)+inp("Address","address",v.address)+ta("About the company","description",v.description);
  const del=r==="admin"?"":`<section class="card"><h2>Delete my account</h2><p class="muted">Permanently removes your account and all related data.</p><form data-post="/account/delete">${inp("Type DELETE to confirm","confirm")}<p><button class="danger" type="submit">Delete account and data</button></p></form></section>`;
  return layout("Profile",`<section class="card narrow"><h1>My profile</h1>${errs(e)}<form data-post="/profile">${fields}<p><button type="submit">Save profile</button></p></form></section><div class="narrow">${del}</div>`);};
route("GET","/profile",()=>{need();return profileForm({full_name:U.name,...(DB.seekers[U.id]||DB.employers[U.id]||{})},[]);});
route("POST","/profile",f=>{need();const e=[],name=clean(f.full_name,100);if(!name)e.push("Name is required.");
  if(U.role==="seeker"){const y=parseFloat(f.years||0);if(!(y>=0&&y<=60))e.push("Years of experience must be a number between 0 and 60.");if(e.length)return profileForm(f,e);
    Object.assign(DB.seekers[U.id],{phone:clean(f.phone,30),barangay:clean(f.barangay,60),edu:f.edu,years:y,skills:parseSkills(f.skills).join(", "),summary:clean(f.summary,500),tier:f.tier});}
  else if(U.role==="employer"){if(!clean(f.company,150))e.push("Company name is required.");if(e.length)return profileForm(f,e);
    Object.assign(DB.employers[U.id],{company:clean(f.company,150),industry:clean(f.industry,80),address:clean(f.address,200),description:clean(f.description,1000)});}
  else if(e.length)return profileForm(f,e);
  U.name=name;save();flash("Profile saved.","ok");throw new Redirect("/profile");});
route("POST","/account/delete",f=>{need("seeker","employer");
  if((f.confirm||"").trim()!=="DELETE"){flash("Type DELETE to confirm account deletion.","error");throw new Redirect("/profile");}
  const id=U.id;DB.users=DB.users.filter(u=>u.id!==id);delete DB.seekers[id];delete DB.employers[id];DB.docs=DB.docs.filter(d=>d.eid!==id);
  const jids=DB.jobs.filter(j=>j.eid===id).map(j=>j.id);DB.jobs=DB.jobs.filter(j=>j.eid!==id);DB.apps=DB.apps.filter(a=>a.sid!==id&&!jids.includes(a.jid));
  save();delete localStorage.sep_uid;flash("Your account and all related data were deleted.");throw new Redirect("/");});

/* ---- employer ---- */
const jobForm=(v,e)=>{const vt=verifiedTiers(U.id);return layout("Post a job",`<section class="card narrow"><h1>Post a job</h1>${errs(e)}${vt.length?"":'<div class="warnbox">Your company is not verified yet. Job seekers will see postings only after your documents are approved.</div>'}
<form data-post="/employer/jobs/new">${inp("Job title","title",v.title,"text","required maxlength=120")}${ta("Description","desc",v.desc,"required")}${ta("Required skills","req",v.req,"required")}<div class="hint">Comma-separated, e.g. bookkeeping, excel</div>${ta("Preferred skills (optional)","pref",v.pref)}
<div class="formcols"><div>${inp("Minimum experience (years)","minExp",v.minExp||0,"number",'min="0" max="50" step="0.5"')}</div><div>${sel("Minimum education","edu",EDU,v.edu||"Any")}</div><div>${sel("Market level","tier",tierItems(),v.tier||"local")}</div><div>${inp("Location","loc",v.loc)}</div></div>${inp("Salary (text)","salary",v.salary)}
<p><button type="submit">Save job</button> <a href="#/employer">Cancel</a></p></form></section>`);};
route("GET","/employer/jobs/new",()=>{need("employer");return jobForm({},[]);});
route("POST","/employer/jobs/new",f=>{need("employer");const e=[],req=parseSkills(f.req).join(", "),mx=parseFloat(f.minExp||0);
  if(!clean(f.title,120))e.push("Job title is required.");if(!clean(f.desc,5000))e.push("Job description is required.");if(!req)e.push("List at least one required skill.");if(!(mx>=0&&mx<=50))e.push("Minimum experience must be a number between 0 and 50.");
  if(e.length)return jobForm(f,e);const id=nid("j");
  DB.jobs.push({id,eid:U.id,title:clean(f.title,120),desc:clean(f.desc,5000),req,pref:parseSkills(f.pref).join(", "),minExp:mx,edu:f.edu,tier:f.tier,loc:clean(f.loc,120),salary:clean(f.salary,80),status:"open"});
  save();flash("Job posted.","ok");throw new Redirect("/jobs/"+id);});
route("GET","/employer",()=>{need("employer");const vt=verifiedTiers(U.id),jobs=DB.jobs.filter(j=>j.eid===U.id).reverse();
  return layout("Employer dashboard",`<h1>${esc(DB.employers[U.id].company)}</h1><section class="card"><h2>Verification status</h2><ul>${TIERS.map(t=>`<li>${TIER_LABEL[t]}: ${sb(vt.includes(t)?"verified":"unverified")}</li>`).join("")}</ul><a class="btn sec" href="#/employer/verification">Manage verification documents</a></section>
<div class="row between"><h2>Your job postings</h2><a class="btn" href="#/employer/jobs/new">Post a job</a></div>${jobs.length?`<div class="tablewrap"><table><tr><th>Job</th><th>Level</th><th>Verified</th><th>Status</th><th>Applicants</th><th></th></tr>${jobs.map(j=>`<tr><td><a href="#/jobs/${j.id}">${esc(j.title)}</a></td><td>${tb(j.tier)}</td><td>${sb(vt.includes(j.tier)?"verified":"unverified")}</td><td>${j.status}</td><td>${DB.apps.filter(a=>a.jid===j.id).length}</td><td><a href="#/employer/jobs/${j.id}/applicants">Applicants</a><form data-post="/employer/jobs/${j.id}/toggle" class="inline"><button class="link" type="submit">${j.status==="open"?"Close":"Reopen"}</button></form></td></tr>`).join("")}</table></div>`:'<p class="muted">No postings yet.</p>'}`);});
const ownJob=id=>{need("employer");const j=getJob(id);if(j.eid!==U.id)throw new HttpErr(403,"You can only manage your own job postings.");return j;};
route("POST","/employer/jobs/(\\d+)/toggle",(f,id)=>{const j=ownJob(id),r=DB.jobs.find(x=>x.id===j.id);r.status=r.status==="open"?"closed":"open";save();flash("Job "+r.status+".","ok");throw new Redirect("/employer");});
route("GET","/employer/jobs/(\\d+)/applicants",(f,id)=>{const j=ownJob(id);
  const rows=DB.apps.filter(a=>a.jid===j.id).map(a=>{const s=DB.seekers[a.sid],u=DB.users.find(x=>x.id===a.sid);return{a,s,u,r:scoreMatch(s,j)};}).sort((x,y)=>y.r.score-x.r.score);
  return layout("Applicants",`<p><a href="#/employer">&larr; Dashboard</a></p><h1>Applicants: ${esc(j.title)}</h1><p class="muted">Ranked by match score (${rows.length} applicant(s)).</p>${rows.map(({a,s,u,r})=>`<article class="card"><div class="row between"><h3>${esc(u.name)}</h3>${sb(a.status)}</div>
<p class="muted">${esc(s.edu)} &middot; ${s.years} yr experience &middot; ${esc(s.barangay||"barangay n/a")} &middot; ${esc(u.email)}${s.phone?" &middot; "+esc(s.phone):""}</p>${scoreBar(r)}${matchDetail(r)}${a.note?`<p><span class="lbl">Cover note:</span> ${esc(a.note)}</p>`:""}
<form data-post="/applications/${a.id}/status" class="inline"><select name="status">${opts(STATUSES,a.status)}</select><button class="sec" type="submit">Update</button></form></article>`).join("")||'<p class="muted">No applicants yet.</p>'}`);});
route("POST","/applications/(\\d+)/status",(f,id)=>{need("employer");const a=DB.apps.find(x=>x.id==id),j=a&&DB.jobs.find(x=>x.id===a.jid);
  if(!a||j.eid!==U.id)throw new HttpErr(403,"You can only update applications to your own jobs.");if(!STATUSES.includes(f.status))throw new HttpErr(400,"Invalid status.");
  a.status=f.status;save();flash("Application marked as "+f.status+".","ok");throw new Redirect(`/employer/jobs/${j.id}/applicants`);});

/* ---- verification ---- */
const reqTable=()=>`<div class="tablewrap"><table><tr><th>Market level</th><th>Approved documents needed</th></tr>${TIERS.map(t=>`<tr><td>${TIER_LABEL[t]}</td><td>${esc(TIER_REQ[t].map(g=>g.length>1?"("+g.map(d=>DOC_TYPES[d]).join(" or ")+")":DOC_TYPES[g[0]]).join(" AND "))}</td></tr>`).join("")}</table></div>`;
const verForm=(e=[])=>{const docs=DB.docs.filter(d=>d.eid===U.id).reverse();
  return layout("Verification",`<h1>Employer verification</h1>${errs(e)}<section class="card"><h2>Upload a document</h2><form data-post="/employer/verification">${sel("Document type","doc_type",Object.entries(DOC_TYPES))}${inp("Document / registration number","doc_number","","text","required maxlength=60")}<div class="hint">Sample numbers for the demo registry: BP-2026-0102, CS2015-04567, DMW-LA-2024-0045.</div>
<label for="file">File (PDF, PNG or JPG, max 5 MB)</label><input type="file" id="file" name="file" accept=".pdf,.png,.jpg,.jpeg" required><p><button type="submit">Upload for review</button></p></form></section>
<h2>Your documents</h2>${docs.length?`<div class="tablewrap"><table><tr><th>Document</th><th>Number</th><th>Simulated registry check</th><th>Status</th><th>Reviewer note</th></tr>${docs.map(d=>`<tr><td>${DOC_TYPES[d.type]}</td><td>${esc(d.number)}</td><td>${REG_LABEL[d.check]}</td><td>${sb(d.status)}</td><td>${esc(d.note)}</td></tr>`).join("")}</table></div>`:'<p class="muted">No documents uploaded yet.</p>'}<h2>How verification works</h2><p class="muted">Each upload is checked against a simulated registry, then reviewed by a PESO administrator.</p>${reqTable()}`);};
route("GET","/employer/verification",()=>{need("employer");return verForm();});
route("POST","/employer/verification",f=>{need("employer");const e=[],file=f.file,num=clean(f.doc_number,60);
  if(!DOC_TYPES[f.doc_type])e.push("Choose a valid document type.");if(!num)e.push("Enter the document number.");
  if(!file||!file.name)e.push("Choose a file to upload.");else if(!/\.(pdf|png|jpe?g)$/i.test(file.name))e.push("Only PDF, PNG or JPG files are accepted.");else if(file.size>5*1024*1024)e.push("The file is larger than 5 MB.");
  if(e.length)return verForm(e);
  DB.docs.push({id:nid("d"),eid:U.id,type:f.doc_type,number:num,filename:file.name.slice(0,120),check:lookupRegistry(f.doc_type,num,DB.employers[U.id].company),status:"pending",note:""});
  save();flash("Document recorded. A PESO administrator will review it. (The file itself is not stored in this browser-only demo.)","ok");throw new Redirect("/employer/verification");});

/* ---- admin ---- */
route("GET","/admin",()=>{need("admin");const open=DB.jobs.filter(j=>j.status==="open"),cnt=a=>Object.fromEntries(countBy(a)),
  demand=countBy(open.flatMap(j=>parseSkills(j.req))),supply=countBy(Object.values(DB.seekers).flatMap(s=>parseSkills(s.skills))),sup=Object.fromEntries(supply);
  const tiles=[[DB.users.filter(u=>u.role==="seeker").length,"job seekers"],[Object.keys(DB.employers).length,"employers"],[Object.keys(DB.employers).filter(id=>verifiedTiers(id).length).length,"verified employers"],[open.length,"open jobs"],[DB.apps.length,"applications"],[DB.docs.filter(d=>d.status==="pending").length,"documents awaiting review"]];
  const byTier=cnt(open.map(j=>j.tier)),byStatus=cnt(DB.apps.map(a=>a.status)),card=(t,b)=>`<section class="card"><h2>${t}</h2>${b}</section>`;
  return layout("Admin dashboard",`<h1>PESO dashboard</h1><div class="grid g4">${tiles.map(([n,t])=>`<div class="stat"><b>${n}</b><span>${t}</span></div>`).join("")}</div><div class="grid g2">
${card("Open jobs by market level",hbars(TIERS.map(t=>[t,byTier[t]||0])))}${card("Applications by status",hbars(STATUSES.map(s=>[s,byStatus[s]||0])))}${card("Most demanded skills",hbars(demand.slice(0,10)))}${card("Most common job-seeker skills",hbars(supply.slice(0,10)))}
${card("Skills gap (demanded, no seeker has it)",hbars(demand.filter(([k])=>!sup[k]).slice(0,8),"No gaps found."))}${card("Employers by industry",hbars(countBy(Object.values(DB.employers).map(e=>e.industry||"Unspecified")).slice(0,8)))}</div>`);});
route("GET","/admin/verifications",()=>{need("admin");const docs=[...DB.docs].sort((a,b)=>(b.status==="pending")-(a.status==="pending")||b.id-a.id);
  return layout("Verifications",`<h1>Employer verification queue</h1>${docs.length?`<div class="tablewrap"><table><tr><th>Employer</th><th>Document</th><th>Simulated registry</th><th>Status</th><th>Review</th></tr>${docs.map(d=>`<tr><td>${esc(DB.employers[d.eid].company)}</td><td>${DOC_TYPES[d.type]}<br>${esc(d.number)}<br><span class="muted">${esc(d.filename)}</span></td><td>${REG_LABEL[d.check]}</td><td>${sb(d.status)}</td>
<td><form data-post="/admin/docs/${d.id}/review"><input type="text" name="note" placeholder="Note (optional)" maxlength="300" value="${esc(d.note)}"><p><button type="submit" name="decision" value="approve">Approve</button> <button class="danger" type="submit" name="decision" value="reject">Reject</button></p></form></td></tr>`).join("")}</table></div>`:'<p class="muted">No documents submitted yet.</p>'}`);});
route("POST","/admin/docs/(\\d+)/review",(f,id)=>{need("admin");const d=DB.docs.find(x=>x.id==id);if(!d)throw new HttpErr(404,"Document not found.");
  if(!["approve","reject"].includes(f.decision))throw new HttpErr(400,"Invalid decision.");d.status=f.decision==="approve"?"approved":"rejected";d.note=clean(f.note,300);save();
  const t=verifiedTiers(d.eid);flash(`Document ${d.status}. Employer is now verified for: ${t.join(", ")||"no levels"}.`,"ok");throw new Redirect("/admin/verifications");});
route("GET","/admin/users",()=>{need("admin");
  return layout("Users",`<h1>Users</h1><div class="tablewrap"><table><tr><th>Name</th><th>Email</th><th>Role</th><th>Active</th><th>Joined</th><th></th></tr>${DB.users.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${u.role}</td><td>${sb(u.active?"approved":"rejected")}</td><td>${u.created.slice(0,10)}</td><td>${u.id===U.id?"":`<form data-post="/admin/users/${u.id}/toggle" class="inline"><button class="sec" type="submit">${u.active?"Deactivate":"Activate"}</button></form>`}</td></tr>`).join("")}</table></div>`);});
route("POST","/admin/users/(\\d+)/toggle",(f,id)=>{need("admin");const u=DB.users.find(x=>x.id==id);if(!u)throw new HttpErr(404,"User not found.");if(u.id===U.id)throw new HttpErr(400,"You cannot deactivate your own account.");
  u.active=!u.active;save();flash(`${u.name} ${u.active?"activated":"deactivated"}.`,"ok");throw new Redirect("/admin/users");});

const fail=e=>{document.getElementById("app").innerHTML=`<main class="wrap"><div class="errors"><strong>Cannot reach the database.</strong><ul><li>${esc(e.message)}</li><li>Open this page through XAMPP (http://localhost/portal/), with Apache and MySQL started - not by double-clicking index.html.</li></ul></div></main>`;};
initDb().then(render).catch(fail);
