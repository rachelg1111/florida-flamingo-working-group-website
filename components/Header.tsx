'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState} from 'react';
import {navigation} from '@/content/site';
export default function Header(){const [open,setOpen]=useState(false);const path=usePathname();return <header className="site-header"><div className="header-inner"><Link className="wordmark" href="/" aria-label="Florida Flamingo Working Group home"><span className="brand-symbol" aria-hidden="true">F<span>F</span></span><span>FLORIDA FLAMINGO<small>WORKING GROUP</small></span></Link><button className="menu-toggle" aria-expanded={open} aria-controls="main-nav" onClick={()=>setOpen(!open)}>{open?'Close menu':'Menu'} <span aria-hidden="true">{open?'×':'☰'}</span></button><nav id="main-nav" className={open?'nav open':'nav'} aria-label="Main navigation">{navigation.map(([label,href])=><Link key={href} href={href} aria-current={path.replace(/\/$/,'')===href.replace(/\/$/,'')?'page':undefined} onClick={()=>setOpen(false)}>{label}</Link>)}<Link className="button small coral" href="/report-a-flamingo-sighting/" onClick={()=>setOpen(false)}>Report a sighting <span aria-hidden="true">↗</span></Link></nav></div></header>}
