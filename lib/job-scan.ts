export type ScanResult={role:string;company:string;notes:string;source:string;message:string};
export function clean(value:unknown):string {
 if(typeof value!=='string'&&typeof value!=='number')return '';
 return String(value).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<\/(?:p|div|li|h[1-6])>|<br\s*\/?>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const x=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return x>0&&x<=0x10ffff?String.fromCodePoint(x):''}).replace(/&(amp|quot|apos|lt|gt|nbsp);/gi,(_,x)=>(({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '} as Record<string,string>)[x.toLowerCase()]||'')).replace(/[ \t]+/g,' ').replace(/\n\s*\n/g,'\n').trim();
}
export function publicURL(raw:string){
 const url=new URL(raw);const host=url.hostname.toLowerCase();
 if(!['https:','http:'].includes(url.protocol)||url.username||url.password||(url.port&&!['80','443'].includes(url.port))||!host.includes('.')||/[\[\]:]/.test(host)||/^[\d.]+$/.test(host)||/(?:^|\.)(?:localhost|local|internal|test|invalid|lan|home|arpa)$/.test(host))throw Error('Use a public job listing URL, starting with https://.');
 url.hash='';return url;
}
function attrs(tag:string){const out:Record<string,string>={};for(const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))out[m[1].toLowerCase()]=m[2]??m[3]??m[4];return out;}
function postings(value:any,found:any[]=[],depth=0):any[]{if(depth>12||!value||typeof value!=='object')return found;if([value['@type']].flat().some(t=>typeof t==='string'&&/(?:^|\/)JobPosting$/.test(t)))found.push(value);for(const v of Object.values(value))if(v&&typeof v==='object')postings(v,found,depth+1);return found;}
export function extractJob(html:string,url:string):ScanResult{
 const all:any[]=[];
 for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){if(!/application\/ld\+json/i.test(attrs(m[1]).type||''))continue;try{postings(JSON.parse(m[2].trim()),all)}catch{}}
 // Never pick an arbitrary job from a search/results page.
 const candidates=all.length===1?all:all.filter(j=>{try{return new URL(j.url,url).pathname===new URL(url).pathname}catch{return false}});
 if(candidates.length===1){const j=candidates[0],role=clean(j.title||j.name).slice(0,180),company=clean(j.hiringOrganization?.name||j.hiringOrganization).slice(0,180);
 const loc=[j.jobLocation].flat().map((x:any)=>{const a=x?.address;return typeof a==='string'?clean(a):[a?.addressLocality,a?.addressRegion,typeof a?.addressCountry==='object'?a.addressCountry.name:a?.addressCountry].filter(Boolean).map(clean).join(', ')}).filter(Boolean).join('; ');
 const salary=j.baseSalary,sv=salary?.value;const amount=typeof sv==='object'?[sv.minValue,sv.maxValue].filter(x=>x!==undefined).join(' – ')||sv.value:sv;const pay=typeof salary==='string'||typeof salary==='number'?clean(salary):[salary?.currency,amount,sv?.unitText].filter(x=>x!==undefined&&x!=='').map(clean).join(' ');
 const notes=[loc&&'Location: '+loc,j.jobLocationType==='TELECOMMUTE'&&'Work arrangement: Remote',j.employmentType&&'Employment: '+[j.employmentType].flat().map(clean).join(', '),pay&&'Listed salary: '+pay,j.validThrough&&'Listing expiry: '+clean(j.validThrough),clean(j.description).slice(0,6000)].filter(Boolean).join('\n\n');
 return {role,company,notes,source:'Job listing data',message:'Details found. Review them before saving; your application status and date are yours to choose.'};}
 const meta:Record<string,string>={};for(const m of html.matchAll(/<meta\b[^>]*>/gi)){const a=attrs(m[0]);meta[a.property||a.name]=clean(a.content)}
 const title=meta['og:title']||clean(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
 let role='',company='';const at=title.match(/^(?:Job Application for\s+)?(.+?)\s+at\s+(.+?)(?:\s+[|–]\s+.*)?$/i),hiring=title.match(/^(.+?)\s+hiring\s+(.+?)(?:\s+in\s+.+)?(?:\s*\|.*)?$/i);
 if(at){role=at[1];company=at[2]}else if(hiring){company=hiring[1];role=hiring[2]}
 if(!role){
 const titleCompany=title.match(/^(.+?)\s+(?:[-–—|])\s+(.+?)(?:\s*\|\s*(?:LinkedIn|JobStreet|Glints|Jobs).*)?$/i);
 if(titleCompany&&!/^(careers?|jobs?|linkedin|jobstreet|glints|apply now)$/i.test(titleCompany[2].trim())){role=titleCompany[1];company=titleCompany[2]}
 const micro=(prop:string)=>{const tag=html.match(new RegExp('<[^>]+itemprop=["\']'+prop+'["\'][^>]*>([\\s\\S]*?)<\\/[^>]+>','i'));return clean(tag?.[1])};
 role ||= micro('title');
 company ||= meta['job:company']||meta['hiringOrganization']||'';
 if(role.length>180)role='';
 }
 if(/sign in|log in|access denied|just a moment|captcha/i.test(title)){role='';company=''}
 return {role:role.slice(0,180),company:company.slice(0,180),notes:role?clean(meta['og:description']||meta.description).slice(0,6000):'',source:role?'Page title (please verify)':'',message:role?'Suggested details from the page title. Please check the company and role.':all.length>1?'This link contains several jobs. Paste the link for one specific vacancy.':'This page did not expose readable job details. It may require sign-in or JavaScript. Paste the job text below, or enter the company and role.'};
}
export function extractText(text:string):ScanResult{
 const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);const labelled=(names:string)=>clean(lines.find(x=>new RegExp('^(?:'+names+')\\s*[:：]','i').test(x))?.replace(/^[^:：]+[:：]\s*/,''));
 let role=labelled('job title|role|position|posisi|jabatan'),company=labelled('company|employer|perusahaan');
 const heading=lines.slice(0,5).map(l=>l.match(/^(.+?)\s+at\s+(.+)$/i)).find(Boolean);if(heading){role||=heading[1];company||=heading[2]}
 let suggested=false;
 if(!role){const headings=lines.slice(0,18).filter(l=>l.length<160&&!/^(show|share|save|apply|about the job|sign in|join|home|jobs|notifications|follow|see more|company logo|.* followers|.* connections)$/i.test(l));const i=headings.findIndex(l=>/\b(analyst|engineer|manager|associate|intern|scientist|specialist|consultant|trainee|developer|designer|officer|executive|coordinator|administrator|lead|director)\b/i.test(l)&&!/[.!?]$/.test(l));if(i>=0){role=clean(headings[i]);suggested=true;const previous=headings[i-1]?.replace(/\s+logo$/i,'');if(!company&&previous&&previous.length<90&&!/\b(ago|applicant|remote|full.time|on.site|hybrid|Jakarta|Indonesia)\b/i.test(previous))company=clean(previous)}}
 return {role:role.slice(0,180),company:company.slice(0,180),notes:clean(text).slice(0,9000),source:'Pasted job text',message:suggested?'Suggested from the pasted heading. Please verify the company and role.':role||company?'Text added. Review the detected details and fill any missing fields.':'Job text added to notes. Fill company and role below; these could not be identified reliably.'};
}
