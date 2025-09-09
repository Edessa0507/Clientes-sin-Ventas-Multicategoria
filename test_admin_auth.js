// Script para probar autenticación del administrador
const SUPABASE_URL = 'https://xaohatfpnsoszduxgdyp.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhhb2hhdGZwbnNvc3pkdXhnZHlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyOTMxMzIsImV4cCI6MjA3Mjg2OTEzMn0.7UR1-L1Jx4YQz-bgp9u_vU-7UHqimt_ErakI9av6cI'

async function testAdminAuth() {
  try {
    console.log('Probando autenticación del administrador...')
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/auth-code-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        code: 'ADMIN001',
        password: 'EdessA2748'
      })
    })

    const data = await response.json()
    
    console.log('Status:', response.status)
    console.log('Response:', data)
    
    if (response.ok && data.success) {
      console.log('✅ Administrador autenticado exitosamente!')
      console.log('Usuario:', data.user)
    } else {
      console.log('❌ Error en autenticación:', data.error || 'Error desconocido')
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testAdminAuth()
