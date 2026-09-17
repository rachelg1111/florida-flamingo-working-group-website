import {NextRequest,NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {MAX_BYTES,validateSubmission,imageSignatureMatches} from '@/lib/submission.mjs';
export const runtime='nodejs';
const reply=(body:object,status:number)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:NextRequest){
 if(process.env.FORMS_ENABLED!=='true'||!process.env.FORM_WEBHOOK_URL||!process.env.FORM_WEBHOOK_SECRET)return reply({error:'This preview does not receive submissions. Please use the current FFWG website.'},503);
 const origin=request.headers.get('origin');if(!origin||new URL(origin).host!==new URL(request.url).host)return reply({error:'Submission origin could not be verified.'},403);
 const size=Number(request.headers.get('content-length'));if(size>MAX_BYTES+100000)return reply({error:'The submission is too large. Keep photos under 3 MB in total.'},413);
 try{
 const reader=request.body?.getReader();if(!reader)return reply({error:'No submission received.'},400);const chunks:Uint8Array[]=[];let length=0;
 while(true){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>MAX_BYTES+100000){await reader.cancel();return reply({error:'The submission is too large.'},413);}chunks.push(value);}
 const data=await new Response(Buffer.concat(chunks),{headers:{'content-type':request.headers.get('content-type')||''}}).formData();
 const {errors,photos}=validateSubmission(data);if(errors.length)return reply({error:errors[0]},400);
 for(const file of photos){const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());if(!imageSignatureMatches(bytes,file.type))return reply({error:'One photograph is not a supported image file.'},400);}
 const endpoint=new URL(process.env.FORM_WEBHOOK_URL);if(endpoint.protocol!=='https:')return reply({error:'Submission delivery is not configured correctly.'},503);
 const reference=randomUUID();data.delete('website');data.set('reference',reference);data.set('receivedAt',new Date().toISOString());
 const response=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${process.env.FORM_WEBHOOK_SECRET}`,'Idempotency-Key':reference},body:data,signal:AbortSignal.timeout(15000),redirect:'error'});
 if(!response.ok)return reply({error:'Your submission could not be delivered. Please try again or use the current FFWG website.'},502);
 return reply({reference},200);
 }catch{return reply({error:'Your submission could not be delivered. Please check your entries and try again.'},502);}
}
