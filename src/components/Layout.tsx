import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link, useNavigate } from 'react-router-dom';
import { useDiscordAuth } from '@/hooks/useDiscordAuth';
import { 
  Shield, 
  Settings, 
  LogOut, 
  Building2,
  ChevronDown 
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, pageTitle }) => {
  const { 
    profile, 
    enterprise, 
    userRole, 
    isAuthenticated, 
    signOut 
  } = useDiscordAuth();
  const navigate = useNavigate();

  const getRoleColor = (role: string | null) => {
    switch (role) {
      case 'superadmin': return 'bg-red-600 text-white';
      case 'admin': return 'bg-orange-600 text-white';
      case 'patron': return 'bg-blue-600 text-white';
      case 'co-patron': return 'bg-blue-500 text-white';
      case 'employe': return 'bg-green-600 text-white';
      case 'dot': return 'bg-purple-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const getRoleDisplay = (role: string | null) => {
    switch (role) {
      case 'superadmin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'patron': return 'Patron';
      case 'co-patron': return 'Co-Patron';
      case 'employe': return 'Employé';
      case 'dot': return 'Dotation';
      default: return 'Utilisateur';
    }
  };

  const canAccessSuperadmin = () => {
    return ['superadmin', 'admin'].includes(userRole || '');
  };

  const canAccessPatronConfig = () => {
    return ['superadmin', 'admin', 'patron', 'co-patron'].includes(userRole || '');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          {/* Logo et titre */}
          <div className="flex items-center space-x-4">
            <img
              src="/lovable-uploads/edb98f3b-c1fa-4ca1-8a20-dd0be59b3591.png"
              alt="Logo Flashback FA"
              className="h-8 w-8 rounded"
              loading="lazy"
            />
            <div>
              <Link to="/" className="text-xl font-bold text-gradient hover:opacity-80">
                Portail Entreprise Flashback FA
              </Link>
              {enterprise && (
                <p className="text-sm text-muted-foreground">{enterprise.name}</p>
              )}
            </div>
          </div>
          
          {/* Actions utilisateur */}
          <div className="flex items-center space-x-4">
            {/* Badge rôle */}
            <Badge className={getRoleColor(userRole)}>
              {getRoleDisplay(userRole)}
            </Badge>
            
            {/* Badge entreprise */}
            {enterprise && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {enterprise.key}
              </Badge>
            )}
            
            {/* Bouton Superadmin */}
            {canAccessSuperadmin() && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="flex items-center gap-1"
              >
                <Link to="/superadmin">
                  <Shield className="h-4 w-4" />
                  SuperAdmin
                </Link>
              </Button>
            )}
            
            {/* Bouton Patron Config */}
            {canAccessPatronConfig() && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="flex items-center gap-1"
              >
                <Link to="/patron-config">
                  <Settings className="h-4 w-4" />
                  Config
                </Link>
              </Button>
            )}
            
            {/* Menu utilisateur */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback>
                      {profile?.username?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline">
                    {profile?.display_name || profile?.username}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">
                      {profile?.display_name || profile?.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {profile?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="container mx-auto px-4 py-8">
        {pageTitle && (
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
          </div>
        )}
        {children}
      </main>
    </div>
  );
};