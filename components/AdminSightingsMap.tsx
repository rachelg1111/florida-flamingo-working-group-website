'use client';

import {useEffect,useMemo,useRef,useState} from 'react';

declare global {
  interface Window { L?: any }
}

type Sighting={
  id:string;
  reference_no:number|null;
  sighting_date:string;
  sighting_time:string|null;
  location_description:string;
  latitude:number|null;
  longitude:number|null;
  flamingo_count:number;
  bands_or_tags:string|null;
  behavior:string|null;
  notes:string|null;
  status:string;
  source:string;
  observer_name:string;
  sighting_photos?:Array<{id:string}>;
};

type Props={
  sightings:Sighting[];
  onOpenRecord:(id:string)=>void;
};

const leafletCss='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const leafletJs='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

function sourceLabel(v:string){return v==='website'?'Website':v==='spreadsheet_import'?'Spreadsheet':'Manual';}
function statusLabel(v:string){return v.charAt(0).toUpperCase()+v.slice(1).replace('_',' ');}
function formatDate(v:string){try{return new Date(v+'T12:00:00').toLocaleDateString();}catch{return v}}

async function ensureLeaflet(){
  if(window.L)return window.L;
  if(!document.querySelector('link[data-ffwg-leaflet]')){
    const link=document.createElement('link');
    link.rel='stylesheet';link.href=leafletCss;link.dataset.ffwgLeaflet='true';
    document.head.appendChild(link);
  }
  await new Promise<void>((resolve,reject)=>{
    const existing=document.querySelector('script[data-ffwg-leaflet]') as HTMLScriptElement|null;
    if(existing){
      if(window.L){resolve();return;}
      existing.addEventListener('load',()=>resolve(),{once:true});
      existing.addEventListener('error',()=>reject(new Error('Unable to load map library.')),{once:true});
      return;
    }
    const script=document.createElement('script');
    script.src=leafletJs;script.async=true;script.dataset.ffwgLeaflet='true';
    script.onload=()=>resolve();script.onerror=()=>reject(new Error('Unable to load map library.'));
    document.head.appendChild(script);
  });
  return window.L;
}

