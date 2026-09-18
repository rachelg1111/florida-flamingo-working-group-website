import type {Metadata} from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {site} from '@/content/site';
import './globals.css';
const base='https://floridaflamingowg.org';
export const metadata:Metadata={metadataBase:new URL(base),title:{default:site.name,template:`%s | ${site.name}`},description:site.description,robots:{index:true,follow:true},openGraph:{type:'website',siteName:site.name,title:site.name,description:site.description,images:[{url:'/images/original-9.webp',width:1600,height:1067,alt:'American flamingos wading in shallow water'}]},twitter:{card:'summary_large_image'},icons:{icon:'/icon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><a className="skip" href="#main">Skip to content</a><Header/><main id="main">{children}</main><Footer/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({'@context':'https://schema.org','@type':'Organization',name:site.name,legalName:site.legalName,url:base,description:site.description})}}/></body></html>}
