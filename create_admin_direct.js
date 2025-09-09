// Script para crear usuario administrador directamente
const SUPABASE_URL = 'https://xaohatfpnsoszduxgdyp.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhhb2hhdGZwbnNvc3pkdXhnZHlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyOTMxMzIsImV4cCI6MjA3Mjg2OTEzMn0.7UR1-L1Jx4YQz-bgp9u_vU-7UHqimt_ErakI9av6cI'

async function createAdminUser() {
  try {
    console.log('Creando usuario administrador...')
    
    // Crear usuario usando la Edge Function
    const response = await fetch(`${SUPABASE_URL}/functions/v1/auth-code-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        code: 'ADMIN001',
        password: 'EdessA2748',
        create_user: true // Flag para crear usuario si no existe
      })
    })

    const data = await response.json()
    console.log('Respuesta completa:', data)
    
    if (response.ok) {
      console.log('✅ Usuario administrador creado/autenticado exitosamente!')
      console.log('Usuario:', data.user)
    } else {
      console.log('❌ Error:', data.error)
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

createAdminUser()
