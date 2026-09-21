import { useId } from 'react'
import './DripCoin.css'

// Валюта Driply. tone="drip" — монета в --drip с буквой --on-drip;
// tone="ink" — монета цветом текста, буква прорезана и показывает фон под ней.
export default function DripCoin({ size = 16, tone = 'drip', className = '', title }) {
  const maskId = 'dc' + useId().replace(/:/g, '')
  const letter = (
    <text x="12" y="12.6" textAnchor="middle" dominantBaseline="central"
      fontFamily="Unbounded, system-ui, sans-serif" fontWeight="900" fontSize="14">d</text>
  )

  return (
    <svg
      className={`dripcoin dripcoin--${tone} ${className}`}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : 'true'}
    >
      {tone === 'ink' ? (
        <>
          <mask id={maskId}>
            <rect width="24" height="24" fill="#fff" />
            <g fill="#000">{letter}</g>
          </mask>
          <circle cx="12" cy="12" r="12" fill="currentColor" mask={`url(#${maskId})`} />
        </>
      ) : (
        <>
          <circle className="dripcoin__disc" cx="12" cy="12" r="12" />
          <g className="dripcoin__letter">{letter}</g>
        </>
      )}
    </svg>
  )
}
