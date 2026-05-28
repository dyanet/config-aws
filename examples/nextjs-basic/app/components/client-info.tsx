'use client';

import { env } from '@dyanet/nextjs-config-aws';

export function ClientInfo() {
  // `env()` reads from the window object populated by <PublicEnvScript /> in layout.tsx.
  const apiUrl = env('PUBLIC_API_URL', 'http://localhost:3000');
  const appName = env('PUBLIC_APP_NAME', 'demo');

  return (
    <pre>{JSON.stringify({ PUBLIC_API_URL: apiUrl, PUBLIC_APP_NAME: appName }, null, 2)}</pre>
  );
}
