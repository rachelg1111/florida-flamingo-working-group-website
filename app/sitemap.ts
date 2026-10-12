import type {MetadataRoute} from 'next';
import {paths} from '@/content/site';

export default function sitemap():MetadataRoute.Sitemap {
  if(process.env.SITE_LAUNCH_APPROVED!=='true'||!process.env.SITE_URL)return [];
  const base=process.env.SITE_URL.replace(/\/+$/, '');
  return paths.map(path=>({url:`${base}/${path}`}));
}
