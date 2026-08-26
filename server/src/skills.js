import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { SkillStatus } from '@prisma/client'
import { prisma, recomputeSkillProgress } from './progress.js'
import { requireAuth } from './auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsDir = path.join(__dirname, '..', 'uploads')
fs.mkdirSync(uploadsDir, { recursive: true })

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
      cb(null, `${Date.now()}-${safe}`)
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'))
    }
    cb(null, true)
  },
})

function mapTask(task) {
  return {
    id: task.id,
    sortOrder: task.sortOrder,
    type: task.type,
    prompt: task.prompt,
    xpReward: task.xpReward,
    payload: task.payload,
  }
}

function evaluateAnswer(payload, selectedIds) {
  const mode = payload?.answer?.mode
  const correctIds = payload?.answer?.correctIds ?? []

  if (mode === 'ordered') {
    return (
      selectedIds.length === correctIds.length &&
      selectedIds.every((id, index) => id === correctIds[index])
    )
  }

  if (mode === 'multiple' || mode === 'recipe') {
    const selected = [...selectedIds].sort()
    const correct = [...correctIds].sort()
    return (
      selected.length === correct.length &&
      selected.every((id, index) => id === correct[index])
    )
  }

  return selectedIds.length === 1 && selectedIds[0] === correctIds[0]
}

export function createSkillsRouter() {
  const router = Router()

  router.get('/', requireAuth, async (req, res) => {
    try {
      const skills = await prisma.skill.findMany({
        orderBy: { sortOrder: 'asc' },
        include: {
          _count: { select: { tasks: true } },
          progress: {
            where: { userId: req.user.id },
            take: 1,
          },
        },
      })

      res.json({
        skills: skills.map((skill) => {
          const userProgress = skill.progress[0]
          const status = (userProgress?.status ?? SkillStatus.LOCKED).toLowerCase()
          const progress = userProgress?.progress ?? 0
          const icon =
            status === 'complete'
              ? 'crown'
              : status === 'current'
                ? 'flame'
                : 'lock'

          return {
            id: skill.id,
            slug: skill.slug,
            title: skill.title,
            description: skill.description,
            tip: skill.tip,
            sortOrder: skill.sortOrder,
            status,
            icon,
            taskCount: skill._count.tasks,
            progress,
          }
        }),
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: 'Failed to load skills' })
    }
  })

  router.get('/:slug/tasks', requireAuth, async (req, res) => {
    try {
      const skill = await prisma.skill.findUnique({
        where: { slug: req.params.slug },
        include: {
          tasks: { orderBy: { sortOrder: 'asc' } },
          progress: {
            where: { userId: req.user.id },
            take: 1,
          },
        },
      })

      if (!skill) {
        return res.status(404).json({ error: 'Skill not found' })
      }

      const userProgress = skill.progress[0]
      const status = (userProgress?.status ?? SkillStatus.LOCKED).toLowerCase()

      if (status === 'locked') {
        return res.status(403).json({ error: 'Skill is locked' })
      }

      const completed = await prisma.userTaskProgress.findMany({
        where: {
          userId: req.user.id,
          taskId: { in: skill.tasks.map((t) => t.id) },
        },
        select: { taskId: true },
      })
      const completedSet = new Set(completed.map((row) => row.taskId))

      res.json({
        skill: {
          id: skill.id,
          slug: skill.slug,
          title: skill.title,
          status,
          progress: userProgress?.progress ?? 0,
        },
        tasks: skill.tasks.map((task) => ({
          ...mapTask(task),
          completed: completedSet.has(task.id),
        })),
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: 'Failed to load tasks' })
    }
  })

  router.post('/:slug/check', requireAuth, async (req, res) => {
    try {
      const { taskId, selectedIds } = req.body ?? {}
      if (!taskId || !Array.isArray(selectedIds)) {
        return res.status(400).json({ error: 'taskId and selectedIds[] are required' })
      }

      const skill = await prisma.skill.findUnique({
        where: { slug: req.params.slug },
        include: { tasks: true },
      })

      if (!skill) {
        return res.status(404).json({ error: 'Skill not found' })
      }

      const task = skill.tasks.find((item) => item.id === taskId)
      if (!task) {
        return res.status(404).json({ error: 'Task not found' })
      }

      const payload = task.payload
      const isCorrect = evaluateAnswer(payload, selectedIds)

      let xpAwarded = 0
      let awardedBadge = null
      if (isCorrect) {
        const existing = await prisma.userTaskProgress.findUnique({
          where: {
            userId_taskId: { userId: req.user.id, taskId: task.id },
          },
        })

        if (!existing) {
          await prisma.userTaskProgress.create({
            data: {
              userId: req.user.id,
              taskId: task.id,
            },
          })
          xpAwarded = task.xpReward
          await prisma.user.update({
            where: { id: req.user.id },
            data: { xp: { increment: xpAwarded } },
          })
          req.user.xp += xpAwarded
        }

        const progressResult = await recomputeSkillProgress(req.user.id, skill.id)
        if (progressResult?.awardedBadge?.badge) {
          const b = progressResult.awardedBadge.badge
          awardedBadge = {
            id: progressResult.awardedBadge.id,
            awardedAt: progressResult.awardedBadge.awardedAt,
            title: b.title,
            description: b.description,
            slug: b.slug,
            icon: b.icon,
            skillTitle: skill.title,
          }
        }
      }

      res.json({
        correct: isCorrect,
        xpAwarded,
        feedback: isCorrect ? payload.feedback.correct : payload.feedback.incorrect,
        correctIds: isCorrect ? undefined : payload?.answer?.correctIds,
        userXp: req.user.xp,
        awardedBadge,
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: 'Failed to check answer' })
    }
  })

  router.post('/:slug/plate', requireAuth, (req, res) => {
    upload.single('photo')(req, res, async (err) => {
      try {
        if (err) {
          return res.status(400).json({ error: err.message || 'Upload failed' })
        }

        const skipped = req.body?.skipped === 'true' || req.body?.skipped === true
        const skill = await prisma.skill.findUnique({
          where: { slug: req.params.slug },
          include: {
            tasks: {
              where: { type: 'RECIPE_COMPLETE' },
              orderBy: { sortOrder: 'desc' },
              take: 1,
            },
          },
        })

        if (!skill) {
          return res.status(404).json({ error: 'Skill not found' })
        }

        const recipeTask = skill.tasks[0]
        const photoMeta = recipeTask?.payload?.photo
        let xpBonus = 0

        if (!skipped && req.file && photoMeta?.xpBonus) {
          xpBonus = Number(photoMeta.xpBonus) || 0
          if (xpBonus > 0) {
            await prisma.user.update({
              where: { id: req.user.id },
              data: { xp: { increment: xpBonus } },
            })
            req.user.xp += xpBonus
          }
        }

        const storageKey = req.file ? req.file.filename : null
        const url = req.file ? `/uploads/${req.file.filename}` : null

        const plate = await prisma.plateUpload.create({
          data: {
            userId: req.user.id,
            skillId: skill.id,
            taskId: recipeTask?.id,
            storageKey,
            url,
            skipped: Boolean(skipped) || !req.file,
          },
        })

        res.json({
          plate: {
            id: plate.id,
            url: plate.url,
            skipped: plate.skipped,
          },
          xpBonus,
          userXp: req.user.xp,
        })
      } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Failed to save plate' })
      }
    })
  })

  return router
}

export { uploadsDir }
