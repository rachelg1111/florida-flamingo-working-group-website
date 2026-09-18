import {NextRequest,NextResponse} from 'next/server';

export const runtime='nodejs';
const reply=(body:object,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});

function allowedRedirect(value:string){
  try{
    const u=new URL(value);
    if(u.protocol!=='https:')return null;
    if(u.hostname==='floridaflamingowg.org'||u.hostname==='www.floridaflamingowg.org')return u.origin+'/admin';
    if(u.hostname.endsWith('-rachel-michelles-projects.vercel.app'))return u.origin+'/admin';
    return null;
  }catch{return null;}
}

export async function POST(request:NextRequest){
  try{
    if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SECRET_KEY)return reply({ok:true});
    const body=await request.json();
    const email=String(body.email||'').trim().toLowerCase();
    const redirectTo=allowedRedirect(String(body.redirectTo||''));
    if(!email||!redirectTo)return reply({ok:true});

    const allowed=await fetch(process.env.SUPABASE_URL+'/rest/v1/admin_allowlist?select=email&email=eq.'+encodeURIComponent(email)+'&active=eq.true',{
      headers:{apikey:process.env.SUPABASE_SECRET_KEY,Authorization:'Bearer '+process.env.SUPABASE_SECRET_KEY},
      cache:'no-store'
    });
    if(!allowed.ok)return reply({ok:true});
    const rows=await allowed.json();
    if(!Array.isArray(rows)||rows.length===0)return reply({ok:true});

    const otp=await fetch(process.env.SUPABASE_URL+'/auth/v1/otp?redirect_to='+encodeURIComponent(redirectTo),{
      method:'POST',
      headers:{apikey:process.env.SUPABASE_SECRET_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({email,create_user:true}),
      cache:'no-store'
    });
    if(!otp.ok)console.error('Admin sign-in email failed',otp.status,await otp.text());
    return reply({ok:true});
  }catch{
    return reply({ok:true});
  }
}
