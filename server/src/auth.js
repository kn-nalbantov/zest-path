import { Router } from 'express'
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import {
  prisma,
  createGuestUser,
  mergeGuestIntoUser,
  mapUser,
  initProgressForUser,
} from './progress.js'

export function configurePassport() {
  passport.serializeUser((user, done) => {
    done(null, user.id)
  })

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } })
      done(null, user || false)
    } catch (error) {
      done(error)
    }
  })

  const clientID = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const callbackURL =
    process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/auth/google/callback'

  if (!clientID || !clientSecret) {
    console.warn('[auth] GOOGLE_CLIENT_ID/SECRET not set — Google OAuth disabled')
    return
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
        passReqToCallback: true,
      },
      async (req, _accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value ?? null
          const name = profile.displayName || 'Chef'
          const avatarUrl = profile.photos?.[0]?.value ?? null
          const googleId = profile.id

          let user = await prisma.user.findUnique({ where: { googleId } })
          if (!user && email) {
            user = await prisma.user.findUnique({ where: { email } })
          }

          if (user) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                googleId,
                email: email ?? user.email,
                name: name || user.name,
                avatarUrl: avatarUrl || user.avatarUrl,
                isGuest: false,
              },
            })
            const progressCount = await prisma.userSkillProgress.count({
              where: { userId: user.id },
            })
            if (progressCount === 0) {
              await initProgressForUser(user.id)
            }
          } else {
            user = await prisma.user.create({
              data: {
                googleId,
                email,
                name,
                avatarUrl,
                isGuest: false,
              },
            })
            await initProgressForUser(user.id)
          }

          const fromGuest = req.session?.guestMergeId
          if (fromGuest && fromGuest !== user.id) {
            await mergeGuestIntoUser(fromGuest, user.id)
            delete req.session.guestMergeId
          }

          done(null, user)
        } catch (error) {
          done(error)
        }
      },
    ),
  )
}

export function requireAuth(req, res, next) {
  if (req.isAuthenticated?.() && req.user) {
    return next()
  }
  return res.status(401).json({ error: 'Authentication required' })
}

export function createAuthRouter() {
  const router = Router()
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  )

  router.post('/guest', async (req, res) => {
    try {
      if (req.isAuthenticated?.() && req.user) {
        return res.json({ user: mapUser(req.user) })
      }

      const user = await createGuestUser()
      await new Promise((resolve, reject) => {
        req.login(user, (err) => (err ? reject(err) : resolve()))
      })
      res.json({ user: mapUser(user) })
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: 'Failed to start guest session' })
    }
  })

  router.get('/google', (req, res, next) => {
    if (!googleEnabled) {
      return res.status(503).json({
        error: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
      })
    }
    if (req.user?.isGuest) {
      req.session.guestMergeId = req.user.id
    }
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      prompt: 'select_account',
    })(req, res, next)
  })

  router.get(
    '/google/callback',
    (req, res, next) => {
      if (!googleEnabled) {
        return res.redirect(`${clientUrl}/?authError=google_disabled`)
      }
      passport.authenticate('google', {
        failureRedirect: `${clientUrl}/?authError=google_failed`,
      })(req, res, next)
    },
    (req, res) => {
      res.redirect(`${clientUrl}/?auth=ok`)
    },
  )

  router.get('/me', (req, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }
    res.json({
      user: mapUser(req.user),
      googleEnabled,
    })
  })

  router.get('/status', (_req, res) => {
    res.json({ googleEnabled })
  })

  router.post('/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error(err)
        return res.status(500).json({ error: 'Failed to log out' })
      }
      req.session.destroy(() => {
        res.clearCookie('connect.sid')
        res.json({ ok: true })
      })
    })
  })

  return router
}
