import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5'
import { corsHeaders } from '../_shared/cors.ts'

interface ImportRequest {
  file: string // Base64 encoded file
  fileName: string
  sheetName?: string
  columnMapping?: Record<string, string>
  previewOnly?: boolean
}

interface ImportResponse {
  success: boolean
  importId?: string
  preview?: any[]
  summary?: {
    totalRows: number
    validRows: number
    errors: string[]
  }
  error?: string
}

interface ExcelRow {
  FechaReporte?: string
  Zona?: string
  Ruta?: string
  VendedorDisplay?: string
  VendedorCodigo?: string
  VendedorNombre?: string
  ClienteId?: string
  ClienteNombre?: string
  CategoriaId?: string
  CategoriaNombre?: string
  EstadoActivacion?: string
  VentasRecientes?: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Método no permitido' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar autenticación de admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token de autorización requerido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parsear request
    const { file, fileName, sheetName = 'CLIENTES SIN VENT MULTICATEGORI', columnMapping, previewOnly = false }: ImportRequest = await req.json()

    if (!file || !fileName) {
      return new Response(
        JSON.stringify({ success: false, error: 'Archivo y nombre de archivo requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Decodificar archivo base64
    const fileBuffer = Uint8Array.from(atob(file), c => c.charCodeAt(0))
    
    // Leer Excel
    const workbook = XLSX.read(fileBuffer, { type: 'array' })
    
    // Verificar que existe la hoja
    if (!workbook.SheetNames.includes(sheetName)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Hoja '${sheetName}' no encontrada. Hojas disponibles: ${workbook.SheetNames.join(', ')}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Convertir hoja a JSON
    const worksheet = workbook.Sheets[sheetName]
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    if (rawData.length < 2) {
      return new Response(
        JSON.stringify({ success: false, error: 'El archivo debe contener al menos una fila de encabezados y una fila de datos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extraer encabezados y datos
    const headers = rawData[0] as string[]
    const dataRows = rawData.slice(1)

    // Mapeo de columnas por defecto
    const defaultMapping: Record<string, string> = {
      'Fecha Reporte': 'FechaReporte',
      'Zona': 'Zona',
      'Ruta': 'Ruta',
      'Vendedor': 'VendedorDisplay',
      'Cliente ID': 'ClienteId',
      'Cliente': 'ClienteNombre',
      'Categoria ID': 'CategoriaId',
      'Categoria': 'CategoriaNombre',
      'Estado': 'EstadoActivacion',
      'Ventas': 'VentasRecientes'
    }

    const mapping = columnMapping || defaultMapping

    // Procesar datos
    const processedData: ExcelRow[] = []
    const errors: string[] = []

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      const rowNumber = i + 2 // +2 porque empezamos desde fila 1 y saltamos encabezados

      try {
        const processedRow: ExcelRow = {}

        // Mapear columnas
        headers.forEach((header, index) => {
          const mappedField = mapping[header]
          if (mappedField && row[index] !== undefined && row[index] !== null) {
            processedRow[mappedField as keyof ExcelRow] = row[index]
          }
        })

        // Extraer código y nombre del vendedor si viene en formato "E56 - (PREV) NOMBRE"
        if (processedRow.VendedorDisplay) {
          const vendedorMatch = processedRow.VendedorDisplay.match(/^\s*([A-Za-z0-9]+)\s*-\s*(.+)$/)
          if (vendedorMatch) {
            processedRow.VendedorCodigo = vendedorMatch[1].trim().toUpperCase()
            processedRow.VendedorNombre = vendedorMatch[2].trim()
          }
        }

        // Normalizar strings
        if (processedRow.ClienteNombre) {
          processedRow.ClienteNombre = processedRow.ClienteNombre.toString().trim().toUpperCase()
        }
        if (processedRow.CategoriaNombre) {
          processedRow.CategoriaNombre = processedRow.CategoriaNombre.toString().trim().toUpperCase()
        }

        // Validar campos requeridos
        const requiredFields = ['VendedorCodigo', 'ClienteNombre', 'CategoriaNombre']
        const missingFields = requiredFields.filter(field => !processedRow[field as keyof ExcelRow])
        
        if (missingFields.length > 0) {
          errors.push(`Fila ${rowNumber}: Campos requeridos faltantes: ${missingFields.join(', ')}`)
          continue
        }

        // Procesar fecha
        if (processedRow.FechaReporte) {
          const fecha = new Date(processedRow.FechaReporte)
          if (isNaN(fecha.getTime())) {
            errors.push(`Fila ${rowNumber}: Fecha inválida: ${processedRow.FechaReporte}`)
            continue
          }
          processedRow.FechaReporte = fecha.toISOString().split('T')[0]
        } else {
          processedRow.FechaReporte = new Date().toISOString().split('T')[0]
        }

        // Procesar ventas recientes
        if (processedRow.VentasRecientes) {
          const ventas = parseFloat(processedRow.VentasRecientes.toString())
          processedRow.VentasRecientes = isNaN(ventas) ? 0 : ventas
        }

        // Normalizar estado de activación
        if (processedRow.EstadoActivacion) {
          const estado = processedRow.EstadoActivacion.toString().toLowerCase()
          if (['activado', 'activo', 'si', 'yes', '1'].includes(estado)) {
            processedRow.EstadoActivacion = 'activado'
          } else if (['pendiente', 'no', 'no_aplica', '0'].includes(estado)) {
            processedRow.EstadoActivacion = 'pendiente'
          } else {
            processedRow.EstadoActivacion = 'pendiente'
          }
        } else {
          processedRow.EstadoActivacion = 'pendiente'
        }

        processedData.push(processedRow)

      } catch (error) {
        errors.push(`Fila ${rowNumber}: Error procesando datos: ${error.message}`)
      }
    }

    // Si es solo preview, retornar muestra
    if (previewOnly) {
      const preview = processedData.slice(0, 10) // Primeras 10 filas
      return new Response(
        JSON.stringify({
          success: true,
          preview,
          summary: {
            totalRows: dataRows.length,
            validRows: processedData.length,
            errors: errors.slice(0, 20) // Primeros 20 errores
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Crear registro de importación
    const { data: importRun, error: importError } = await supabaseAdmin
      .from('import_runs')
      .insert({
        usuario_id: 'admin-user-id', // TODO: Obtener del JWT
        nombre_archivo: fileName,
        nombre_hoja: sheetName,
        total_filas: dataRows.length,
        estado: 'procesando',
        fecha_datos: processedData[0]?.FechaReporte || new Date().toISOString().split('T')[0]
      })
      .select()
      .single()

    if (importError) {
      throw new Error(`Error creando registro de importación: ${importError.message}`)
    }

    // Insertar datos en staging
    const stagingData = processedData.map((row, index) => ({
      import_run_id: importRun.id,
      fila_numero: index + 2,
      datos_originales: dataRows[index],
      datos_procesados: row,
      estado: 'procesado'
    }))

    const { error: stagingError } = await supabaseAdmin
      .from('import_staging')
      .insert(stagingData)

    if (stagingError) {
      throw new Error(`Error insertando datos en staging: ${stagingError.message}`)
    }

    // Aplicar importación (reemplazar datos operativos)
    await supabaseAdmin.rpc('apply_import', { 
      p_import_run_id: importRun.id 
    })

    // Actualizar estado de importación
    await supabaseAdmin
      .from('import_runs')
      .update({
        estado: 'completado',
        filas_procesadas: processedData.length,
        filas_insertadas: processedData.length,
        completed_at: new Date().toISOString(),
        resumen_cambios: {
          errores: errors,
          filas_validas: processedData.length,
          total_filas: dataRows.length
        }
      })
      .eq('id', importRun.id)

    // Refrescar vistas materializadas
    await supabaseAdmin.rpc('refresh_materialized_views')

    const response: ImportResponse = {
      success: true,
      importId: importRun.id,
      summary: {
        totalRows: dataRows.length,
        validRows: processedData.length,
        errors
      }
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error en excel-import:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Error procesando importación: ${error.message}` 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
