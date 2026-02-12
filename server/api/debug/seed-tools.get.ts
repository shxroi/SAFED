import { db } from '../../utils/baseDb'
import { tools } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    // 1. Check if dummy data already exists (check first tool)
    const [existing] = await db.select().from(tools).where(eq(tools.name, 'Tang Potong')).limit(1)
    if (existing) {
      return { 
        success: false, 
        message: 'Dummy tools data already seeded' 
      }
    }

    const dummyTools = [
      { name: 'Tang Potong' },
      { name: 'Tang Kombinasi' },
      { name: 'Obeng Plus (+)' },
      { name: 'Obeng Minus (-)' },
      { name: 'Kunci Pas 10mm' },
      { name: 'Kunci Pas 12mm' },
      { name: 'Kunci Inggris 8"' },
      { name: 'Kunci Ring 14mm' },
      { name: 'Palu Besi 500g' },
      { name: 'Gergaji Besi' },
      { name: 'Meteran 5m' },
      { name: 'Solder Listrik 40W' },
      { name: 'Bor Tangan Manual' },
      { name: 'Pahat Kayu 1/2"' },
      { name: 'Kikir Besi Rata' },
      { name: 'Gunting Seng' },
      { name: 'Kuas Cat 2"' },
      { name: 'Rol Cat 7"' },
      { name: 'Tang Lancip' },
      { name: 'Sikat Kawat' }
    ]

    // 3. Insert data in batch
    await db.insert(tools).values(dummyTools)

    return {
      success: true,
      message: '20 Dummy tools created successfully',
      data: dummyTools
    }
  } catch (error: any) {
    throw createError({ 
      statusCode: 500, 
      message: error.message 
    })
  }
})