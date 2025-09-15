import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDiscordAuth } from '@/hooks/useDiscordAuth';
import { Navigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { isAuthenticated, isLoading, signInWithDiscord } = useDiscordAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Vérification de l'authentification...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img
              src="/lovable-uploads/edb98f3b-c1fa-4ca1-8a20-dd0be59b3591.png"
              alt="Logo Flashback FA"
              className="h-16 w-16 rounded-lg mx-auto"
            />
          </div>
          <CardTitle className="text-2xl font-bold">
            Portail Entreprise
          </CardTitle>
          <CardDescription>
            Connectez-vous avec Discord pour accéder au portail entreprise Flashback FA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button 
            onClick={signInWithDiscord}
            className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white"
            size="lg"
          >
            <MessageSquare className="mr-2 h-5 w-5" />
            Se connecter avec Discord
          </Button>
          
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Utilisez votre compte Discord pour vous connecter.
              Vos rôles et permissions seront automatiquement détectés.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};