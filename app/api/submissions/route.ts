import {NextRequest,NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {MAX_BYTES,validateSubmission,imageSignatureMatches} from '@/lib/submission.mjs';
export const runtime='nodejs';
const reply=(body:object,status:number)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:NextRequest){
 if(process.env.FORMS_ENABLED!=='true'||!process.env.FORM_WEBHOOK_URL||!process.env.FORM_WEBHOOK_SECRET)return reply({error:'Contact submissions are temporarily unavailable.'},503);
 const origin=request.headers.get('origin');if(!origin||new URL(origin).host!==new URL(request.url).host)return reply({error:'Submission origin could not be verified.'},403);
 const size=Number(request.headers.get('content-length'));if(size>MAX_BYTES+250000)return reply({error:'The submission is too large.'},413);
 try{
  const data=await request.formData();data.set('kind','contact');const {errors,photos}=validateSubmission(data);if(errors.length)return reply({error:errors[0]},400);
  for(const file of photos){const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());if(!imageSignatureMatches(bytes,file.type))return reply({error:'One attachment is not a supported image file.'},400);}
  const endpoint=new URL(process.env.FORM_WEBHOOK_URL);if(endpoint.protocol!=='https:')return reply({error:'Submission delivery is not configured correctly.'},503);
  const reference=randomUUID();data.delete('website');data.set('reference',reference);data.set('receivedAt',new Date().toISOString());
  const response=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${process.env.FORM_WEBHOOK_SECRET}`,'Idempotency-Key':reference},body:data,signal:AbortSignal.timeout(15000),redirect:'error'});
  return response.ok?reply({reference},200):reply({error:'Your message could not be delivered. Please try again.'},502);
 }catch{return reply({error:'Your message could not be delivered. Please check your entries and try again.'},502);}
}
