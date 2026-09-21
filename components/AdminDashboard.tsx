'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import AdminSightingsMap from '@/components/AdminSightingsMap';

declare global {
  interface Window { XLSX?: any }
}

const SUPABASE_URL='https://umvxpiswwxsvfotuylin.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_CIn4aVJKOl4GZ1_kcxe2eg_1o1WHBjf';
const ACCESS_KEY='ffwg_admin_access';
const REFRESH_KEY='ffwg_admin_refresh';
const EDITOR_ENDPOINT=SUPABASE_URL+'/functions/v1/admin-sighting-editor';

type AdminInfo={email:string;role:'owner'|'admin'|'reviewer'};
type Photo={id:string;storage_path:string;original_filename:string;mime_type:string;size_bytes:number};
type Sighting={
  id:string;reference_no:number|null;submitted_at:string;observer_name:string;observer_email:string|null;
  sighting_date:string;sighting_time:string|null;location_description:string;latitude:number|null;longitude:number|null;
  flamingo_count:number;bands_or_tags:string|null;behavior:string|null;notes:string|null;consent_research:boolean;
  consent_photo_use:boolean;status:string;internal_notes:string|null;source:string;legacy_id:string|null;import_batch_id:string|null;
  sighting_photos:Photo[];
};
type ImportBatch={
  id:string;filename:string;source_label:string|null;imported_by:string;created_at:string;completed_at:string|null;
  status:string;rows_total:number;rows_valid:number;rows_imported:number;rows_rejected:number;
};
type AdminMember={email:string;role:'owner'|'admin'|'reviewer';active:boolean;added_at:string};
type ContactInquiry={id:string;reference_no:number;submitted_at:string;name:string;email:string;topic:string;message:string;status:'new'|'reviewing'|'responded'|'closed'|'spam';internal_notes:string|null};

const fields=[
  ['sighting_date','Sighting date *'],['location_description','Location *'],['flamingo_count','Flamingo count *'],
  ['sighting_time','Local time'],['latitude','Latitude'],['longitude','Longitude'],['bands_or_tags','Bands / tags'],
  ['behavior','Behavior'],['notes','Notes'],['observer_name','Observer name'],['observer_email','Observer email'],['legacy_id','Legacy ID']
] as const;

