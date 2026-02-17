import { execSync } from 'node:child_process'

const databaseUrl = process.env.DATABASE_URL ?? ''
const usesPostgres = /^postgres(ql)?:\/\//i.test(databaseUrl)
const schemaPath = usesPostgres ? 'prisma/schema.postgres.prisma' : 'prisma/schema.prisma'

console.log(
  `[prisma-generate] DATABASE_URL ${usesPostgres ? 'postgres detected' : 'sqlite/default detected'}; using ${schemaPath}`
)

execSync(`pnpm prisma generate --schema ${schemaPath}`, { stdio: 'inherit' })
