export function BolaMurcha({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 18 11"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="gol contra"
    >
      {/* Oval achatado — corpo da bola murcha */}
      <ellipse cx="9" cy="8" rx="8" ry="2.8" stroke="currentColor" strokeWidth="1.4" />
      {/* Arco superior — silhueta de quando era redonda */}
      <path d="M3 6.5 Q9 1.5 15 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      {/* Mancha central */}
      <ellipse cx="9" cy="8" rx="2.8" ry="1" fill="currentColor" opacity="0.35" />
    </svg>
  )
}
