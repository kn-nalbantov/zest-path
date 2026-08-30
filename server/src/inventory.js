import { Router } from 'express'
import { prisma, seedInventoryForUser } from './progress.js'
import { requireAuth } from './auth.js'

function mapItem(item) {
  return {
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    category: item.category,
  }
}

export function createInventoryRouter() {
  const router = Router()

  router.get('/', requireAuth, async (req, res) => {
    try {
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

      res.json({ items: items.map(mapItem) })
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: 'Failed to load inventory' })
    }
  })

  return router
}
