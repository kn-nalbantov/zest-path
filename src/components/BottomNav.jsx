import { HomeIcon, PathIcon, ChefBotIcon, SocialIcon } from './Icons'
import './BottomNav.css'

const TABS = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'path', label: 'Path', Icon: PathIcon },
  { id: 'ai', label: 'AI Chef', Icon: ChefBotIcon },
  { id: 'social', label: 'Social', Icon: SocialIcon },
]

export default function BottomNav({ active = 'home', onChange }) {
  return (
    <nav className="bottom-nav" aria-label="Main">
      {TABS.map(({ id, label, Icon }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            type="button"
            className={`bottom-nav__item${isActive ? ' is-active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onChange?.(id)}
          >
            <span className="bottom-nav__icon">
              <Icon />
            </span>
            {isActive && <span className="bottom-nav__label">{label}</span>}
          </button>
        )
      })}
    </nav>
  )
}
