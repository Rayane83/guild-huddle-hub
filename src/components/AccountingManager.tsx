import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calculator, DollarSign, FileText, Plus, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CompanyAccounting {
  id: string;
  enterprise_id: string;
  accounting_period_start: string;
  accounting_period_end: string;
  gross_revenue: number;
  deductible_expenses: number;
  net_profit: number;
  tax_rate: number;
  tax_amount: number;
  profit_after_tax: number;
  total_bonuses: number;
  profit_after_bonuses: number;
  wealth_tax: number;
  bank_balance: number;
  employee_count: number;
}

interface TaxBracket {
  id: string;
  min_profit: number;
  max_profit: number;
  tax_rate: number;
  max_employee_salary: number;
  max_boss_salary: number;
  max_employee_bonus: number;
  max_boss_bonus: number;
}

interface AccountingTransaction {
  id: string;
  transaction_date: string;
  transaction_type: string;
  justification: string;
  amount: number;
}

interface AccountingManagerProps {
  enterpriseId: string;
  guildId: string;
}

export const AccountingManager: React.FC<AccountingManagerProps> = ({ 
  enterpriseId, 
  guildId 
}) => {
  const { toast } = useToast();
  const [currentAccounting, setCurrentAccounting] = useState<CompanyAccounting | null>(null);
  const [taxBrackets, setTaxBrackets] = useState<TaxBracket[]>([]);
  const [transactions, setTransactions] = useState<AccountingTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newTransaction, setNewTransaction] = useState({
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    transaction_type: 'expense' as const,
    justification: '',
    amount: 0
  });

  const [accountingData, setAccountingData] = useState({
    accounting_period_start: format(new Date(), 'yyyy-MM-dd'),
    accounting_period_end: format(new Date(), 'yyyy-MM-dd'),
    gross_revenue: 0,
    deductible_expenses: 0,
    bank_balance: 0,
    employee_count: 0
  });

  // Charger les données
  useEffect(() => {
    loadAccountingData();
    loadTaxBrackets();
  }, [enterpriseId, guildId]);

  const loadAccountingData = async () => {
    try {
      // Charger la comptabilité actuelle
      const { data: accounting } = await supabase
        .from('company_accounting')
        .select('*')
        .eq('enterprise_id', enterpriseId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (accounting) {
        setCurrentAccounting(accounting);
        setAccountingData({
          accounting_period_start: accounting.accounting_period_start,
          accounting_period_end: accounting.accounting_period_end,
          gross_revenue: accounting.gross_revenue,
          deductible_expenses: accounting.deductible_expenses,
          bank_balance: accounting.bank_balance,
          employee_count: accounting.employee_count
        });

        // Charger les transactions
        const { data: txns } = await supabase
          .from('accounting_transactions')
          .select('*')
          .eq('accounting_id', accounting.id)
          .order('transaction_date', { ascending: false });

        setTransactions(txns || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données comptables",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTaxBrackets = async () => {
    try {
      const { data } = await supabase
        .from('tax_brackets')
        .select('*')
        .eq('guild_id', guildId)
        .order('min_profit');

      setTaxBrackets(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des tranches:', error);
    }
  };

  // Calculer la tranche fiscale appropriée
  const calculateTaxBracket = (profit: number): TaxBracket | null => {
    return taxBrackets.find(bracket => 
      profit >= bracket.min_profit && profit <= bracket.max_profit
    ) || null;
  };

  // Calculer automatiquement les totaux
  const calculateTotals = () => {
    const netProfit = accountingData.gross_revenue - accountingData.deductible_expenses;
    const bracket = calculateTaxBracket(netProfit);
    
    if (!bracket) return null;

    const taxAmount = netProfit * bracket.tax_rate;
    const profitAfterTax = netProfit - taxAmount;
    
    return {
      net_profit: netProfit,
      tax_rate: bracket.tax_rate,
      tax_amount: taxAmount,
      profit_after_tax: profitAfterTax,
      applicable_bracket: bracket
    };
  };

  const saveAccounting = async () => {
    const totals = calculateTotals();
    if (!totals) {
      toast({
        title: "Erreur",
        description: "Impossible de calculer les impôts avec ce montant",
        variant: "destructive"
      });
      return;
    }

    try {
      const accountingRecord = {
        enterprise_id: enterpriseId,
        ...accountingData,
        net_profit: totals.net_profit,
        tax_rate: totals.tax_rate,
        tax_amount: totals.tax_amount,
        profit_after_tax: totals.profit_after_tax,
        total_bonuses: 0, // À calculer selon les employés
        profit_after_bonuses: totals.profit_after_tax,
        wealth_tax: 0 // À calculer selon la richesse
      };

      let result;
      if (currentAccounting) {
        result = await supabase
          .from('company_accounting')
          .update(accountingRecord)
          .eq('id', currentAccounting.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('company_accounting')
          .insert(accountingRecord)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      setCurrentAccounting(result.data);
      toast({
        title: "Succès",
        description: "Comptabilité sauvegardée avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la sauvegarde",
        variant: "destructive"
      });
    }
  };

  const addTransaction = async () => {
    if (!currentAccounting) {
      toast({
        title: "Erreur",
        description: "Créez d'abord une période comptable",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('accounting_transactions')
        .insert({
          accounting_id: currentAccounting.id,
          ...newTransaction
        })
        .select()
        .single();

      if (error) throw error;

      setTransactions([data, ...transactions]);
      setNewTransaction({
        transaction_date: format(new Date(), 'yyyy-MM-dd'),
        transaction_type: 'expense',
        justification: '',
        amount: 0
      });

      toast({
        title: "Succès",
        description: "Transaction ajoutée avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'ajout de la transaction",
        variant: "destructive"
      });
    }
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Chargement de la comptabilité...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Calculator className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Comptabilité d'Entreprise</h2>
      </div>

      <Tabs defaultValue="accounting" className="w-full">
        <TabsList>
          <TabsTrigger value="accounting">Comptabilité</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="tax-brackets">Tranches Fiscales</TabsTrigger>
        </TabsList>

        <TabsContent value="accounting">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Bilan Comptable
              </CardTitle>
              <CardDescription>
                Gérez les revenus, dépenses et calculs fiscaux de votre entreprise
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="period-start">Début de période</Label>
                  <Input
                    id="period-start"
                    type="date"
                    value={accountingData.accounting_period_start}
                    onChange={(e) => setAccountingData(prev => ({
                      ...prev,
                      accounting_period_start: e.target.value
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period-end">Fin de période</Label>
                  <Input
                    id="period-end"
                    type="date"
                    value={accountingData.accounting_period_end}
                    onChange={(e) => setAccountingData(prev => ({
                      ...prev,
                      accounting_period_end: e.target.value
                    }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gross-revenue">CA Brut (€)</Label>
                  <Input
                    id="gross-revenue"
                    type="number"
                    value={accountingData.gross_revenue}
                    onChange={(e) => setAccountingData(prev => ({
                      ...prev,
                      gross_revenue: parseFloat(e.target.value) || 0
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deductible-expenses">Dépenses Déductibles (€)</Label>
                  <Input
                    id="deductible-expenses"
                    type="number"
                    value={accountingData.deductible_expenses}
                    onChange={(e) => setAccountingData(prev => ({
                      ...prev,
                      deductible_expenses: parseFloat(e.target.value) || 0
                    }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank-balance">Solde Bancaire (€)</Label>
                  <Input
                    id="bank-balance"
                    type="number"
                    value={accountingData.bank_balance}
                    onChange={(e) => setAccountingData(prev => ({
                      ...prev,
                      bank_balance: parseFloat(e.target.value) || 0
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employee-count">Nombre d'employés</Label>
                  <Input
                    id="employee-count"
                    type="number"
                    value={accountingData.employee_count}
                    onChange={(e) => setAccountingData(prev => ({
                      ...prev,
                      employee_count: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>
              </div>

              {totals && (
                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                  <h3 className="font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Calculs Automatiques
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Bénéfice Net:</span>
                      <p className="font-medium">{totals.net_profit.toLocaleString('fr-FR')} €</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Taux d'imposition:</span>
                      <p className="font-medium">{(totals.tax_rate * 100).toFixed(0)}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Montant des impôts:</span>
                      <p className="font-medium">{totals.tax_amount.toLocaleString('fr-FR')} €</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Bénéfice après impôts:</span>
                      <p className="font-medium text-green-600">{totals.profit_after_tax.toLocaleString('fr-FR')} €</p>
                    </div>
                  </div>
                  
                  {totals.applicable_bracket && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground mb-2">Tranche fiscale applicable:</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Salaire max employé:</span>
                          <p>{totals.applicable_bracket.max_employee_salary.toLocaleString('fr-FR')} €</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Salaire max patron:</span>
                          <p>{totals.applicable_bracket.max_boss_salary.toLocaleString('fr-FR')} €</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Prime max employé:</span>
                          <p>{totals.applicable_bracket.max_employee_bonus.toLocaleString('fr-FR')} €</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Prime max patron:</span>
                          <p>{totals.applicable_bracket.max_boss_bonus.toLocaleString('fr-FR')} €</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Button onClick={saveAccounting} className="w-full">
                <DollarSign className="h-4 w-4 mr-2" />
                Sauvegarder la Comptabilité
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Ajouter une Transaction</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tx-date">Date</Label>
                    <Input
                      id="tx-date"
                      type="date"
                      value={newTransaction.transaction_date}
                      onChange={(e) => setNewTransaction(prev => ({
                        ...prev,
                        transaction_date: e.target.value
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tx-type">Type</Label>
                    <select
                      id="tx-type"
                      value={newTransaction.transaction_type}
                      onChange={(e) => setNewTransaction(prev => ({
                        ...prev,
                        transaction_type: e.target.value as any
                      }))}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="expense">Dépense</option>
                      <option value="revenue">Recette</option>
                      <option value="salary">Salaire</option>
                      <option value="bonus">Prime</option>
                      <option value="debit">Débit</option>
                      <option value="credit">Crédit</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tx-amount">Montant (€)</Label>
                    <Input
                      id="tx-amount"
                      type="number"
                      step="0.01"
                      value={newTransaction.amount}
                      onChange={(e) => setNewTransaction(prev => ({
                        ...prev,
                        amount: parseFloat(e.target.value) || 0
                      }))}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addTransaction} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tx-justification">Justification</Label>
                  <Input
                    id="tx-justification"
                    placeholder="Décrivez la transaction..."
                    value={newTransaction.justification}
                    onChange={(e) => setNewTransaction(prev => ({
                      ...prev,
                      justification: e.target.value
                    }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Historique des Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Justification</TableHead>
                      <TableHead>Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {format(new Date(transaction.transaction_date), 'dd/MM/yyyy', { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{transaction.transaction_type}</Badge>
                        </TableCell>
                        <TableCell>{transaction.justification}</TableCell>
                        <TableCell>
                          <span className={
                            ['revenue', 'credit'].includes(transaction.transaction_type) 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }>
                            {transaction.amount.toLocaleString('fr-FR')} €
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {transactions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>Aucune transaction enregistrée</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tax-brackets">
          <Card>
            <CardHeader>
              <CardTitle>Tranches Fiscales</CardTitle>
              <CardDescription>
                Barème fiscal en vigueur pour votre guilde
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bénéfice Min</TableHead>
                    <TableHead>Bénéfice Max</TableHead>
                    <TableHead>Taux</TableHead>
                    <TableHead>Salaire Max Employé</TableHead>
                    <TableHead>Salaire Max Patron</TableHead>
                    <TableHead>Prime Max Employé</TableHead>
                    <TableHead>Prime Max Patron</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxBrackets.map((bracket) => (
                    <TableRow key={bracket.id}>
                      <TableCell>{bracket.min_profit.toLocaleString('fr-FR')} €</TableCell>
                      <TableCell>{bracket.max_profit.toLocaleString('fr-FR')} €</TableCell>
                      <TableCell>
                        <Badge>{(bracket.tax_rate * 100).toFixed(0)}%</Badge>
                      </TableCell>
                      <TableCell>{bracket.max_employee_salary.toLocaleString('fr-FR')} €</TableCell>
                      <TableCell>{bracket.max_boss_salary.toLocaleString('fr-FR')} €</TableCell>
                      <TableCell>{bracket.max_employee_bonus.toLocaleString('fr-FR')} €</TableCell>
                      <TableCell>{bracket.max_boss_bonus.toLocaleString('fr-FR')} €</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};