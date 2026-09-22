import {NextRequest,NextResponse} from 'next/server';

export const runtime='nodejs';

type NominatimResult={display_name?:string;lat?:string;lon?:string;type?:string;class?:string};

function searchQueries(value:string){
  const query=value.trim().replace(/\s+/g,' ');
  const directional=query.match(/^(?:north|south|east|west|northeast|northwest|southeast|southwest)\s+of\s+(.+?)(?:\s+in\s+(.+))?$/i);
  if(directional){
    const place=directional[1].trim();
    const context=directional[2]?.trim();
    return [
      context?place+', '+context+', Florida, USA':place+', Florida, USA',
      place+', Florida, USA'
    ];
  }
  return [query+', Florida, USA',query];
}

export async function GET(request:NextRequest){
  const query=(request.nextUrl.searchParams.get('q')||'').trim();
  if(query.length<2||query.length>500)return NextResponse.json({error:'Enter a location to search.'},{status:400});
  try{
    for(const candidate of searchQueries(query)){
      const url='https://nominatim.openstreetmap.org/search?format=jsonv2&limit=3&countrycodes=us&q='+encodeURIComponent(candidate);
      const response=await fetch(url,{
        headers:{
          Accept:'application/json',
          'User-Agent':'Florida Flamingo Working Group website geocoder (https://floridaflamingowg.org)'
        },
        cache:'no-store',
        signal:AbortSignal.timeout(8000)
      });
      if(!response.ok)continue;
      const results=await response.json() as NominatimResult[];
      const matches=(Array.isArray(results)?results:[]).map(result=>({
        label:String(result.display_name||candidate),
        latitude:Number(result.lat),
        longitude:Number(result.lon)
      })).filter(result=>Number.isFinite(result.latitude)&&Number.isFinite(result.longitude));
      if(matches.length)return NextResponse.json({matches},{headers:{'Cache-Control':'no-store'}});
    }
    return NextResponse.json({matches:[]},{headers:{'Cache-Control':'no-store'}});
  }catch{
    return NextResponse.json({error:'Location search is temporarily unavailable.'},{status:502});
  }
}
