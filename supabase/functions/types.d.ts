// Declaraciones para módulos remotos usados por Deno en Edge Functions
// Esto evita errores de resolución en el linter/TS local (Node)

declare module "https://deno.land/std@0.168.0/http/server.ts" {
	export const serve: any;
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
	export * from "@supabase/supabase-js";
}


