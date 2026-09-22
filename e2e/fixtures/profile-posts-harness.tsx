import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { ProfilePosts } from '../../src/components/profile/ProfilePosts';
import '../../src/index.css';

document.documentElement.classList.add('dark');
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <BrowserRouter>
      <main className="mx-auto max-w-5xl p-4 sm:p-8">
        <ProfilePosts userId="11111111-1111-4111-8111-111111111111" name="Javier Alonso" avatarUrl={null} isOwnProfile={!location.search.includes('visitor')} />
      </main>
      <Toaster />
    </BrowserRouter>
  </QueryClientProvider>,
);
