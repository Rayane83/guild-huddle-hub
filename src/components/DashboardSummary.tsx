// Composant temporairement simplifié pour la nouvelle structure
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrencyDollar, formatPercentage, getISOWeek } from '@/lib/fmt';
import { 
  TrendingUp, 
  Users, 
  Calendar,
  AlertCircle,
  Building2,
  RefreshCw
} from 'lucide-react';
import { NewDashboard } from './NewDashboard';
import type { Role } from '@/lib/types';

interface DashboardSummaryProps {
  guildId: string;
  currentRole?: Role;
  entreprise?: string;
}

export function DashboardSummary({ guildId, currentRole, entreprise }: DashboardSummaryProps) {
  const currentWeek = getISOWeek();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Calendar className="w-3 h-3" />
            <span>Semaine {currentWeek}</span>
          </Badge>
        </div>
      </div>

      <Card className="stat-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-warning" />
            <span>Dashboard en cours de reconstruction</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Le dashboard principal est en cours de migration vers la nouvelle structure de base de données.
            Utilisez le nouveau dashboard ci-dessous pour accéder aux données.
          </p>
          <div className="text-sm text-muted-foreground">
            <p><strong>Guild ID:</strong> {guildId}</p>
            <p><strong>Rôle:</strong> {currentRole || 'Non défini'}</p>
            <p><strong>Entreprise:</strong> {entreprise || 'Non définie'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Nouveau dashboard intégré */}
      <NewDashboard />
    </div>
  );
}