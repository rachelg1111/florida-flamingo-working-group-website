import urllib.request,urllib.error,concurrent.futures,json,re,subprocess,time
from pathlib import Path
from html.parser import HTMLParser
paths=['','about-us','our-work','why-flamingos-matter','research-and-resources','report-a-flamingo-sighting','state-bird-campaign','news','get-involved','contact-us','privacy']
class P(HTMLParser):
 def __init__(self):super().__init__();self.h1=0;self.links=[];self.ids=[];self.images=[];self.inputs=[];self.labels=[]
 def handle_starttag(self,t,a):
  a=dict(a)
  if t=='h1':self.h1+=1
  if t=='a':self.links.append(a.get('href',''))
  if 'id' in a:self.ids.append(a['id'])
  if t=='img':self.images.append(a)
def check(path):
 r=urllib.request.urlopen('http://127.0.0.1:3101/'+path,timeout=10);body=r.read().decode();p=P();p.feed(body)
 return {'path':'/'+path,'status':r.status,'h1':p.h1,'robotsHeader':r.headers.get('X-Robots-Tag'),'title':re.search(r'<title>(.*?)</title>',body)[1],'canonical':re.search(r'<link rel="canonical" href="([^"]+)',body)[1],'links':p.links,'ids':p.ids,'images':p.images,'missingImageAlt':sum('alt' not in i for i in p.images)}
log=open('/tmp/ffwg-server.log','w');server=subprocess.Popen(['node','node_modules/next/dist/bin/next','start','--port','3101','--hostname','127.0.0.1'],stdout=log,stderr=log)
try:
 for i in range(30):
  try:urllib.request.urlopen('http://127.0.0.1:3101/',timeout=2);break
  except:time.sleep(.3)
 results=list(concurrent.futures.ThreadPoolExecutor().map(check,paths));issues=[]
 bypath={r['path'].rstrip('/') or '/':r for r in results}
 for r in results:
  if r['h1']!=1 or r['missingImageAlt'] or r['robotsHeader']!='noindex, nofollow, noarchive':issues.append(r['path']+' semantics/indexing')
  for u in r['links']:
   if u.startswith('/') and not u.startswith('//'):
    path,_,frag=u.partition('#');match=bypath.get(path.rstrip('/') or '/')
    if not match:issues.append(r['path']+' broken internal route '+u)
    elif frag and frag not in match['ids']:issues.append(r['path']+' broken fragment '+u)
 for u in set(i['src'] for r in results for i in r['images']):
  try:
   response=urllib.request.urlopen('http://127.0.0.1:3101'+u,timeout=10);assert response.headers.get('Content-Type','').startswith('image/')
  except Exception as e:issues.append('image '+u+' '+str(e))
 try:urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:3101/api/submissions',data=b'',method='POST'));issues.append('Preview POST unexpectedly accepted')
 except urllib.error.HTTPError as e:
  if e.code!=503:issues.append('Unexpected form status '+str(e.code))
 assert 'Disallow: /' in urllib.request.urlopen('http://127.0.0.1:3101/robots.txt').read().decode()
 try:urllib.request.urlopen('http://127.0.0.1:3101/nonexistent-page');issues.append('Missing 404')
 except urllib.error.HTTPError as e:
  if e.code!=404:issues.append('Unexpected not-found status')
 Path('docs/audit/http-checks.json').write_text(json.dumps({'pages':results,'issues':issues},indent=2))
 print(json.dumps({'pages':len(results),'allHTTP200':all(r['status']==200 for r in results),'uniqueTitles':len(set(r['title'] for r in results)),'imagesChecked':len(set(i['src'] for r in results for i in r['images'])),'previewPost':503,'issues':issues},indent=2))
 if issues:raise SystemExit(1)
finally:server.terminate();server.wait();log.close()
