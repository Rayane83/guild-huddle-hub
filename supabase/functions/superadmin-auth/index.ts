import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
// Import bcrypt for secure password hashing from esm.sh
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";

// CORS sécurisé - autorise les domaines Lovable et Supabase
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Temporairement permissif pour Lovable
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Codes secrets pour l'inscription (depuis les secrets Supabase)
const SUPERADMIN_CODE = Deno.env.get('SUPERADMIN_CODE');
const ADMIN_CODE = Deno.env.get('ADMIN_CODE');

const handler = async (req: Request): Promise<Response> => {
  console.log('🔍 Superadmin-auth request received:', req.method, req.url);
  
  if (req.method === "OPTIONS") {
    console.log('✅ CORS preflight request handled');
    return new Response(null, { headers: corsHeaders });
  }

  // Vérifier les codes secrets au moment de la requête
  if (!SUPERADMIN_CODE || !ADMIN_CODE) {
    console.error('❌ Codes d\'accès manquants dans les secrets Supabase');
    return new Response(
      JSON.stringify({ error: 'Configuration des codes d\'accès manquante' }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  try {
    const body = await req.json();
    console.log('📝 Request body received:', JSON.stringify(body, null, 2));
    
    const { action, ...data } = body;
    console.log('🎯 Action:', action, 'Data keys:', Object.keys(data));

    switch (action) {
      case 'send_login_code':
        console.log('Handling send_login_code');
        return await handleSendLoginCode(data);
      case 'verify_login_code':
        console.log('Handling verify_login_code');
        return await handleVerifyLoginCode(data);
      case 'register_with_code':
        console.log('Handling register_with_code');
        return await handleRegisterWithCode(data);
      case 'reset_user_password':
        console.log('Handling reset_user_password');
        return await handleResetUserPassword(data);
      default:
        console.error('Unknown action:', action);
        throw new Error('Action non reconnue: ' + action);
    }
  } catch (error: any) {
    console.error('Erreur dans superadmin-auth:', error);
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack ? error.stack.split('\n').slice(0, 5).join('\n') : 'No stack trace'
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

async function handleSendLoginCode(data: any) {
  const { email } = data;

  // Vérifier si l'email existe
  const { data: credentials } = await supabase
    .from('auth_credentials')
    .select('email, is_superstaff')
    .eq('email', email)
    .single();

  if (!credentials) {
    throw new Error('Email non trouvé');
  }

  if (!credentials.is_superstaff) {
    throw new Error('Accès non autorisé - Seuls les superadmins peuvent utiliser cette méthode');
  }

  // Générer un code à 6 chiffres
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Nettoyer les anciens codes expirés
  await supabase.rpc('cleanup_expired_codes');
  
  // Stocker le code de manière sécurisée via la nouvelle fonction
  const { data: storeResult, error: storeError } = await supabase.rpc('store_auth_code', {
    target_email: email,
    auth_code: code
  });

  if (storeError || !storeResult?.success) {
    console.error('Erreur lors du stockage du code:', storeError);
    throw new Error('Erreur lors de la génération du code');
  }

  // Envoyer l'email via la fonction send-auth-code
  const { error } = await supabase.functions.invoke('send-auth-code', {
    body: {
      email,
      code,
      type: 'login'
    }
  });

  if (error) {
    // Nettoyer le code si l'envoi d'email échoue
    await supabase
      .from('auth_temp_codes')
      .delete()
      .eq('code', code);
    throw new Error('Erreur lors de l\'envoi de l\'email');
  }

  return new Response(JSON.stringify({ 
    success: true, 
    message: 'Code envoyé par email' 
  }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function handleVerifyLoginCode(data: any) {
  const { email, code, password } = data;

  // Valider et consommer le code de manière sécurisée
  const { data: codeValidation, error: codeError } = await supabase.rpc('validate_and_consume_auth_code', {
    target_email: email,
    target_code: code
  });

  if (codeError || !codeValidation?.valid) {
    throw new Error('Code invalide ou expiré');
  }

  // Vérifier le mot de passe
  const { data: credentials } = await supabase
    .from('auth_credentials')
    .select('*')
    .eq('email', email)
    .single();

  if (!credentials) {
    throw new Error('Utilisateur non trouvé');
  }

  // Vérifier le mot de passe avec bcrypt
  const isValidPassword = await verifyPassword(password, credentials.password_hash);
  if (!isValidPassword) {
    throw new Error('Mot de passe incorrect');
  }

  // Le code a déjà été marqué comme utilisé par validate_and_consume_auth_code

  // Créer une session Supabase avec la bonne URL de redirection
  const { data: authData, error: authError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: email,
    options: {
      redirectTo: `${req.headers.get('origin') || 'https://af9bbd67-a473-4fc4-bd6b-bc26cdfcce51.lovableproject.com'}/superadmin`
    }
  });

  if (authError) {
    throw new Error('Erreur lors de la création de la session');
  }

  return new Response(JSON.stringify({
    success: true,
    user: {
      id: credentials.user_id,
      email: credentials.email,
      uniqueId: credentials.unique_id,
      is_superstaff: credentials.is_superstaff
    },
    magicLink: authData.properties?.action_link
  }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function handleRegisterWithCode(data: any) {
  const { email, password, uniqueId, discordId, accessCode } = data;

  let isuperstaff = false;
  
  // Vérifier le code d'accès
  if (accessCode === SUPERADMIN_CODE) {
    isuperstaff = true;
  } else if (accessCode === ADMIN_CODE) {
    isuperstaff = false;
  } else {
    return new Response(JSON.stringify({ 
      error: 'Code d\'accès invalide',
      type: 'INVALID_ACCESS_CODE'
    }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // Vérifier si l'email ou l'uniqueId existe déjà
  const { data: existingUser } = await supabase
    .from('auth_credentials')
    .select('email, unique_id')
    .or(`email.eq.${email},unique_id.eq.${uniqueId}`)
    .single();

  if (existingUser) {
    if (existingUser.email === email) {
      return new Response(JSON.stringify({ 
        error: 'Cet email est déjà utilisé. Essayez de vous connecter à la place.',
        type: 'EMAIL_ALREADY_EXISTS'
      }), {
        status: 409,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (existingUser.unique_id === uniqueId) {
      return new Response(JSON.stringify({ 
        error: 'Cet ID unique est déjà utilisé',
        type: 'UNIQUE_ID_ALREADY_EXISTS'
      }), {
        status: 409,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  }

  // Créer l'utilisateur Supabase
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
  });

  if (authError || !authUser.user) {
    // Handle specific Supabase Auth errors
    if (authError?.message?.includes('already been registered')) {
      // L'utilisateur existe déjà dans auth.users -> récupérer l'user_id directement via auth.users
      const { data: existingAuthUser, error: getUserError } = await supabase.auth.admin.listUsers();
      
      if (getUserError) {
        throw new Error(`Erreur lors de la récupération des utilisateurs: ${getUserError.message}`);
      }
      
      const existingUser = existingAuthUser.users.find(u => u.email === email);
      
      if (!existingUser) {
        return new Response(JSON.stringify({ 
          error: "Utilisateur non trouvé dans le système d'authentification",
          type: 'USER_NOT_FOUND'
        }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const existingUserId = existingUser.id;

      // Hasher le mot de passe et (upsert manuel) des credentials
      const passwordHashExisting = await hashPassword(password);

      const { data: existingCred } = await supabase
        .from('auth_credentials')
        .select('id')
        .eq('user_id', existingUserId)
        .single();

      if (existingCred) {
        const { error: updErr } = await supabase
          .from('auth_credentials')
          .update({
            email,
            unique_id: uniqueId,
            password_hash: passwordHashExisting,
            is_superstaff: isuperstaff,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingCred.id);
        if (updErr) {
          throw new Error(`Erreur mise à jour credentials existants: ${updErr.message}`);
        }
      } else {
        const { error: insErr } = await supabase
          .from('auth_credentials')
          .insert({
            user_id: existingUserId,
            email,
            unique_id: uniqueId,
            password_hash: passwordHashExisting,
            is_superstaff: isuperstaff,
            registration_date: new Date().toISOString(),
          });
        if (insErr) {
          throw new Error(`Erreur création credentials: ${insErr.message}`);
        }
      }

      // S'assurer que le profil est créé/mis à jour
      const { error: upProfileErr } = await supabase
        .from('profiles')
        .upsert({
          user_id: existingUserId,
          username: uniqueId,
          discord_id: discordId,
          email,
        }, { onConflict: 'user_id' });
      if (upProfileErr) {
        console.error('Erreur lors de la mise à jour du profil:', upProfileErr);
      }

      return new Response(JSON.stringify({ 
        success: true,
        message: `Compte ${isuperstaff ? 'superadmin' : 'admin'} mis à jour avec succès`,
        user: { id: existingUserId, email, uniqueId, is_superstaff: isuperstaff }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    
    return new Response(JSON.stringify({ 
      error: `Erreur lors de la création du compte: ${authError?.message}`,
      type: 'AUTH_USER_CREATION_FAILED'
    }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const userId = authUser.user.id;

  // Hasher le mot de passe
  const passwordHash = await hashPassword(password);

  // Insérer dans auth_credentials
  const { error: credError } = await supabase
    .from('auth_credentials')
    .insert({
      user_id: userId,
      email: email,
      unique_id: uniqueId,
      password_hash: passwordHash,
      is_superstaff: isuperstaff,
      registration_date: new Date().toISOString(),
    });

  if (credError) {
    // Rollback - supprimer l'utilisateur créé
    await supabase.auth.admin.deleteUser(userId);
    throw new Error(`Erreur lors de la création des credentials: ${credError.message}`);
  }

  // Créer le profil
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      user_id: userId,
      username: uniqueId,
      discord_id: discordId,
    });

  if (profileError) {
    console.error('Erreur lors de la création du profil:', profileError);
  }

  return new Response(JSON.stringify({
    success: true,
    message: `Compte ${isuperstaff ? 'superadmin' : 'admin'} créé avec succès`,
    user: {
      id: userId,
      email: email,
      uniqueId: uniqueId,
      is_superstaff: isuperstaff
    }
  }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function handleResetUserPassword(data: any) {
  const { targetEmail, adminUserId } = data;

  // Vérifier que l'admin est bien superstaff
  const { data: adminCreds } = await supabase
    .from('auth_credentials')
    .select('is_superstaff')
    .eq('user_id', adminUserId)
    .single();

  if (!adminCreds?.is_superstaff) {
    throw new Error('Seuls les superadmins peuvent réinitialiser les mots de passe');
  }

  // Trouver l'utilisateur cible
  const { data: targetUser } = await supabase
    .from('auth_credentials')
    .select('*')
    .eq('email', targetEmail)
    .single();

  if (!targetUser) {
    throw new Error('Utilisateur non trouvé');
  }

  // Générer un nouveau mot de passe temporaire
  const tempPassword = Math.random().toString(36).slice(-12) + Math.floor(Math.random() * 1000);
  const passwordHash = await hashPassword(tempPassword);

  // Mettre à jour le mot de passe
  const { error: updateError } = await supabase
    .from('auth_credentials')
    .update({ password_hash: passwordHash })
    .eq('user_id', targetUser.user_id);

  if (updateError) {
    throw new Error('Erreur lors de la mise à jour du mot de passe');
  }

  // Envoyer le nouveau mot de passe par email
  const { error: emailError } = await supabase.functions.invoke('send-auth-code', {
    body: {
      email: targetEmail,
      code: tempPassword,
      type: 'password_reset'
    }
  });

  if (emailError) {
    throw new Error('Erreur lors de l\'envoi de l\'email');
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'Mot de passe réinitialisé et envoyé par email'
  }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function hashPassword(password: string): Promise<string> {
  // Utiliser bcryptjs avec un salt aléatoire pour chaque mot de passe
  const saltRounds = 12; // Coût élevé pour la sécurité
  try {
    return await bcrypt.hash(password, saltRounds);
  } catch (error) {
    console.error('Erreur lors du hachage du mot de passe:', error);
    throw new Error('Erreur lors du hachage du mot de passe');
  }
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Erreur lors de la vérification du mot de passe:', error);
    return false;
  }
}

serve(handler);