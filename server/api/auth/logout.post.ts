export default defineEventHandler(async (event) => {
  try {
    await clearUserSession(event)

    return {
      success: true,
      message: 'Logout successful'
    }
  } catch (error: any) {
    console.error('Logout Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Logout failed'
    })
  }
})