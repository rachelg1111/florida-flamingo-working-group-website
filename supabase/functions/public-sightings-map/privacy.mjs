const EARTH_RADIUS_METERS=6371000;
const PUBLIC_OFFSET_METERS=1609.344;

function radians(value){return value*Math.PI/180;}
function degrees(value){return value*180/Math.PI;}

export async function shiftedCoordinate(id,latitude,longitude,secret){
  const key=await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    {name:'HMAC',hash:'SHA-256'},
    false,
    ['sign']
  );
  const signature=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(id)));
  const bearing=((signature[0]*256+signature[1])/65536)*Math.PI*2;
  const angularDistance=PUBLIC_OFFSET_METERS/EARTH_RADIUS_METERS;
  const lat1=radians(latitude),lon1=radians(longitude);
  const lat2=Math.asin(
    Math.sin(lat1)*Math.cos(angularDistance)+
    Math.cos(lat1)*Math.sin(angularDistance)*Math.cos(bearing)
  );
  const lon2=lon1+Math.atan2(
    Math.sin(bearing)*Math.sin(angularDistance)*Math.cos(lat1),
    Math.cos(angularDistance)-Math.sin(lat1)*Math.sin(lat2)
  );
  return {
    latitude:Number(degrees(lat2).toFixed(6)),
    longitude:Number((((degrees(lon2)+540)%360)-180).toFixed(6))
  };
}
