import {createClient} from "npm:@supabase/supabase-js@2.95.0";
import {shiftedCoordinate} from "./privacy.mjs";

const corsHeaders={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"content-type",
  "Access-Control-Allow-Methods":"GET, OPTIONS"
};
const reply=(body:object,status=200)=>Response.json(body,{status,headers:{
  ...corsHeaders,
  "Cache-Control":"public, max-age=300, s-maxage=300",
  "X-Content-Type-Options":"nosniff"
}});

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:corsHeaders});
  if(req.method!=="GET")return reply({error:"Method not allowed."},405);
  try{
    const url=Deno.env.get("SUPABASE_URL");
    const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!url||!serviceKey)throw new Error("Missing server configuration.");
    const supabase=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data,error}=await supabase
      .from("sightings")
      .select("id,sighting_date,flamingo_count,latitude,longitude")
      .eq("status","verified")
      .not("latitude","is",null)
      .not("longitude","is",null)
      .order("sighting_date",{ascending:false})
      .limit(1000);
    if(error)throw error;
    const sightings=await Promise.all((data||[]).map(async(row)=>{
      const approximate=await shiftedCoordinate(row.id,Number(row.latitude),Number(row.longitude),serviceKey);
      return {
        sighting_date:row.sighting_date,
        flamingo_count:row.flamingo_count,
        latitude:approximate.latitude,
        longitude:approximate.longitude
      };
    }));
    return reply({sightings});
  }catch(error){
    console.error("public sightings map error",error);
    return reply({error:"The sightings map is temporarily unavailable."},500);
  }
});
