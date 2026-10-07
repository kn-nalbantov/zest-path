import { Router } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { prisma, seedInventoryForUser } from './progress.js'
import { requireAuth } from './auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const promptPath = path.join(__dirname, '..', 'prompts', 'ai-chef.md')

let cachedSystemPrompt = null

function getSystemPrompt() {
  if (!cachedSystemPrompt) {
    cachedSystemPrompt = fs.readFileSync(promptPath, 'utf8')
  }
  return cachedSystemPrompt
}

function formatInventory(items) {
  if (!items.length) return '(empty pantry)'
  return items
    .map((item) => {
      const qty =
        item.quantity != null
          ? `${item.quantity}${item.unit ? ` ${item.unit}` : ''}`
          : item.unit || ''
      return qty ? `- ${item.name} (${qty})` : `- ${item.name}`
    })
    .join('\n')
}

function extractJson(text) {
  if (!text) return null
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1))
      } catch {
        return null
      }
    }
    return null
  }
}

function normalizeAiPayload(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return {
      assistantMessage:
        "I couldn't shape that into a recipe just now. Tell me what you're craving, or ask me to cook from your pantry.",
      recipe: null,
      shoppingSuggestions: null,
      refused: false,
    }
  }

  const recipe =
    parsed.recipe && typeof parsed.recipe === 'object'
      ? {
          title: String(parsed.recipe.title || 'Quick Recipe'),
          time: String(parsed.recipe.time || '15 mins'),
          difficulty: ['Easy', 'Medium', 'Hard'].includes(parsed.recipe.difficulty)
            ? parsed.recipe.difficulty
            : 'Easy',
          servings: String(parsed.recipe.servings || '1 serving'),
          ingredients: Array.isArray(parsed.recipe.ingredients)
            ? parsed.recipe.ingredients.map(String)
            : [],
          steps: Array.isArray(parsed.recipe.steps)
            ? parsed.recipe.steps.map(String)
            : [],
        }
      : null

  return {
    assistantMessage: String(
      parsed.assistantMessage ||
        (recipe
          ? `Here's a idea: ${recipe.title}.`
          : 'Tell me what you want to cook from your pantry.'),
    ),
    recipe,
    shoppingSuggestions: Array.isArray(parsed.shoppingSuggestions)
      ? parsed.shoppingSuggestions.map(String)
      : null,
    refused: Boolean(parsed.refused),
  }
}

export function createAiRouter() {
  const router = Router()

  router.post('/chat', requireAuth, async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY
      if (!apiKey) {
        return res.status(503).json({
          error:
            'Gemini is not configured. Add GEMINI_API_KEY to server/.env and restart the API.',
        })
      }

      const messages = Array.isArray(req.body?.messages) ? req.body.messages : []
      const cleaned = messages
        .filter(
          (m) =>
            m &&
            (m.role === 'user' || m.role === 'assistant') &&
            typeof m.content === 'string' &&
            m.content.trim(),
        )
        .slice(-10)

      if (cleaned.length === 0) {
        return res.status(400).json({ error: 'messages[] with user content is required' })
      }

      let items = await prisma.inventoryItem.findMany({
        where: { userId: req.user.id },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      })
      if (items.length === 0) {
        await seedInventoryForUser(req.user.id)
        items = await prisma.inventoryItem.findMany({
          where: { userId: req.user.id },
          orderBy: [{ category: 'asc' }, { name: 'asc' }],
        })
      }

      const inventoryBlock = formatInventory(items)
      const systemPrompt = `${getSystemPrompt()}

## Current user inventory (source of truth — do not invent extras)
${inventoryBlock}
`

      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
        systemInstruction: systemPrompt,
        generationConfig: {
          responseMimeType: 'application/json',
        },
      })

      const contents = cleaned.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))

      // Gemini requires the first turn to be from the user
      if (contents[0]?.role !== 'user') {
        contents.unshift({
          role: 'user',
          parts: [{ text: 'Help me cook something from my pantry.' }],
        })
      }

      const result = await model.generateContent({ contents })
      const text = result.response?.text?.() || ''
      const parsed = extractJson(text)
      const payload = normalizeAiPayload(parsed)

      res.json({
        ...payload,
        inventoryCount: items.length,
      })
    } catch (error) {
      console.error('[ai/chat]', error)
      const message =
        error?.message?.includes('API key')
          ? 'Gemini rejected the request. Check GEMINI_API_KEY.'
          : error?.status === 404
            ? 'Gemini model not found. Update GEMINI_MODEL in server/.env.'
            : 'Failed to reach the AI chef. Try again in a moment.'
      res.status(502).json({ error: message })
    }
  })

  return router
}
