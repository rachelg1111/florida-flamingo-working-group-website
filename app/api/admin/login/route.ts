import {NextRequest,NextResponse} from 'next/server';

export const runtime='nodejs';
const reply=(body:object,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});

export async function POST(request:NextRequest){
  try{
    const body=await request.text();
    const response=await fetch('https://umvxpiswwxsvfotuylin.supabase.co/functions/v1/admin-login',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body,
      cache:'no-store'
    });
    const text=await response.text();
    return new NextResponse(text,{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  }catch{
    return reply({ok:false},502);
  }
}
