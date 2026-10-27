import assert from 'node:assert/strict';
import {networkURL,moduleURL} from './load-ts.mjs';
const {scanLink,readPublic,adapterFor,publicIP}=await import(networkURL);
const {validateInterview}=await import(moduleURL('lib/interviews.ts'));
const json=x=>new Response(JSON.stringify(x),{headers:{'content-type':'application/json'}});
let calls=[];const apiMock=async(url)=>{calls.push(String(url));return json({name:'Product Analyst',company:{name:'Grab'},location:{city:'Jakarta',country:'ID'},jobAd:{sections:{jobDescription:{title:'Responsibilities',text:'<p>Analyse product data.</p>'}}}})};
let job=await scanLink('https://jobs.smartrecruiters.com/Grab/12345-product-analyst',apiMock);assert.equal(job.company,'Grab');assert.equal(job.role,'Product Analyst');assert.equal(calls.length,1);assert.ok(calls[0].startsWith('https://api.smartrecruiters.com/')); // no DoH dependency
job=await scanLink('https://www.linkedin.com/jobs/view/data-analyst-at-example-co-12345/',async()=>new Response('',{status:403}));assert.equal(job.role,'data analyst');assert.match(job.message,/suggestions/);
await assert.rejects(()=>scanLink('https://id.jobstreet.com/job/12345',async()=>new Response('',{status:403})),/HTTP 403/);
await assert.rejects(()=>readPublic('https://jobs.lever.co/example/id',AbortSignal.timeout(1000),async()=>new Response('',{status:302,headers:{location:'http://127.0.0.1/admin'}})),/public job listing/);
await assert.rejects(()=>readPublic('https://company.example/job',AbortSignal.timeout(1000),async()=>json({Status:0,Answer:[{type:1,data:'10.0.0.1'}]})),/public job-page/);
assert.equal(adapterFor(new URL('https://jobs.lever.co/brand/abc')).kind,'lever');assert.equal(adapterFor(new URL('https://job-boards.greenhouse.io/brand/jobs/123')).kind,'greenhouse');
for(const ip of ['127.0.0.1','169.254.169.254','10.1.2.3','192.168.1.1','172.16.0.1','100.64.1.1','::1','fc00::1','fe80::1'])assert.equal(publicIP(ip),false);assert.equal(publicIP('104.18.4.15'),true);
const entry={id:'test',question:'Tell me about yourself',category:'General',kind:'Preparation',confidence:'To practise',starred:false,company:'',role:'',applicationId:'',interviewDate:'',plannedAnswer:'Example',actualAnswer:'',improvedAnswer:'',reflection:'',tags:'',updated:'2026-10-27'};
assert.ok(validateInterview(entry));assert.ok(!validateInterview({...entry,question:' '}));assert.ok(!validateInterview({...entry,kind:'invalid'}));assert.ok(!validateInterview({...entry,plannedAnswer:'x'.repeat(50000)}));
console.log('PASS: public API import, blocked-page fallback, redirect/private-address rejection, API adapter routing, interview validation');
