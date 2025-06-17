const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 シードデータを投入中...')

  // テストユーザーの作成
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'テストユーザー',
      preferences: JSON.stringify({
        theme: 'light',
        language: 'ja',
        timeFormat: '24h',
        weekStartDay: 1
      })
    }
  })

  console.log('✅ ユーザーを作成:', user.name)

  // カテゴリの作成
  const categories = []
  
  const categoryData = [
    { name: '仕事', color: '#3b82f6', icon: '💼' },
    { name: '学習', color: '#10b981', icon: '📚' },
    { name: 'プライベート', color: '#f59e0b', icon: '🏠' },
    { name: '運動', color: '#ef4444', icon: '🏃' }
  ]

  for (const data of categoryData) {
    const category = await prisma.scheduleCategory.create({
      data: {
        userId: user.id,
        name: data.name,
        color: data.color,
        icon: data.icon
      }
    })
    categories.push(category)
  }

  console.log('✅ カテゴリを作成:', categories.length, '件')

  // 固定スケジュールの作成（今週）
  const today = new Date()
  const monday = new Date(today.setDate(today.getDate() - today.getDay() + 1))

  const schedules = []
  
  // 平日の朝の準備時間
  for (let i = 0; i < 5; i++) {
    const date = new Date(monday)
    date.setDate(date.getDate() + i)
    
    schedules.push(
      prisma.schedule.create({
        data: {
          userId: user.id,
          title: '朝の準備',
          startTime: '07:00',
          endTime: '08:00',
          date: date,
          categoryId: categories[2].id, // プライベート
          isFixed: true,
          color: categories[2].color
        }
      }),
      prisma.schedule.create({
        data: {
          userId: user.id,
          title: '仕事',
          startTime: '09:00',
          endTime: '17:00',
          date: date,
          categoryId: categories[0].id, // 仕事
          isFixed: true,
          color: categories[0].color
        }
      })
    )
  }

  await Promise.all(schedules)
  console.log('✅ スケジュールを作成:', schedules.length, '件')

  // サンプルタスクの作成
  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        userId: user.id,
        title: 'React コンポーネントの実装',
        description: '週間カレンダーグリッドコンポーネントを作成する',
        estimatedDuration: 120,
        priority: 'HIGH',
        categoryId: categories[0].id, // 仕事
        status: 'PENDING',
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3日後
      }
    }),
    prisma.task.create({
      data: {
        userId: user.id,
        title: '英語の勉強',
        description: 'TOEIC対策の単語暗記',
        estimatedDuration: 60,
        priority: 'MEDIUM',
        categoryId: categories[1].id, // 学習
        status: 'PENDING'
      }
    }),
    prisma.task.create({
      data: {
        userId: user.id,
        title: 'ジョギング',
        description: '公園を30分ジョギング',
        estimatedDuration: 30,
        priority: 'LOW',
        categoryId: categories[3].id, // 運動
        status: 'PENDING'
      }
    })
  ])

  console.log('✅ タスクを作成:', tasks.length, '件')

  console.log('🎉 シードデータの投入が完了しました！')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ シードデータの投入中にエラーが発生しました:', e)
    await prisma.$disconnect()
    process.exit(1)
  })