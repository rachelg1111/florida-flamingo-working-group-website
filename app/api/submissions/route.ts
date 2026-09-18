import {NextRequest,NextResponse} from 'next/server';
import {createHash,randomUUID} from 'node:crypto';
import {MAX_BYTES,validateSubmission,imageSignatureMatches} from '@/lib/submission.mjs';
export const runtime='nodejs';
const reply=(body:object,status:number)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
const supa=(path:string,init:RequestInit={})=>fetch(`${process.env.SUPABASE_URL}/${path}`,{...init,headers:{apikey:process.env.SUPABASE_SECRET_KEY!,...(init.headers||{})}});
function coordinates(value:string){const m=value.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);if(!m)return [null,null];const lat=Number(m[1]),lng=Number(m[2]);return lat>=-90&&lat<=90&&lng>=-180&&lng<=180?[lat,lng]:[null,null];}
export async function POST(request:NextRequest){
 const origin=request.headers.get('origin');if(!origin||new URL(origin).host!==new URL(request.url).host)return reply({error:'Submission origin could not be verified.'},403);
 const size=Number(request.headers.get('content-length'));if(size>MAX_BYTES+250000)return reply({error:'The submission is too large.'},413);
 try{
  const data=await request.formData();const kind=String(data.get('kind')||'');const {errors,photos}=validateSubmission(data);if(errors.length)return reply({error:errors[0]},400);
  for(const file of photos){const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());if(!imageSignatureMatches(bytes,file.type))return reply({error:'One photograph is not a supported image file.'},400);}
  if(kind!=='sighting'){
   if(process.env.FORMS_ENABLED!=='true'||!process.env.FORM_WEBHOOK_URL||!process.env.FORM_WEBHOOK_SECRET)return reply({error:'Contact submissions are temporarily unavailable.'},503);
   const endpoint=new URL(process.env.FORM_WEBHOOK_URL);if(endpoint.protocol!=='https:')return reply({error:'Submission delivery is not configured correctly.'},503);
   const reference=randomUUID();data.delete('website');data.set('reference',reference);data.set('receivedAt',new Date().toISOString());
   const response=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${process.env.FORM_WEBHOOK_SECRET}`,'Idempotency-Key':reference},body:data,signal:AbortSignal.timeout(15000),redirect:'error'});
   return response.ok?reply({reference},200):reply({error:'Your message could not be delivered. Please try again.'},502);
  }
  if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SECRET_KEY)return reply({error:'Sighting storage is temporarily unavailable.'},503);
  const text=(k:string)=>String(data.get(k)||'').trim();const [latitude,longitude]=coordinates(text('coordinates'));
  const ip=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'';
  const payload={observer_name:text('name'),observer_email:text('email')||null,sighting_date:text('date'),sighting_time:text('time')||null,location_description:text('location'),latitude,longitude,flamingo_count:Number(text('count')),bands_or_tags:text('bands')==='yes'?(text('bandDetails')||'Bands/tags visible'):text('bands'),behavior:text('behavior')||null,notes:text('notes')||null,consent_research:data.get('consent')==='on',consent_photo_use:data.get('outreach')==='on',source_ip_hash:ip?createHash('sha256').update(ip).digest('hex'):null,user_agent:(request.headers.get('user-agent')||'').slice(0,1000)};
  const created=await supa('rest/v1/sightings?select=id,reference_no',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(payload)});
  if(!created.ok){console.error('Supabase sighting insert failed',created.status,await created.text());return reply({error:'Your sighting could not be saved. Please try again.'},502);}
  const [sighting]=await created.json();const uploaded:string[]=[];
  try{
   for(let i=0;i<photos.length;i++){const file=photos[i];const ext=file.type==='image/jpeg'?'jpg':file.type==='image/png'?'png':file.type==='image/webp'?'webp':file.type==='image/heic'?'heic':'heif';const path=`${sighting.id}/${String(i+1).padStart(2,'0')}-${randomUUID()}.${ext}`;const bytes=Buffer.from(await file.arrayBuffer());
    const up=await supa(`storage/v1/object/sighting-photos/${path}`,{method:'POST',headers:{'Content-Type':file.type,'x-upsert':'false'},body:bytes});if(!up.ok){console.error('Supabase photo upload failed',up.status,await up.text());throw new Error('photo upload failed');}uploaded.push(path);
    const meta=await supa('rest/v1/sighting_photos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sighting_id:sighting.id,storage_path:path,original_filename:file.name.slice(0,500),mime_type:file.type,size_bytes:file.size})});if(!meta.ok){console.error('Supabase photo metadata failed',meta.status,await meta.text());throw new Error('photo metadata failed');}
   }
  }catch{for(const path of uploaded)await supa(`storage/v1/object/sighting-photos/${path}`,{method:'DELETE'});await supa(`rest/v1/sightings?id=eq.${sighting.id}`,{method:'DELETE'});return reply({error:'Your photos could not be stored, so the sighting was not submitted. Please try again.'},502);}
  return reply({reference:`FFWG-${new Date().getFullYear()}-${String(sighting.reference_no).padStart(5,'0')}`},200);
 }catch{return reply({error:'Your submission could not be saved. Please check your entries and try again.'},502);}
}