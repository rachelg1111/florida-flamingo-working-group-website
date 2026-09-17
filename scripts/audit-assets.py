import json,pathlib,urllib.request,concurrent.futures,html
from html.parser import HTMLParser
root=pathlib.Path(__file__).resolve().parents[1]
pages=json.loads((root/'docs/audit/original-content.json').read_text())
urls=sorted(set(u.split('?')[0] for p in pages for u in p['image_links'] if '/uploads/' in u))
def fetch(item):
 i,u=item
 try:
  path=root/'public/images'/f'original-{i}{pathlib.Path(u).suffix}'
  path.write_bytes(urllib.request.urlopen(u+'?w=1600&quality=85',timeout=30).read())
  return {'file':'/images/'+path.name,'source':u,'rights':'Reused from organization website for review. Original photographer, permission scope, and location must be confirmed before launch.'}
 except Exception as e:return {'source':u,'error':str(e)}
assets=list(concurrent.futures.ThreadPoolExecutor(max_workers=6).map(fetch,enumerate(urls)))
(root/'docs/audit/media.json').write_text(json.dumps(assets,indent=2))
print(json.dumps(assets,indent=2))
class Parser(HTMLParser):
 def __init__(self):super().__init__();self.items=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag in ['input','textarea','select'] and a.get('type')!='hidden':self.items.append({k:a[k] for k in ['id','name','type','required','placeholder'] if k in a})
forms={}
for p in ['report-a-flamingo-sighting','contact-us']:
 parser=Parser();parser.feed((root/'docs/audit'/f'raw-{p}.html').read_text());forms[p]=parser.items
(root/'docs/audit/forms.json').write_text(json.dumps(forms,indent=2));print(json.dumps(forms,indent=2))
