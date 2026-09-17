import json,re,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
pages=json.loads((root/'docs/audit/original-content.json').read_text())
out={}
for p in pages:
 slug=p['url'].rstrip('/').split('/')[-1]
 if slug=='floridaflamingowg.org':continue
 t=p['text'].split('\n',1)[1].strip()
 t=t.replace('Build Public Steward','Build Public Stewardship').replace('track Flamingo','track flamingo').replace('study Flamingo','study flamingo').replace('Because Flamingos','Because flamingos').replace('to Flamingos','to flamingos').replace('causing disturbance,','causing disturbance.').replace('Our Leadership and Membership brings','Our leadership and membership bring').replace('**Samantha** **Montes de Orca**','**Samantha Montes de Orca**').replace('**Steffanie Munguia**—','**Steffanie Munguia** —')
 if slug=='state-bird-campaign':
  t=t.split('\n# Make the American Flamingo')[0]
  t=t.replace('View House Bill 11','[View House Bill 11](https://www.flhouse.gov/Sections/Bills/billsdetail.aspx?BillId=82535)').replace('View Senate Bill 150','[View Senate Bill 150](https://www.flsenate.gov/Session/Bill/2026/150)')
  t=t.replace('[Join the State Bird Campaign] [Contact Your Legislators] [Download Campaign Resources]','[Ask about the campaign](/contact-us/) · [Find your state senator](https://www.flsenate.gov/Senators/Find) · [Explore research and resources](/research-and-resources/)')
  t=t.replace('Subscribe for legislative updates, campaign news, educational resources, and opportunities to take action.','Contact us to ask about legislative updates, campaign news, educational resources, and opportunities to take action.')
  t=t.replace('This designation will','This designation could').replace('would:','could:')
 if slug=='research-and-resources':
  for label,url in [('Read the 2018 study','https://doi.org/10.1650/CONDOR-17-187.1'),('Read the 2021 telemetry study','https://digitalcommons.usf.edu/ffn/vol49/iss2/6/'),('Read the 2020 range-wide assessment','https://doi.org/10.1371/journal.pone.0244117'),('Read the population-genomics study','https://doi.org/10.1093/ornithapp/duaf071'),('Report a Sighting','/report-a-flamingo-sighting/')]:t=t.replace(label,f'[{label}]({url})')
  t=t.replace('It was the first empirical field study of a wild flamingo in Florida.','It was the first empirical field study of a wild flamingo in Florida. Because it followed one individual, its findings should not be treated as a population-wide estimate.')
  t=t.replace('## Species and Conservation Resources','## Species and Conservation Resources\n\n* [Florida Fish and Wildlife Conservation Commission: American flamingo](https://myfwc.com/wildlifehabitats/profiles/birds/waterbirds/american-flamingo/) — state wildlife agency\n* [Flamingo Specialist Group](https://flamingospecialistgroup.org/) — specialist conservation network\n* [BirdLife International species factsheet](https://datazone.birdlife.org/species/factsheet/american-flamingo-phoenicopterus-ruber) — species and conservation reference\n* [UCF: population genetics and restoration](https://www.ucf.edu/news/ucf-study-confirms-flamingos-are-native-to-florida-and-genetically-fit-for-restoration/) — university research summary, December 2025')
 out[slug]={'title':p['title'],'body':t,'source':p['url']}
(root/'content/pages.json').write_text(json.dumps(out,indent=2,ensure_ascii=False))
about=out['about-us']['body']
membertext=about.split('### Working Group Members')[1].split('Our leadership')[0]
members=[]
for line in membertext.splitlines():
 m=re.match(r'\* \*\*(.*?)\*\* — (.*)',line)
 if m:members.append({'name':m[1],'affiliation':m[2]})
(root/'content/members.json').write_text(json.dumps(members,indent=2,ensure_ascii=False))
