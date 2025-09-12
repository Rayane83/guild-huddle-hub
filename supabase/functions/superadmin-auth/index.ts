import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Codes secrets pour l'inscription
const SUPERADMIN_CODE = "r_RU<1j$;5m8:=|D/0f~o>t~Q~I^1wKj)IIu~EB_KHe%+:>/pLN(bkLJS^S;@...AnRfeKT8wild[o-M=y<hE&CM071g&jn.VC0ug<6_uGBNsDeJm26lT!g&P9_tT";
const ADMIN_CODE = "Xx!5R$A3bN=G}oZJ7yq<eU0?m@tD1p^s~Wz9F+K%hC*V>8uO)f&nQ6j|l[2rS:kYdM_E#TwZaLgB4vP;HiJcXRU7$N!5m@2Fh-0V^oQn]9zD*+p|y<K%";

// Store des codes temporaires (en production, utiliser Redis ou une DB)
const tempCodes = new Map<string, { email: string; timestamp: number }>();

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...data } = await req.json();

    switch (action) {
      case 'send_login_code':
        return await handleSendLoginCode(data);
      case 'verify_login_code':
        return await handleVerifyLoginCode(data);
      case 'register_with_code':
        return await handleRegisterWithCode(data);
      case 'reset_user_password':
        return await handleResetUserPassword(data);
      default:
        throw new Error('Action non reconnue');
    }
  } catch (error: any) {
    console.error('Erreur dans superadmin-auth:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
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
  
  // Stocker le code temporairement (10 minutes)
  tempCodes.set(email, { email, timestamp: Date.now() });

  // Envoyer l'email via la fonction send-auth-code
  const { error } = await supabase.functions.invoke('send-auth-code', {
    body: {
      email,
      code,
      type: 'login'
    }
  });

  if (error) {
    throw new Error('Erreur lors de l\'envoi de l\'email');
  }

  // Stocker le code avec l'email
  tempCodes.set(code, { email, timestamp: Date.now() });

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

  // Vérifier si le code existe et n'est pas expiré (10 minutes)
  const codeData = tempCodes.get(code);
  if (!codeData || codeData.email !== email) {
    throw new Error('Code invalide ou expiré');
  }

  if (Date.now() - codeData.timestamp > 10 * 60 * 1000) {
    tempCodes.delete(code);
    throw new Error('Code expiré');
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

  // Vérifier le mot de passe
  const isValidPassword = await verifyPassword(password, credentials.password_hash);
  if (!isValidPassword) {
    throw new Error('Mot de passe incorrect');
  }

  // Supprimer le code utilisé
  tempCodes.delete(code);

  // Créer une session Supabase
  const { data: authData, error: authError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: email
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
      isuperstaff: credentials.is_superstaff
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
    throw new Error('Code d\'accès invalide');
  }

  // Vérifier si l'email ou l'uniqueId existe déjà
  const { data: existingUser } = await supabase
    .from('auth_credentials')
    .select('email, unique_id')
    .or(`email.eq.${email},unique_id.eq.${uniqueId}`)
    .single();

  if (existingUser) {
    if (existingUser.email === email) {
      throw new Error('Cet email est déjà utilisé');
    }
    if (existingUser.unique_id === uniqueId) {
      throw new Error('Cet ID unique est déjà utilisé');
    }
  }

  // Créer l'utilisateur Supabase
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
  });

  if (authError || !authUser.user) {
    throw new Error(`Erreur lors de la création du compte: ${authError?.message}`);
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
      isuperstaff: isuperstaff
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
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'flashback_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashedInput = await hashPassword(password);
  return hashedInput === hash;
}

serve(handler);