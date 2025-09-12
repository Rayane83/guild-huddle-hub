import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Key, User, AlertCircle, Loader2, UserCheck, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStandardAuth } from "@/hooks/useStandardAuth";
import { useNavigate } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";

const AuthPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp, isAuthenticated, isLoading: authLoading } = useStandardAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });
  
  const [signupForm, setSignupForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    uniqueId: '',
    discordId: ''
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await signIn(loginForm.email, loginForm.password);
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Email ou mot de passe incorrect');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Veuillez confirmer votre email avant de vous connecter');
        } else {
          setError(error.message);
        }
        return;
      }
      
      toast({
        title: "Connexion réussie",
        description: "Bienvenue !",
      });
      
      // Navigation is handled by useEffect above
    } catch (error: any) {
      setError(error.message || 'Erreur lors de la connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signupForm.password !== signupForm.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (signupForm.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const metadata = {
        display_name: signupForm.displayName || undefined,
        unique_id: signupForm.uniqueId || undefined,
        discord_id: signupForm.discordId || undefined,
      };
      
      const { error } = await signUp(signupForm.email, signupForm.password, metadata);
      
      if (error) {
        if (error.message.includes('already registered')) {
          setError('Cet email est déjà enregistré');
        } else {
          setError(error.message);
        }
        return;
      }
      
      toast({
        title: "Inscription réussie",
        description: "Un email de confirmation vous a été envoyé. Vérifiez votre boîte mail.",
        duration: 5000,
      });
      
      // Reset form
      setSignupForm({
        email: '',
        password: '',
        confirmPassword: '',
        displayName: '',
        uniqueId: '',
        discordId: ''
      });
      
    } catch (error: any) {
      setError(error.message || 'Erreur lors de l\'inscription');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-hero-pro flex items-center justify-center p-4">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Chargement...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead 
        title="Connexion - Portail Flashback Fa"
        description="Connectez-vous ou créez votre compte sur le portail Flashback Fa pour accéder à vos données d'entreprise."
      />
      
      <div className="min-h-screen bg-hero-pro flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-8 animate-fade-in">
            <img
              src="/lovable-uploads/edb98f3b-c1fa-4ca1-8a20-dd0be59b3591.png"
              alt="Logo Flashback Fa"
              className="mx-auto h-16 w-16 rounded-md shadow"
              loading="lazy"
              decoding="async"
            />
            <h1 className="mt-6 text-3xl font-bold text-gradient">
              Portail Flashback Fa
            </h1>
            <p className="mt-2 text-muted-foreground">
              Authentification sécurisée
            </p>
          </div>

          {/* Auth Card */}
          <Card className="glass-panel">
            <CardHeader className="text-center">
              <CardTitle>Authentification</CardTitle>
              <CardDescription>Connectez-vous ou créez votre compte</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Connexion</TabsTrigger>
                  <TabsTrigger value="signup">Inscription</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login" className="space-y-4 mt-6">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="votre@email.com"
                          value={loginForm.email}
                          onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Mot de passe</Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="Votre mot de passe"
                          value={loginForm.password}
                          onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    
                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    
                    <Button 
                      type="submit"
                      className="w-full" 
                      disabled={isLoading || !loginForm.email || !loginForm.password}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Connexion...
                        </>
                      ) : (
                        <>
                          <UserCheck className="mr-2 h-4 w-4" />
                          Se connecter
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="signup" className="space-y-4 mt-6">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="votre@email.com"
                          value={signupForm.email}
                          onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-display-name">Nom d'affichage</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-display-name"
                          type="text"
                          placeholder="Votre nom"
                          value={signupForm.displayName}
                          onChange={(e) => setSignupForm(prev => ({ ...prev, displayName: e.target.value }))}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Mot de passe *</Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="Minimum 6 caractères"
                          value={signupForm.password}
                          onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm-password">Confirmer le mot de passe *</Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-confirm-password"
                          type="password"
                          placeholder="Répétez votre mot de passe"
                          value={signupForm.confirmPassword}
                          onChange={(e) => setSignupForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    
                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    
                    <Button 
                      type="submit"
                      className="w-full" 
                      disabled={
                        isLoading || 
                        !signupForm.email || 
                        !signupForm.password || 
                        !signupForm.confirmPassword
                      }
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Inscription...
                        </>
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Créer un compte
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          <div className="text-center mt-6">
            <p className="text-xs text-muted-foreground">
              En vous connectant, vous acceptez nos conditions d'utilisation
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthPage;