import { basePath } from './config/paths.mjs';
const development = process.env.NODE_ENV === 'development';
export default {
  output: development ? undefined : 'export',
  basePath: basePath(),
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath() },
  turbopack: { root: process.cwd() },
  ...(development ? { async rewrites() { return [
    {source:'/projects/:slug/',destination:'/projects/:slug/index.html'},
    {source:'/zh/projects/:slug/',destination:'/zh/projects/:slug/index.html'},
    {source:'/projects/:slug/zh/',destination:'/projects/:slug/zh/index.html'},
  ]; } } : {}),
};
