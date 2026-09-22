'use client';
import {useMemo,useRef,useState} from 'react';

type GeoMatch={label:string;latitude:number;longitude:number};

function mapEmbed(match:GeoMatch){
 const pad=.08;
 const left=match.longitude-pad,right=match.longitude+pad,bottom=match.latitude-pad,top=match.latitude+pad;
 return 'https://www.openstreetmap.org/export/embed.html?bbox='+encodeURIComponent([left,bottom,right,top].join(','))+'&layer=mapnik&marker='+encodeURIComponent(match.latitude+','+match.longitude);
}

export default function SubmissionForm({kind,live}:{kind:'sighting'|'contact';live:boolean}){
 const sighting=kind==='sighting';
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [done,setDone]=useState(false);
 const [photos,setPhotos]=useState<string[]>([]);
 const [geo,setGeo]=useState('');
 const [reference,setReference]=useState('');
 const [location,setLocation]=useState('');
 const [locationSearching,setLocationSearching]=useState(false);
 const [locationMatches,setLocationMatches]=useState<GeoMatch[]>([]);
 const [selectedMatch,setSelectedMatch]=useState<GeoMatch|null>(null);
 const [locationConfirmed,setLocationConfirmed]=useState(false);
 const form=useRef<HTMLFormElement>(null);
 const coords=useRef<HTMLInputElement>(null);
 const currentUrl=`https://floridaflamingowg.org/${sighting?'report-a-flamingo-sighting':'contact-us'}/`;
 const mapUrl=useMemo(()=>selectedMatch?mapEmbed(selectedMatch):'',[selectedMatch]);

 function clearLocationConfirmation(){
  setLocationConfirmed(false);
  setSelectedMatch(null);
  setLocationMatches([]);
  if(coords.current)coords.current.value='';
 }

 async function findLocation(){
  const query=location.trim();
  if(!query){setError('Enter the sighting location first.');return;}
  setLocationSearching(true);setError('');setGeo('');
  try{
   const res=await fetch('/api/geocode?q='+encodeURIComponent(query),{headers:{Accept:'application/json'}});
   const data=await res.json();
   if(!res.ok)throw new Error(data.error||'Unable to search for that location.');
   const matches=(data.matches||[]) as GeoMatch[];
   if(!matches.length){setLocationMatches([]);setSelectedMatch(null);setLocationConfirmed(false);setGeo('We could not find that place. Try a nearby landmark, waterbody, park, or town.');return;}
   setLocationMatches(matches);setSelectedMatch(matches[0]);setLocationConfirmed(false);
   if(coords.current)coords.current.value='';
   setGeo(matches.length===1?'We found a possible location. Please confirm the pin below.':'Choose the best match below, then confirm the pin.');
  }catch(e){setGeo('');setError(e instanceof Error?e.message:'Unable to search for that location.');}
  finally{setLocationSearching(false);}
 }

 function chooseMatch(match:GeoMatch){
  setSelectedMatch(match);setLocationConfirmed(false);
  if(coords.current)coords.current.value='';
 }

 function confirmLocation(){
  if(!selectedMatch)return;
  if(coords.current)coords.current.value=`${selectedMatch.latitude.toFixed(6)}, ${selectedMatch.longitude.toFixed(6)}`;
  setLocationConfirmed(true);
  setGeo('Location confirmed. Exact coordinates will stay private; the public map uses an approximate location.');
 }

 function locate(){
  if(!navigator.geolocation){setGeo('Location is unavailable. Enter the location and use Find on map.');return;}
  setGeo('Requesting your current location…');setError('');
  navigator.geolocation.getCurrentPosition(p=>{
   const match={label:'Current device location',latitude:p.coords.latitude,longitude:p.coords.longitude};
   setSelectedMatch(match);setLocationMatches([match]);setLocationConfirmed(false);
   if(coords.current)coords.current.value='';
   setGeo('Current location found. Please confirm the pin below.');
  },()=>setGeo('Location could not be retrieved. Enter the location and use Find on map.'),{timeout:10000,maximumAge:0,enableHighAccuracy:false});
 }

 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setError('');
  if(sighting&&!locationConfirmed){setError('Please find and confirm the sighting location on the map before submitting.');return;}
  setBusy(true);
  const data=new FormData(e.currentTarget);
  const files=data.getAll('photos').filter((x):x is File=>x instanceof File&&x.size>0);
  if(files.length>3||files.some(f=>f.size>20*1024*1024)||files.some(f=>!['image/jpeg','image/png','image/webp','image/heic','image/heif'].includes(f.type))){setError('Choose up to 3 JPG, PNG, WebP, HEIC, or HEIF photos, up to 20 MB each.');setBusy(false);return;}
  if(!live){setDone(true);setBusy(false);return;}
  try{
   data.set('kind',kind);
   const endpoint=sighting?'https://umvxpiswwxsvfotuylin.supabase.co/functions/v1/submit-sighting':'https://umvxpiswwxsvfotuylin.supabase.co/functions/v1/submit-contact';
   const res=await fetch(endpoint,{method:'POST',body:data});
   const result=await res.json();
   if(!res.ok)throw new Error(result.error||'Your message could not be delivered. Please try again.');
   setReference(result.reference);setDone(true);
  }catch(e){setError(e instanceof Error?e.message:'Unable to deliver your submission. Please try again.');}
  finally{setBusy(false);}
 }

 if(done)return <div className="form-success" role="status" tabIndex={-1}><span className="success-mark" aria-hidden="true">✓</span><p className="eyebrow">{live?'SUBMISSION RECEIVED':'PREVIEW COMPLETE'}</p><h2>{live?'Thank you for contributing.':'Your test is complete.'}</h2><p>{live?`Your ${sighting?'sighting report':'message'} has been securely saved to the Florida Flamingo Working Group ${sighting?'sightings database':'inquiry inbox'}. Reference: ${reference}.`:'This was a demonstration. Nothing was sent or saved, and no photographs were uploaded.'}</p>{!live&&<a className="text-link" href={currentUrl}>{sighting?'Submit a real sighting on the current website':'Send a real inquiry on the current website'} ↗</a>}<button className="button navy" onClick={()=>{setDone(false);setPhotos([]);setGeo('');setLocation('');clearLocationConfirmation();}}>{live?'Start another submission':'Return to the form'}</button></div>;

 return <form ref={form} className="submission-form" onSubmit={submit} encType="multipart/form-data">
  {!live&&<div className="form-notice"><strong>Review mode — nothing is sent.</strong><p>You can try the form and its confirmation screen. For an actual {sighting?'sighting':'inquiry'}, <a href={currentUrl}>use the current FFWG website</a>.</p></div>}
  <p className="required-note">Fields marked * are required.</p>
  <fieldset><legend>{sighting?'1. About you':'Your details'}</legend><div className="field-grid"><label>Your name *<input name="name" autoComplete="name" required maxLength={120}/></label><label>Email{sighting?' (optional)':' *'}<input name="email" type="email" autoComplete="email" required={!sighting} maxLength={254}/></label></div></fieldset>

  {sighting?<><fieldset><legend>2. Your observation</legend>
   <div className="field-grid">
    <label>Date of sighting *<input name="date" type="date" max={new Date().toISOString().slice(0,10)} required/></label>
    <label>Local time (optional)<input name="time" type="time"/></label>
    <label className="full">Location *<input name="location" value={location} onChange={e=>{setLocation(e.target.value);clearLocationConfirmation();}} required maxLength={500} placeholder="Nearest landmark, waterbody, park, or town"/></label>
   </div>
   <input ref={coords} name="coordinates" type="hidden"/>
   <div className="location-actions">
    <button type="button" className="button small" onClick={findLocation} disabled={locationSearching||!location.trim()}>{locationSearching?'Finding…':'Find on map'}</button>
    <button type="button" className="location-button" onClick={locate}>Use my current location</button>
   </div>
   <p className="field-help">For past sightings, enter the nearest known place and choose <strong>Find on map</strong>. If you are still at the sighting location, you can use your current location.</p>
   <p role="status" className="field-help">{geo}</p>

   {locationMatches.length>1&&<div className="location-results" aria-label="Location search results">{locationMatches.map((match,index)=><button type="button" key={match.label+index} className={selectedMatch===match?'location-result active':'location-result'} onClick={()=>chooseMatch(match)}><strong>{index+1}.</strong> {match.label}</button>)}</div>}
   {selectedMatch&&<div className={locationConfirmed?'location-confirmation confirmed':'location-confirmation'}>
    <div><strong>{locationConfirmed?'✓ Location confirmed':'Confirm this location'}</strong><p>{selectedMatch.label}</p></div>
    <iframe title="Map preview of the selected sighting location" src={mapUrl} loading="lazy"/>
    <div className="location-confirm-actions">
     {!locationConfirmed&&<button type="button" className="button small navy" onClick={confirmLocation}>Yes, use this location</button>}
     {locationConfirmed&&<button type="button" className="button small" onClick={()=>setLocationConfirmed(false)}>Change location</button>}
    </div>
    <p className="field-help">The confirmed coordinates are stored privately for research. The public sightings map does not display the exact point.</p>
   </div>}

   <div className="field-grid">
    <label>Number of flamingos *<input name="count" type="number" min="1" max="100000" step="1" inputMode="numeric" required/></label>
    <label>Were bands or tags visible?<select name="bands"><option value="unknown">Not sure / not observed</option><option value="yes">Yes</option><option value="no">No</option></select></label>
    <label className="full">Band colors, numbers, or tag details<input name="bandDetails" maxLength={1000}/></label>
    <label className="full">What were the birds doing?<input name="behavior" maxLength={1000} placeholder="For example: feeding, resting, or flying"/></label>
    <label className="full">Additional observations<textarea name="notes" rows={4} maxLength={5000}/></label>
   </div>
  </fieldset>
  <fieldset><legend>3. Photographs (optional)</legend><label className="upload-field">Add photographs<input name="photos" type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={e=>setPhotos(Array.from(e.target.files||[]).map(f=>f.name))}/></label><p className="field-help">Up to 3 JPG, PNG, WebP, HEIC, or HEIF images, up to 20 MB each. Do not approach birds to obtain a photograph.</p>{photos.length>0&&<ul className="file-list">{photos.map((p,i)=><li key={i}>{p}</li>)}</ul>}</fieldset>
  <fieldset><legend>4. Use of your report</legend><label className="checkbox"><input type="checkbox" name="consent" required/><span>I agree to the use of this report for research and conservation. My contact information will not be publicly shared, and exact locations will not be publicly disclosed without permission. *</span></label><label className="checkbox"><input type="checkbox" name="outreach"/><span>I also give permission to use the submitted information and photographs for education and outreach. (Optional)</span></label></fieldset>
  </>:<fieldset><legend>Your inquiry</legend><label>Topic<select name="topic"><option>General inquiry</option><option>Research collaboration</option><option>Media request</option><option>Education</option><option>Participation or volunteering</option><option>State bird campaign</option><option>Privacy request</option></select></label><label>Message *<textarea name="message" rows={7} required maxLength={5000}/></label><label className="checkbox"><input name="consent" type="checkbox" required/><span>I understand that my contact information will be used to respond to this inquiry. *</span></label></fieldset>}

  <div className="honeypot" aria-hidden="true"><label>Leave this field empty<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
  {error&&<p className="form-error" role="alert">{error}</p>}
  <button disabled={busy} type="submit" className="button navy">{busy?'Sending…':live?(sighting?'Submit sighting':'Send inquiry'):'Test the confirmation'} <span aria-hidden="true">↗</span></button>
  <p className="field-help">{live?(sighting?'Your sighting information is securely stored in the Florida Flamingo Working Group sightings system.':'Your inquiry is securely stored for authorized Working Group administrators.'):'Review mode does not send or store your entries.'} <a href="/privacy/">Privacy information</a></p>
 </form>;
}
