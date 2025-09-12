import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Shield, ArrowRight } from "lucide-react";

/**
 * Composant de transition pour remplacer AuthScreen
 * Redirige vers l'authentification standard et explique la dépréciation du système HWID
 */
interface AuthScreenTransitionProps {
  onAuthSuccess: () => void;
}

export function AuthScreenTransition({ onAuthSuccess }: AuthScreenTransitionProps) {
  const redirectToStandardAuth = () => {
    window.location.href = '/auth';
  };

  const redirectToSuperadminAuth = () => {
    window.location.href = '/superadmin-auth';
  };

  return (
    <div className="min-h-screen bg-hero-pro flex items-center justify-center p-4">
      <div className="w-full max-w-lg mx-auto space-y-6">
        {/* Hero Section */}
        <div className="text-center mb-8 animate-fade-in">
          <img
            src="/lovable-uploads/edb98f3b-c1fa-4ca1-8a20-dd0be59b3591.png"
            alt="Logo Flashback Fa"
            className="mx-auto h-16 w-16 rounded-md shadow"
            loading="lazy"
            decoding="async"
          />
          <h1 className="mt-6 text-4xl font-extrabold text-gradient">
            Portail Entreprise Flashback Fa
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Système d'authentification sécurisé modernisé
          </p>
        </div>

        {/* Migration Notice */}
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Système d'authentification HWID déprécié</strong>
            <br />
            Pour des raisons de sécurité, l'ancien système d'authentification basé sur HWID a été désactivé.
            Veuillez utiliser l'authentification standard ci-dessous.
          </AlertDescription>
        </Alert>

        {/* Security Improvements Card */}
        <Card className="glass-panel">
          <CardHeader className="text-center">
            <Shield className="w-12 h-12 mx-auto text-primary mb-4" />
            <CardTitle className="text-2xl">Sécurité Renforcée</CardTitle>
            <CardDescription>
              Le nouveau système offre une meilleure sécurité et fiabilité
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Améliorations de sécurité :</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Authentification Supabase standard robuste</li>
                <li>• Gestion des rôles centralisée et sécurisée</li>
                <li>• Politiques de sécurité au niveau base de données</li>
                <li>• Suppression des vulnérabilités liées au HWID client</li>
                <li>• Audit et traçabilité complets</li>
              </ul>
            </div>
            
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold">Choisissez votre méthode de connexion :</h3>
              
              <Button 
                onClick={redirectToStandardAuth}
                className="w-full"
                size="lg"
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Connexion Standard
              </Button>
              
              <Button 
                onClick={redirectToSuperadminAuth}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Shield className="mr-2 h-4 w-4" />
                Connexion Superadmin
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Si vous rencontrez des problèmes, contactez un administrateur.
          </p>
        </div>
      </div>
    </div>
  );
}