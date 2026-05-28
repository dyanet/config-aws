import type { ReactNode } from 'react';
import { PublicEnvScript } from '@dyanet/nextjs-config-aws';

export const metadata = { title: '@dyanet/nextjs-config-aws — basic example' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/*
          Exposes the listed env vars to the client at request time.
          Runtime — no NEXT_PUBLIC_ build-time inlining required.
        */}
        <PublicEnvScript publicVars={['PUBLIC_API_URL', 'PUBLIC_APP_NAME']} />
      </head>
      <body>{children}</body>
    </html>
  );
}
