import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Shield, User, Mail, Key, Hash, AlertCircle, Loader2, UserCheck, UserPlus, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SuperadminAuthProps {
  onAuthSuccess: () => void;
}

export function SuperadminAuth({ onAuthSuccess }: SuperadminAuthProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [pendingEmail, setPendingEmail] = useState('');
  
  // Formulaires
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
    code: ''
  });
  
  const [registerForm, setRegisterForm] = useState({
    uniqueId: '',
    discordId: '',
    email: '',
    password: '',
    confirmPassword: '',
    accessCode: ''
  });

  const [resetForm, setResetForm] = useState({
    targetEmail: ''
  });

  const handleSendCode = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('superadmin-auth', {
        body: {
          action: 'send_login_code',
          email: loginForm.email
        }
      });

      if (error) throw error;

      setPendingEmail(loginForm.email);
      setStep('code');
      toast({
        title: "Code envoyé",
        description: "Vérifiez votre boîte email pour le code de connexion",
      });
    } catch (err: any) {
      console.error('Send code error:', err);
      setError(err.message || 'Erreur lors de l\'envoi du code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('superadmin-auth', {
        body: {
          action: 'verify_login_code',
          email: pendingEmail,
          code: loginForm.code,
          password: loginForm.password
        }
      });

      if (error) throw error;

      if (data?.magicLink) {
        // Rediriger vers le lien magique
        window.location.href = data.magicLink;
        return;
      }

      toast({
        title: "Connexion réussie",
        description: "Bienvenue sur le portail superadmin !",
      });
      onAuthSuccess();
    } catch (err: any) {
      console.error('Verify code error:', err);
      setError(err.message || 'Code ou mot de passe incorrect');
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
      const { data, error } = await supabase.functions.invoke('superadmin-auth', {
        body: {
          action: 'register_with_code',
          email: registerForm.email,
          password: registerForm.password,
          uniqueId: registerForm.uniqueId,
          discordId: registerForm.discordId,
          accessCode: registerForm.accessCode
        }
      });

      if (error) {
        // Handle specific error types
        if (error.type === 'EMAIL_ALREADY_EXISTS') {
          setError('Cet email est déjà enregistré. Essayez de vous connecter dans l\'onglet "Connexion".');
        } else if (error.type === 'UNIQUE_ID_ALREADY_EXISTS') {
          setError('Cet ID unique est déjà utilisé. Veuillez en choisir un autre.');
        } else if (error.type === 'INVALID_ACCESS_CODE') {
          setError('Code d\'accès invalide. Contactez un superadmin pour obtenir le bon code.');
        } else {
          setError(error.error || error.message || 'Erreur lors de l\'inscription');
        }
        return;
      }

      toast({
        title: "Inscription réussie",
        description: data.message || "Compte créé avec succès !",
        variant: "default",
      });

      // Reset form
      setRegisterForm({
        uniqueId: '',
        discordId: '',
        email: '',
        password: '',
        confirmPassword: '',
        accessCode: ''
      });
    } catch (err: any) {
      console.error('Register error:', err);
      
      // Handle network or parsing errors
      if (err.message?.includes('EMAIL_ALREADY_EXISTS')) {
        setError('Cet email est déjà enregistré. Essayez de vous connecter dans l\'onglet "Connexion".');
      } else if (err.message?.includes('UNIQUE_ID_ALREADY_EXISTS')) {
        setError('Cet ID unique est déjà utilisé. Veuillez en choisir un autre.');
      } else if (err.message?.includes('INVALID_ACCESS_CODE')) {
        setError('Code d\'accès invalide. Contactez un superadmin pour obtenir le bon code.');
      } else {
        setError(err.message || 'Erreur lors de l\'inscription');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Obtenir l'ID de l'utilisateur actuel (supposé être superadmin)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Vous devez être connecté comme superadmin');
      }

      const { data, error } = await supabase.functions.invoke('superadmin-auth', {
        body: {
          action: 'reset_user_password',
          targetEmail: resetForm.targetEmail,
          adminUserId: user.id
        }
      });

      if (error) throw error;

      toast({
        title: "Mot de passe réinitialisé",
        description: "Le nouveau mot de passe a été envoyé par email",
      });

      setResetForm({ targetEmail: '' });
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message || 'Erreur lors de la réinitialisation');
    } finally {
      setIsLoading(false);
    }
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
            Portail Superadmin Flashback Fa
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Authentification sécurisée par email avec codes de vérification
          </p>
        </div>

        {/* Auth Card */}
        <Card className="glass-panel">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Authentification Superadmin</CardTitle>
            <CardDescription>Accès réservé aux administrateurs autorisés</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="login">Connexion</TabsTrigger>
                <TabsTrigger value="register">Inscription</TabsTrigger>
                <TabsTrigger value="reset">Réinitialiser</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4 mt-6">
                {step === 'email' ? (
                  <>
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
                    
                    <Button 
                      onClick={handleSendCode} 
                      className="w-full" 
                      disabled={isLoading || !loginForm.email || !loginForm.password}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Envoi du code...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Envoyer le code
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="verification-code">Code de vérification</Label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="verification-code"
                          type="text"
                          placeholder="Code à 6 chiffres"
                          value={loginForm.code}
                          onChange={(e) => setLoginForm(prev => ({ ...prev, code: e.target.value }))}
                          className="pl-10"
                          maxLength={6}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Code envoyé à {pendingEmail}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleVerifyCode} 
                        className="flex-1" 
                        disabled={isLoading || !loginForm.code}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Vérification...
                          </>
                        ) : (
                          <>
                            <UserCheck className="mr-2 h-4 w-4" />
                            Se connecter
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setStep('email');
                          setLoginForm(prev => ({ ...prev, code: '' }));
                          setError(null);
                        }}
                        disabled={isLoading}
                      >
                        Retour
                      </Button>
                    </div>
                  </>
                )}
                
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
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

                <Separator className="my-4" />
                
                <div className="space-y-2">
                  <Label htmlFor="access-code">Code d'accès *</Label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="access-code"
                      type="password"
                      placeholder="Code superadmin ou admin"
                      value={registerForm.accessCode}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, accessCode: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Contactez un superadmin existant pour obtenir le code d'accès
                  </p>
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
                    !registerForm.confirmPassword ||
                    !registerForm.accessCode
                  }
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Créer le compte
                    </>
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="reset" className="space-y-4 mt-6">
                <div className="text-center mb-4">
                  <RotateCcw className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Réinitialiser un mot de passe</h3>
                  <p className="text-sm text-muted-foreground">
                    Fonction réservée aux superadmins connectés
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="target-email">Email de l'utilisateur</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="target-email"
                      type="email"
                      placeholder="email@utilisateur.com"
                      value={resetForm.targetEmail}
                      onChange={(e) => setResetForm(prev => ({ ...prev, targetEmail: e.target.value }))}
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
                  onClick={handleResetPassword} 
                  className="w-full" 
                  disabled={isLoading || !resetForm.targetEmail}
                  variant="destructive"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Réinitialisation...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Réinitialiser le mot de passe
                    </>
                  )}
                </Button>
                
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Un nouveau mot de passe temporaire sera envoyé à l'utilisateur par email.
                    L'utilisateur devra le changer lors de sa prochaine connexion.
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <div className="text-center mt-6 space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4 text-primary" />
            <span>Authentification sécurisée par email</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Système de double vérification avec codes temporaires
          </p>
        </div>
      </div>
    </div>
  );
}