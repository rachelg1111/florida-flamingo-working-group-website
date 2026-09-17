export const MAX_BYTES=3*1024*1024;
export function validateSubmission(data){
 const errors=[];const kind=data.get('kind');const text=k=>typeof data.get(k)==='string'?data.get(k).trim():'';
 if(!['sighting','contact'].includes(kind))errors.push('Select a valid submission type.');
 if(!text('name')||text('name').length>120)errors.push('Enter your name (up to 120 characters).');
 const email=text('email');if((kind==='contact'&&!email)||(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))||email.length>254)errors.push('Enter a valid email address.');
 if(data.get('consent')!=='on')errors.push('Please confirm how your information may be used.');
 if(text('website'))errors.push('Unable to accept this submission.');
 if(kind==='sighting'){
 const date=text('date');const parsed=new Date(`${date}T00:00:00Z`);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||isNaN(+parsed)||parsed.toISOString().slice(0,10)!==date||+parsed>Date.now()+86400000)errors.push('Enter a valid sighting date that is not in the future.');
 if(!text('location'))errors.push('Enter the sighting location.');
 const n=Number(text('count'));if(!Number.isInteger(n)||n<1||n>100000)errors.push('Enter a whole number of flamingos between 1 and 100,000.');
 if(text('time')&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(text('time')))errors.push('Enter a valid local time.');
 if(!['yes','no','unknown'].includes(text('bands')))errors.push('Select whether bands were visible.');
 }
 if(kind==='contact'&&!text('message'))errors.push('Enter a message.');
 for(const [key,value] of data.entries())if(typeof value==='string'&&value.length>5000)errors.push('One of your entries is too long.');
 const photos=data.getAll('photos').filter(f=>typeof f!=='string'&&f.size>0);
 if(photos.length>3||photos.reduce((s,f)=>s+f.size,0)>MAX_BYTES||photos.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)))errors.push('Use up to 3 JPG, PNG, or WebP photos totaling 3 MB or less.');
 return {errors,photos};
}
export function imageSignatureMatches(bytes,type){return type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:type==='image/png'?bytes.slice(0,8).join(',')==='137,80,78,71,13,10,26,10':type==='image/webp'?new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP':false;}
