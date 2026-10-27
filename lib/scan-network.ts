import {clean,extractJob,publicURL,type ScanResult} from './job-scan';
export class ScanError extends Error{constructor(public code:string,message:string){super(message)}}
const trusted=['linkedin.com','jobstreet.com','jobstreet.co.id','id.jobstreet.com','glints.com','kalibrr.com','indeed.com','indeed.co.id','jobs.lever.co','jobs.eu.lever.co','api.lever.co','api.eu.lever.co','boards.greenhouse.io','job-boards.greenhouse.io','boards-api.greenhouse.io','jobs.smartrecruiters.com','careers.smartrecruiters.com','api.smartrecruiters.com','jobs.ashbyhq.com','api.ashbyhq.com','myworkdayjobs.com','careers.shopee.co.id','careers.shopee.com','careers.grab.com'];
export const knownHost=(host:string)=>trusted.some(h=>host===h||host.endsWith('.'+h));
export function publicIP(ip:string){if(ip.includes(':'))return /^[23][0-9a-f]{3}:/i.test(ip)&&!/^2001:(?:0:|db8:|10:|20:)/i.test(ip);const p=ip.split('.').map(Number);if(p.length!==4||p.some(x=>!Number.isInteger(x)||x<0||x>255))return false;const [a,b]=p;return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&[0,168].includes(b)||a===100&&b>=64&&b<=127||a===198&&[18,19,51].includes(b)||a===203&&b===0)}
/** Known hiring platform domains do not need an additional DNS HTTP service.
 * Unknown domains are checked via A + AAAA records, including each redirect.
 * No browser cookies, authentication headers, or private-network bindings are sent. */
