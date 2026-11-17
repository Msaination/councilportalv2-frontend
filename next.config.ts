import type { NextConfig } from "next";

const extraDevOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '172.20.17.16:3000',
    '172.20.17.16:3002',
    '172.20.17.16:3099',
    '192.168.2.28:3000',
    '192.168.2.28:3099',
    'IntranetApp:3000',
    'IntranetApp:3099',
    '*.Emalalahleni.local',
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:3099',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3002',
    'http://127.0.0.1:3099',
    '192.168.*.*',
    '172.20.*.*',
    ...extraDevOrigins,
  ],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
