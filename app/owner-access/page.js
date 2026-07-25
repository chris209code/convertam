import OwnerAccessClient from '@/components/OwnerAccessClient';

// Private, unlinked admin route — never indexed. Split into a server
// wrapper (for the noindex metadata export) + client component (for the
// interactive login form), the same pattern used for the homepage.
export const metadata = {
  robots: { index: false, follow: false },
};

export default function OwnerAccessPage() {
  return <OwnerAccessClient />;
}
