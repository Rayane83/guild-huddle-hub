import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Calculator, Users, DollarSign, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Employee {
  id: string;
  profile_id: string;
  grade: string;
  salary: number;
  is_active: boolean;
}

interface EmployeeProfile {
  id: string;
  username: string;
  display_name: string;
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

interface SalaryCalculation {
  id?: string;
  employee_id: string;
  calculation_period_start: string;
  calculation_period_end: string;
  run_count: number;
  invoices_count: number;
  sales_count: number;
  total_revenue: number;
  calculated_salary: number;
  calculated_bonus: number;
  tax_bracket_used?: string;
}

interface AdvancedSalaryCalculatorProps {
  enterpriseId: string;
  guildId: string;
  currentProfit?: number;
}

export const AdvancedSalaryCalculatorWithFiscal: React.FC<AdvancedSalaryCalculatorProps> = ({
  enterpriseId,
  guildId,
  currentProfit = 0
}) => {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<(Employee & { profile?: EmployeeProfile })[]>([]);
  const [taxBrackets, setTaxBrackets] = useState<TaxBracket[]>([]);
  const [calculations, setCalculations] = useState<Record<string, SalaryCalculation>>({});
  const [loading, setLoading] = useState(true);
  const [applicableBracket, setApplicableBracket] = useState<TaxBracket | null>(null);

  const [calculationPeriod, setCalculationPeriod] = useState({
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    loadData();
  }, [enterpriseId, guildId]);

  useEffect(() => {
    // Trouver la tranche fiscale applicable selon le bénéfice actuel
    const bracket = taxBrackets.find(b => 
      currentProfit >= b.min_profit && currentProfit <= b.max_profit
    );
    setApplicableBracket(bracket || null);
  }, [currentProfit, taxBrackets]);

  const loadData = async () => {
    try {
      // Charger les employés avec leurs profils
      const { data: employeesData } = await supabase
        .from('employees')
        .select(`
          *,
          profiles!inner(id, username, display_name)
        `)
        .eq('enterprise_id', enterpriseId)
        .eq('is_active', true);

      setEmployees(employeesData?.map(emp => ({
        ...emp,
        profile: emp.profiles
      })) || []);

      // Charger les tranches fiscales
      const { data: bracketsData } = await supabase
        .from('tax_brackets')
        .select('*')
        .eq('guild_id', guildId)
        .order('min_profit');

      setTaxBrackets(bracketsData || []);

      // Charger les calculs existants pour la période actuelle
      const { data: calculationsData } = await supabase
        .from('salary_calculations')
        .select('*')
        .in('employee_id', employeesData?.map(e => e.id) || [])
        .gte('calculation_period_start', calculationPeriod.start)
        .lte('calculation_period_end', calculationPeriod.end);

      const calcMap: Record<string, SalaryCalculation> = {};
      calculationsData?.forEach(calc => {
        calcMap[calc.employee_id] = calc;
      });
      setCalculations(calcMap);

    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getMaxSalaryForEmployee = (grade: string): number => {
    if (!applicableBracket) return 0;
    
    const isManager = ['patron', 'co-patron'].includes(grade.toLowerCase());
    return isManager ? applicableBracket.max_boss_salary : applicableBracket.max_employee_salary;
  };

  const getMaxBonusForEmployee = (grade: string): number => {
    if (!applicableBracket) return 0;
    
    const isManager = ['patron', 'co-patron'].includes(grade.toLowerCase());
    return isManager ? applicableBracket.max_boss_bonus : applicableBracket.max_employee_bonus;
  };

  const updateCalculation = (employeeId: string, field: keyof SalaryCalculation, value: any) => {
    setCalculations(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        employee_id: employeeId,
        calculation_period_start: calculationPeriod.start,
        calculation_period_end: calculationPeriod.end,
        [field]: value
      } as SalaryCalculation
    }));
  };

  const calculateAutomaticSalary = (employeeId: string) => {
    const calc = calculations[employeeId];
    const employee = employees.find(e => e.id === employeeId);
    
    if (!calc || !employee) return;

    // Calcul basé sur les performances (exemple)
    const basePerformance = (calc.run_count * 100) + (calc.invoices_count * 150) + (calc.sales_count * 200);
    const revenueBonus = calc.total_revenue * 0.1; // 10% du CA généré
    
    const suggestedSalary = Math.min(
      basePerformance + (employee.salary || 0),
      getMaxSalaryForEmployee(employee.grade)
    );
    
    const suggestedBonus = Math.min(
      revenueBonus,
      getMaxBonusForEmployee(employee.grade)
    );

    updateCalculation(employeeId, 'calculated_salary', Math.round(suggestedSalary));
    updateCalculation(employeeId, 'calculated_bonus', Math.round(suggestedBonus));
  };

