import FavoritesPageClient from '../../components/FavoritesPageClient';

const TITLE = 'Your Favorite Tools — Convertam';
const DESCRIPTION = 'Quick access to the Convertam tools you use most.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/favorites' },
  robots: { index: false, follow: true },
};

export default function FavoritesPage() {
  return <FavoritesPageClient />;
}
