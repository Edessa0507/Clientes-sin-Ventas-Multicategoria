// Lista de orígenes permitidos
const allowedOrigins = [
  'http://localhost:5173', // Desarrollo local Vite
  'http://localhost:3000', // Desarrollo local Vite (puerto alterno)
  'http://172.16.10.153:3000', // Desarrollo en red local
  'https://clientes-sin-ventas-edessa.netlify.app', // Producción Netlify
  'https://xaohatfpnsoszduxgdyp.supabase.co' // Supabase
];

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  };

  // Si el origen está en la lista, permitirlo. Si no, no devolver cabecera de origen.
  if (origin && allowedOrigins.includes(origin)) {
    return {
      ...headers,
      'Access-Control-Allow-Origin': origin,
    };
  }

  // Por defecto, no permitir ningún origen si no está en la lista.
  return headers;
}
