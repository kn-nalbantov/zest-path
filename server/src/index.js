import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import session from 'express-session'
import passport from 'passport'
import connectPgSimple from 'connect-pg-simple'
import pg from 'pg'
import { configurePassport, createAuthRouter } from './auth.js'
import { createSkillsRouter, uploadsDir } from './skills.js'
import { createSocialRouter } from './social.js'
import { createInventoryRouter } from './inventory.js'
import { createAiRouter } from './ai.js'

const app = express()
const PORT = Number(process.env.PORT) || 4000
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
const useSsl = /sslmode=require/i.test(process.env.DATABASE_URL || '')
const cookieSecure = process.env.COOKIE_SECURE === 'true'

const PgSession = connectPgSimple(session)
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
})

app.set('trust proxy', 1)

app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  }),
)
app.use(express.json({ limit: '2mb' }))
app.use('/uploads', express.static(uploadsDir))

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: 'user_sessions',
      createTableIfMissing: true,
    }),
    name: 'connect.sid',
    secret: process.env.SESSION_SECRET || 'zestpath-dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: cookieSecure,
      maxAge: 1000 * 60 * 60 * 24 * 60, // 60 days
    },
  }),
)

configurePassport()
app.use(passport.initialize())
app.use(passport.session())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'zestpath-api' })
})

app.use('/api/auth', createAuthRouter())
app.use('/api/skills', createSkillsRouter())
app.use('/api/social', createSocialRouter())
app.use('/api/inventory', createInventoryRouter())
app.use('/api/ai', createAiRouter())

app.listen(PORT, () => {
  console.log(`ZestPath API listening on http://localhost:${PORT}`)
})
