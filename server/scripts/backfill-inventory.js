import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { seedInventoryForUser } from '../src/progress.js'

const prisma = new PrismaClient()

const users = await prisma.user.findMany({ select: { id: true, name: true } })
for (const user of users) {
  await seedInventoryForUser(user.id)
  console.log('inventory ok', user.name || user.id)
}

await prisma.$disconnect()
