import {NextRequest,NextResponse} from 'next/server';

export const runtime='nodejs';
const endpoint='https://umvxpiswwxsvfotuylin.supabase.co/functions/v1/admin-api';

export async function POST(request:NextRequest){
  const auth=request.headers.get('authorization');
  if(!auth)return NextResponse.json({error:'Sign in required.'},{status:401});
  try{
    const body=await request.text();
    const res=await fetch(endpoint,{
      method:'POST',
      headers:{Authorization:auth,'Content-Type':'application/json'},
      body,
      cache:'no-store'
    });
    const text=await res.text();
    return new NextResponse(text,{status:res.status,headers:{'Content-Type':res.headers.get('content-type')||'application/json','Cache-Control':'no-store'}});
  }catch{
    return NextResponse.json({error:'Admin service is unavailable.'},{status:502});
  }
}
