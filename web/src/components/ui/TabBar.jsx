import { Home, Search, Plus, BarChart2, User } from 'lucide-react'
import { t } from '../../i18n.js'
import './ui.css'

function Tab({ label, active, onClick, children }) {
  return (
    <button className={`ui-tab ${active ? 'ui-tab--on' : ''}`} onClick={onClick} aria-label={label}
      aria-current={active ? 'page' : undefined}>
      {children}
    </button>
  )
}

export default function TabBar({ active = 'home', onHome, onSearch, onCreate, onTop, onProfile }) {
  const icon = { size: 24, strokeWidth: 1.9 }
  return (
    <nav className="ui-tabbar">
      <Tab label={t('tab_home_aria')} active={active === 'home'} onClick={onHome}><Home {...icon} /></Tab>
      <Tab label={t('search_aria')} active={active === 'search'} onClick={onSearch}><Search {...icon} /></Tab>
      <button className="ui-tabbar__create" onClick={onCreate} aria-label={t('post_look')}>
        <Plus size={26} strokeWidth={2.2} />
      </button>
      <Tab label={t('tab_top_aria')} active={active === 'top'} onClick={onTop}><BarChart2 {...icon} /></Tab>
      <Tab label={t('my_profile_aria')} active={active === 'profile'} onClick={onProfile}><User {...icon} /></Tab>
    </nav>
  )
}
