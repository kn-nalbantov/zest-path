import PhoneShell from '../components/PhoneShell'
import BottomNav from '../components/BottomNav'
import {
  FlameIcon,
  BoltIcon,
  StarIcon,
  UtensilsIcon,
} from '../components/Icons'
import './StartScreen.css'

const RECENT_PLATES = [
  {
    id: 1,
    cook: 'Alex J.',
    dish: 'Garden Crunch Salad',
    rating: 4.8,
    tone: 'salad',
  },
  {
    id: 2,
    cook: 'Sarah M.',
    dish: 'Avocado Toast',
    rating: 4.9,
    tone: 'toast',
  },
]

export default function StartScreen({ activeTab, onTabChange, user, onOpenProfile }) {
  const questProgress = 40
  const displayName = user?.isGuest ? 'Guest Chef' : user?.name || 'Chef'
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <PhoneShell>
      <main className="screen start-screen">
        <header className="screen-header">
          <div className="screen-header__identity">
            <button
              type="button"
              className="avatar-button"
              onClick={onOpenProfile}
              aria-label="Open profile"
            >
              {user?.avatarUrl ? (
                <img className="avatar avatar--image" src={user.avatarUrl} alt="" />
              ) : (
                <div className="avatar" aria-hidden="true">
                  <span>{initials || 'ZP'}</span>
                </div>
              )}
            </button>
            <div className="screen-header__copy">
              <h1 className="brand">ZestPath</h1>
              <p className="screen-header__user">{displayName}</p>
            </div>
          </div>

          <div className="screen-header__stats">
            <div className="chip chip--streak" title="Day streak">
              <FlameIcon size={16} />
              <span>{user?.streakDays ?? 0}</span>
            </div>
            <div className="chip chip--xp" title="Experience points">
              <span>{user?.xp ?? 0} XP</span>
            </div>
          </div>
        </header>

        <section className="card quest-card" aria-labelledby="daily-quest-title">
          <div className="quest-card__top">
            <h2 id="daily-quest-title">Daily Quest</h2>
            <span className="quest-card__timer">Refreshes in 12h</span>
          </div>

          <div className="quest-card__body">
            <div className="quest-card__copy">
              <p className="quest-card__task">Cook with Greens</p>
              <p className="quest-card__reward">+20 XP</p>
            </div>
            <div
              className="progress"
              role="progressbar"
              aria-valuenow={questProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Daily quest progress"
            >
              <div className="progress__fill" style={{ width: `${questProgress}%` }} />
            </div>
          </div>
        </section>

        <button type="button" className="btn btn--primary btn--hero">
          <BoltIcon />
          Quick AI Recipe
        </button>

        <section className="section" aria-labelledby="recent-plates-title">
          <div className="section__head">
            <h2 id="recent-plates-title">Recent Plates</h2>
          </div>

          <div className="plates-row">
            {RECENT_PLATES.map((plate) => (
              <article key={plate.id} className="card plate-card">
                <div className={`plate-card__media plate-card__media--${plate.tone}`} aria-hidden="true">
                  <div className="plate-card__shine" />
                </div>
                <div className="plate-card__meta">
                  <p className="plate-card__cook">{plate.cook}</p>
                  <h3 className="plate-card__dish">{plate.dish}</h3>
                  <p className="plate-card__rating">
                    <FlameIcon size={14} />
                    {plate.rating}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="stats-grid" aria-label="Your cooking stats">
          <div className="card stat-card">
            <div className="stat-card__icon stat-card__icon--green">
              <UtensilsIcon size={26} />
            </div>
            <p className="stat-card__value">12</p>
            <p className="stat-card__label">Dishes Cooked</p>
          </div>

          <div className="card stat-card">
            <div className="stat-card__icon stat-card__icon--gold">
              <StarIcon size={26} />
            </div>
            <p className="stat-card__value">Master Chef</p>
            <p className="stat-card__label">Level</p>
          </div>
        </section>
      </main>

      <BottomNav active={activeTab} onChange={onTabChange} />
    </PhoneShell>
  )
}
