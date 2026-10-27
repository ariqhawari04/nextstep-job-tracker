import { getChatGPTUser } from '../../chatgpt-auth';
import { getDb } from '../../../db';
import { applications } from '../../../db/schema';
import { and, eq } from 'drizzle-orm';
export async function GET() {
 const user=await getChatGPTUser(); if(!user)return Response.json({error:'Please sign in to load your applications.'},{status:401});
 const rows=await getDb().select().from(applications).where(eq(applications.owner,user.userId));
 return Response.json(rows.map(r=>JSON.parse(r.data)));
}
export async function POST(req:Request){
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Please sign in to save.'},{status:401});
 const body=await req.json(); const items=Array.isArray(body)?body:[body];
 if(items.length>1000)return Response.json({error:'Import up to 1,000 applications at once.'},{status:400});
 const statuses=['Saved','Applied','Assessment','Interview','Offer','Closed'];
 for(const a of items){if(!a.id||typeof a.id!=='string'||!a.company?.trim()||!a.role?.trim()||!statuses.includes(a.status)||JSON.stringify(a).length>30000)return Response.json({error:'Each application needs a company, role and valid status.'},{status:400});}
 const db=getDb();
 for(const a of items){const id=user.userId+':'+a.id;await db.insert(applications).values({id,owner:user.userId,data:JSON.stringify(a),updated:new Date().toISOString()}).onConflictDoUpdate({target:applications.id,set:{data:JSON.stringify(a),updated:new Date().toISOString()}});}
 return Response.json({ok:true});
}
export async function DELETE(req:Request){const user=await getChatGPTUser();if(!user)return new Response('Unauthorized',{status:401});const {id}=await req.json() as {id:string};await getDb().delete(applications).where(and(eq(applications.id,user.userId+':'+id),eq(applications.owner,user.userId)));return Response.json({ok:true});}
