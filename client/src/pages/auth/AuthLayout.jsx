import { Link } from 'react-router-dom';
import Logo from '../../components/ui/Logo';
import Footer from '../../components/layout/Footer';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen flex-col bg-navy">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <Link to="/" className="mb-8">
          <Logo />
        </Link>
        <div className="w-full max-w-sm rounded-2xl border border-border-subtle bg-surface p-8">
          <h1 className="text-xl font-bold text-white">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-slate-400">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
