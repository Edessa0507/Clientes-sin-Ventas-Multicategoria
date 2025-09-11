import * as XLSX from 'xlsx'

// Utilidades para procesamiento de Excel
export const excel = {
  // Leer archivo Excel
  async readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          resolve(workbook)
        } catch (error) {
          reject(error)
        }
      }
      
      reader.onerror = () => reject(new Error('Error leyendo el archivo'))
      reader.readAsArrayBuffer(file)
    })
  },

  // Procesar hoja de Excel
  processSheet(workbook, sheetName = null) {
    try {
      // Buscar hoja por defecto o usar la primera
      let targetSheet = sheetName
      if (!targetSheet) {
        // Buscar hoja con nombre específico
        const preferredNames = [
          'CLIENTES SIN VENT MULTICATEGORI',
          'CLIENTES SIN VENTAS',
          'DATOS',
          'Sheet1'
        ]
        
        for (const name of preferredNames) {
          if (workbook.SheetNames.includes(name)) {
            targetSheet = name
            break
          }
        }
        
        // Si no encuentra ninguna, usar la primera
        if (!targetSheet) {
          targetSheet = workbook.SheetNames[0]
        }
      }

      const worksheet = workbook.Sheets[targetSheet]
      if (!worksheet) {
        throw new Error(`Hoja "${targetSheet}" no encontrada`)
      }

      // Convertir a JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '',
        blankrows: false
      })

      if (jsonData.length === 0) {
        throw new Error('La hoja está vacía')
      }

      return {
        sheetName: targetSheet,
        headers: jsonData[0],
        rows: jsonData.slice(1).filter(row => row.some(cell => cell !== ''))
      }
    } catch (error) {
      throw new Error(`Error procesando Excel: ${error.message}`)
    }
  },

  // Validar estructura del Excel
  validateStructure(headers) {
    const requiredColumns = ['SUPERVISOR', 'VENDEDOR', 'RUTA', 'CLIENTE']
    const missing = requiredColumns.filter(col => 
      !headers.some(header => 
        header && header.toString().toUpperCase().includes(col)
      )
    )

    if (missing.length > 0) {
      throw new Error(`Columnas requeridas faltantes: ${missing.join(', ')}`)
    }

    // Encontrar índices de columnas
    const columnIndices = {}
    requiredColumns.forEach(col => {
      const index = headers.findIndex(header => 
        header && header.toString().toUpperCase().includes(col)
      )
      columnIndices[col.toLowerCase()] = index
    })

    // Detectar columnas de categorías (todas después de CLIENTE)
    const clienteIndex = columnIndices.cliente
    const categoryColumns = headers.slice(clienteIndex + 1)
      .map((header, index) => ({
        name: header ? header.toString().trim() : '',
        index: clienteIndex + 1 + index
      }))
      .filter(col => col.name !== '')

    return {
      columnIndices,
      categoryColumns,
      isValid: true
    }
  },

  // Normalizar datos de una fila
  normalizeRow(row, structure) {
    const { columnIndices, categoryColumns } = structure
    
    // Extraer datos básicos
    const supervisor = this.normalizeString(row[columnIndices.supervisor] || '')
    const vendedorRaw = this.normalizeString(row[columnIndices.vendedor] || '')
    const ruta = this.normalizeString(row[columnIndices.ruta] || '')
    const clienteRaw = this.normalizeString(row[columnIndices.cliente] || '')

    // Parsear vendedor: "E56 - (PREV) PEDRO JOSE BURGOS"
    const vendedorMatch = vendedorRaw.match(/^\s*([A-Za-z0-9]+)\s*-\s*(.+)$/)
    if (!vendedorMatch) {
      throw new Error(`Formato de vendedor inválido: ${vendedorRaw}`)
    }
    
    const vendedorCodigo = vendedorMatch[1].toUpperCase()
    const vendedorNombre = this.normalizeString(vendedorMatch[2])

    // Parsear cliente: "61842 - CASA NANDO"
    const clienteMatch = clienteRaw.match(/^(\d+)\s*-\s*(.+)$/)
    if (!clienteMatch) {
      throw new Error(`Formato de cliente inválido: ${clienteRaw}`)
    }
    
    const clienteId = parseInt(clienteMatch[1])
    const clienteNombre = this.normalizeString(clienteMatch[2])

    // Procesar categorías
    const categorias = categoryColumns.map(cat => {
      const valor = row[cat.index] || ''
      const estado = this.normalizeEstado(valor)
      
      return {
        categoria_nombre: cat.name,
        estado
      }
    })

    return {
      supervisor,
      vendedor_codigo: vendedorCodigo,
      vendedor_nombre: vendedorNombre,
      ruta,
      cliente_id: clienteId,
      cliente_nombre: clienteNombre,
      categorias
    }
  },

  // Normalizar string
  normalizeString(str) {
    return str.toString()
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase()
  },

  // Normalizar estado de categoría
  normalizeEstado(valor) {
    const valorStr = valor.toString().trim().toUpperCase()
    
    if (valorStr === 'ACTIVADO') return 'ACTIVADO'
    if (valorStr === 'FALTA') return 'FALTA'
    return '0' // Para "0", vacío, u otros valores
  },

  // Procesar archivo completo
  async processFile(file, fechaReporte) {
    try {
      // Leer archivo
      const workbook = await this.readFile(file)
      
      // Procesar hoja
      const sheetData = this.processSheet(workbook)
      
      // Validar estructura
      const structure = this.validateStructure(sheetData.headers)
      
      // Procesar filas
      const processedRows = []
      const errors = []
      const clientes = new Map()
      const categorias = new Set()
      const vendedores = new Map()

      sheetData.rows.forEach((row, index) => {
        try {
          const normalized = this.normalizeRow(row, structure)
          
          // Recopilar datos únicos
          clientes.set(normalized.cliente_id, {
            cliente_id: normalized.cliente_id,
            cliente_nombre: normalized.cliente_nombre
          })
          
          vendedores.set(normalized.vendedor_codigo, {
            vendedor_codigo: normalized.vendedor_codigo,
            nombre: normalized.vendedor_nombre,
            rol: 'vendedor'
          })
          
          // Crear asignaciones por categoría
          normalized.categorias.forEach(cat => {
            categorias.add(cat.categoria_nombre)
            
            processedRows.push({
              fecha_reporte: fechaReporte,
              vendedor_codigo: normalized.vendedor_codigo,
              cliente_id: normalized.cliente_id,
              categoria_nombre: cat.categoria_nombre,
              estado: cat.estado,
              supervisor_nombre: normalized.supervisor,
              ruta: normalized.ruta,
              zona: this.extractZona(normalized.ruta)
            })
          })
          
        } catch (error) {
          errors.push({
            row: index + 2, // +2 porque index es 0-based y hay header
            error: error.message
          })
        }
      })

      return {
        success: errors.length === 0,
        data: {
          asignaciones: processedRows,
          clientes: Array.from(clientes.values()),
          categorias: Array.from(categorias).map((nombre, index) => ({
            categoria_id: index + 1,
            categoria_nombre: nombre
          })),
          vendedores: Array.from(vendedores.values())
        },
        stats: {
          totalRows: sheetData.rows.length,
          processedRows: processedRows.length,
          uniqueClientes: clientes.size,
          uniqueCategorias: categorias.size,
          uniqueVendedores: vendedores.size
        },
        errors,
        sheetName: sheetData.sheetName
      }
      
    } catch (error) {
      throw new Error(`Error procesando archivo: ${error.message}`)
    }
  },

  // Extraer zona de la ruta
  extractZona(ruta) {
    // Extraer zona del formato "1L - Lunes 1x"
    const match = ruta.match(/^(\d+[A-Z]?)/)
    return match ? match[1] : 'SIN_ZONA'
  },

  // Generar preview de datos
  generatePreview(processResult, maxRows = 10) {
    if (!processResult.success) {
      return {
        hasErrors: true,
        errors: processResult.errors,
        stats: processResult.stats
      }
    }

    const { data, stats } = processResult
    
    return {
      hasErrors: false,
      stats,
      preview: {
        clientes: data.clientes.slice(0, maxRows),
        categorias: data.categorias,
        vendedores: data.vendedores,
        sampleAsignaciones: data.asignaciones.slice(0, maxRows)
      }
    }
  }
}
