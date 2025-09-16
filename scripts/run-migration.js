import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = 'https://ualdsvobfonbmsuhmtsr.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhbGRzdm9iZm9uYm1zdWhtdHNyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzgxODg5OCwiZXhwIjoyMDczMzk0ODk4fQ.Lm5p8VJhGLNqBGJzQYJhKGJzQYJhKGJzQYJhKGJzQYI'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20250117000000_create_staging_system.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('Executing migration...')
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      console.error('Migration failed:', error)
      process.exit(1)
    }
    
    console.log('Migration completed successfully!')
    console.log('Result:', data)
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

runMigration()
