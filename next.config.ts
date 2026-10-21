import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // cacheComponents must remain disabled as required by Document 00 §9.1
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
