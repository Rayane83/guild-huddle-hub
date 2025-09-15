import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, FileText, TrendingUp, Calendar, Save, Download } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrencyDollar } from '@/lib/fmt';

interface TaxManagerProps {
  guildId: string;
  currentRole?: string;
  entreprise?: string;
}

interface PayrollReport {
  id: string;
  enterprise_id: string;
  period_start: string;
  period_end: string;
  total_amount: number;
  employee_count: number;
  status: string;
  created_at: string;
  enterprises: {
    name: string;
    key: string;
  };
}

interface TaxCalculation {
  grossIncome: number;
  federalTax: number;
  stateTax: number;
  socialSecurity: number;
  medicare: number;
  totalTax: number;
  netIncome: number;
}

const TAX_RATES = {
  federal: 0.22, // 22% impôt fédéral
  state: 0.08,   // 8% impôt d'état
  socialSecurity: 0.062, // 6.2% sécurité sociale
  medicare: 0.0145 // 1.45% Medicare
};

export function TaxManager({ guildId, currentRole, entreprise }: TaxManagerProps) {
  const [reports, setReports] = useState<PayrollReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [taxCalculation, setTaxCalculation] = useState<TaxCalculation | null>(null);
  const [customTaxData, setCustomTaxData] = useState({
    grossIncome: '',
    description: '',
    period: new Date().toISOString().split('T')[0]
  });
  const { toast } = useToast();

  useEffect(() => {
    loadPayrollReports();
  }, [guildId]);

  const loadPayrollReports = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('payroll_reports')
        .select(`
          *,
          enterprises:enterprise_id (
            name,
            key
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des rapports:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les rapports de paie",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTax = (grossIncome: number): TaxCalculation => {
    const federalTax = grossIncome * TAX_RATES.federal;
    const stateTax = grossIncome * TAX_RATES.state;
    const socialSecurity = grossIncome * TAX_RATES.socialSecurity;
    const medicare = grossIncome * TAX_RATES.medicare;
    const totalTax = federalTax + stateTax + socialSecurity + medicare;
    const netIncome = grossIncome - totalTax;

    return {
      grossIncome,
      federalTax,
      stateTax,
      socialSecurity,
      medicare,
      totalTax,
      netIncome
    };
  };

  const handleReportSelect = (reportId: string) => {
    setSelectedReport(reportId);
    const report = reports.find(r => r.id === reportId);
    if (report) {
      const calculation = calculateTax(report.total_amount);
      setTaxCalculation(calculation);
    }
  };

  const handleCustomCalculation = (e: React.FormEvent) => {
    e.preventDefault();
    
    const grossIncome = parseFloat(customTaxData.grossIncome);
    if (isNaN(grossIncome) || grossIncome <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un montant valide",
        variant: "destructive"
      });
      return;
    }

    const calculation = calculateTax(grossIncome);
    setTaxCalculation(calculation);
  };

  const saveTaxRecord = async () => {
    if (!taxCalculation) return;

    try {
      const { error } = await supabase
        .from('archives')
        .insert({
          guild_id: guildId,
          type: 'tax_calculation',
          montant: taxCalculation.totalTax,
          statut: 'completed',
          payload: {
            ...taxCalculation,
            description: customTaxData.description,
            period: customTaxData.period,
            calculated_at: new Date().toISOString()
          }
        });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Calcul d'impôts sauvegardé dans les archives",
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le calcul",
        variant: "destructive"
      });
    }
  };

  const exportTaxReport = () => {
    if (!taxCalculation) return;

    const reportData = {
      date: new Date().toLocaleDateString(),
      grossIncome: taxCalculation.grossIncome,
      taxes: {
        federal: taxCalculation.federalTax,
        state: taxCalculation.stateTax,
        socialSecurity: taxCalculation.socialSecurity,
        medicare: taxCalculation.medicare
      },
      totalTax: taxCalculation.totalTax,
      netIncome: taxCalculation.netIncome
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Succès",
      description: "Rapport d'impôts exporté",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="w-6 h-6" />
          Gestion des Impôts
        </h2>
        <Badge variant="secondary" className="flex items-center gap-1">
          <FileText className="w-4 h-4" />
          {reports.length} rapports
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calcul basé sur les rapports de paie */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Calcul depuis Rapport de Paie
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Sélectionner un rapport de paie</Label>
              <Select value={selectedReport} onValueChange={handleReportSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un rapport" />
                </SelectTrigger>
                <SelectContent>
                  {reports.map((report) => (
                    <SelectItem key={report.id} value={report.id}>
                      <div className="flex flex-col">
                        <span>{report.enterprises?.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatCurrencyDollar(report.total_amount)} - {new Date(report.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Calcul manuel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Calcul Manuel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCustomCalculation} className="space-y-4">
              <div>
                <Label htmlFor="grossIncome">Revenu Brut ($USD)</Label>
                <Input
                  id="grossIncome"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={customTaxData.grossIncome}
                  onChange={(e) => setCustomTaxData(prev => ({ ...prev, grossIncome: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="period">Période</Label>
                <Input
                  id="period"
                  type="date"
                  value={customTaxData.period}
                  onChange={(e) => setCustomTaxData(prev => ({ ...prev, period: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Notes sur ce calcul d'impôts"
                  value={customTaxData.description}
                  onChange={(e) => setCustomTaxData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <Button type="submit" className="w-full">
                <Calculator className="w-4 h-4 mr-2" />
                Calculer les Impôts
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Résultats du calcul */}
      {taxCalculation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Résultat du Calcul d'Impôts
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportTaxReport}>
                  <Download className="w-4 h-4 mr-2" />
                  Exporter
                </Button>
                <Button size="sm" onClick={saveTaxRecord}>
                  <Save className="w-4 h-4 mr-2" />
                  Sauvegarder
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold text-lg mb-2">Revenu Brut</h4>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrencyDollar(taxCalculation.grossIncome)}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Impôt Fédéral ({(TAX_RATES.federal * 100).toFixed(1)}%)</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrencyDollar(taxCalculation.federalTax)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Impôt d'État ({(TAX_RATES.state * 100).toFixed(1)}%)</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrencyDollar(taxCalculation.stateTax)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Sécurité Sociale ({(TAX_RATES.socialSecurity * 100).toFixed(1)}%)</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrencyDollar(taxCalculation.socialSecurity)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Medicare ({(TAX_RATES.medicare * 100).toFixed(2)}%)</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrencyDollar(taxCalculation.medicare)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                  <h4 className="font-semibold text-lg mb-2">Total des Impôts</h4>
                  <p className="text-2xl font-bold text-red-600">
                    -{formatCurrencyDollar(taxCalculation.totalTax)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {((taxCalculation.totalTax / taxCalculation.grossIncome) * 100).toFixed(1)}% du revenu brut
                  </p>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <h4 className="font-semibold text-lg mb-2">Revenu Net</h4>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrencyDollar(taxCalculation.netIncome)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Après déduction des impôts
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historique des calculs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Taux d'Imposition Actuels
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <p className="text-sm text-muted-foreground">Fédéral</p>
              <p className="text-lg font-bold">{(TAX_RATES.federal * 100).toFixed(1)}%</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <p className="text-sm text-muted-foreground">État</p>
              <p className="text-lg font-bold">{(TAX_RATES.state * 100).toFixed(1)}%</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <p className="text-sm text-muted-foreground">Sécurité Sociale</p>
              <p className="text-lg font-bold">{(TAX_RATES.socialSecurity * 100).toFixed(1)}%</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <p className="text-sm text-muted-foreground">Medicare</p>
              <p className="text-lg font-bold">{(TAX_RATES.medicare * 100).toFixed(2)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}