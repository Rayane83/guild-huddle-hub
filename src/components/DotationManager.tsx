import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Plus, DollarSign, Users, Calendar, Save } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrencyDollar } from '@/lib/fmt';

interface DotationFormProps {
  guildId: string;
  currentRole?: string;
  entreprise?: string;
}

interface Employee {
  id: string;
  profile_id: string;
  enterprise_id: string;
  salary: number;
  grade: string;
  is_active: boolean;
  profiles: {
    email: string;
    display_name: string;
    unique_id: string;
  };
}

interface Enterprise {
  id: string;
  name: string;
  key: string;
  discord_role_id: string;
}

export function DotationManager({ guildId, currentRole, entreprise }: DotationFormProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [selectedEnterprise, setSelectedEnterprise] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [dotationData, setDotationData] = useState({
    amount: '',
    description: '',
    type: 'salary_adjustment',
    employeeId: ''
  });
  const { toast } = useToast();

  // Charger les entreprises
  useEffect(() => {
    loadEnterprises();
  }, [guildId]);

  // Charger les employés quand une entreprise est sélectionnée
  useEffect(() => {
    if (selectedEnterprise) {
      loadEmployees();
    }
  }, [selectedEnterprise]);

  const loadEnterprises = async () => {
    try {
      const { data, error } = await supabase
        .from('enterprises')
        .select('*')
        .eq('discord_guild_id', guildId);

      if (error) throw error;
      setEnterprises(data || []);
      
      if (data && data.length > 0 && !selectedEnterprise) {
        setSelectedEnterprise(data[0].id);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des entreprises:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les entreprises",
        variant: "destructive"
      });
    }
  };

  const loadEmployees = async () => {
    if (!selectedEnterprise) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          profiles:profile_id (
            email,
            display_name,
            unique_id
          )
        `)
        .eq('enterprise_id', selectedEnterprise)
        .eq('is_active', true);

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des employés:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les employés",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitDotation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dotationData.employeeId || !dotationData.amount) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    try {
      // Créer un rapport de paie spécial pour la dotation
      const { data: reportData, error: reportError } = await supabase
        .from('payroll_reports')
        .insert({
          enterprise_id: selectedEnterprise,
          period_start: new Date().toISOString().split('T')[0],
          period_end: new Date().toISOString().split('T')[0],
          total_amount: parseFloat(dotationData.amount),
          employee_count: 1,
          status: 'completed',
          data: {
            type: 'dotation',
            description: dotationData.description
          }
        })
        .select()
        .single();

      if (reportError) throw reportError;

      // Créer l'entrée de paie pour la dotation
      const { error: entryError } = await supabase
        .from('payroll_entries')
        .insert({
          report_id: reportData.id,
          employee_id: dotationData.employeeId,
          base_salary: 0,
          bonus: parseFloat(dotationData.amount),
          deductions: 0,
          net_amount: parseFloat(dotationData.amount),
          hours_worked: 0,
          data: {
            type: 'dotation',
            description: dotationData.description,
            date: new Date().toISOString()
          }
        });

      if (entryError) throw entryError;

      toast({
        title: "Succès",
        description: "Dotation créée avec succès",
      });

      // Reset form
      setDotationData({
        amount: '',
        description: '',
        type: 'salary_adjustment',
        employeeId: ''
      });

    } catch (error) {
      console.error('Erreur lors de la création de la dotation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la dotation",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="w-6 h-6" />
          Gestion des Dotations
        </h2>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          {employees.length} employés
        </Badge>
      </div>

      {/* Sélection de l'entreprise */}
      <Card>
        <CardHeader>
          <CardTitle>Sélection de l'entreprise</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="enterprise">Entreprise</Label>
              <Select value={selectedEnterprise} onValueChange={setSelectedEnterprise}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une entreprise" />
                </SelectTrigger>
                <SelectContent>
                  {enterprises.map((enterprise) => (
                    <SelectItem key={enterprise.id} value={enterprise.id}>
                      {enterprise.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulaire de dotation */}
      {selectedEnterprise && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Nouvelle Dotation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitDotation} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employee">Employé *</Label>
                  <Select 
                    value={dotationData.employeeId} 
                    onValueChange={(value) => setDotationData(prev => ({ ...prev, employeeId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un employé" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{employee.profiles?.display_name || employee.profiles?.unique_id}</span>
                            <Badge variant="outline" className="ml-2">
                              {employee.grade}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="amount">Montant ($USD) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={dotationData.amount}
                    onChange={(e) => setDotationData(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Raison de la dotation (optionnel)"
                  value={dotationData.description}
                  onChange={(e) => setDotationData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <Button type="submit" className="w-full">
                <Save className="w-4 h-4 mr-2" />
                Créer la Dotation
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Liste des employés */}
      {selectedEnterprise && !isLoading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Employés Actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {employees.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucun employé actif dans cette entreprise</p>
              </div>
            ) : (
              <div className="space-y-2">
                {employees.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">
                          {employee.profiles?.display_name || employee.profiles?.unique_id}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {employee.profiles?.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{employee.grade}</Badge>
                      <span className="text-sm font-medium">
                        {formatCurrencyDollar(employee.salary)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}