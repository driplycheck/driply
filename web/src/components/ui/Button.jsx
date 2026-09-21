import DripCoin from './DripCoin.jsx'
import './ui.css'

// variant: primary | secondary | drip (монета + подпись на --drip)
export default function Button({ variant = 'primary', className = '', children, ...rest }) {
  return (
    <button className={`ui-btn ui-btn--${variant} ${className}`} {...rest}>
      {variant === 'drip' && <DripCoin size={16} tone="ink" />}
      {children}
    </button>
  )
}