export default function AdminSightingsMap({sightings,onOpenRecord}:Props){
  const container=useRef<HTMLDivElement|null>(null);
  const mapRef=useRef<any>(null);
  const layerRef=useRef<any>(null);
  const [ready,setReady]=useState(false);
  const [error,setError]=useState('');
  const [selected,setSelected]=useState<Sighting|null>(null);
  const [dateFrom,setDateFrom]=useState('');
  const [dateTo,setDateTo]=useState('');
  const [status,setStatus]=useState('');
  const [source,setSource]=useState('');
  const [minimumBirds,setMinimumBirds]=useState('');
  const [bandsOnly,setBandsOnly]=useState(false);

  const mappable=useMemo(()=>sightings.filter(s=>Number.isFinite(s.latitude)&&Number.isFinite(s.longitude)),[sightings]);
  const filtered=useMemo(()=>mappable.filter(s=>{
    if(dateFrom&&s.sighting_date<dateFrom)return false;
    if(dateTo&&s.sighting_date>dateTo)return false;
    if(status&&s.status!==status)return false;
    if(source&&s.source!==source)return false;
    const min=minimumBirds?Number(minimumBirds):0;
    if(min&&s.flamingo_count<min)return false;
    if(bandsOnly&&!s.bands_or_tags?.toLowerCase().includes('yes')&&!s.bands_or_tags?.toLowerCase().includes('band'))return false;
    return true;
  }),[mappable,dateFrom,dateTo,status,source,minimumBirds,bandsOnly]);

  useEffect(()=>{
    let cancelled=false;
    ensureLeaflet().then(L=>{
      if(cancelled||!container.current)return;
      const map=L.map(container.current,{zoomControl:true,scrollWheelZoom:true});
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxZoom:19,
        attribution:'&copy; OpenStreetMap contributors'
      }).addTo(map);
      const layer=L.layerGroup().addTo(map);
      mapRef.current=map;layerRef.current=layer;
      map.setView([27.7,-81.7],6);
      setReady(true);
    }).catch(e=>setError(e instanceof Error?e.message:'Unable to load map.'));
    return ()=>{cancelled=true;if(mapRef.current){mapRef.current.remove();mapRef.current=null;layerRef.current=null;}};
  },[]);

  useEffect(()=>{
    const L=window.L,map=mapRef.current,layer=layerRef.current;
    if(!ready||!L||!map||!layer)return;
    layer.clearLayers();
    const bounds:any[]=[];
    filtered.forEach(s=>{
      const lat=s.latitude as number,lng=s.longitude as number;
      const marker=L.circleMarker([lat,lng],{
        radius:Math.min(13,7+Math.log2(Math.max(1,s.flamingo_count))),
        weight:2,
        opacity:1,
        fillOpacity:.82
      });
      marker.bindTooltip(`${formatDate(s.sighting_date)} · ${s.flamingo_count} flamingo${s.flamingo_count===1?'':'s'}`);
      marker.on('click',()=>setSelected(s));
      marker.addTo(layer);bounds.push([lat,lng]);
    });
    if(bounds.length===1)map.setView(bounds[0],11);
    else if(bounds.length>1)map.fitBounds(bounds,{padding:[35,35],maxZoom:11});
    else map.setView([27.7,-81.7],6);
  },[filtered,ready]);

  return <div className="admin-map-section">
    <div className="admin-map-toolbar">
      <label>From<input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/></label>
      <label>To<input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}/></label>
      <label>Status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option>{['new','reviewing','verified','unverified','duplicate','archived'].map(v=><option value={v} key={v}>{statusLabel(v)}</option>)}</select></label>
      <label>Source<select value={source} onChange={e=>setSource(e.target.value)}><option value="">All sources</option><option value="website">Website</option><option value="spreadsheet_import">Spreadsheet</option><option value="manual_admin">Manual</option></select></label>
      <label>Minimum birds<input type="number" min="1" value={minimumBirds} onChange={e=>setMinimumBirds(e.target.value)} placeholder="Any"/></label>
      <label className="admin-map-check"><input type="checkbox" checked={bandsOnly} onChange={e=>setBandsOnly(e.target.checked)}/><span>Bands/tags only</span></label>
    </div>

    <div className="admin-map-summary"><strong>{filtered.length}</strong> mapped sighting{filtered.length===1?'':'s'} <span>· {mappable.length} with coordinates · {sightings.length-mappable.length} without coordinates</span></div>
    {error&&<div className="form-error">{error}</div>}
    <div className="admin-map-layout">
      <div ref={container} className="admin-map-canvas" aria-label="Private interactive map of flamingo sightings"/>
      <aside className="admin-map-card">
        {selected?<><p className="eyebrow">MAP SELECTION</p><h2>{selected.reference_no?'FFWG-'+new Date().getFullYear()+'-'+String(selected.reference_no).padStart(5,'0'):'Imported record'}</h2><dl><dt>Date</dt><dd>{formatDate(selected.sighting_date)} {selected.sighting_time||''}</dd><dt>Location</dt><dd>{selected.location_description}</dd><dt>Coordinates</dt><dd>{selected.latitude}, {selected.longitude}</dd><dt>Flamingos</dt><dd>{selected.flamingo_count}</dd><dt>Status</dt><dd>{statusLabel(selected.status)}</dd><dt>Source</dt><dd>{sourceLabel(selected.source)}</dd><dt>Bands / tags</dt><dd>{selected.bands_or_tags||'—'}</dd><dt>Behavior</dt><dd>{selected.behavior||'—'}</dd><dt>Photos</dt><dd>{selected.sighting_photos?.length||0}</dd></dl><button className="button navy" onClick={()=>onOpenRecord(selected.id)}>Open full record</button></>:<div className="admin-empty">Click a map marker to see the sighting summary.</div>}
      </aside>
    </div>
    <p className="admin-map-privacy"><strong>Private research view.</strong> Exact coordinates are shown only to authorized dashboard members and are not published on the public website.</p>
  </div>;
}
