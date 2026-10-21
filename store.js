/* Browser-only version: data is kept in localStorage + demo seed data. Prototype only: no real security. */
let DB=null, saveQ=Promise.resolve();
const KEY="sep_db";
const save=()=>{localStorage.setItem(KEY,JSON.stringify(DB));return Promise.resolve();};
async function refreshDb(){try{const d=JSON.parse(localStorage.getItem(KEY));if(d&&d.users)DB=d;}catch(e){}}
const nid=t=>DB.seq[t]=(DB.seq[t]||0)+1;
async function hashPw(p,salt){ const b=new TextEncoder().encode(salt+p);
  if(window.crypto&&crypto.subtle) return [...new Uint8Array(await crypto.subtle.digest("SHA-256",b))].map(x=>x.toString(16).padStart(2,"0")).join("");
  return btoa(salt+p); }
const newSalt=()=>Math.random().toString(36).slice(2);
async function addUser(email,pw,role,name){ const salt=newSalt(); const u={id:nid("u"),email:email.toLowerCase(),salt,pw:await hashPw(pw,salt),role,name,active:true,created:new Date().toISOString()}; DB.users.push(u); return u; }

const REGISTRY=[["MAYOR","BP-2026-0101","Bislig Timber & Wood Products Corp.","active"],["MAYOR","BP-2026-0102","Mangagoy Hardware & Supply","active"],["MAYOR","BP-2026-0103","Tabon Fresh Agri Trading","active"],["MAYOR","BP-2026-0104","Pacific Horizon Manpower Agency","active"],["SEC","CS2015-04567","Bislig Timber & Wood Products Corp.","active"],["SEC","CS2012-00987","Pacific Horizon Manpower Agency","active"],["DTI","DTI-BN-558201","Mangagoy Hardware & Supply","active"],["DMW","DMW-LA-2024-0045","Pacific Horizon Manpower Agency","active"],["DMW","DMW-LA-2019-0012","Sunrise Overseas Placement","expired"]];
// [email, company, industry, address, [[type, number, status]]]
const EMPS=[["hr@bisligtimber.test","Bislig Timber & Wood Products Corp.","Wood & Forestry","Mangagoy, Bislig City",[["MAYOR","BP-2026-0101","approved"],["SEC","CS2015-04567","approved"]]],
["hr@mangagoyhardware.test","Mangagoy Hardware & Supply","Retail","Mangagoy, Bislig City",[["MAYOR","BP-2026-0102","approved"]]],
["owner@tabonagri.test","Tabon Fresh Agri Trading","Agriculture","Tabon, Bislig City",[["MAYOR","BP-2026-0103","pending"]]],
["hr@pacifichorizon.test","Pacific Horizon Manpower Agency","Manpower / Overseas Recruitment","Poblacion, Bislig City",[["MAYOR","BP-2026-0104","approved"],["SEC","CS2012-00987","approved"],["DMW","DMW-LA-2024-0045","approved"]]],
["jobs@quickcashglobal.test","QuickCash Global Jobs","Recruitment","Unknown",[["DMW","DMW-LA-9999-0000","rejected"]]]];
// [employer, title, tier, location, required, preferred, minExp, education, salary]
const JOBS=[["hr@bisligtimber.test","Forklift Operator","local","Mangagoy, Bislig City","forklift operation, heavy equipment safety","inventory, teamwork",1,"High School","PHP 14,000 - 16,000 / month"],
["hr@bisligtimber.test","Wood Processing Technician","local","Mangagoy, Bislig City","wood processing, machine operation, quality inspection","carpentry, safety",2,"Vocational/TESDA","PHP 15,000 - 18,000 / month"],
["hr@bisligtimber.test","Accounting Staff","provincial","Bislig City / Tandag City","bookkeeping, excel, accounting","quickbooks, payroll",1,"Bachelor's Degree","PHP 18,000 - 22,000 / month"],
["hr@bisligtimber.test","Logistics Coordinator","national","Davao City","logistics, inventory, excel","supply chain, communication",2,"Bachelor's Degree","PHP 22,000 - 26,000 / month"],
["hr@bisligtimber.test","IT Support Staff","local","Mangagoy, Bislig City","troubleshooting, networking, computer hardware","windows, customer service",1,"College Undergraduate","PHP 16,000 - 20,000 / month"],
["hr@mangagoyhardware.test","Sales Associate","local","Mangagoy, Bislig City","customer service, sales, cash handling","inventory, pos",0,"Senior High School","PHP 12,000 - 14,000 / month"],
["hr@mangagoyhardware.test","Store Cashier","local","Mangagoy, Bislig City","cash handling, pos, customer service","excel",0,"High School","PHP 11,500 - 13,500 / month"],
["hr@mangagoyhardware.test","Delivery Driver","local","Bislig City","driving, route planning","motorcycle, customer service",1,"High School","PHP 13,000 - 15,000 / month"],
["owner@tabonagri.test","Farm Supervisor","local","Tabon, Bislig City","crop management, farm equipment, supervision","agriculture, record keeping",3,"Any","PHP 16,000 - 19,000 / month"],
["hr@pacifichorizon.test","Welder (Overseas)","international","Middle East","welding, fabrication, blueprint reading","english, safety",3,"Vocational/TESDA","USD 650 - 800 / month"],
["hr@pacifichorizon.test","Caregiver (Overseas)","international","Taiwan","caregiving, first aid, patient care","english, cooking",1,"Senior High School","TWD 24,000 - 28,000 / month"],
["hr@pacifichorizon.test","Customer Service Representative","national","Davao City","customer service, english, computer literacy","typing, crm",0,"Senior High School","PHP 15,000 - 18,000 / month"],
["jobs@quickcashglobal.test","Overseas Domestic Helper - Guaranteed Visa","international","Overseas","housekeeping, cooking","",0,"Any","USD 1,500 / month (upfront fee required - scam demo)"],
["jobs@quickcashglobal.test","Office Assistant","local","Bislig City","computer literacy, filing","",0,"High School","PHP 9,000 / month"]];
// [email, name, barangay, education, years, skills, tier]
const SEEKERS=[["maria.santos@example.test","Maria Santos","Mangagoy","Senior High School",2,"customer service, sales, cash handling, pos, english","local"],
["juan.delacruz@example.test","Juan Dela Cruz","Coleto","High School",3,"forklift operation, heavy equipment safety, driving, inventory","local"],
["ana.reyes@example.test","Ana Reyes","Poblacion","Bachelor's Degree",2,"bookkeeping, excel, accounting, payroll, communication","provincial"],
["pedro.villanueva@example.test","Pedro Villanueva","San Fernando","Vocational/TESDA",5,"welding, fabrication, blueprint reading, safety, english","international"],
["liza.mercado@example.test","Liza Mercado","Tabon","College Undergraduate",1,"troubleshooting, networking, computer hardware, windows, customer service","local"]];

