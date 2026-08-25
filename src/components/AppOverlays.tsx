import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';

/** Non-blocking notification surfaces, loaded after the route can render. */
export default function AppOverlays() {
  return (
    <>
      <Toaster />
      <Sonner />
    </>
  );
}
