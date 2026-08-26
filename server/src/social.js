import { Router } from 'express'
import { prisma } from './progress.js'
import { requireAuth } from './auth.js'

function mapBadgeAward(row) {
  return {
    id: row.id,
    awardedAt: row.awardedAt,
    title: row.badge.title,
    description: row.badge.description,
    slug: row.badge.slug,
    icon: row.badge.icon,
    skillTitle: row.badge.skill?.title ?? null,
    skillSlug: row.badge.skill?.slug ?? null,
    user: row.user
      ? {
          id: row.user.id,
          name: row.user.isGuest ? 'Guest Chef' : row.user.name || 'Chef',
          avatarUrl: row.user.avatarUrl,
          isGuest: row.user.isGuest,
          xp: row.user.xp,
        }
      : undefined,
  }
}

export function createSocialRouter() {
  const router = Router()

  router.get('/feed', requireAuth, async (req, res) => {
    try {
      const myBadges = await prisma.userBadge.findMany({
        where: { userId: req.user.id },
        include: {
          badge: { include: { skill: { select: { title: true, slug: true } } } },
        },
        orderBy: { awardedAt: 'desc' },
      })

      const recentAwards = await prisma.userBadge.findMany({
        include: {
          badge: { include: { skill: { select: { title: true, slug: true } } } },
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              isGuest: true,
              xp: true,
            },
          },
        },
        orderBy: { awardedAt: 'desc' },
        take: 20,
      })

      const recentPlates = await prisma.plateUpload.findMany({
        where: { skipped: false, url: { not: null } },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              isGuest: true,
              xp: true,
            },
          },
          skill: { select: { title: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })

      const feed = [
        ...recentAwards.map((row) => ({
          id: `badge-${row.id}`,
          type: 'badge',
          createdAt: row.awardedAt,
          badge: mapBadgeAward(row),
          caption: `Just earned the ${row.badge.title} badge for finishing ${row.badge.skill?.title ?? 'a path'}!`,
        })),
        ...recentPlates.map((plate) => ({
          id: `plate-${plate.id}`,
          type: 'plate',
          createdAt: plate.createdAt,
          plate: {
            id: plate.id,
            url: plate.url,
            skillTitle: plate.skill?.title ?? null,
          },
          user: {
            id: plate.user.id,
            name: plate.user.isGuest ? 'Guest Chef' : plate.user.name || 'Chef',
            avatarUrl: plate.user.avatarUrl,
            xp: plate.user.xp,
          },
          caption: plate.skill
            ? `Shared a plate from ${plate.skill.title}.`
            : 'Shared a finished plate.',
        })),
      ]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 25)

      res.json({
        challenge: {
          title: 'Weekly Community Challenge: Summer Salads',
          participants: 1240,
          progress: 65,
        },
        myBadges: myBadges.map(mapBadgeAward),
        feed,
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: 'Failed to load social feed' })
    }
  })

  return router
}
