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
      .select("id,sighting_date,location_description,flamingo_count,latitude,longitude,consent_photo_use,sighting_photos(storage_path)")
      .eq("status","verified")
      .order("sighting_date",{ascending:false})
      .limit(1000);
    if(error)throw error;

    const photoPaths=(data||[])
      .filter(row=>row.consent_photo_use)
      .flatMap(row=>(row.sighting_photos||[]).map((photo:{storage_path:string})=>photo.storage_path))
      .filter(Boolean);
    const signedByPath=new Map<string,string>();
    if(photoPaths.length){
      const {data:signed,error:signedError}=await supabase.storage.from("sighting-photos").createSignedUrls(photoPaths,3600);
      if(signedError)throw signedError;
      (signed||[]).forEach((item:{path?:string;signedUrl?:string})=>{
        if(item.path&&item.signedUrl)signedByPath.set(item.path,item.signedUrl);
      });
    }

    async function geocodeLocation(description:string){
      const query=description.trim();
      if(!query)return null;
      const simplified=query
        .replace(/^(north|south|east|west|northeast|northwest|southeast|southwest)\\s+of\\s+/i,"")
        .replace(/\\s+in\\s+(Everglades National Park).*$/i,", $1")
        .trim();
      const placeBeforeIn=query.match(/(?:north|south|east|west|northeast|northwest|southeast|southwest)\\s+of\\s+(.+?)\\s+in\\s+/i)?.[1]?.trim();
      const queries=[
        query,
        query+", Florida, USA",
        simplified,
        simplified+", Florida, USA",
        placeBeforeIn?placeBeforeIn+", Everglades National Park, Florida, USA":"",
        placeBeforeIn?placeBeforeIn+", Florida, USA":"",
        placeBeforeIn||""
      ].filter((q,index,list)=>q&&list.indexOf(q)===index);
      for(const q of queries){
        const endpoint="https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=us&q="+encodeURIComponent(q);
        const res=await fetch(endpoint,{headers:{"User-Agent":"Florida Flamingo Working Group sightings map (floridaflamingowg.org)","Accept":"application/json"}});
        if(!res.ok)continue;
        const matches=await res.json();
        if(Array.isArray(matches)&&matches[0]){
          const latitude=Number(matches[0].lat),longitude=Number(matches[0].lon);
          if(Number.isFinite(latitude)&&Number.isFinite(longitude))return {latitude,longitude};
        }
      }
      return null;
    }

    const sightings=(await Promise.all((data||[]).map(async(row)=>{
      const hasExact=row.latitude!==null&&row.longitude!==null&&Number.isFinite(Number(row.latitude))&&Number.isFinite(Number(row.longitude));
      const base=hasExact
        ?{latitude:Number(row.latitude),longitude:Number(row.longitude)}
        :await geocodeLocation(row.location_description||"");
      if(!base)return null;
      const approximate=await shiftedCoordinate(row.id,base.latitude,base.longitude,serviceKey);
      return {
        sighting_date:row.sighting_date,
        flamingo_count:row.flamingo_count,
        latitude:approximate.latitude,
        longitude:approximate.longitude,
        photos:row.consent_photo_use
          ?(row.sighting_photos||[]).map((photo:{storage_path:string})=>signedByPath.get(photo.storage_path)).filter(Boolean)
          :[],
        location_source:hasExact?"submitted_coordinates":"location_description"
      };
    }))).filter(Boolean);
    return reply({sightings});
  }catch(error){
    console.error("public sightings map error",error);
    return reply({error:"The sightings map is temporarily unavailable."},500);
  }
});
