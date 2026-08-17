import { Link } from 'react-router-dom';
import Footer from '../components/layout/Footer';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-navy text-slate-200">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <h1 className="text-6xl font-extrabold text-white">404</h1>
        <p className="mt-3 text-slate-400">This page hasn&apos;t been built yet.</p>
        <Link to="/" className="mt-6 text-electric hover:text-electric-light">
          Back home
        </Link>
      </div>
      <Footer />
    </div>
  );
}
