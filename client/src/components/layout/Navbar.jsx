import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from '../ui/Logo';
import { useAuth } from '../../hooks/useAuth';

const roleBadgeStyles = {
  ADMIN: 'bg-accent-green/15 text-accent-green',
  ANALYST: 'bg-electric/15 text-electric',
  VIEWER: 'bg-slate-500/15 text-slate-300',
};

const navLinkClass = ({ isActive }) =>
  `text-sm font-medium transition ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`;

const mobileNavLinkClass = ({ isActive }) =>
  `block rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-surface-raised text-white' : 'text-slate-300 hover:bg-surface-raised hover:text-white'
  }`;

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/data-sources', label: 'Data Sources' },
  { to: '/ask', label: 'Ask AI' },
  { to: '/dashboards', label: 'Dashboards' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = user?.role === 'ADMIN' ? [...NAV_ITEMS, { to: '/admin', label: 'Admin' }] : NAV_ITEMS;

  return (
    <header className="relative border-b border-border-subtle bg-navy">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link to="/dashboard">
            <Logo size={28} />
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <span
            className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-block ${roleBadgeStyles[user?.role]}`}
          >
            {user?.role}
          </span>
          <span className="hidden text-sm text-slate-300 lg:inline">{user?.name}</span>
          <button
            onClick={logout}
            className="hidden rounded-lg border border-border-subtle px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:border-electric md:inline-block"
          >
            Log out
          </button>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-lg p-2 text-slate-300 hover:bg-surface-raised md:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="absolute inset-x-0 top-full z-40 border-b border-border-subtle bg-navy px-4 py-3 md:hidden">
          <div className="mb-3 flex items-center gap-2 px-3">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${roleBadgeStyles[user?.role]}`}>
              {user?.role}
            </span>
            <span className="text-sm text-slate-300">{user?.name}</span>
          </div>
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} className={mobileNavLinkClass} onClick={() => setMobileOpen(false)}>
              {item.label}
            </NavLink>
          ))}
          <button
            onClick={() => {
              setMobileOpen(false);
              logout();
            }}
            className="mt-2 block w-full rounded-lg border border-border-subtle px-3 py-2 text-left text-sm font-medium text-slate-200 hover:border-electric"
          >
            Log out
          </button>
        </nav>
      )}
    </header>
  );
}
