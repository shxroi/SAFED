import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { db } from '../utils/db'

export default defineNitroPlugin(async () => {
	try {
		await migrate(db, {
			migrationsFolder: './db/migrations',
		})

		console.info('[server/plugins/migrations.ts] Migration done ✨')
	} catch (error) {
		console.error('[server/plugins/migrations.ts] Migration failed')
		console.error(error)
	}
})