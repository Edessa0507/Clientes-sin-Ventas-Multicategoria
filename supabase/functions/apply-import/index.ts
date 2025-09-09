import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import * as xlsx from 'https://deno.land/x/sheetjs/xlsx.mjs'

const { utils, read } = xlsx

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Crear cliente de Supabase con rol de servicio para operaciones de backend
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Autenticar al usuario que realiza la solicitud
    const authHeader = req.headers.get('Authorization')!
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 3. Leer y parsear el archivo Excel del cuerpo de la solicitud
    const body = await req.arrayBuffer()
    const workbook = read(body, { type: 'buffer' })
    const sheetName = workbook.SheetNames.find(name => name.toUpperCase().includes('CLIENTES SIN VENT MULTICATEGORI'))
    if (!sheetName) {
      throw new Error('No se encontró la hoja "CLIENTES SIN VENT MULTICATEGORI" en el archivo.')
    }
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

    // 4. Procesar y validar los datos del Excel
    const headers = (jsonData[0] || []).map(h => h.toString().trim())
    const rows = jsonData.slice(1).map(row => {
      const rowData: { [key: string]: any } = {}
      headers.forEach((header, index) => {
        rowData[header] = row[index]
      })
      return rowData
    })

    if (rows.length === 0) {
      throw new Error('El archivo no contiene datos para importar.')
    }

    // 5. Iniciar un registro de importación en la base de datos
    const { data: importRun, error: importRunError } = await supabaseAdmin
      .from('import_runs')
      .insert({ 
        user_id: user.id,
        file_name: 'importacion_manual.xlsx',
        registros_totales: rows.length
      })
      .select()
      .single()

    if (importRunError) throw importRunError

    // 6. Preparar los datos para la tabla de staging
    const stagingData = rows.map(row => ({
      import_run_id: importRun.id,
      datos_crudos: row,
      datos_procesados: {
        VendedorCodigo: row['Cod. Vendedor'],
        VendedorNombre: row['Vendedor'],
        ClienteNombre: row['Cliente'],
        Ruta: row['Ruta'],
        // Asumimos que las categorías están en columnas separadas
        ENSURE: row['ENSURE'] || 'Falta',
        CHOCOLATE: row['CHOCOLATE'] || 'Falta',
        ALPINA: row['ALPINA'] || 'Falta',
        SUPER_DE_ALIM: row['SUPER DE ALIM'] || 'Falta',
      }
    }))    

    // 7. Insertar los datos en la tabla de staging
    const { error: stagingError } = await supabaseAdmin
      .from('import_staging')
      .insert(stagingData)

    if (stagingError) {
      // Si falla el staging, marcar la importación como fallida
      await supabaseAdmin.from('import_runs').update({ estado: 'fallido', error_log: stagingError.message }).eq('id', importRun.id)
      throw stagingError
    }

    // 8. Marcar la importación como completada
    await supabaseAdmin.from('import_runs').update({ estado: 'completado' }).eq('id', importRun.id)

    // 9. Devolver una respuesta exitosa
    return new Response(
      JSON.stringify({ success: true, message: `${rows.length} registros procesados e importados.` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error en la función de importación:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