function parseCsv(text:string){
  const out:string[][]=[];let row:string[]=[];let cell='';let quote=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(quote){
      if(ch==='"'&&text[i+1]==='"'){cell+='"';i++;}
      else if(ch==='"')quote=false;
      else cell+=ch;
    }else{
      if(ch==='"')quote=true;
      else if(ch===','){row.push(cell);cell='';}
      else if(ch==='\n'){row.push(cell.replace(/\r$/,''));out.push(row);row=[];cell='';}
      else cell+=ch;
    }
  }
  row.push(cell.replace(/\r$/,''));if(row.some(v=>v!==''))out.push(row);
  return out;
}
function normalizeHeader(s:string){return s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function guessMapping(headers:string[]){
  const synonyms:Record<string,string[]>={
    sighting_date:['date','sighting date','observation date','observed date'],
    location_description:['location','place','site','sighting location','observation location'],
    flamingo_count:['count','number','number of flamingos','birds','flamingos'],
    sighting_time:['time','local time','sighting time'],
    latitude:['latitude','lat'],longitude:['longitude','lon','lng','long'],
    bands_or_tags:['bands','tags','band tag','band or tag','bands or tags'],
    behavior:['behavior','behaviour','activity'],notes:['notes','comments','remarks','observation notes'],
    observer_name:['observer','observer name','name'],observer_email:['email','observer email','contact email'],
    legacy_id:['id','legacy id','record id','sighting id']
  };
  const map:Record<string,number>={};
  headers.forEach((h,i)=>{
    const n=normalizeHeader(h);
    for(const [key,vals] of Object.entries(synonyms))if(map[key]===undefined&&vals.includes(n))map[key]=i;
  });
  return map;
}
function fmtDate(v:string){try{return new Date(v+'T12:00:00').toLocaleDateString();}catch{return v}}
function sourceLabel(v:string){return v==='website'?'Website':v==='spreadsheet_import'?'Spreadsheet':'Manual';}
function statusLabel(v:string){return v.charAt(0).toUpperCase()+v.slice(1).replace('_',' ');}

export default function AdminDashboard(){
  const [admin,setAdmin]=useState<AdminInfo|null>(null);
  const [email,setEmail]=useState('');
  const [loginSent,setLoginSent]=useState(false);
  const [loginError,setLoginError]=useState('');
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState<'sightings'|'map'|'import'|'history'|'inquiries'|'users'>('sightings');
  const [rows,setRows]=useState<Sighting[]>([]);
  const [selected,setSelected]=useState<Sighting|null>(null);
  const [search,setSearch]=useState('');
  const [status,setStatus]=useState('');
  const [source,setSource]=useState('');
  const [imports,setImports]=useState<ImportBatch[]>([]);
  const [users,setUsers]=useState<AdminMember[]>([]);
  const [inquiries,setInquiries]=useState<ContactInquiry[]>([]);
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [photoFiles,setPhotoFiles]=useState<File[]>([]);
  const statusSelectRef=useRef<HTMLSelectElement>(null);

  const [fileName,setFileName]=useState('');
  const [headers,setHeaders]=useState<string[]>([]);
  const [sheetRows,setSheetRows]=useState<any[][]>([]);
  const [mapping,setMapping]=useState<Record<string,number>>({});
  const [sourceLabelText,setSourceLabelText]=useState('');
  const [validation,setValidation]=useState<any>(null);

  useEffect(()=>{
    const hash=new URLSearchParams(window.location.hash.replace(/^#/,''));
    const access=hash.get('access_token'),refresh=hash.get('refresh_token');
    if(access){localStorage.setItem(ACCESS_KEY,access);if(refresh)localStorage.setItem(REFRESH_KEY,refresh);history.replaceState(null,'',window.location.pathname);}
    checkSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  async function refreshSession(){
    const refresh=localStorage.getItem(REFRESH_KEY);if(!refresh)return null;
    const res=await fetch(SUPABASE_URL+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:refresh})});
    if(!res.ok)return null;const data=await res.json();localStorage.setItem(ACCESS_KEY,data.access_token);if(data.refresh_token)localStorage.setItem(REFRESH_KEY,data.refresh_token);return data.access_token as string;
  }
  async function api(action:string,payload:any={},retry=true){
    let token=localStorage.getItem(ACCESS_KEY);if(!token)throw new Error('Sign in required.');
    let res=await fetch('/api/admin',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action,...payload})});
    if(res.status===401&&retry){token=await refreshSession();if(token)return api(action,payload,false);}
    const data=await res.json();if(!res.ok)throw new Error(data.error||'Request failed.');return data;
  }
  async function editorApi(action:string,payload:any={},retry=true){
    let token=localStorage.getItem(ACCESS_KEY);if(!token)throw new Error('Sign in required.');
    let res=await fetch(EDITOR_ENDPOINT,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action,...payload})});
    if(res.status===401&&retry){token=await refreshSession();if(token)return editorApi(action,payload,false);}
    const data=await res.json();if(!res.ok)throw new Error(data.error||'Request failed.');return data;
  }
  async function uploadSelectedPhotos(retry=true){
    if(!selected||photoFiles.length===0)return;
    let token=localStorage.getItem(ACCESS_KEY);if(!token)throw new Error('Sign in required.');
    const form=new FormData();form.set('action','addPhotos');form.set('id',selected.id);photoFiles.forEach(file=>form.append('photos',file));
    const res=await fetch(EDITOR_ENDPOINT,{method:'POST',headers:{Authorization:'Bearer '+token},body:form});
    if(res.status===401&&retry){token=await refreshSession();if(token)return uploadSelectedPhotos(false);}
    const data=await res.json();if(!res.ok)throw new Error(data.error||'Photo upload failed.');
  }
  async function checkSession(){
    setLoading(true);
    try{const data=await api('me');setAdmin(data);await Promise.all([loadSightings(data),loadImports(data),data.role==='owner'?loadAdmins(data):Promise.resolve(),data.role!=='reviewer'?loadInquiries(data):Promise.resolve()]);}
    catch{localStorage.removeItem(ACCESS_KEY);localStorage.removeItem(REFRESH_KEY);setAdmin(null);}
    finally{setLoading(false);}
  }
  async function requestLogin(e:React.FormEvent){
    e.preventDefault();setLoginError('');setBusy(true);
    try{
      const redirect=window.location.origin+'/admin';
      const res=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email.trim().toLowerCase(),redirectTo:redirect})});
      if(!res.ok)throw new Error('Unable to send sign-in link.');
      setLoginSent(true);
    }catch(e){setLoginError(e instanceof Error?e.message:'Unable to send sign-in link.');}
    finally{setBusy(false);}
  }
  function logout(){localStorage.removeItem(ACCESS_KEY);localStorage.removeItem(REFRESH_KEY);setAdmin(null);setRows([]);setSelected(null);}

  async function loadSightings(_a=admin){
    if(!_a)return;setBusy(true);setNotice('');
    try{const d=await api('listSightings',{search,status,source});setRows(d.rows);if(selected){const fresh=d.rows.find((r:Sighting)=>r.id===selected.id);if(fresh)setSelected(fresh);}}
    catch(e){setNotice(e instanceof Error?e.message:'Could not load sightings.');}
    finally{setBusy(false);}
  }
  async function loadImports(_a=admin){
    if(!_a)return;try{const d=await api('listImports');setImports(d.rows);}catch{}
  }
  async function loadAdmins(_a=admin){
    if(_a?.role!=='owner')return;
    try{const d=await api('listAdmins');setUsers(d.rows);}catch(e){setNotice(e instanceof Error?e.message:'Could not load user access.');}
  }
  async function loadInquiries(_a=admin){
    if(!_a||_a.role==='reviewer')return;
    try{const d=await api('listContactInquiries');setInquiries(d.rows);}catch(e){setNotice(e instanceof Error?e.message:'Could not load inquiries.');}
  }
  async function saveInquiry(inquiry:ContactInquiry){
    setBusy(true);setNotice('');
    try{await api('updateContactInquiry',{id:inquiry.id,status:inquiry.status,internal_notes:inquiry.internal_notes||''});setNotice('Inquiry updated.');await loadInquiries();}
    catch(e){setNotice(e instanceof Error?e.message:'Inquiry update failed.');}
    finally{setBusy(false);}
  }
  async function saveAdminAccess(member:AdminMember){
    setBusy(true);setNotice('');
    try{await api('updateAdmin',{email:member.email,role:member.role,active:member.active});setNotice('User access updated.');await loadAdmins();}
    catch(e){setNotice(e instanceof Error?e.message:'Access update failed.');}
    finally{setBusy(false);}
  }
  async function saveSelected(){
    if(!selected)return;
    const statusToSave=statusSelectRef.current?.value||selected.status;
    setBusy(true);setNotice('');
    try{
      await editorApi('updateSighting',{id:selected.id,sighting_date:selected.sighting_date,sighting_time:(selected.sighting_time||'').slice(0,5),location_description:selected.location_description,latitude:selected.latitude,longitude:selected.longitude,flamingo_count:selected.flamingo_count,bands_or_tags:selected.bands_or_tags||'',behavior:selected.behavior||'',notes:selected.notes||'',status:statusToSave,internal_notes:selected.internal_notes||''});
      await uploadSelectedPhotos();setPhotoFiles([]);setNotice('Sighting updated — status: '+statusLabel(statusToSave)+'.');await loadSightings();
    }
    catch(e){setNotice(e instanceof Error?e.message:'Update failed.');}
    finally{setBusy(false);}
  }
  async function openPhoto(p:Photo){
    try{const d=await api('photoUrl',{path:p.storage_path});window.open(d.url,'_blank','noopener,noreferrer');}catch(e){setNotice(e instanceof Error?e.message:'Unable to open photo.');}
  }
  async function removePhoto(p:Photo){
    if(!selected||admin?.role==='reviewer'||!confirm('Remove '+p.original_filename+' from this sighting? This cannot be undone.'))return;
    setBusy(true);setNotice('');
    try{await editorApi('deletePhoto',{id:selected.id,photo_id:p.id});setNotice('Photo removed.');await loadSightings();}
    catch(e){setNotice(e instanceof Error?e.message:'Unable to remove photo.');}
    finally{setBusy(false);}
  }
  async function deleteSelected(){
    if(!selected||admin?.role==='reviewer')return;
    const label=selected.reference_no?'FFWG-'+new Date().getFullYear()+'-'+String(selected.reference_no).padStart(5,'0'):'this sighting';
    if(!confirm('Permanently delete '+label+' and all linked private photos? This cannot be undone.'))return;
    setBusy(true);setNotice('');
    try{
      const d=await api('deleteSighting',{id:selected.id});
      setNotice('Sighting deleted'+(d.deletedPhotos?(' with '+d.deletedPhotos+' photo'+(d.deletedPhotos===1?'':'s')):'')+'.');
      setSelected(null);await loadSightings();
    }catch(e){setNotice(e instanceof Error?e.message:'Delete failed.');}
    finally{setBusy(false);}
  }
  async function exportCsv(){
    setBusy(true);try{const d=await api('exportSightings');const blob=new Blob([d.csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=d.filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}catch(e){setNotice(e instanceof Error?e.message:'Export failed.');}finally{setBusy(false);}
  }

  async function ensureXlsx(){
    if(window.XLSX)return window.XLSX;
    await new Promise<void>((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';s.async=true;s.onload=()=>resolve();s.onerror=()=>reject(new Error('Could not load Excel reader.'));document.head.appendChild(s);});
    return window.XLSX;
  }
  async function loadFile(file:File){
    setValidation(null);setNotice('');setFileName(file.name);
    try{
      let matrix:any[][];
      if(file.name.toLowerCase().endsWith('.csv'))matrix=parseCsv(await file.text());
      else{const XLSX=await ensureXlsx();const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false});const ws=wb.Sheets[wb.SheetNames[0]];matrix=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false,dateNF:'yyyy-mm-dd'});}
      if(matrix.length<2)throw new Error('The spreadsheet needs a header row and at least one data row.');
      const h=matrix[0].map((v:any)=>String(v??'').trim());setHeaders(h);setSheetRows(matrix.slice(1,5001));setMapping(guessMapping(h));
    }catch(e){setNotice(e instanceof Error?e.message:'Unable to read spreadsheet.');}
  }
  async function validateImport(){
    setBusy(true);setNotice('');
    try{const d=await api('validateImport',{rows:sheetRows,mapping,filename:fileName});setValidation(d);}
    catch(e){setNotice(e instanceof Error?e.message:'Validation failed.');}
    finally{setBusy(false);}
  }
  async function commitImport(){
    if(!validation||!confirm('Import the valid rows into the FFWG sightings database?'))return;
    setBusy(true);setNotice('');
    try{const d=await api('commitImport',{rows:sheetRows,mapping,filename:fileName,sourceLabel:sourceLabelText});setNotice('Imported '+d.imported+' sightings. '+d.rejected+' rows were skipped.');setValidation(null);setFileName('');setHeaders([]);setSheetRows([]);setMapping({});await Promise.all([loadSightings(),loadImports()]);setTab('history');}
    catch(e){setNotice(e instanceof Error?e.message:'Import failed.');}
    finally{setBusy(false);}
  }
  async function rollbackImport(id:string){
    if(!confirm('Roll back this import? All sightings created by this batch will be deleted.'))return;
    setBusy(true);try{await api('rollbackImport',{id});setNotice('Import rolled back.');await Promise.all([loadSightings(),loadImports()]);}catch(e){setNotice(e instanceof Error?e.message:'Rollback failed.');}finally{setBusy(false);}
  }

  const stats=useMemo(()=>({total:rows.length,newCount:rows.filter(r=>r.status==='new').length,verified:rows.filter(r=>r.status==='verified').length,photos:rows.reduce((n,r)=>n+(r.sighting_photos?.length||0),0)}),[rows]);

  if(loading)return <section className="container section admin-shell"><p>Loading admin dashboard…</p></section>;
  if(!admin)return <section className="container section admin-shell"><div className="admin-login"><p className="eyebrow">FFWG ADMIN</p><h1>Sightings dashboard</h1><p>Authorized Working Group members can review reports, manage photos, import historical data, and export records.</p>{loginSent?<div className="admin-success"><strong>Check your email.</strong><p>Use the one-time sign-in link to open the dashboard.</p></div>:<form onSubmit={requestLogin}><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label>{loginError&&<p className="form-error">{loginError}</p>}<button className="button navy" disabled={busy}>{busy?'Sending…':'Email me a sign-in link'}</button></form>}</div></section>;

  return <section className="container section admin-shell">
    <div className="admin-top"><div><p className="eyebrow">FFWG SIGHTINGS SYSTEM</p><h1>Admin dashboard</h1><p className="admin-muted">Signed in as {admin.email} · {admin.role}</p></div><button className="button small navy" onClick={logout}>Sign out</button></div>
    <div className="admin-tabs"><button className={tab==='sightings'?'active':''} onClick={()=>setTab('sightings')}>Sightings</button><button className={tab==='map'?'active':''} onClick={()=>setTab('map')}>Interactive map</button><button className={tab==='import'?'active':''} onClick={()=>setTab('import')}>Import sightings</button><button className={tab==='history'?'active':''} onClick={()=>setTab('history')}>Import history</button>{admin.role!=='reviewer'&&<button className={tab==='inquiries'?'active':''} onClick={()=>setTab('inquiries')}>Inquiries</button>}{admin.role==='owner'&&<button className={tab==='users'?'active':''} onClick={()=>setTab('users')}>User access</button>}</div>
    {notice&&<div className="admin-notice">{notice}</div>}

    {tab==='sightings'&&<>
      <div className="admin-stats"><div><strong>{stats.total}</strong><span>Loaded sightings</span></div><div><strong>{stats.newCount}</strong><span>New</span></div><div><strong>{stats.verified}</strong><span>Verified</span></div><div><strong>{stats.photos}</strong><span>Photos</span></div></div>
      <div className="admin-toolbar"><input placeholder="Search name, location, notes" value={search} onChange={e=>setSearch(e.target.value)}/><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option>{['new','reviewing','verified','unverified','duplicate','archived'].map(v=><option key={v} value={v}>{statusLabel(v)}</option>)}</select><select value={source} onChange={e=>setSource(e.target.value)}><option value="">All sources</option><option value="website">Website</option><option value="spreadsheet_import">Spreadsheet</option><option value="manual_admin">Manual</option></select><button className="button small navy" onClick={()=>loadSightings()} disabled={busy}>Apply</button><button className="button small" onClick={exportCsv} disabled={busy}>Export CSV</button></div>
      <div className="admin-grid">
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Date</th><th>Location</th><th>Birds</th><th>Source</th><th>Status</th><th>Photos</th></tr></thead><tbody>{rows.map(r=><tr key={r.id} className={selected?.id===r.id?'selected':''} onClick={()=>{setSelected({...r});setPhotoFiles([]);}}><td>{fmtDate(r.sighting_date)}</td><td>{r.location_description}</td><td>{r.flamingo_count}</td><td>{sourceLabel(r.source)}</td><td><span className={'status-pill '+r.status}>{statusLabel(r.status)}</span></td><td>{r.sighting_photos?.length||0}</td></tr>)}</tbody></table></div>
        <aside className="admin-detail">{selected?<><div className="admin-detail-head"><div><p className="eyebrow">SIGHTING</p><h2>{selected.reference_no?'FFWG-'+new Date(selected.submitted_at).getFullYear()+'-'+String(selected.reference_no).padStart(5,'0'):'Imported record'}</h2></div></div><div className="admin-edit-grid"><label>Date<input type="date" value={selected.sighting_date} disabled={admin.role==='reviewer'} onChange={e=>setSelected({...selected,sighting_date:e.target.value})}/></label><label>Local time<input type="time" value={(selected.sighting_time||'').slice(0,5)} disabled={admin.role==='reviewer'} onChange={e=>setSelected({...selected,sighting_time:e.target.value||null})}/></label><label className="full">Location<input value={selected.location_description} disabled={admin.role==='reviewer'} maxLength={500} onChange={e=>setSelected({...selected,location_description:e.target.value})}/></label><label>Latitude<input type="number" step="any" value={selected.latitude??''} disabled={admin.role==='reviewer'} onChange={e=>setSelected({...selected,latitude:e.target.value===''?null:Number(e.target.value)})}/></label><label>Longitude<input type="number" step="any" value={selected.longitude??''} disabled={admin.role==='reviewer'} onChange={e=>setSelected({...selected,longitude:e.target.value===''?null:Number(e.target.value)})}/></label><p className="field-help full">Exact coordinates stay private and are only visible to authorized dashboard members.</p><label>Flamingos<input type="number" min="1" max="10000" value={selected.flamingo_count} disabled={admin.role==='reviewer'} onChange={e=>setSelected({...selected,flamingo_count:Number(e.target.value)})}/></label><label>Bands / tags<input value={selected.bands_or_tags||''} disabled={admin.role==='reviewer'} maxLength={5000} onChange={e=>setSelected({...selected,bands_or_tags:e.target.value})}/></label><label className="full">Behavior<textarea rows={3} value={selected.behavior||''} disabled={admin.role==='reviewer'} maxLength={5000} onChange={e=>setSelected({...selected,behavior:e.target.value})}/></label><label className="full">Notes<textarea rows={4} value={selected.notes||''} disabled={admin.role==='reviewer'} maxLength={5000} onChange={e=>setSelected({...selected,notes:e.target.value})}/></label></div><dl><dt>Observer</dt><dd>{selected.observer_name}{selected.observer_email?<><br/><small>{selected.observer_email}</small></>:null}</dd><dt>Source</dt><dd>{sourceLabel(selected.source)}{selected.legacy_id?' · '+selected.legacy_id:''}</dd></dl><div className="admin-photos"><h3>Photos ({selected.sighting_photos?.length||0}/3)</h3>{selected.sighting_photos?.map(p=><div className="admin-photo-row" key={p.id}><button onClick={()=>openPhoto(p)}>{p.original_filename} <span>View ↗</span></button>{admin.role!=='reviewer'&&<button className="admin-photo-remove" onClick={()=>removePhoto(p)} aria-label={'Remove '+p.original_filename}>Remove</button>}</div>)}{admin.role!=='reviewer'&&(selected.sighting_photos?.length||0)<3&&<label className="upload-field">Add photos<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple onChange={e=>setPhotoFiles(Array.from(e.target.files||[]).slice(0,3-(selected.sighting_photos?.length||0)))}/><small>{photoFiles.length?photoFiles.map(f=>f.name).join(', '):'Up to '+(3-(selected.sighting_photos?.length||0))+' more; 20 MB each.'}</small></label>}</div><label>Status<select ref={statusSelectRef} value={selected.status} onChange={e=>setSelected({...selected,status:e.target.value})}>{['new','reviewing','verified','unverified','duplicate','archived'].map(v=><option key={v} value={v}>{statusLabel(v)}</option>)}</select></label><label>Internal notes<textarea rows={5} value={selected.internal_notes||''} onChange={e=>setSelected({...selected,internal_notes:e.target.value})}/></label><div className="admin-record-actions"><button className="button navy" onClick={saveSelected} disabled={busy}>{busy?'Saving…':'Save changes'}</button>{admin.role!=='reviewer'&&<button className="admin-danger-button" onClick={deleteSelected} disabled={busy}>Delete sighting</button>}</div></>:<div className="admin-empty">Select a sighting to review its details.</div>}</aside>
      </div>
    </>}

    {tab==='map'&&<AdminSightingsMap sightings={rows} onOpenRecord={id=>{const record=rows.find(r=>r.id===id);if(record)setSelected({...record});setTab('sightings');}}/>}

    {tab==='import'&&<div className="admin-import">
      <div className="admin-card"><p className="eyebrow">BULK IMPORT</p><h2>Import historical sightings</h2><p>Upload a CSV or Excel file. Nothing is written until validation is complete and you confirm the import.</p><label className="upload-field">Choose CSV or Excel<input type="file" accept=".csv,.xlsx,.xls" onChange={e=>e.target.files?.[0]&&loadFile(e.target.files[0])}/></label>{fileName&&<p><strong>{fileName}</strong> · {sheetRows.length} data rows loaded</p>}</div>
      {headers.length>0&&<div className="admin-card"><h3>Map spreadsheet columns</h3><div className="mapping-grid">{fields.map(([key,label])=><label key={key}>{label}<select value={mapping[key]??''} onChange={e=>setMapping({...mapping,[key]:e.target.value===''?-1:Number(e.target.value)})}><option value="">Not mapped</option>{headers.map((h,i)=><option key={i} value={i}>{h||'Column '+(i+1)}</option>)}</select></label>)}</div><label>Source label (optional)<input value={sourceLabelText} onChange={e=>setSourceLabelText(e.target.value)} placeholder="Example: 2024 statewide survey"/></label><button className="button navy" onClick={validateImport} disabled={busy}>Validate import</button></div>}
      {validation&&<div className="admin-card"><h3>Validation results</h3><div className="admin-stats"><div><strong>{validation.summary.total}</strong><span>Total rows</span></div><div><strong>{validation.summary.valid}</strong><span>Ready</span></div><div><strong>{validation.summary.rejected}</strong><span>Skipped</span></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Row</th><th>Date</th><th>Location</th><th>Birds</th><th>Result</th></tr></thead><tbody>{validation.preview.map((r:any)=><tr key={r.row}><td>{r.row}</td><td>{r.data.sighting_date||'—'}</td><td>{r.data.location_description||'—'}</td><td>{r.data.flamingo_count??'—'}</td><td>{r.valid?'Ready':r.errors.join('; ')}</td></tr>)}</tbody></table></div>{validation.summary.valid>0&&admin.role!=='reviewer'&&<button className="button coral" onClick={commitImport} disabled={busy}>Import {validation.summary.valid} valid rows</button>}</div>}
    </div>}

    {tab==='inquiries'&&admin.role!=='reviewer'&&<div className="admin-import"><div className="admin-card"><p className="eyebrow">CONTACT FORM</p><h2>Inquiries</h2><p>Messages submitted through the public Contact Us form appear here for authorized administrators.</p></div>{inquiries.length===0?<div className="admin-card"><p>No inquiries yet.</p></div>:inquiries.map(q=><div className="admin-card" key={q.id}><p className="eyebrow">{'FFWG-C-'+new Date(q.submitted_at).getFullYear()+'-'+String(q.reference_no).padStart(5,'0')} · {new Date(q.submitted_at).toLocaleString()}</p><h2>{q.topic}</h2><p><strong>From:</strong> {q.name} · <a href={'mailto:'+q.email}>{q.email}</a></p><p style={{whiteSpace:'pre-wrap'}}>{q.message}</p><div className="mapping-grid"><label>Status<select value={q.status} disabled={busy} onChange={e=>setInquiries(inquiries.map(x=>x.id===q.id?{...x,status:e.target.value as ContactInquiry['status']}:x))}>{['new','reviewing','responded','closed','spam'].map(v=><option key={v} value={v}>{statusLabel(v)}</option>)}</select></label><label>Internal notes<textarea rows={3} value={q.internal_notes||''} disabled={busy} onChange={e=>setInquiries(inquiries.map(x=>x.id===q.id?{...x,internal_notes:e.target.value}:x))}/></label></div><a className="button small" href={'mailto:'+q.email+'?subject='+encodeURIComponent('Florida Flamingo Working Group: '+q.topic)}>Reply by email</a> <button className="button small navy" onClick={()=>saveInquiry(q)} disabled={busy}>Save inquiry</button></div>)}</div>}

    {tab==='users'&&admin.role==='owner'&&<div className="admin-card"><p className="eyebrow">DASHBOARD ACCESS</p><h2>User access</h2><p>Reviewers can review sightings, update status and internal notes, view photos, and export records. Admins can also delete sightings and import or roll back data. Only the owner can manage access.</p><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Email</th><th>Role</th><th>Status</th><th>Added</th><th></th></tr></thead><tbody>{users.map(u=><tr key={u.email}><td>{u.email}</td><td><select aria-label={'Role for '+u.email} value={u.role} disabled={u.role==='owner'||busy} onChange={e=>setUsers(users.map(x=>x.email===u.email?{...x,role:e.target.value as AdminMember['role']}:x))}>{u.role==='owner'&&<option value="owner">Owner</option>}<option value="reviewer">Reviewer</option><option value="admin">Admin</option></select></td><td><select aria-label={'Status for '+u.email} value={u.active?'active':'inactive'} disabled={u.role==='owner'||busy} onChange={e=>setUsers(users.map(x=>x.email===u.email?{...x,active:e.target.value==='active'}:x))}><option value="active">Active</option><option value="inactive">Inactive</option></select></td><td>{new Date(u.added_at).toLocaleDateString()}</td><td>{u.role!=='owner'&&<button className="admin-link-button" onClick={()=>saveAdminAccess(u)} disabled={busy}>Save</button>}</td></tr>)}</tbody></table></div></div>}

    {tab==='history'&&<div className="admin-card"><p className="eyebrow">IMPORT AUDIT TRAIL</p><h2>Import history</h2>{imports.length===0?<p>No spreadsheet imports yet.</p>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Date</th><th>File</th><th>Imported</th><th>Skipped</th><th>Status</th><th></th></tr></thead><tbody>{imports.map(b=><tr key={b.id}><td>{new Date(b.created_at).toLocaleString()}</td><td>{b.filename}{b.source_label?<><br/><small>{b.source_label}</small></>:null}</td><td>{b.rows_imported}</td><td>{b.rows_rejected}</td><td>{statusLabel(b.status)}</td><td>{b.status==='imported'&&admin.role!=='reviewer'?<button className="admin-link-button" onClick={()=>rollbackImport(b.id)}>Roll back</button>:null}</td></tr>)}</tbody></table></div>}</div>}
  </section>;
}
