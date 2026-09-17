import type {MetadataRoute} from 'next';
export default function robots():MetadataRoute.Robots{const live=process.env.SITE_LAUNCH_APPROVED==='true';return {rules:{userAgent:'*',...(live?{allow:'/'}:{disallow:'/'})},...(live&&process.env.SITE_URL?{sitemap:`${process.env.SITE_URL}/sitemap.xml`}:{})};}
