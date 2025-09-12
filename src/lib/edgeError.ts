// Utilitaires pour extraire des messages d'erreur pertinents provenant des Edge Functions Supabase
export type EdgeErrorType =
  | 'EMAIL_ALREADY_EXISTS'
  | 'UNIQUE_ID_ALREADY_EXISTS'
  | 'DISCORD_ID_ALREADY_EXISTS'
  | 'INVALID_ACCESS_CODE'
  | 'INVALID_CODE'
  | 'INVALID_PASSWORD'
  | 'USER_NOT_FOUND'
  | 'EMAIL_NOT_FOUND'
  | 'NOT_SUPERADMIN'
  | string;

export interface EdgeErrorDetails {
  message: string;
  type?: EdgeErrorType;
}

export function mapEdgeErrorType(type?: EdgeErrorType): string | null {
  switch (type) {
    case 'EMAIL_ALREADY_EXISTS':
      return "Cet email est déjà enregistré. Essayez de vous connecter à la place.";
    case 'UNIQUE_ID_ALREADY_EXISTS':
      return "Cet ID unique est déjà utilisé. Veuillez en choisir un autre.";
    case 'DISCORD_ID_ALREADY_EXISTS':
      return "Cet ID Discord est déjà utilisé.";
    case 'INVALID_ACCESS_CODE':
      return "Code d'accès invalide. Contactez un superadmin.";
    case 'INVALID_CODE':
      return 'Code invalide ou expiré';
    case 'INVALID_PASSWORD':
      return 'Mot de passe incorrect';
    case 'USER_NOT_FOUND':
      return 'Utilisateur non trouvé';
    case 'EMAIL_NOT_FOUND':
      return 'Email non trouvé';
    case 'NOT_SUPERADMIN':
      return 'Accès réservé aux superadmins';
    default:
      return null;
  }
}

// Extrait un message lisible et un type d'un objet d'erreur Supabase FunctionsError
export async function extractEdgeError(e: any): Promise<EdgeErrorDetails> {
  let message: string = e?.message || 'Erreur inattendue';
  let type: EdgeErrorType | undefined;

  // 1) Corps déjà parsé dans l'erreur (cas supabase-js)
  const body = e?.context?.body;
  try {
    const parsed = typeof body === 'string' ? JSON.parse(body) : body;
    if (parsed) {
      type = (parsed?.type as EdgeErrorType) ?? type;
      if (parsed?.error) message = String(parsed.error);
    }
  } catch {}

  // 2) Réponse HTTP accessible (FunctionsError.context.response)
  if (!type && e?.context?.response) {
    try {
      const resp = e.context.response as Response;
      // Cloner puis lire le body pour ne pas le consommer ailleurs
      const text = await resp.clone().text();
      try {
        const parsed = JSON.parse(text);
        type = (parsed?.type as EdgeErrorType) ?? type;
        if (parsed?.error) message = String(parsed.error);
      } catch {
        // si pas JSON, garder message par défaut
      }
    } catch {}
  }

  return { message: mapEdgeErrorType(type) || message, type };
}
