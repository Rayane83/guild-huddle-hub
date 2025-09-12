import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, User, Mail, Key, Hash, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSecureAuth } from "@/hooks/useSecureAuth";

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Formulaires
  const [loginForm, setLoginForm] = useState({
    identifier: '', // Peut être unique_id ou email
    password: ''
  });
  
  const [registerForm, setRegisterForm] = useState({
    uniqueId: '',
    discordId: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Utiliser l'API Supabase au lieu de fetch direct
      const auth = useSecureAuth();
      
      await auth.signIn(loginForm.identifier, loginForm.password);
      
      toast({
        title: "Connexion réussie",
        description: "Bienvenue sur le portail !",
      });
      onAuthSuccess();
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.message?.includes('HWID') || err.message?.includes('HWIP')) {
        setError('Connexion refusée : Votre appareil n\'est pas autorisé. Contactez un superstaff pour réinitialiser votre HWID.');
      } else {
        setError(err.message || 'Erreur de connexion');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (registerForm.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Utiliser l'API Supabase au lieu de fetch direct
      const auth = useSecureAuth();
      
      await auth.signUp({
        uniqueId: registerForm.uniqueId,
        discordId: registerForm.discordId,
        email: registerForm.email,
        password: registerForm.password,
      });
      
      toast({
        title: "Inscription réussie",
        description: "Votre compte a été créé avec succès !",
      });
      onAuthSuccess();
    } catch (err: any) {
      console.error('Register error:', err);
      setError(err.message || 'Erreur lors de l\'inscription');
    } finally {
      setIsLoading(false);
    }
  };

  const getClientHWIP = async (): Promise<string> => {
    // Générer un HWIP basé sur plusieurs facteurs du navigateur
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('HWIP', 10, 50);
    const canvasFingerprint = canvas.toDataURL();
    
    const screenFingerprint = `${screen.width}x${screen.height}x${screen.colorDepth}`;
    const timezoneFingerprint = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const languageFingerprint = navigator.language;
    const platformFingerprint = navigator.platform;
    
    const combined = `${canvasFingerprint}-${screenFingerprint}-${timezoneFingerprint}-${languageFingerprint}-${platformFingerprint}`;
    
    // Hash simple (dans un vrai projet, utilisez une lib crypto)
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString(16);
  };

  return (
    <div className="min-h-screen bg-hero-pro flex items-center justify-center p-4">
      <div className="w-full max-w-lg mx-auto">
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
            Authentification sécurisée avec protection HWID
          </p>
        </div>

        {/* Auth Card */}
        <Card className="glass-panel">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Authentification</CardTitle>
            <CardDescription>Connectez-vous ou créez votre compte</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Connexion</TabsTrigger>
                <TabsTrigger value="register">Inscription</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="login-identifier">ID Unique ou Email</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-identifier"
                      type="text"
                      placeholder="Votre ID unique ou email"
                      value={loginForm.identifier}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, identifier: e.target.value }))}
                      className="pl-10"
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
                  onClick={handleLogin} 
                  className="w-full" 
                  disabled={isLoading || !loginForm.identifier || !loginForm.password}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connexion...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Se connecter
                    </>
                  )}
                </Button>
              </TabsContent>
              
              <TabsContent value="register" className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="register-unique-id">ID Unique *</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="register-unique-id"
                      type="text"
                      placeholder="Votre identifiant unique"
                      value={registerForm.uniqueId}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, uniqueId: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="register-discord-id">ID Discord *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="register-discord-id"
                      type="text"
                      placeholder="Votre ID Discord"
                      value={registerForm.discordId}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, discordId: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="votre@email.com"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="register-password">Mot de passe *</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Minimum 8 caractères"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="register-confirm-password">Confirmer le mot de passe *</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="register-confirm-password"
                      type="password"
                      placeholder="Répétez votre mot de passe"
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="pl-10"
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
                  onClick={handleRegister} 
                  className="w-full" 
                  disabled={
                    isLoading || 
                    !registerForm.uniqueId || 
                    !registerForm.discordId || 
                    !registerForm.email || 
                    !registerForm.password || 
                    !registerForm.confirmPassword
                  }
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <User className="mr-2 h-4 w-4" />
                      Créer le compte
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-muted-foreground text-center">
                  * Tous les champs sont obligatoires
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <div className="text-center mt-6 space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4 text-primary" />
            <span>Protection HWID activée</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Un seul appareil par compte. Contactez un superstaff pour changer d'appareil.
          </p>
        </div>
      </div>
    </div>
  );
}