  const saveCalculations = async () => {
    try {
      const calculationsToSave = Object.values(calculations).filter(calc => 
        calc.employee_id && (calc.calculated_salary > 0 || calc.calculated_bonus > 0)
      );

      for (const calc of calculationsToSave) {
        if (calc.id) {
          // Mise à jour
          await supabase
            .from('salary_calculations')
            .update({
              ...calc,
              tax_bracket_used: applicableBracket?.id
            })
            .eq('id', calc.id);
        } else {
          // Création
          await supabase
            .from('salary_calculations')
            .insert({
              ...calc,
              tax_bracket_used: applicableBracket?.id
            });
        }
      }

      toast({
        title: "Succès",
        description: `${calculationsToSave.length} calculs sauvegardés`
      });

      // Recharger les données
      loadData();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la sauvegarde",
        variant: "destructive"
      });
    }
  };

  const getTotalCalculatedCost = (): number => {
    return Object.values(calculations).reduce((total, calc) => {
      return total + (calc.calculated_salary || 0) + (calc.calculated_bonus || 0);
    }, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Chargement du calculateur...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Calculator className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Calculateur de Salaires Avancé</h2>
      </div>

      {/* Informations sur la tranche fiscale actuelle */}
      {applicableBracket && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <TrendingUp className="h-5 w-5" />
              Tranche Fiscale Actuelle
            </CardTitle>
            <CardDescription>
              Basée sur un bénéfice de {currentProfit.toLocaleString('fr-FR')} €
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Taux d'imposition:</span>
                <p className="font-medium text-blue-700">{(applicableBracket.tax_rate * 100).toFixed(0)}%</p>
              </div>
              <div>
                <span className="text-muted-foreground">Salaire max employé:</span>
                <p className="font-medium">{applicableBracket.max_employee_salary.toLocaleString('fr-FR')} €</p>
              </div>
              <div>
                <span className="text-muted-foreground">Salaire max patron:</span>
                <p className="font-medium">{applicableBracket.max_boss_salary.toLocaleString('fr-FR')} €</p>
              </div>
              <div>
                <span className="text-muted-foreground">Coût total calculé:</span>
                <p className="font-medium text-green-600">{getTotalCalculatedCost().toLocaleString('fr-FR')} €</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!applicableBracket && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="h-5 w-5" />
              <span>Aucune tranche fiscale trouvée pour ce niveau de bénéfice</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Période de calcul */}
      <Card>
        <CardHeader>
          <CardTitle>Période de Calcul</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="period-start">Du</Label>
              <Input
                id="period-start"
                type="date"
                value={calculationPeriod.start}
                onChange={(e) => setCalculationPeriod(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period-end">Au</Label>
              <Input
                id="period-end"
                type="date"
                value={calculationPeriod.end}
                onChange={(e) => setCalculationPeriod(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
            <Button onClick={loadData}>
              Charger la Période
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des calculs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Calculs de Salaires
          </CardTitle>
          <CardDescription>
            Gérez les performances et calculs de salaires selon la tranche fiscale
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employé</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>RUN</TableHead>
                <TableHead>Factures</TableHead>
                <TableHead>Ventes</TableHead>
                <TableHead>CA Généré (€)</TableHead>
                <TableHead>Salaire Calculé (€)</TableHead>
                <TableHead>Prime Calculée (€)</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => {
                const calc: SalaryCalculation = calculations[employee.id] || {
                  employee_id: employee.id,
                  calculation_period_start: calculationPeriod.start,
                  calculation_period_end: calculationPeriod.end,
                  run_count: 0,
                  invoices_count: 0,
                  sales_count: 0,
                  total_revenue: 0,
                  calculated_salary: 0,
                  calculated_bonus: 0
                };
                const maxSalary = getMaxSalaryForEmployee(employee.grade);
                const maxBonus = getMaxBonusForEmployee(employee.grade);
                const isManager = ['patron', 'co-patron'].includes(employee.grade.toLowerCase());

                return (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{employee.profile?.display_name || employee.profile?.username}</p>
                        <p className="text-sm text-muted-foreground">{employee.profile?.username}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={isManager ? "default" : "secondary"}>
                        {employee.grade}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-20"
                        value={calc.run_count || 0}
                        onChange={(e) => updateCalculation(
                          employee.id, 
                          'run_count', 
                          parseInt(e.target.value) || 0
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-20"
                        value={calc.invoices_count || 0}
                        onChange={(e) => updateCalculation(
                          employee.id, 
                          'invoices_count', 
                          parseInt(e.target.value) || 0
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-20"
                        value={calc.sales_count || 0}
                        onChange={(e) => updateCalculation(
                          employee.id, 
                          'sales_count', 
                          parseInt(e.target.value) || 0
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-24"
                        value={calc.total_revenue || 0}
                        onChange={(e) => updateCalculation(
                          employee.id, 
                          'total_revenue', 
                          parseFloat(e.target.value) || 0
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Input
                          type="number"
                          className="w-24"
                          value={calc.calculated_salary || 0}
                          onChange={(e) => updateCalculation(
                            employee.id, 
                            'calculated_salary', 
                            parseFloat(e.target.value) || 0
                          )}
                        />
                        <p className="text-xs text-muted-foreground">
                          Max: {maxSalary.toLocaleString('fr-FR')} €
                        </p>
                        {(calc.calculated_salary || 0) > maxSalary && (
                          <p className="text-xs text-red-600">Dépasse le maximum !</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Input
                          type="number"
                          className="w-24"
                          value={calc.calculated_bonus || 0}
                          onChange={(e) => updateCalculation(
                            employee.id, 
                            'calculated_bonus', 
                            parseFloat(e.target.value) || 0
                          )}
                        />
                        <p className="text-xs text-muted-foreground">
                          Max: {maxBonus.toLocaleString('fr-FR')} €
                        </p>
                        {(calc.calculated_bonus || 0) > maxBonus && (
                          <p className="text-xs text-red-600">Dépasse le maximum !</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => calculateAutomaticSalary(employee.id)}
                        disabled={!applicableBracket}
                      >
                        Auto
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {employees.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2" />
              <p>Aucun employé trouvé dans cette entreprise</p>
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Coût total: <span className="font-medium">{getTotalCalculatedCost().toLocaleString('fr-FR')} €</span>
            </div>
            <Button onClick={saveCalculations} disabled={!applicableBracket}>
              <DollarSign className="h-4 w-4 mr-2" />
              Sauvegarder les Calculs
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};