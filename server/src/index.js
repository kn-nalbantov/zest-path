import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const app = express()
const PORT = Number(process.env.PORT) || 4000

app.use(cors())
app.use(express.json())

function mapSkill(skill) {
  const taskCount = skill.tasks?.length ?? skill._count?.tasks ?? 0
  const completedHint = skill.status === 'COMPLETE' ? 100 : skill.status === 'CURRENT' ? 75 : 0

  return {
    id: skill.id,
    slug: skill.slug,
    title: skill.title,
    description: skill.description,
    tip: skill.tip,
    sortOrder: skill.sortOrder,
    status: skill.status.toLowerCase(),
    icon: skill.icon,
    taskCount,
    progress: completedHint,
    tasks: skill.tasks?.map(mapTask),
  }
}

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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'zestpath-api' })
})

app.get('/api/skills', async (_req, res) => {
  try {
    const skills = await prisma.skill.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { tasks: true } },
      },
    })
    res.json({ skills: skills.map(mapSkill) })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load skills' })
  }
})

app.get('/api/skills/:slug', async (req, res) => {
  try {
    const skill = await prisma.skill.findUnique({
      where: { slug: req.params.slug },
      include: {
        tasks: { orderBy: { sortOrder: 'asc' } },
      },
    })

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' })
    }

    res.json({ skill: mapSkill(skill) })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load skill' })
  }
})

app.get('/api/skills/:slug/tasks', async (req, res) => {
  try {
    const skill = await prisma.skill.findUnique({
      where: { slug: req.params.slug },
      include: {
        tasks: { orderBy: { sortOrder: 'asc' } },
      },
    })

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' })
    }

    res.json({
      skill: {
        id: skill.id,
        slug: skill.slug,
        title: skill.title,
        status: skill.status.toLowerCase(),
      },
      tasks: skill.tasks.map(mapTask),
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load tasks' })
  }
})

app.post('/api/skills/:slug/check', async (req, res) => {
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
    const mode = payload?.answer?.mode
    const correctIds = payload?.answer?.correctIds ?? []

    let isCorrect = false
    if (mode === 'ordered') {
      isCorrect =
        selectedIds.length === correctIds.length &&
        selectedIds.every((id, index) => id === correctIds[index])
    } else if (mode === 'multiple') {
      const selected = [...selectedIds].sort()
      const correct = [...correctIds].sort()
      isCorrect =
        selected.length === correct.length &&
        selected.every((id, index) => id === correct[index])
    } else {
      isCorrect = selectedIds.length === 1 && selectedIds[0] === correctIds[0]
    }

    res.json({
      correct: isCorrect,
      xpAwarded: isCorrect ? task.xpReward : 0,
      feedback: isCorrect ? payload.feedback.correct : payload.feedback.incorrect,
      correctIds: isCorrect ? undefined : correctIds,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to check answer' })
  }
})

app.listen(PORT, () => {
  console.log(`ZestPath API listening on http://localhost:${PORT}`)
})
