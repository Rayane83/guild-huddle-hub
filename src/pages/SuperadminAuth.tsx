import { SuperadminAuth } from '@/components/SuperadminAuth';
import { SEOHead } from '@/components/SEOHead';

const SuperadminAuthPage = () => {
  const handleAuthSuccess = () => {
    // Rediriger vers la page principale après connexion
    window.location.href = '/';
  };

  return (
    <>
      <SEOHead 
        title="Connexion Superadmin - Portail Entreprise Flashback Fa"
        description="Authentification sécurisée pour les superadministrateurs du portail Flashback Fa avec vérification par email."
      />
      <SuperadminAuth onAuthSuccess={handleAuthSuccess} />
    </>
  );
};

export default SuperadminAuthPage;