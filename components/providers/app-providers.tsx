'use client';

import { PropsWithChildren } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <>
      {children}
      <Toaster />
      <SonnerToaster />
    </>
  );
}

export default AppProviders;