import { Link } from 'react-router-dom';
import Logo from '../components/ui/Logo';

export default function Landing() {
  return (
    <div className="min-h-screen bg-navy text-slate-200">
      <header className="flex items-center justify-between px-6 py-5 md:px-12">
        <Logo />
        <nav className="flex items-center gap-3">
          <Link
            to="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-200 hover:text-white"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="rounded-lg bg-electric px-4 py-2 text-sm font-semibold text-white transition hover:bg-electric-light"
          >
            Get started
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col items-center px-6 pt-24 text-center md:pt-32">
        <span className="rounded-full border border-border-subtle bg-surface px-4 py-1 text-xs font-medium uppercase tracking-wider text-accent-green">
          AI-Powered Business Intelligence
        </span>
        <h1 className="mt-6 text-4xl font-extrabold leading-tight text-white md:text-6xl">
          Intelligence that moves with you
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-slate-400">
          Connect your data, ask questions in plain English, and get instant
          SQL-backed answers, dashboards, and insights — powered by InsightIQ&apos;s
          AI agent.
        </p>
        <div className="mt-10 flex gap-4">
          <Link
            to="/register"
            className="rounded-lg bg-electric px-6 py-3 text-base font-semibold text-white transition hover:bg-electric-light"
          >
            Start free
          </Link>
          <a
            href="#features"
            className="rounded-lg border border-border-subtle px-6 py-3 text-base font-semibold text-slate-200 transition hover:border-electric"
          >
            See how it works
          </a>
        </div>
      </main>

      <section
        id="features"
        className="mx-auto mt-32 grid max-w-5xl grid-cols-1 gap-6 px-6 pb-24 md:grid-cols-3"
      >
        {[
          {
            title: 'Ask in plain English',
            desc: 'No SQL required. Describe what you want to know and let the AI agent write the query.',
          },
          {
            title: 'Live dashboards',
            desc: 'Auto-generated charts and drag-and-drop layouts, saved and shared with your team.',
          },
          {
            title: 'Proactive insights',
            desc: 'Anomaly detection and daily summaries land in your inbox before you have to ask.',
          },
        ].map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-border-subtle bg-surface p-6 text-left"
          >
            <h3 className="text-lg font-semibold text-white">{f.title}</h3>
            <p className="mt-2 text-sm text-slate-400">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
