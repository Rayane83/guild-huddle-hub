-- Créer un utilisateur test pour pouvoir se connecter et tester le système

-- Créer un utilisateur Supabase directement (avec un mot de passe simple pour les tests)
-- Email: test@flashback.dev
-- Mot de passe: Test123!

-- D'abord, vérifier si l'utilisateur existe déjà et le supprimer si nécessaire
DO $$ 
DECLARE
    test_user_id uuid;
BEGIN
    -- Trouver l'utilisateur test s'il existe
    SELECT id INTO test_user_id 
    FROM auth.users 
    WHERE email = 'test@flashback.dev';
    
    -- Si l'utilisateur existe, nettoyer ses données
    IF test_user_id IS NOT NULL THEN
        DELETE FROM public.user_roles WHERE user_id = test_user_id;
        DELETE FROM public.profiles WHERE user_id = test_user_id;
        DELETE FROM public.auth_credentials WHERE user_id = test_user_id;
        DELETE FROM auth.users WHERE id = test_user_id;
    END IF;
END $$;

-- Créer l'utilisateur test dans auth.users
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'test@flashback.dev',
    crypt('Test123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    '',
    '',
    '',
    ''
);

-- Récupérer l'ID de l'utilisateur créé
DO $$ 
DECLARE
    test_user_id uuid;
BEGIN
    SELECT id INTO test_user_id 
    FROM auth.users 
    WHERE email = 'test@flashback.dev';
    
    -- Créer le profil
    INSERT INTO public.profiles (
        user_id,
        email,
        username,
        discord_id,
        display_name
    ) VALUES (
        test_user_id,
        'test@flashback.dev',
        'testuser',
        '123456789012345678',
        'Utilisateur Test'
    );
    
    -- Créer les credentials d'authentification
    INSERT INTO public.auth_credentials (
        user_id,
        email,
        unique_id,
        password_hash,
        is_superstaff,
        registration_date
    ) VALUES (
        test_user_id,
        'test@flashback.dev',
        'testuser',
        crypt('Test123!', gen_salt('bf')),
        true,
        now()
    );
    
    -- Attribuer le rôle superadmin
    INSERT INTO public.user_roles (
        user_id,
        role,
        assigned_by
    ) VALUES (
        test_user_id,
        'superadmin'::app_role,
        test_user_id
    );
    
END $$;