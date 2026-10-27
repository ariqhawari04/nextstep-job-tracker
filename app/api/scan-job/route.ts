import {getChatGPTUser} from '../../chatgpt-auth';
import {extractText} from '../../../lib/job-scan';
import {scanLink,ScanError} from '../../../lib/scan-network';
export async function POST(req:Request){
 if(!await getChatGPTUser())return Response.json({error:'Sign in with ChatGPT before scanning a link.',code:'auth'},{status:401});
 try{const body=await req.text();if(body.length>50000)throw new ScanError('size','Please paste a shorter job description.');const input=JSON.parse(body);if(typeof input.text==='string'&&input.text.trim())return Response.json(extractText(input.text));if(typeof input.url!=='string'||!input.url.trim()||input.url.length>4000)throw new ScanError('url','Paste a valid job listing link.');return Response.json(await scanLink(input.url),{headers:{'Cache-Control':'no-store'}})}catch(e:any){return Response.json({error:e instanceof ScanError?e.message:e.name==='TimeoutError'||e.name==='AbortError'?'The website took too long. Use Paste job text instead.':e instanceof TypeError?'Check the URL, or paste the job text if this website cannot be reached.':e instanceof SyntaxError?'Could not read the listing data. Try Paste job text.':e.message||'Could not read this listing. Use Paste job text.',code:e instanceof ScanError?e.code:'unreadable'},{status:400})}
}
