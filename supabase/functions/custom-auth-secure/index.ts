import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'
// Import bcrypt for secure password hashing from esm.sh
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";

// CORS sécurisé - restreint aux domaines autorisés uniquement  
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://pmhktnxqponixycsjcwr.supabase.co', // Restreint au domaine du projet
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400', // Cache des preflight requests
}

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
      details: 'Veuillez utiliser l\'authentification standard via email/mot de passe.'
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 410 // Gone - indique que la ressource n'est plus disponible
    }
  );
});

// Fonctions dépréciées - conservées pour référence historique mais non utilisées
// Ces fonctions présentaient des failles de sécurité majeures :
// 1. Génération HWID côté client (non sécurisé)
// 2. Complexité inutile par rapport à l'auth standard
// 3. Possibilités de contournement par modification JS
  uniqueId: string;
  discordId: string;
  email: string;
  password: string;
  hwid: string;
}) {
  try {
    const { uniqueId, discordId, email, password, hwid } = userData;

    // Vérifier si l'ID unique existe déjà
    const { data: existingCredential } = await supabase
      .from('auth_credentials')
      .select('unique_id')
      .eq('unique_id', uniqueId)
      .single();

    if (existingCredential) {
      return new Response(
        JSON.stringify({ success: false, message: 'Cet ID unique est déjà utilisé' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Vérifier si l'email existe déjà
    const { data: existingEmail } = await supabase
      .from('auth_credentials')
      .select('email')
      .eq('email', email)
      .single();

    if (existingEmail) {
      return new Response(
        JSON.stringify({ success: false, message: 'Cet email est déjà utilisé' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Hacher le mot de passe
    const passwordHash = await hashPassword(password);

    // Créer l'utilisateur Supabase
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      return new Response(
        JSON.stringify({ success: false, message: 'Erreur lors de la création du compte' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Créer le profil (données publiques)
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: authUser.user.id,
        username: uniqueId,
        discord_id: discordId,
        avatar_url: null
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    // Créer les credentials sécurisées (données sensibles)
    const { error: credentialsError } = await supabase
      .from('auth_credentials')
      .insert({
        user_id: authUser.user.id,
        unique_id: uniqueId,
        email: email,
        password_hash: passwordHash,
        hwid: hwid,
        registration_date: new Date().toISOString()
      });

    if (credentialsError) {
      console.error('Credentials creation error:', credentialsError);
      // Nettoyer l'utilisateur créé en cas d'erreur
      await supabase.auth.admin.deleteUser(authUser.user.id);
      
      return new Response(
        JSON.stringify({ success: false, message: 'Erreur lors de la création des credentials' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`User registered successfully: ${uniqueId} (${authUser.user.id})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Compte créé avec succès',
        userId: authUser.user.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Register error:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Erreur lors de l\'inscription' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}

async function handleSecureLogin(supabase: any, loginData: {
  identifier: string;
  password: string;
  hwid: string;
}) {
  try {
    const { identifier, password, hwid } = loginData;

    // Chercher l'utilisateur par unique_id ou email dans auth_credentials
    const { data: credential, error: credentialError } = await supabase
      .from('auth_credentials')
      .select('*')
      .or(`unique_id.eq.${identifier},email.eq.${identifier}`)
      .single();

    if (credentialError || !credential) {
      console.log('Credential not found for identifier:', identifier);
      return new Response(
        JSON.stringify({ success: false, message: 'Identifiants incorrects' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Vérifier le mot de passe
    const isPasswordValid = await verifyPassword(password, credential.password_hash);
    if (!isPasswordValid) {
      console.log('Invalid password for user:', credential.unique_id);
      return new Response(
        JSON.stringify({ success: false, message: 'Identifiants incorrects' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Vérifier le HWID avec la nouvelle fonction sécurisée
    const { data: hwidCheck } = await supabase.rpc('check_hwid_access_secure', {
      target_hwid: hwid,
      target_user_id: credential.user_id
    });

    if (!hwidCheck.allowed) {
      // Logger la tentative dans hwid_audit
      await supabase.from('hwid_audit').insert({
        auth_credential_id: credential.id,
        hwid: hwid,
        success: false,
        reason: hwidCheck.reason,
        user_agent: 'Secure Auth Function'
      });

      console.log('HWID check failed for user:', credential.unique_id, 'reason:', hwidCheck.reason);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Appareil non autorisé', 
          code: 'HWID_MISMATCH' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Logger la connexion réussie
    await supabase.from('hwid_audit').insert({
      auth_credential_id: credential.id,
      hwid: hwid,
      success: true,
      reason: 'login_success',
      user_agent: 'Secure Auth Function'
    });

    // Générer un JWT pour l'utilisateur
    const { data: authData, error: signInError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: credential.email
    });

    if (signInError) {
      console.error('Sign in error:', signInError);
      return new Response(
        JSON.stringify({ success: false, message: 'Erreur de connexion' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`User logged in successfully: ${credential.unique_id} (${credential.user_id})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Connexion réussie',
        user: {
          id: credential.user_id,
          uniqueId: credential.unique_id,
          email: credential.email
        },
        authUrl: authData.properties?.action_link
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Erreur lors de la connexion' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}

// Fonctions utilitaires pour le hachage de mot de passe avec bcryptjs
async function hashPassword(password: string): Promise<string> {
  // Utiliser bcryptjs avec un salt aléatoire pour chaque mot de passe
  const saltRounds = 12; // Coût élevé pour la sécurité
  return await bcrypt.hash(password, saltRounds);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Erreur lors de la vérification du mot de passe:', error);
    return false;
  }
}