'use client';

import {useEffect,useRef,useState} from 'react';

declare global{interface Window{L?:any}}

type PublicSighting={
  sighting_date:string;
  flamingo_count:number;
  latitude:number;
  longitude:number;
};

const endpoint='https://umvxpiswwxsvfotuylin.supabase.co/functions/v1/public-sightings-map';
const leafletCss='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const leafletJs='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const formatDate=(value:string)=>new Date(value+'T12:00:00').toLocaleDateString();

async function ensureLeaflet(){
  if(window.L)return window.L;
  if(!document.querySelector('link[data-ffwg-leaflet]')){
    const link=document.createElement('link');link.rel='stylesheet';link.href=leafletCss;link.dataset.ffwgLeaflet='true';document.head.appendChild(link);
  }
  await new Promise<void>((resolve,reject)=>{
    const existing=document.querySelector('script[data-ffwg-leaflet]') as HTMLScriptElement|null;
    if(existing){if(window.L)resolve();else{existing.addEventListener('load',()=>resolve(),{once:true});existing.addEventListener('error',()=>reject(new Error('Unable to load map.')),{once:true});}return;}
    const script=document.createElement('script');script.src=leafletJs;script.async=true;script.dataset.ffwgLeaflet='true';script.onload=()=>resolve();script.onerror=()=>reject(new Error('Unable to load map.'));document.head.appendChild(script);
  });
  return window.L;
}

export default function PublicSightingsMap(){
  const container=useRef<HTMLDivElement|null>(null);
  const mapRef=useRef<any>(null);
  const [sightings,setSightings]=useState<PublicSighting[]>([]);
  const [selected,setSelected]=useState<PublicSighting|null>(null);
  const [error,setError]=useState('');
  const [ready,setReady]=useState(false);

  useEffect(()=>{
    let cancelled=false;
    Promise.all([
      fetch(endpoint,{headers:{Accept:'application/json'}}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||'Unable to load sightings.');return data.sightings as PublicSighting[];}),
      ensureLeaflet()
    ]).then(([rows,L])=>{
      if(cancelled||!container.current)return;
      setSightings(rows);
      const map=L.map(container.current,{zoomControl:true,scrollWheelZoom:true});
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
      const bounds:any[]=[];
      rows.forEach(sighting=>{
        const marker=L.circleMarker([sighting.latitude,sighting.longitude],{radius:9,color:'#102e35',weight:2,fillColor:'#f79781',fillOpacity:.9});
        marker.bindTooltip('Approximate location');
        marker.on('click',()=>setSelected(sighting));
        marker.addTo(map);
        bounds.push([sighting.latitude,sighting.longitude]);
      });
      if(bounds.length===1)map.setView(bounds[0],10);
      else if(bounds.length>1)map.fitBounds(bounds,{padding:[35,35],maxZoom:10});
      else map.setView([27.7,-81.7],6);
      mapRef.current=map;setReady(true);
    }).catch(reason=>setError(reason instanceof Error?reason.message:'Unable to load the sightings map.'));
    return()=>{cancelled=true;if(mapRef.current){mapRef.current.remove();mapRef.current=null;}};
  },[]);

  return <div className="public-map">
    <div className="public-map-summary"><strong>{sightings.length}</strong> verified mapped sighting{sightings.length===1?'':'s'}</div>
    {error&&<div className="form-error">{error}</div>}
    <div className="public-map-layout">
      <div ref={container} className="public-map-canvas" aria-label="Map of approximate verified flamingo sighting locations">{!ready&&!error&&<span>Loading map…</span>}</div>
      <aside className="public-map-card">{selected?<><p className="eyebrow">SIGHTING</p><h2>Approximate location</h2><dl><dt>Date</dt><dd>{formatDate(selected.sighting_date)}</dd><dt>Flamingos</dt><dd>{selected.flamingo_count}</dd></dl></>:<div className="admin-empty">Select a pin to see the sighting summary.</div>}</aside>
    </div>
    <p className="public-map-note">Approximate location</p>
  </div>;
}
