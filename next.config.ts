import type { NextConfig } from 'next';
const config: NextConfig = { poweredByHeader: false, async headers(){ return [{source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'X-Frame-Options',value:'SAMEORIGIN'},...(process.env.SITE_LAUNCH_APPROVED==='true'?[]:[{key:'X-Robots-Tag',value:'noindex, nofollow, noarchive'}])]}]; } };
export default config;
