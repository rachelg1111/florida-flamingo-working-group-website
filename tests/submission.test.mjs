import {test} from 'node:test';import assert from 'node:assert/strict';import {validateSubmission,imageSignatureMatches} from '../lib/submission.mjs';
const base=()=>{const f=new FormData();for(const [k,v] of Object.entries({kind:'sighting',name:'Review Test',date:'2026-09-01',location:'Test only',count:'2',bands:'unknown',consent:'on'}))f.set(k,v);return f;};
test('sighting preserves optional email and accepts complete records',()=>assert.deepEqual(validateSubmission(base()).errors,[]));
test('rejects impossible dates and fractional bird counts',()=>{const f=base();f.set('date','2026-02-31');f.set('count','1.5');assert.equal(validateSubmission(f).errors.length,2)});
test('requires consent and rejects filled honeypot',()=>{const f=base();f.delete('consent');f.set('website','spam');assert.equal(validateSubmission(f).errors.length,2)});
test('contact requires email and message',()=>{const f=base();f.set('kind','contact');assert.equal(validateSubmission(f).errors.length,2)});
test('rejects unsupported uploads and oversized content',()=>{const f=base();f.set('photos',new File(['script'],'bad.svg',{type:'image/svg+xml'}));f.set('notes','a'.repeat(5001));assert.equal(validateSubmission(f).errors.length,2)});
test('checks image magic bytes rather than trusting MIME alone',()=>{assert.equal(imageSignatureMatches(Uint8Array.from([255,216,255]),'image/jpeg'),true);assert.equal(imageSignatureMatches(new TextEncoder().encode('<script>'),'image/jpeg'),false);});
