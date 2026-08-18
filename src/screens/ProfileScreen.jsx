import { useEffect, useState } from 'react'
import PhoneShell from '../components/PhoneShell'
import { FlameIcon, StarIcon } from '../components/Icons'
import { fetchSkills, googleAuthUrl } from '../api/client'
import './ProfileScreen.css'

export default function ProfileScreen({
  user,
  googleEnabled,
  onBack,
  onLogout,
}) {
  const [stats, setStats] = useState({ completed: 0, current: 0, total: 0 })
  const [logoutBusy, setLogoutBusy] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)

  const displayName = user?.isGuest ? 'Guest Chef' : user?.name || 'Chef'
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  useEffect(() => {
    let cancelled = false
    fetchSkills()
      .then((data) => {
        if (cancelled) return
        const skills = data.skills ?? []
        setStats({
          total: skills.length,
          completed: skills.filter((s) => s.status === 'complete').length,
          current: skills.filter((s) => s.status === 'current').length,
        })
      })
      .catch(() => {
        if (!cancelled) setStats({ completed: 0, current: 0, total: 0 })
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleLogout() {
    if (!confirmLogout) {
      setConfirmLogout(true)
      return
    }
    setLogoutBusy(true)
    try {
      await onLogout?.()
    } finally {
      setLogoutBusy(false)
    }
  }

  return (
    <PhoneShell>
      <main className="screen profile-screen">
        <header className="profile-top">
          <button type="button" className="profile-back" onClick={onBack} aria-label="Back">
            ←
          </button>
          <h1 className="profile-top__title">Profile</h1>
          <span className="profile-top__spacer" aria-hidden="true" />
        </header>

        <section className="profile-hero card">
          {user?.avatarUrl ? (
            <img className="avatar avatar--lg avatar--image" src={user.avatarUrl} alt="" />
          ) : (
            <div className="avatar avatar--lg" aria-hidden="true">
              <span>{initials || 'ZP'}</span>
            </div>
          )}
          <h2 className="profile-hero__name">{displayName}</h2>
          <p className="profile-hero__meta">
            {user?.isGuest ? 'Guest account' : user?.email || 'Google account'}
          </p>
          <div className="profile-hero__chips">
            <div className="chip chip--streak">
              <FlameIcon size={16} />
              <span>{user?.streakDays ?? 0} day streak</span>
            </div>
            <div className="chip chip--xp">
              <StarIcon size={16} />
              <span>{user?.xp ?? 0} XP</span>
            </div>
          </div>
        </section>

        <section className="profile-stats" aria-label="Learning stats">
          <div className="card profile-stat">
            <p className="profile-stat__value">{stats.completed}</p>
            <p className="profile-stat__label">Skills done</p>
          </div>
          <div className="card profile-stat">
            <p className="profile-stat__value">{stats.current}</p>
            <p className="profile-stat__label">In progress</p>
          </div>
          <div className="card profile-stat">
            <p className="profile-stat__value">{stats.total}</p>
            <p className="profile-stat__label">On path</p>
          </div>
        </section>

        {user?.isGuest && googleEnabled && (
          <section className="card profile-upgrade">
            <h3>Save your progress</h3>
            <p>Sign in with Google to keep your path across devices.</p>
            <a className="btn btn--primary" href={googleAuthUrl()}>
              Sign in with Google
            </a>
          </section>
        )}

        <section className="profile-logout">
          {confirmLogout && (
            <p className="profile-logout__warn" role="status">
              Tap again to confirm log out. Guest progress stays on this device until the session
              ends.
            </p>
          )}
          <button
            type="button"
            className={`btn ${confirmLogout ? 'btn--danger' : 'btn--ghost'}`}
            onClick={handleLogout}
            disabled={logoutBusy}
          >
            {logoutBusy ? 'Logging out…' : confirmLogout ? 'Confirm Log Out' : 'Log Out'}
          </button>
          {confirmLogout && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setConfirmLogout(false)}
              disabled={logoutBusy}
            >
              Cancel
            </button>
          )}
        </section>
      </main>
    </PhoneShell>
  )
}
