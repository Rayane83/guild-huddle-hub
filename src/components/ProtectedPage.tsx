import React from 'react';
import { useDiscordAuth } from '@/hooks/useDiscordAuth';
import { AuthPage } from '@/components/AuthPage';
import { Layout } from '@/components/Layout';

interface ProtectedPageProps {
  children: React.ReactNode;
  pageTitle?: string;
  requiredRoles?: string[];
}

export const ProtectedPage: React.FC<ProtectedPageProps> = ({ 
  children, 
  pageTitle,
  requiredRoles 
}) => {
  const { isAuthenticated, isLoading, userRole } = useDiscordAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // Vérifier les permissions si des rôles sont requis
  if (requiredRoles && requiredRoles.length > 0) {
    if (!userRole || !requiredRoles.includes(userRole)) {
      return (
        <Layout pageTitle="Accès refusé">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">Accès refusé</h2>
            <p className="text-muted-foreground">
              Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            </p>
          </div>
        </Layout>
      );
    }
  }

  return (
    <Layout pageTitle={pageTitle}>
      {children}
    </Layout>
  );
};