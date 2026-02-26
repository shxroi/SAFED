import { baseDb } from '../../utils/baseDb'
import { operations, operationsEnroll, users } from '../../db/schema'

export default defineEventHandler(async (event) => {
  try {
    // First, get all users
    const allUsers = await baseDb.select().from(users)
    
    if (allUsers.length === 0) {
      return {
        success: false,
        message: 'No users found. Please seed users first.',
      }
    }

    // Find users by role
    const staffUsers = allUsers.filter(u => u.roles === 'STAFF')
    
    if (staffUsers.length === 0) {
      return {
        success: false,
        message: 'No STAFF users found. Please create staff users first.',
      }
    }

    // Sample operation data - ALL with vessel names now
    const operationData = [
      {
        company: 'PT Pertamina',
        type: 'Installation' as const,
        vesselName: 'MV Sinar Banda',
        location: 'Belawan Port, Medan',
        date: new Date('2026-02-15'),
        status: 'Active' as const,
      },
      {
        company: 'PT Chevron Pacific Indonesia',
        type: 'Maintenance' as const,
        vesselName: 'MT Cinta Laut',
        location: 'Balikpapan Bay',
        date: new Date('2026-02-20'),
        status: 'Draft' as const,
      },
      {
        company: 'PT Freeport Indonesia',
        type: 'SAT/Commissioning' as const,
        vesselName: 'MV Amamapare Express', // CHANGED: Added vessel name
        location: 'Amamapare Port, Papua',
        date: new Date('2026-03-01'),
        status: 'Draft' as const,
      },
      {
        company: 'PT Shell Indonesia',
        type: 'Upgrade' as const,
        vesselName: 'MV Ocean Pride',
        location: 'Tanjung Priok, Jakarta',
        date: new Date('2026-02-25'),
        status: 'Active' as const,
      },
      {
        company: 'PT Total E&P Indonesie',
        type: 'Installation' as const,
        vesselName: 'MT Blue Horizon',
        location: 'Bontang LNG Terminal',
        date: new Date('2026-03-10'),
        status: 'Draft' as const,
      },
      {
        company: 'PT Medco Energi',
        type: 'Maintenance' as const,
        vesselName: 'MV Samudra Jaya',
        location: 'Tarakan Harbor',
        date: new Date('2026-02-12'),
        status: 'Active' as const,
      },
      {
        company: 'PT BP Berau',
        type: 'Uninstall' as const,
        vesselName: 'MT Nusantara Star',
        location: 'Berau Bay, Kalimantan',
        date: new Date('2026-03-15'),
        status: 'Draft' as const,
      },
      {
        company: 'PT ConocoPhillips Indonesia',
        type: 'SAT/Commissioning' as const,
        vesselName: 'MV Grissik Pioneer', // CHANGED: Added vessel name
        location: 'Grissik Terminal, South Sumatra',
        date: new Date('2026-02-18'),
        status: 'Complete' as const,
      },
      {
        company: 'PT ExxonMobil Oil Indonesia',
        type: 'Installation' as const,
        vesselName: 'MV Pacific Explorer',
        location: 'Dumai Port, Riau',
        date: new Date('2026-03-05'),
        status: 'Draft' as const,
      },
      {
        company: 'PT Petronas Carigali Indonesia',
        type: 'Upgrade' as const,
        vesselName: 'MT Garuda Mas',
        location: 'Batam Shipyard',
        date: new Date('2026-01-30'),
        status: 'Cancelled' as const,
      },
    ]

    const createdOperations = []

    // Create operations and assign staff
    for (const opData of operationData) {
      // Create operation
      const [newOp] = await baseDb.insert(operations).values(opData).returning()
      
      if (!newOp) {
        console.error('Failed to create operation:', opData)
        continue
      }
      
      // Randomly assign supervisor and staff
      const supervisorIndex = Math.floor(Math.random() * staffUsers.length)
      const supervisor = staffUsers[supervisorIndex]
      
      if (!supervisor) {
        console.error('Failed to assign supervisor for operation:', newOp.id)
        continue
      }
      
      // Add supervisor enrollment
      await baseDb.insert(operationsEnroll).values({
        operationId: newOp.id,
        userId: supervisor.id,
        operationRole: 'SUPERVISOR',
      })
      
      // Add 2-4 random staff members (excluding supervisor)
      const numStaff = Math.floor(Math.random() * 3) + 2 // 2-4 staff
      const availableStaff = staffUsers.filter(u => u.id !== supervisor.id)
      const selectedStaff = availableStaff
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(numStaff, availableStaff.length))
      
      for (const staff of selectedStaff) {
        await baseDb.insert(operationsEnroll).values({
          operationId: newOp.id,
          userId: staff.id,
          operationRole: 'STAFF',
        })
      }
      
      createdOperations.push({
        ...newOp,
        supervisor: supervisor.name,
        staffCount: selectedStaff.length,
      })
    }

    return {
      success: true,
      message: `Successfully created ${createdOperations.length} operations`,
      operations: createdOperations,
    }
  } catch (error: any) {
    console.error('Error seeding operations:', error)
    return {
      success: false,
      message: error.message,
      error: error,
    }
  }
})