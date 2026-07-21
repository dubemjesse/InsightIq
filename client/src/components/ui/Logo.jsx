/**
 * InsightIQ brand mark: a hexagon "data node" with connecting nodes,
 * paired with the wordmark. Renders icon-only when `withText` is false.
 */
export default function Logo({ withText = true, size = 32, className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M24 3L42.4 13.5V34.5L24 45L5.6 34.5V13.5L24 3Z"
          fill="#03122A"
          stroke="#378ADD"
          strokeWidth="2"
        />
        <circle cx="24" cy="24" r="4" fill="#97C459" />
        <circle cx="24" cy="12" r="2.5" fill="#378ADD" />
        <circle cx="34.5" cy="30" r="2.5" fill="#378ADD" />
        <circle cx="13.5" cy="30" r="2.5" fill="#378ADD" />
        <path d="M24 16V20M20.5 26L15.5 28.5M27.5 26L32.5 28.5" stroke="#378ADD" strokeWidth="1.5" />
      </svg>
      {withText && (
        <span className="text-xl font-bold tracking-tight text-white">
          Insight<span className="text-electric">IQ</span>
        </span>
      )}
    </div>
  );
}
