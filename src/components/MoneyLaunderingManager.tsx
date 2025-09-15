import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, DollarSign, TrendingDown, ShieldCheck, Eye, Save } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrencyDollar } from '@/lib/fmt';

interface MoneyLaunderingProps {
  guildId: string;
  entrepriseKey: string;
  onBlanchimentChanged?: () => void;
}

interface LaunderingOperation {
  id: string;
  amount: number;
  dirtyMoney: number;
  cleanMoney: number;
  fee: number;
  method: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  description: string;
  created_at: string;
}

interface LaunderingStats {
  totalProcessed: number;
  totalFees: number;
  successRate: number;
  activeOperations: number;
}

const LAUNDERING_METHODS = [
  { id: 'casino', name: 'Casino', fee: 0.15, time: 30, description: 'Blanchissement via casino (15% de commission)' },
  { id: 'business', name: 'Entreprise Fantôme', fee: 0.25, time: 60, description: 'Blanchissement via entreprise (25% de commission)' },
  { id: 'real_estate', name: 'Immobilier', fee: 0.30, time: 120, description: 'Blanchissement via immobilier (30% de commission)' },
  { id: 'offshore', name: 'Comptes Offshore', fee: 0.20, time: 90, description: 'Blanchissement offshore (20% de commission)' }
];

