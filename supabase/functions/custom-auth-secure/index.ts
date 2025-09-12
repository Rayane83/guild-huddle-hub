import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// CORS sécurisé - restreint aux domaines autorisés uniquement  
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://pmhktnxqponixycsjcwr.supabase.co',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // AVERTISSEMENT DE SÉCURITÉ : Cette fonction est dépréciée
  console.warn('⚠️  SÉCURITÉ: custom-auth-secure est déprécié et présente des failles de sécurité');
  console.warn('📌 Utilisez l\'authentification Supabase standard à la place');
  
  // Retourner une erreur de dépréciation pour forcer la migration
  return new Response(
    JSON.stringify({ 
      success: false, 
      message: 'Cette méthode d\'authentification a été désactivée pour des raisons de sécurité.',
      code: 'AUTH_METHOD_DEPRECATED',
      details: 'Veuillez utiliser l\'authentification standard via email/mot de passe.',
      redirect: '/auth'
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 410 // Gone - indique que la ressource n'est plus disponible
    }
  );
});