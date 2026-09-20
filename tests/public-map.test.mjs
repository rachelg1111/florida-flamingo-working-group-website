import test from 'node:test';
import assert from 'node:assert/strict';
import {shiftedCoordinate} from '../supabase/functions/public-sightings-map/privacy.mjs';

function distanceMeters(a,b){
  const toRad=value=>value*Math.PI/180;
  const dLat=toRad(b.latitude-a.latitude),dLon=toRad(b.longitude-a.longitude);
  const lat1=toRad(a.latitude),lat2=toRad(b.latitude);
  const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
  return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}

test('public coordinate is stable and approximately one mile from the exact point',async()=>{
  const exact={latitude:28.7060278,longitude:-80.8180694};
  const first=await shiftedCoordinate('sighting-one',exact.latitude,exact.longitude,'test-secret');
  const second=await shiftedCoordinate('sighting-one',exact.latitude,exact.longitude,'test-secret');
  assert.deepEqual(first,second);
  assert.ok(Math.abs(distanceMeters(exact,first)-1609.344)<1);
});

test('different sighting ids produce different directions',async()=>{
  const first=await shiftedCoordinate('sighting-one',28.7060278,-80.8180694,'test-secret');
  const second=await shiftedCoordinate('sighting-two',28.7060278,-80.8180694,'test-secret');
  assert.notDeepEqual(first,second);
});