async function validateHost(url:URL,signal:AbortSignal,fetcher:typeof fetch){if(knownHost(url.hostname))return;let responses:any[]|null=null;for(const resolver of ['https://cloudflare-dns.com/dns-query','https://dns.google/resolve']){try{responses=await Promise.all(['A','AAAA'].map(async type=>{const r=await fetcher(`${resolver}?name=${encodeURIComponent(url.hostname)}&type=${type}`,{headers:{accept:'application/dns-json'},signal:AbortSignal.any([signal,AbortSignal.timeout(4000)])});if(!r.ok)throw Error();const result:any=await r.json();if(result.Status!==0)throw Error();return result}));break}catch{if(signal.aborted)throw new ScanError('timeout','The scan timed out. Use the job-text option instead.')}}if(!responses)throw new ScanError('dns','Could not resolve this company website. Try its direct job-board link or paste the job text.');const ips=responses.flatMap(r=>(r.Answer||[]).filter((a:any)=>[1,28].includes(a.type)).map((a:any)=>a.data));if(!ips.length||ips.some(ip=>!publicIP(ip)))throw new ScanError('private_address','This is not a supported public job-page address.')}
export async function readPublic(raw:string,signal:AbortSignal,fetcher:typeof fetch=fetch,accept='text/html,application/xhtml+xml'){
 let url=publicURL(raw);
 for(let hop=0;hop<5;hop++){
 await validateHost(url,signal,fetcher);let r:Response;
 try{r=await fetcher(url.toString(),{redirect:'manual',signal:AbortSignal.any([signal,AbortSignal.timeout(10000)]),headers:{Accept:accept,'User-Agent':'NextstepJobImporter/2.0'}})}catch{throw new ScanError('network','The job website could not be reached or took too long to respond. You can paste its job text below.')}
 if(r.status>=300&&r.status<400){const to=r.headers.get('location');await r.body?.cancel();if(!to)throw new ScanError('redirect','This link has an incomplete redirect. Copy the final job-page URL.');url=publicURL(new URL(to,url).toString());continue}
 if(!r.ok){await r.body?.cancel();throw new ScanError(r.status===404||r.status===410?'expired':'blocked',`The job site returned HTTP ${r.status}. ${r.status===404||r.status===410?'The vacancy may have expired.':'It may block automated readers or require sign-in.'} Copy the job text from your browser instead.`)}
 const type=r.headers.get('content-type')||'';if(!/html|json|text\/plain/i.test(type)){await r.body?.cancel();throw new ScanError('file','This link is not a readable job webpage.')}
 const reader=r.body?.getReader();if(!reader)throw new ScanError('empty','The listing returned an empty response.');const decoder=new TextDecoder();let text='',size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>5000000){await reader.cancel();throw new ScanError('size','This job page is too large to scan. Copy its job text instead.')}text+=decoder.decode(value,{stream:true})}text+=decoder.decode();return {text,url:url.toString()};
 }
 throw new ScanError('redirect','Too many redirects. Copy the final job-page URL from your browser.')
}
type Adapter={url:string;kind:'greenhouse'|'lever'|'smartrecruiters';companyHint:string};
export function adapterFor(url:URL):Adapter|null{
 const parts=url.pathname.split('/').filter(Boolean),enc=encodeURIComponent;
 if(['boards.greenhouse.io','job-boards.greenhouse.io'].includes(url.hostname)&&parts[0]){const id=parts[1]==='jobs'?parts[2]:url.searchParams.get('gh_jid');if(id&&/^\d+$/.test(id))return {url:`https://boards-api.greenhouse.io/v1/boards/${enc(parts[0])}/jobs/${id}`,kind:'greenhouse',companyHint:parts[0]}}
 if(['jobs.lever.co','jobs.eu.lever.co'].includes(url.hostname)&&parts[0]&&parts[1])return {url:`https://${url.hostname==='jobs.eu.lever.co'?'api.eu.lever.co':'api.lever.co'}/v0/postings/${enc(parts[0])}/${enc(parts[1])}?mode=json`,kind:'lever',companyHint:parts[0]};
 if(url.hostname==='jobs.smartrecruiters.com'&&parts[0]&&parts[1]){const id=parts[1].match(/^\d+/)?.[0];if(id)return {url:`https://api.smartrecruiters.com/v1/companies/${enc(parts[0])}/postings/${id}`,kind:'smartrecruiters',companyHint:parts[0]}}
 return null;
}
export function fromAPI(a:Adapter,j:any):ScanResult{
 let role='',company='',location='',description='',employment='';
 if(a.kind==='greenhouse'){role=clean(j.title);company=clean(j.company_name);location=clean(j.location?.name);description=clean(clean(clean(j.content)))}
 if(a.kind==='lever'){role=clean(j.text);company=clean(j.company);location=clean(j.categories?.location);employment=clean(j.categories?.commitment);description=[j.descriptionPlain||j.description,...(j.lists||[]).map((l:any)=>clean(l.text)+'\n'+clean(l.content)),j.additionalPlain||j.additional].filter(Boolean).map(clean).join('\n\n')}
 if(a.kind==='smartrecruiters'){role=clean(j.name);company=clean(j.company?.name);location=[j.location?.city,j.location?.country].filter(Boolean).join(', ');employment=clean(j.typeOfEmployment?.label);description=Object.values(j.jobAd?.sections||{}).map((v:any)=>clean(v.title)+'\n'+clean(v.text)).join('\n\n')}
 const inferred=!company;if(!company)company=a.companyHint.replace(/[-_]/g,' ');
 return {role:role.slice(0,180),company:company.slice(0,180),notes:[location&&'Location: '+location,employment&&'Employment: '+employment,description].filter(Boolean).join('\n\n').slice(0,9000),source:a.kind+' public job API',message:inferred?'Role found in the job API. Company suggested from the job-board name—please check its spelling.':'Details found in the public job API. Review them before saving.'}
}
export function urlSuggestion(url:URL):ScanResult|null{
 if(!/(^|\.)linkedin\.com$/.test(url.hostname))return null;
 const slug=url.pathname.match(/\/jobs\/view\/([^/]+)/)?.[1];if(!slug)return null;const match=decodeURIComponent(slug).replace(/-\d+$/,'').match(/^(.+)-at-(.+)$/i);if(!match)return null;
 return {role:match[1].replaceAll('-',' ').slice(0,180),company:match[2].replaceAll('-',' ').slice(0,180),notes:'',source:'URL suggestion—not verified against page',message:'The page could not be read. These are suggestions from the link text only; check the title and company before saving.'};
}
export async function scanLink(raw:string,fetcher:typeof fetch=fetch):Promise<ScanResult>{
 const url=publicURL(raw.trim().match(/^https?:\/\//i)?raw.trim():'https://'+raw.trim());const signal=AbortSignal.timeout(25000);const adapter=adapterFor(url);
 if(adapter){try{const r=await readPublic(adapter.url,signal,fetcher,'application/json');const out=fromAPI(adapter,JSON.parse(r.text));if(out.role)return out}catch{/* Read the normal public page if its documented API is unavailable. */}}
 try{const r=await readPublic(url.toString(),signal,fetcher);const result=extractJob(r.text,r.url);if(result.role||result.company)return result;return urlSuggestion(url)||result}catch(e){const suggestion=urlSuggestion(url);if(suggestion)return suggestion;throw e}
}
