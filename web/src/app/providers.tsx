'use client';

import type { ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { fetcher } from '@/lib/fetcher';

/**
 * Provider klien global (SWR). Bungkus app di root layout.
 * Server-state lewat SWR; jangan duplikasi ke store global.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ fetcher, revalidateOnFocus: false, shouldRetryOnError: false }}>
      {children}
    </SWRConfig>
  );
}

