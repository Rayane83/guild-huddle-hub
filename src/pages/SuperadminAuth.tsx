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
        title="Connexion Superadmin - Portail Flashback Fa"
        description="Authentification superadmin sécurisée avec code email et mot de passe."
      />
      <SuperadminAuth onAuthSuccess={handleAuthSuccess} />
    </>
  );
};

export default SuperadminAuthPage;