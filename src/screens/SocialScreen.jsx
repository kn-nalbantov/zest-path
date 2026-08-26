import { useEffect, useMemo, useState } from 'react'
import PhoneShell from '../components/PhoneShell'
import BottomNav from '../components/BottomNav'
import { CrownIcon, FlameIcon, StarIcon, LockIcon } from '../components/Icons'
import { fetchSocialFeed } from '../api/client'
import './SocialScreen.css'

function timeAgo(value) {
  const ms = Date.now() - new Date(value).getTime()
  const mins = Math.max(1, Math.round(ms / 60000))
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

function BadgeGlyph({ icon, size = 28 }) {
  if (icon === 'flame') return <FlameIcon size={size} />
  if (icon === 'pot' || icon === 'lock') return <LockIcon size={size} />
  return <CrownIcon size={size} />
}

function levelFromXp(xp = 0) {
  return Math.max(1, Math.floor(xp / 50) + 1)
}

export default function SocialScreen({
  activeTab,
  onTabChange,
  user,
  onOpenProfile,
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [challenge, setChallenge] = useState(null)
  const [myBadges, setMyBadges] = useState([])
  const [feed, setFeed] = useState([])
  const [shareBadge, setShareBadge] = useState(null)
  const [shareStatus, setShareStatus] = useState('')

  const displayName = user?.isGuest ? 'Guest Chef' : user?.name || 'Chef'
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const shareText = useMemo(() => {
    if (!shareBadge) return ''
    return `I earned the ${shareBadge.title} badge on ZestPath for completing ${shareBadge.skillTitle || 'a cooking path'}! 🍳`
  }, [shareBadge])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await fetchSocialFeed()
        if (cancelled) return
        setChallenge(data.challenge)
        setMyBadges(data.myBadges ?? [])
        setFeed(data.feed ?? [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load social feed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleShare() {
    if (!shareBadge) return
    setShareStatus('')

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareBadge.title,
          text: shareText,
        })
        setShareStatus('Shared!')
        return
      } catch {
        /* fall through to clipboard */
      }
    }

    try {
      await navigator.clipboard.writeText(shareText)
      setShareStatus('Copied share text to clipboard')
    } catch {
      setShareStatus(shareText)
    }
  }

  return (
    <PhoneShell>
      <main className="screen social-screen">
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
            <h1 className="brand">ZestPath</h1>
          </div>
          <div className="screen-header__stats">
            <div className="chip chip--xp-outline" title="Experience points">
              <StarIcon size={16} />
              <span>{user?.xp ?? 0} XP</span>
            </div>
          </div>
        </header>

        {loading && <p className="social-status">Loading community…</p>}
        {error && !loading && <p className="social-status social-status--error">{error}</p>}

        {!loading && !error && (
          <>
            {challenge && (
              <section className="challenge-card" aria-labelledby="challenge-title">
                <p className="challenge-card__eyebrow">Community</p>
                <h2 id="challenge-title">{challenge.title}</h2>
                <p className="challenge-card__meta">
                  {challenge.participants.toLocaleString()} chefs participating
                </p>
                <div
                  className="progress challenge-card__progress"
                  role="progressbar"
                  aria-valuenow={challenge.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="progress__fill" style={{ width: `${challenge.progress}%` }} />
                </div>
                <p className="challenge-card__goal">{challenge.progress}% community goal</p>
              </section>
            )}

            <section className="badges-section" aria-labelledby="badges-title">
              <div className="section__head">
                <h2 id="badges-title">Your Badges</h2>
              </div>
              {myBadges.length === 0 ? (
                <p className="badges-empty">
                  Finish a path to earn your first badge — it will show up here to share.
                </p>
              ) : (
                <div className="badges-row">
                  {myBadges.map((badge) => (
                    <button
                      key={badge.id}
                      type="button"
                      className="badge-tile"
                      onClick={() => {
                        setShareBadge(badge)
                        setShareStatus('')
                      }}
                    >
                      <span className={`badge-tile__icon badge-tile__icon--${badge.icon}`}>
                        <BadgeGlyph icon={badge.icon} />
                      </span>
                      <span className="badge-tile__title">{badge.title}</span>
                      <span className="badge-tile__hint">Tap to share</span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="feed-section" aria-labelledby="feed-title">
              <div className="section__head">
                <h2 id="feed-title">Recent Activity</h2>
              </div>

              <div className="feed-list">
                {feed.length === 0 && (
                  <p className="badges-empty">No community posts yet. Complete a path to start the feed.</p>
                )}

                {feed.map((item) => {
                  const person =
                    item.type === 'badge' ? item.badge.user : item.user
                  const name = person?.name || 'Chef'
                  const personInitials = name
                    .split(/\s+/)
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()

                  return (
                    <article key={item.id} className="card feed-card">
                      <header className="feed-card__head">
                        {person?.avatarUrl ? (
                          <img className="avatar avatar--image" src={person.avatarUrl} alt="" />
                        ) : (
                          <div className="avatar" aria-hidden="true">
                            <span>{personInitials}</span>
                          </div>
                        )}
                        <div className="feed-card__who">
                          <p className="feed-card__name">{name}</p>
                          <p className="feed-card__meta">
                            {timeAgo(item.createdAt)} · Level {levelFromXp(person?.xp)}
                          </p>
                        </div>
                      </header>

                      {item.type === 'badge' ? (
                        <button
                          type="button"
                          className="feed-badge"
                          onClick={() => {
                            setShareBadge(item.badge)
                            setShareStatus('')
                          }}
                          aria-label={`Share ${item.badge.title} badge`}
                        >
                          <span className={`badge-tile__icon badge-tile__icon--${item.badge.icon}`}>
                            <BadgeGlyph icon={item.badge.icon} size={36} />
                          </span>
                          <span className="feed-badge__copy">
                            <strong>{item.badge.title}</strong>
                            <span>{item.badge.description}</span>
                          </span>
                        </button>
                      ) : (
                        <div className="feed-plate">
                          <img src={item.plate.url} alt="" />
                        </div>
                      )}

                      <p className="feed-card__caption">{item.caption}</p>

                      <div className="feed-card__actions">
                        <button type="button" className="btn btn--ghost feed-action">
                          Cheer
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost feed-action"
                          onClick={() => {
                            if (item.type === 'badge') {
                              setShareBadge(item.badge)
                              setShareStatus('')
                            }
                          }}
                          disabled={item.type !== 'badge'}
                        >
                          Share
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          </>
        )}
      </main>

      {shareBadge && (
        <div className="share-modal" role="dialog" aria-modal="true" aria-labelledby="share-title">
          <div className="share-modal__card">
            <div className={`badge-tile__icon badge-tile__icon--${shareBadge.icon} share-modal__glyph`}>
              <BadgeGlyph icon={shareBadge.icon} size={40} />
            </div>
            <h2 id="share-title">Share {shareBadge.title}</h2>
            <p className="share-modal__text">{shareText}</p>
            {shareStatus && <p className="share-modal__status">{shareStatus}</p>}
            <div className="share-modal__actions">
              <button type="button" className="btn btn--primary" onClick={handleShare}>
                Share Badge
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setShareBadge(null)
                  setShareStatus('')
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active={activeTab} onChange={onTabChange} />
    </PhoneShell>
  )
}
