import { PrismaClient, SkillStatus } from '@prisma/client'

const prisma = new PrismaClient()

export function mapUser(user) {
  if (!user) return null
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    isGuest: user.isGuest,
    xp: user.xp,
    streakDays: user.streakDays,
  }
}

/** Create default path progress: first skill CURRENT, rest LOCKED. */
export async function initProgressForUser(userId, client = prisma) {
  const skills = await client.skill.findMany({
    orderBy: { sortOrder: 'asc' },
    select: { id: true },
  })

  if (skills.length === 0) return

  await client.userSkillProgress.createMany({
    data: skills.map((skill, index) => ({
      userId,
      skillId: skill.id,
      status: index === 0 ? SkillStatus.CURRENT : SkillStatus.LOCKED,
      progress: 0,
    })),
    skipDuplicates: true,
  })
}

export async function createGuestUser(client = prisma) {
  const user = await client.user.create({
    data: {
      isGuest: true,
      name: 'Guest Chef',
    },
  })
  await initProgressForUser(user.id, client)
  return user
}

/**
 * Move guest progress onto a Google account, then delete the guest.
 * Prefer keeping the Google user's XP and merging missing completions.
 */
export async function mergeGuestIntoUser(guestId, targetUserId, client = prisma) {
  if (guestId === targetUserId) return

  const [guest, target] = await Promise.all([
    client.user.findUnique({ where: { id: guestId } }),
    client.user.findUnique({ where: { id: targetUserId } }),
  ])

  if (!guest?.isGuest || !target) return

  const guestTasks = await client.userTaskProgress.findMany({
    where: { userId: guestId },
  })

  for (const row of guestTasks) {
    await client.userTaskProgress.upsert({
      where: {
        userId_taskId: { userId: targetUserId, taskId: row.taskId },
      },
      create: {
        userId: targetUserId,
        taskId: row.taskId,
        completedAt: row.completedAt,
      },
      update: {},
    })
  }

  const guestSkills = await client.userSkillProgress.findMany({
    where: { userId: guestId },
  })

  const rank = { LOCKED: 0, CURRENT: 1, COMPLETE: 2 }

  for (const row of guestSkills) {
    const existing = await client.userSkillProgress.findUnique({
      where: {
        userId_skillId: { userId: targetUserId, skillId: row.skillId },
      },
    })

    if (!existing) {
      await client.userSkillProgress.create({
        data: {
          userId: targetUserId,
          skillId: row.skillId,
          status: row.status,
          progress: row.progress,
        },
      })
      continue
    }

    const betterStatus =
      rank[row.status] > rank[existing.status] ? row.status : existing.status
    const betterProgress = Math.max(row.progress, existing.progress)

    await client.userSkillProgress.update({
      where: { id: existing.id },
      data: {
        status: betterStatus,
        progress: betterProgress,
      },
    })
  }

  const guestPlates = await client.plateUpload.findMany({
    where: { userId: guestId },
  })
  for (const plate of guestPlates) {
    await client.plateUpload.update({
      where: { id: plate.id },
      data: { userId: targetUserId },
    })
  }

  const guestBadges = await client.userBadge.findMany({
    where: { userId: guestId },
  })
  for (const row of guestBadges) {
    await client.userBadge.upsert({
      where: {
        userId_badgeId: { userId: targetUserId, badgeId: row.badgeId },
      },
      create: {
        userId: targetUserId,
        badgeId: row.badgeId,
        awardedAt: row.awardedAt,
      },
      update: {},
    })
  }

  await client.user.update({
    where: { id: targetUserId },
    data: {
      xp: Math.max(guest.xp, target.xp),
      streakDays: Math.max(guest.streakDays, target.streakDays),
    },
  })

  await client.user.delete({ where: { id: guestId } })
}

export async function awardBadgeForSkill(userId, skillId, client = prisma) {
  const badge = await client.badge.findUnique({ where: { skillId } })
  if (!badge) return null

  const existing = await client.userBadge.findUnique({
    where: {
      userId_badgeId: { userId, badgeId: badge.id },
    },
  })
  if (existing) return existing

  return client.userBadge.create({
    data: {
      userId,
      badgeId: badge.id,
    },
    include: { badge: true },
  })
}

export async function recomputeSkillProgress(userId, skillId, client = prisma) {
  const skill = await client.skill.findUnique({
    where: { id: skillId },
    include: {
      tasks: { select: { id: true } },
    },
  })
  if (!skill) return null

  const completed = await client.userTaskProgress.count({
    where: {
      userId,
      taskId: { in: skill.tasks.map((t) => t.id) },
    },
  })

  const total = skill.tasks.length || 1
  const progress = Math.round((completed / total) * 100)
  const isComplete = completed >= skill.tasks.length && skill.tasks.length > 0

  const current = await client.userSkillProgress.findUnique({
    where: { userId_skillId: { userId, skillId } },
  })

  const wasComplete = current?.status === SkillStatus.COMPLETE

  let status = current?.status ?? SkillStatus.LOCKED
  if (isComplete) {
    status = SkillStatus.COMPLETE
  } else if (status === SkillStatus.LOCKED && completed > 0) {
    status = SkillStatus.CURRENT
  } else if (status !== SkillStatus.COMPLETE && completed > 0) {
    status = SkillStatus.CURRENT
  }

  const updated = await client.userSkillProgress.upsert({
    where: { userId_skillId: { userId, skillId } },
    create: {
      userId,
      skillId,
      status,
      progress,
    },
    update: {
      status,
      progress,
    },
  })

  let awardedBadge = null
  if (isComplete) {
    await unlockNextSkill(userId, skill.sortOrder, client)
    if (!wasComplete) {
      awardedBadge = await awardBadgeForSkill(userId, skillId, client)
    }
  }

  return { progress: updated, awardedBadge }
}

async function unlockNextSkill(userId, completedSortOrder, client) {
  const next = await client.skill.findFirst({
    where: { sortOrder: { gt: completedSortOrder } },
    orderBy: { sortOrder: 'asc' },
  })
  if (!next) return

  const existing = await client.userSkillProgress.findUnique({
    where: { userId_skillId: { userId, skillId: next.id } },
  })

  if (!existing) {
    await client.userSkillProgress.create({
      data: {
        userId,
        skillId: next.id,
        status: SkillStatus.CURRENT,
        progress: 0,
      },
    })
    return
  }

  if (existing.status === SkillStatus.LOCKED) {
    await client.userSkillProgress.update({
      where: { id: existing.id },
      data: { status: SkillStatus.CURRENT },
    })
  }
}

export { prisma }