export function MoneyLaunderingManager({ guildId, entrepriseKey, onBlanchimentChanged }: MoneyLaunderingProps) {
  const [operations, setOperations] = useState<LaunderingOperation[]>([]);
  const [stats, setStats] = useState<LaunderingStats>({
    totalProcessed: 0,
    totalFees: 0,
    successRate: 0,
    activeOperations: 0
  });
  const [newOperation, setNewOperation] = useState({
    amount: '',
    method: '',
    description: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadOperations();
    loadStats();
  }, [guildId, entrepriseKey]);

  const loadOperations = async () => {
    try {
      const { data, error } = await supabase
        .from('archives')
        .select('*')
        .eq('guild_id', guildId)
        .eq('enterprise_key', entrepriseKey)
        .eq('type', 'money_laundering')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedOperations: LaunderingOperation[] = (data || []).map(item => ({
        id: item.id,
        amount: (item.payload as any)?.amount || 0,
        dirtyMoney: (item.payload as any)?.dirtyMoney || 0,
        cleanMoney: (item.payload as any)?.cleanMoney || 0,
        fee: (item.payload as any)?.fee || 0,
        method: (item.payload as any)?.method || '',
        status: item.statut as any || 'completed',
        description: (item.payload as any)?.description || '',
        created_at: item.created_at
      }));

      setOperations(formattedOperations);
    } catch (error) {
      console.error('Erreur lors du chargement des opérations:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les opérations de blanchiment",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('archives')
        .select('montant, payload')
        .eq('guild_id', guildId)
        .eq('enterprise_key', entrepriseKey)
        .eq('type', 'money_laundering');

      if (error) throw error;

      const totalProcessed = (data || []).reduce((sum, item) => sum + ((item.payload as any)?.cleanMoney || 0), 0);
      const totalFees = (data || []).reduce((sum, item) => sum + ((item.payload as any)?.fee || 0), 0);
      const completedOps = (data || []).filter(item => (item.payload as any)?.status === 'completed').length;
      const successRate = data?.length ? (completedOps / data.length) * 100 : 0;

      setStats({
        totalProcessed,
        totalFees,
        successRate,
        activeOperations: (data || []).filter(item => (item.payload as any)?.status === 'processing').length
      });
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  const handleSubmitOperation = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(newOperation.amount);
    if (!amount || amount <= 0 || !newOperation.method) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    const method = LAUNDERING_METHODS.find(m => m.id === newOperation.method);
    if (!method) return;

    const fee = amount * method.fee;
    const cleanMoney = amount - fee;

    try {
      const { error } = await supabase
        .from('archives')
        .insert({
          guild_id: guildId,
          enterprise_key: entrepriseKey,
          type: 'money_laundering',
          montant: cleanMoney,
          statut: 'processing',
          payload: {
            amount,
            dirtyMoney: amount,
            cleanMoney,
            fee,
            method: newOperation.method,
            methodName: method.name,
            status: 'processing',
            description: newOperation.description,
            estimatedCompletion: new Date(Date.now() + method.time * 60000).toISOString()
          }
        });

      if (error) throw error;

      toast({
        title: "Succès",
        description: `Opération de blanchiment lancée (${method.name})`,
      });

      // Simuler la completion après le délai
      setTimeout(async () => {
        await completeOperation(cleanMoney, fee);
      }, method.time * 1000); // Temps réduit pour la démo

      setNewOperation({ amount: '', method: '', description: '' });
      loadOperations();
      loadStats();
      onBlanchimentChanged?.();

    } catch (error) {
      console.error('Erreur lors de la création de l\'opération:', error);
      toast({
        title: "Erreur",
        description: "Impossible de lancer l'opération de blanchiment",
        variant: "destructive"
      });
    }
  };

  const completeOperation = async (cleanMoney: number, fee: number) => {
    // Ici on pourrait mettre à jour le statut de l'opération
    loadOperations();
    loadStats();
    
    toast({
      title: "Opération Terminée",
      description: `Blanchiment terminé: ${formatCurrencyDollar(cleanMoney)} récupérés`,
    });
  };

  const selectedMethod = LAUNDERING_METHODS.find(m => m.id === newOperation.method);
  const previewFee = newOperation.amount ? parseFloat(newOperation.amount) * (selectedMethod?.fee || 0) : 0;
  const previewClean = newOperation.amount ? parseFloat(newOperation.amount) - previewFee : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-orange-500" />
          Blanchiment d'Argent
        </h2>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Eye className="w-4 h-4" />
          {operations.length} opérations
        </Badge>
      </div>

      {/* Avertissement */}
      <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
            <ShieldCheck className="w-5 h-5" />
            Avertissement Roleplay
          </CardTitle>
        </CardHeader>
        <CardContent className="text-orange-700 dark:text-orange-300">
          <p>
            Cette fonctionnalité est uniquement destinée au roleplay dans un environnement de jeu fictif.
            Elle ne doit en aucun cas être utilisée pour des activités illégales réelles.
          </p>
        </CardContent>
      </Card>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Blanchi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrencyDollar(stats.totalProcessed)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Commissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrencyDollar(stats.totalFees)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Taux de Réussite</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.successRate.toFixed(1)}%
            </div>
            <Progress value={stats.successRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Opérations Actives</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.activeOperations}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Nouvelle opération */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Nouvelle Opération de Blanchiment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitOperation} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Montant à Blanchir ($USD) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="0.00"
                  value={newOperation.amount}
                  onChange={(e) => setNewOperation(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="method">Méthode de Blanchiment *</Label>
                <Select value={newOperation.method} onValueChange={(value) => setNewOperation(prev => ({ ...prev, method: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une méthode" />
                  </SelectTrigger>
                  <SelectContent>
                    {LAUNDERING_METHODS.map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        <div className="flex flex-col">
                          <span>{method.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {(method.fee * 100).toFixed(0)}% commission - {method.time}min
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedMethod && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Aperçu de l'opération</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Argent sale:</span>
                    <p className="font-medium">{formatCurrencyDollar(parseFloat(newOperation.amount) || 0)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Commission ({(selectedMethod.fee * 100).toFixed(0)}%):</span>
                    <p className="font-medium text-red-600">-{formatCurrencyDollar(previewFee)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Argent propre:</span>
                    <p className="font-medium text-green-600">{formatCurrencyDollar(previewClean)}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Temps estimé: {selectedMethod.time} minutes
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Notes sur cette opération (optionnel)"
                value={newOperation.description}
                onChange={(e) => setNewOperation(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <Button type="submit" className="w-full">
              <TrendingDown className="w-4 h-4 mr-2" />
              Lancer l'Opération
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Historique des opérations */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des Opérations</CardTitle>
        </CardHeader>
        <CardContent>
          {operations.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <TrendingDown className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucune opération de blanchiment enregistrée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {operations.map((operation) => (
                <div
                  key={operation.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={
                        operation.status === 'completed' ? 'default' :
                        operation.status === 'processing' ? 'secondary' :
                        operation.status === 'failed' ? 'destructive' : 'outline'
                      }>
                        {operation.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(operation.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm">{operation.description || 'Opération de blanchiment'}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {formatCurrencyDollar(operation.cleanMoney)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      -{formatCurrencyDollar(operation.fee)} commission
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}