async function seed(){
  DB={seq:{},users:[],seekers:{},employers:{},docs:[],jobs:[],apps:[],registry:REGISTRY.map(([reg,number,name,status])=>({reg,number,name,status}))};
  await addUser("admin@peso-bislig.test","Admin@123","admin","PESO Administrator");
  const ids={};
  for(const [email,company,industry,address,docs] of EMPS){
    const u=await addUser(email,"Employer@123","employer",company+" HR"); ids[email]=u.id;
    DB.employers[u.id]={company,industry,address,description:""};
    docs.forEach(([type,number,status])=>DB.docs.push({id:nid("d"),eid:u.id,type,number,filename:"(sample record)",check:lookupRegistry(type,number,company),status,note:status==="pending"?"":"Seed record"}));
  }
  JOBS.forEach(([e,title,tier,loc,req,pref,minExp,edu,salary])=>DB.jobs.push({id:nid("j"),eid:ids[e],title,desc:title+" - sample posting (fictional).",req,pref,minExp,edu,tier,loc,salary,status:"open"}));
  for(const [email,name,barangay,edu,years,skills,tier] of SEEKERS){
    const u=await addUser(email,"Seeker@123","seeker",name);
    DB.seekers[u.id]={barangay,phone:"",edu,years,skills,summary:"",tier};
  }
  save();
}
async function initDb(){ DB=null; await refreshDb(); if(!DB||!DB.users){await seed();await saveQ;} }

/* verification helpers */
const verifiedTiers=eid=>{const a=new Set(DB.docs.filter(d=>d.eid==eid&&d.status==="approved").map(d=>d.type));return TIERS.filter(t=>TIER_REQ[t].every(g=>g.some(x=>a.has(x))));};
const nrm=s=>(s||"").toLowerCase().replace(/[^a-z0-9]/g,"");
function lookupRegistry(type,number,company){
  const r=DB.registry.find(x=>x.reg===type&&x.number.toLowerCase()===(number||"").trim().toLowerCase());
  if(!r) return "not_found"; if(r.status!=="active") return "expired";
  const a=nrm(r.name),b=nrm(company); return a===b||a.includes(b)||b.includes(a)?"match":"name_mismatch"; }
