import { useCallback, useEffect, useState } from 'react'
import AuthGate from './screens/AuthGate'
import StartScreen from './screens/StartScreen'
import PathScreen from './screens/PathScreen'
import LessonScreen from './screens/LessonScreen'
import ProfileScreen from './screens/ProfileScreen'
import SocialScreen from './screens/SocialScreen'
import {
  fetchAuthStatus,
  fetchMe,
  startGuestSession,
  logout as apiLogout,
} from './api/client'
import './styles/shared.css'
import './App.css'

const PLACEHOLDER_TABS = new Set(['ai'])

export default function App() {
  const [bootstrapping, setBootstrapping] = useState(true)
  const [user, setUser] = useState(null)
  const [googleEnabled, setGoogleEnabled] = useState(false)
  const [authError, setAuthError] = useState('')
  const [guestBusy, setGuestBusy] = useState(false)
  const [tab, setTab] = useState('home')
  const [lessonSlug, setLessonSlug] = useState(null)
  const [showProfile, setShowProfile] = useState(false)

  const refreshUser = useCallback(async () => {
    const data = await fetchMe()
    setUser(data.user)
    if (typeof data.googleEnabled === 'boolean') {
      setGoogleEnabled(data.googleEnabled)
    }
    return data.user
  }, [])

  useEffect(() => {
    let cancelled = false

    async function boot() {
      const params = new URLSearchParams(window.location.search)
      if (params.get('authError')) {
        setAuthError('Google sign-in failed. You can continue as a guest.')
      }
      if (params.get('auth') || params.get('authError')) {
        window.history.replaceState({}, '', window.location.pathname)
      }

      try {
        const status = await fetchAuthStatus()
        if (!cancelled) setGoogleEnabled(Boolean(status.googleEnabled))
      } catch {
        /* ignore */
      }

      try {
        await refreshUser()
      } catch {
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setBootstrapping(false)
      }
    }

    boot()
    return () => {
      cancelled = true
    }
  }, [refreshUser])

  async function handleGuest() {
    setGuestBusy(true)
    setAuthError('')
    try {
      const data = await startGuestSession()
      setUser(data.user)
    } catch (err) {
      setAuthError(err.message || 'Could not start guest session')
    } finally {
      setGuestBusy(false)
    }
  }

  async function handleLogout() {
    try {
      await apiLogout()
    } catch {
      /* ignore */
    }
    setUser(null)
    setTab('home')
    setLessonSlug(null)
    setShowProfile(false)
  }

  const handleTabChange = (next) => {
    if (PLACEHOLDER_TABS.has(next)) return
    setLessonSlug(null)
    setShowProfile(false)
    setTab(next)
  }

  const openProfile = () => {
    setLessonSlug(null)
    setShowProfile(true)
  }

  if (bootstrapping) {
    return (
      <div className="app">
        <div className="app-boot">Loading ZestPath…</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="app">
        <AuthGate
          googleEnabled={googleEnabled}
          onGuest={handleGuest}
          busy={guestBusy}
          error={authError}
        />
      </div>
    )
  }

  if (lessonSlug) {
    return (
      <div className="app">
        <LessonScreen
          skillSlug={lessonSlug}
          user={user}
          onUserXp={(xp) => setUser((current) => ({ ...current, xp }))}
          onExit={() => setLessonSlug(null)}
          onComplete={async () => {
            try {
              await refreshUser()
            } catch {
              /* ignore */
            }
            setLessonSlug(null)
            setTab('path')
          }}
        />
      </div>
    )
  }

  if (showProfile) {
    return (
      <div className="app">
        <ProfileScreen
          user={user}
          googleEnabled={googleEnabled}
          onBack={() => setShowProfile(false)}
          onLogout={handleLogout}
        />
      </div>
    )
  }

  return (
    <div className="app">
      {tab === 'path' ? (
        <PathScreen
          activeTab={tab}
          onTabChange={handleTabChange}
          onStartLesson={setLessonSlug}
          onOpenProfile={openProfile}
          user={user}
        />
      ) : tab === 'social' ? (
        <SocialScreen
          activeTab={tab}
          onTabChange={handleTabChange}
          onOpenProfile={openProfile}
          user={user}
        />
      ) : (
        <StartScreen
          activeTab={tab}
          onTabChange={handleTabChange}
          onOpenProfile={openProfile}
          user={user}
        />
      )}
    </div>
  )
}
