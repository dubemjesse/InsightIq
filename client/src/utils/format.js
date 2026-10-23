/** Compact "3m ago" / "5h ago" / "2d ago" relative time, falling back to a date. */
export function relativeTime(input) {
  if (!input) return null;
  const then = new Date(input).getTime();
  if (Number.isNaN(then)) return null;

  const diff = Date.now() - then;
  if (diff < 60_000) return 'just now';

  const minutes = Math.round(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;

  return new Date(input).toLocaleDateString();
}

/** "Aug 31" from a YYYY-MM-DD key, anchored to local noon to dodge TZ drift. */
export function shortDate(dateKey) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}
