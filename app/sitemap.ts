import type {MetadataRoute} from 'next';
import {paths} from '@/content/site';
export default function sitemap():MetadataRoute.Sitemap{if(process.env.SITE_LAUNCH_APPROVED!=='true'||!process.env.SITE_URL)return [];return paths.map(p=>({url:`${process.env.SITE_URL}/${p}${p?'/':''}`}));}
