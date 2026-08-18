import PhoneShell from '../components/PhoneShell'
import { googleAuthUrl } from '../api/client'
import './AuthGate.css'

export default function AuthGate({ googleEnabled, onGuest, busy, error }) {
  return (
    <PhoneShell>
      <main className="screen auth-gate">
        <div className="auth-gate__hero">
          <div className="avatar auth-gate__logo" aria-hidden="true">
            <span>ZP</span>
          </div>
          <h1 className="brand">ZestPath</h1>
          <p className="auth-gate__tagline">
            Learn cooking the playful way — save your path as a guest or with Google.
          </p>
        </div>

        <div className="auth-gate__actions">
          {googleEnabled ? (
            <a className="btn btn--primary auth-gate__google" href={googleAuthUrl()}>
              Sign in with Google
            </a>
          ) : (
            <button type="button" className="btn btn--primary" disabled>
              Google sign-in unavailable
            </button>
          )}

          <button
            type="button"
            className="btn btn--ghost"
            onClick={onGuest}
            disabled={busy}
          >
            {busy ? 'Starting…' : 'Continue as Guest'}
          </button>
        </div>

        {!googleEnabled && (
          <p className="auth-gate__hint">
            Add Google OAuth keys in <code>server/.env</code> to enable sign-in. Guest mode
            still saves progress in Postgres.
          </p>
        )}

        {error && <p className="auth-gate__error">{error}</p>}
      </main>
    </PhoneShell>
  )
}
