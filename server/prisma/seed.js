import { PrismaClient, SkillStatus, TaskType } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Shared task payload shape used by every lesson on the FE:
 * {
 *   choices: [{ id, text }],
 *   answer: { mode: 'single' | 'multiple' | 'ordered', correctIds: string[] },
 *   feedback: { correct, incorrect }
 * }
 */
function taskPayload({ choices, mode, correctIds, feedback }) {
  return {
    choices,
    answer: { mode, correctIds },
    feedback: {
      correct: feedback?.correct ?? 'Nice work, chef!',
      incorrect: feedback?.incorrect ?? 'Not quite — try again.',
    },
  }
}

const SKILLS = [
  {
    slug: 'knife-skills',
    title: 'Knife Skills',
    description: 'Safe grips, cuts, and kitchen knife basics.',
    tip: 'Master your blade and every recipe gets easier.',
    sortOrder: 1,
    status: SkillStatus.LOCKED,
    icon: 'knife',
    badge: {
      slug: 'blade-master',
      title: 'Blade Master',
      description: 'Completed the Knife Skills path.',
      icon: 'crown',
    },
    tasks: [
      {
        sortOrder: 1,
        type: TaskType.SINGLE_CHOICE,
        prompt: 'Which grip keeps your fingertips safest while chopping?',
        xpReward: 10,
        payload: taskPayload({
          mode: 'single',
          choices: [
            { id: 'claw', text: 'Claw grip (fingertips curled under)' },
            { id: 'flat', text: 'Flat palm pressing the blade tip' },
            { id: 'point', text: 'Pointing at the food with two fingers' },
            { id: 'fist', text: 'Closed fist around the ingredient' },
          ],
          correctIds: ['claw'],
          feedback: {
            correct: 'Yes — the claw grip protects your fingertips.',
            incorrect: 'Think about curling fingertips under, like a bear claw.',
          },
        }),
      },
      {
        sortOrder: 2,
        type: TaskType.ORDER_STEPS,
        prompt: 'Put these knife-prep steps in the right order.',
        xpReward: 15,
        payload: taskPayload({
          mode: 'ordered',
          choices: [
            { id: 'board', text: 'Secure a stable cutting board' },
            { id: 'choose', text: 'Choose the right knife for the job' },
            { id: 'grip', text: 'Use a pinch grip on the blade' },
            { id: 'cut', text: 'Make controlled, even cuts' },
          ],
          correctIds: ['board', 'choose', 'grip', 'cut'],
          feedback: {
            correct: 'Perfect mise en place for knife work.',
            incorrect: 'Start with a stable board, then knife, grip, and cut.',
          },
        }),
      },
      {
        sortOrder: 3,
        type: TaskType.MULTI_CHOICE,
        prompt: 'Select every cut that creates small, even pieces.',
        xpReward: 12,
        payload: taskPayload({
          mode: 'multiple',
          choices: [
            { id: 'dice', text: 'Dice' },
            { id: 'mince', text: 'Mince' },
            { id: 'julienne', text: 'Julienne' },
            { id: 'smash', text: 'Smash with the knife spine' },
          ],
          correctIds: ['dice', 'mince', 'julienne'],
          feedback: {
            correct: 'Dice, mince, and julienne are precise cutting techniques.',
            incorrect: 'Smash is useful, but it is not an even cutting technique.',
          },
        }),
      },
    ],
  },
  {
    slug: 'sauteing-basics',
    title: 'Sautéing Basics',
    description: 'High heat, quick movement, glossy results.',
    tip: "Ready to turn up the heat? Let's master the sauté",
    sortOrder: 2,
    status: SkillStatus.LOCKED,
    icon: 'flame',
    badge: {
      slug: 'saute-star',
      title: 'Sauté Star',
      description: 'Completed the Sautéing Basics path.',
      icon: 'flame',
    },
    tasks: [
      {
        sortOrder: 1,
        type: TaskType.SINGLE_CHOICE,
        prompt: 'What pan works best for a classic sauté?',
        xpReward: 10,
        payload: taskPayload({
          mode: 'single',
          choices: [
            { id: 'skillet', text: 'Wide skillet with slanted sides' },
            { id: 'stock', text: 'Tall stockpot' },
            { id: 'sheet', text: 'Rimmed sheet pan' },
            { id: 'muffin', text: 'Muffin tin' },
          ],
          correctIds: ['skillet'],
          feedback: {
            correct: 'A wide skillet gives food room to sear, not steam.',
            incorrect: 'Look for a wide pan that lets moisture escape quickly.',
          },
        }),
      },
      {
        sortOrder: 2,
        type: TaskType.ORDER_STEPS,
        prompt: 'Order the sauté workflow from start to finish.',
        xpReward: 15,
        payload: taskPayload({
          mode: 'ordered',
          choices: [
            { id: 'heat', text: 'Preheat the pan' },
            { id: 'fat', text: 'Add oil or butter' },
            { id: 'food', text: 'Add food in a single layer' },
            { id: 'toss', text: 'Toss or stir to finish' },
          ],
          correctIds: ['heat', 'fat', 'food', 'toss'],
          feedback: {
            correct: 'Hot pan first — that is the sauté secret.',
            incorrect: 'Heat → fat → food → toss.',
          },
        }),
      },
      {
        sortOrder: 3,
        type: TaskType.MULTI_CHOICE,
        prompt: 'Which signs mean your sauté is going well?',
        xpReward: 12,
        payload: taskPayload({
          mode: 'multiple',
          choices: [
            { id: 'sizzle', text: 'A lively sizzle on contact' },
            { id: 'steam', text: 'Lots of pooled liquid and pale steaming' },
            { id: 'color', text: 'Light browning on the edges' },
            { id: 'space', text: 'Pieces have a little breathing room' },
          ],
          correctIds: ['sizzle', 'color', 'space'],
          feedback: {
            correct: 'Sizzle, color, and space = sauté success.',
            incorrect: 'Pooled liquid usually means the pan is overcrowded or too cool.',
          },
        }),
      },
      {
        sortOrder: 4,
        type: TaskType.RECIPE_COMPLETE,
        prompt: 'Cook this quick sauté recipe, then check off each step.',
        xpReward: 25,
        payload: {
          ...taskPayload({
            mode: 'recipe',
            choices: [
              { id: 'heat', text: 'Preheat a wide skillet over medium-high heat' },
              { id: 'fat', text: 'Add 1 tbsp olive oil or butter' },
              { id: 'garlic', text: 'Sauté minced garlic for 30 seconds' },
              { id: 'greens', text: 'Add spinach or greens in a single layer' },
              { id: 'toss', text: 'Toss until just wilted, then season' },
            ],
            correctIds: ['heat', 'fat', 'garlic', 'greens', 'toss'],
            feedback: {
              correct: 'Plate looks ready — great sauté work!',
              incorrect: 'Check off every recipe step before finishing.',
            },
          }),
          recipe: {
            title: 'Garlic Butter Greens',
            time: '8 mins',
            difficulty: 'Easy',
            servings: '1 plate',
          },
          photo: {
            prompt: 'Upload a photo of your finished plate to complete the course.',
            skipLabel: 'Skip for now',
            xpBonus: 5,
          },
        },
      },
    ],
  },
  {
    slug: 'art-of-simmering',
    title: 'The Art of Simmering',
    description: 'Gentle bubbles for soups, sauces, and stews.',
    tip: 'Unlock simmering to build deep flavor without a boil.',
    sortOrder: 3,
    status: SkillStatus.LOCKED,
    icon: 'lock',
    badge: {
      slug: 'simmer-sage',
      title: 'Simmer Sage',
      description: 'Completed The Art of Simmering path.',
      icon: 'pot',
    },
    tasks: [
      {
        sortOrder: 1,
        type: TaskType.SINGLE_CHOICE,
        prompt: 'What does a proper simmer look like?',
        xpReward: 10,
        payload: taskPayload({
          mode: 'single',
          choices: [
            { id: 'gentle', text: 'Small bubbles breaking gently at the surface' },
            { id: 'rolling', text: 'A violent rolling boil' },
            { id: 'still', text: 'Completely still liquid with no movement' },
            { id: 'smoke', text: 'Oil smoking hard in a dry pan' },
          ],
          correctIds: ['gentle'],
          feedback: {
            correct: 'Gentle bubbles = simmer. A rolling boil is too aggressive.',
            incorrect: 'Simmer is quieter than a boil — look for soft bubbles.',
          },
        }),
      },
      {
        sortOrder: 2,
        type: TaskType.ORDER_STEPS,
        prompt: 'Sequence these steps for a simple simmered sauce.',
        xpReward: 15,
        payload: taskPayload({
          mode: 'ordered',
          choices: [
            { id: 'saute-base', text: 'Softly cook aromatics' },
            { id: 'liquid', text: 'Add stock or tomatoes' },
            { id: 'simmer', text: 'Lower heat to a gentle simmer' },
            { id: 'season', text: 'Season and reduce to taste' },
          ],
          correctIds: ['saute-base', 'liquid', 'simmer', 'season'],
          feedback: {
            correct: 'Build flavor, add liquid, simmer, then finish seasoning.',
            incorrect: 'Aromatics first, then liquid, simmer, and season.',
          },
        }),
      },
      {
        sortOrder: 3,
        type: TaskType.MULTI_CHOICE,
        prompt: 'Pick the dishes that usually rely on simmering.',
        xpReward: 12,
        payload: taskPayload({
          mode: 'multiple',
          choices: [
            { id: 'soup', text: 'Vegetable soup' },
            { id: 'stew', text: 'Beef stew' },
            { id: 'tomato', text: 'Tomato sauce' },
            { id: 'toast', text: 'Avocado toast' },
          ],
          correctIds: ['soup', 'stew', 'tomato'],
          feedback: {
            correct: 'Soups, stews, and sauces love a gentle simmer.',
            incorrect: 'Avocado toast is assembled — no simmer required.',
          },
        }),
      },
    ],
  },
]

async function main() {
  await prisma.userBadge.deleteMany()
  await prisma.badge.deleteMany()
  await prisma.task.deleteMany()
  await prisma.skill.deleteMany()

  for (const skill of SKILLS) {
    const { tasks, badge, ...skillData } = skill
    const created = await prisma.skill.create({
      data: {
        ...skillData,
        tasks: {
          create: tasks,
        },
      },
    })

    if (badge) {
      await prisma.badge.create({
        data: {
          skillId: created.id,
          ...badge,
        },
      })
    }
  }

  const counts = await prisma.skill.findMany({
    include: { _count: { select: { tasks: true } }, badge: true },
    orderBy: { sortOrder: 'asc' },
  })

  console.log('Seeded skills:')
  for (const skill of counts) {
    console.log(
      `- ${skill.title}: ${skill._count.tasks} tasks (${skill.status}) badge=${skill.badge?.title ?? 'none'}`,
    )
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
