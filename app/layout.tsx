import type {Metadata} from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {site} from '@/content/site';
import './globals.css';
const base=process.env.SITE_URL || (process.env.VERCEL_URL?`https://${process.env.VERCEL_URL}`:'http://localhost:3000');
const live=process.env.SITE_LAUNCH_APPROVED==='true';
export const metadata:Metadata={metadataBase:new URL(base),title:{default:site.name,template:`%s | ${site.name}`},description:site.description,robots:{index:live,follow:live},openGraph:{type:'website',siteName:site.name,title:site.name,description:site.description,images:[{url:'/images/original-9.webp',width:1600,height:1067,alt:'American flamingos wading in shallow water'}]},twitter:{card:'summary_large_image'},icons:{icon:'/icon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><a className="skip" href="#main">Skip to content</a>{!live&&<div className="preview-banner">FFWG website preview <span>•</span> Prepared for organizational review</div>}<Header/><main id="main">{children}</main><Footer/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({'@context':'https://schema.org','@type':'Organization',name:site.name,legalName:site.legalName,url:base,description:site.description})}}/></body></html>}
