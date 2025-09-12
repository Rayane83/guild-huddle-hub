import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

/**
 * Composant de transition pour remplacer SecureHwidManager
 * Affiche un avertissement de sécurité pour informer de la dépréciation du système HWID
 */
export function SecureAuthManager() {
  return (
    <div className="p-4 space-y-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Système d'authentification HWID déprécié</strong>
          <br />
          Pour des raisons de sécurité, le système d'authentification basé sur HWID a été désactivé.
          Veuillez utiliser l'authentification standard via email/mot de passe.
        </AlertDescription>
      </Alert>
      
      <div className="text-sm text-muted-foreground">
        <p>
          Le système HWID présentait des failles de sécurité majeures :
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Génération d'identifiants côté client (non sécurisé)</li>
          <li>Possibilité de contournement par modification du code JavaScript</li>
          <li>Absence de validation serveur robuste</li>
          <li>Complexité inutile par rapport à l'authentification standard</li>
        </ul>
        
        <p className="mt-4">
          Le système standard Supabase avec gestion des rôles offre une sécurité bien supérieure
          et est plus simple à maintenir.
        </p>
      </div>
    </div>
  );
}