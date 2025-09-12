// Import bcrypt for secure password hashing
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Codes secrets pour l'inscription (depuis les secrets Supabase)
const SUPERADMIN_CODE = Deno.env.get('SUPERADMIN_CODE');
const ADMIN_CODE = Deno.env.get('ADMIN_CODE');

if (!SUPERADMIN_CODE || !ADMIN_CODE) {
  throw new Error('Les codes d\'accès ne sont pas configurés dans les secrets Supabase');
}

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
  
  // Nettoyer les anciens codes expirés
  await supabase.rpc('cleanup_expired_codes');
  
  // Stocker le code dans la base de données de manière sécurisée
  const { error: insertError } = await supabase
    .from('auth_temp_codes')
    .insert({
      email,
      code,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
    });

  if (insertError) {
    console.error('Erreur lors du stockage du code:', insertError);
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

  // Vérifier le code dans la base de données
  const { data: codeData, error: codeError } = await supabase
    .from('auth_temp_codes')
    .select('*')
    .eq('code', code)
    .eq('email', email)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (codeError || !codeData) {
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

  // Marquer le code comme utilisé
  await supabase
    .from('auth_temp_codes')
    .update({ used: true })
    .eq('id', codeData.id);

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
  // Utiliser bcrypt avec un salt aléatoire pour chaque mot de passe
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

serve(handler);