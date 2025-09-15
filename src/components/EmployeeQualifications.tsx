import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Users, 
  GraduationCap, 
  Phone, 
  CreditCard, 
  Calendar, 
  Save, 
  UserCheck,
  FileText,
  Plus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  email: string;
}

interface EmployeeQualification {
  id?: string;
  employee_id: string;
  patronage_diploma: boolean;
  accounting_diploma: boolean;
  management_diploma: boolean;
  hr_diploma: boolean;
  start_date: string | null;
  phone: string | null;
  unique_identifier: string | null;
  bank_details: string | null;
  arrival_date: string | null;
  created_at?: string;
  updated_at?: string;
}

interface EmployeeQualificationsProps {
  enterpriseId: string;
}

export const EmployeeQualifications: React.FC<EmployeeQualificationsProps> = ({ enterpriseId }) => {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<(Employee & { profile?: EmployeeProfile })[]>([]);
  const [qualifications, setQualifications] = useState<Record<string, EmployeeQualification>>({});
  const [loading, setLoading] = useState(true);
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [enterpriseId]);

  const loadData = async () => {
    try {
      // Charger les employés avec leurs profils
      const { data: employeesData } = await supabase
        .from('employees')
        .select(`
          *,
          profiles!inner(id, username, display_name, email)
        `)
        .eq('enterprise_id', enterpriseId)
        .eq('is_active', true);

      const processedEmployees = employeesData?.map(emp => ({
        ...emp,
        profile: emp.profiles
      })) || [];

      setEmployees(processedEmployees);

      // Charger les qualifications existantes
      const { data: qualificationsData } = await supabase
        .from('employee_qualifications')
        .select('*')
        .in('employee_id', processedEmployees.map(e => e.id));

      const qualMap: Record<string, EmployeeQualification> = {};
      
      // Initialiser avec des valeurs par défaut pour tous les employés
      processedEmployees.forEach(emp => {
        qualMap[emp.id] = {
          employee_id: emp.id,
          patronage_diploma: false,
          accounting_diploma: false,
          management_diploma: false,
          hr_diploma: false,
          start_date: null,
          phone: null,
          unique_identifier: null,
          bank_details: null,
          arrival_date: null
        };
      });

      // Remplacer par les données existantes
      qualificationsData?.forEach(qual => {
        qualMap[qual.employee_id] = qual;
      });

      setQualifications(qualMap);

    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données des employés",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateQualification = (
    employeeId: string, 
    field: keyof EmployeeQualification, 
    value: any
  ) => {
    setQualifications(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [field]: value
      }
    }));
  };

  const saveQualifications = async (employeeId?: string) => {
    try {
      const employeesToSave = employeeId ? [employeeId] : Object.keys(qualifications);
      
      for (const empId of employeesToSave) {
        const qualification = qualifications[empId];
        if (!qualification) continue;

        if (qualification.id) {
          // Mise à jour
          const { error } = await supabase
            .from('employee_qualifications')
            .update(qualification)
            .eq('id', qualification.id);

          if (error) throw error;
        } else {
          // Création
          const { data, error } = await supabase
            .from('employee_qualifications')
            .insert(qualification)
            .select()
            .single();

          if (error) throw error;

          // Mettre à jour l'ID local
          setQualifications(prev => ({
            ...prev,
            [empId]: { ...prev[empId], id: data.id }
          }));
        }
      }

      toast({
        title: "Succès",
        description: employeeId 
          ? "Qualifications sauvegardées" 
          : `${employeesToSave.length} employés mis à jour`
      });

      if (employeeId) {
        setEditingEmployee(null);
      }

    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la sauvegarde",
        variant: "destructive"
      });
    }
  };

  const getDiplomasBadges = (qualification: EmployeeQualification) => {
    const diplomas = [];
    if (qualification.patronage_diploma) diplomas.push('Patronnat');
    if (qualification.accounting_diploma) diplomas.push('Comptabilité');
    if (qualification.management_diploma) diplomas.push('Management');
    if (qualification.hr_diploma) diplomas.push('RH');
    return diplomas;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Chargement des qualifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Qualifications et Informations Légales</h2>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="legal-info">Informations légales</TabsTrigger>
          <TabsTrigger value="diplomas">Diplômes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Résumé des Employés
              </CardTitle>
              <CardDescription>
                Vue d'ensemble des qualifications et informations de chaque employé
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Diplômes</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>ID Unique</TableHead>
                    <TableHead>Date d'arrivée</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => {
                    const qualification = qualifications[employee.id];
                    const diplomas = getDiplomasBadges(qualification);

                    return (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {employee.profile?.display_name || employee.profile?.username}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {employee.profile?.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{employee.grade}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {diplomas.map(diploma => (
                              <Badge key={diploma} variant="secondary" className="text-xs">
                                {diploma}
                              </Badge>
                            ))}
                            {diplomas.length === 0 && (
                              <span className="text-sm text-muted-foreground">Aucun diplôme</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {qualification.phone || (
                            <span className="text-muted-foreground">Non renseigné</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {qualification.unique_identifier || (
                            <span className="text-muted-foreground">Non renseigné</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {qualification.arrival_date ? (
                            format(new Date(qualification.arrival_date), 'dd/MM/yyyy', { locale: fr })
                          ) : (
                            <span className="text-muted-foreground">Non renseignée</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingEmployee(employee.id)}
                          >
                            Modifier
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legal-info">
          <div className="space-y-4">
            {employees.map((employee) => {
              const qualification = qualifications[employee.id];
              const isEditing = editingEmployee === employee.id;

              return (
                <Card key={employee.id} className={isEditing ? 'border-primary' : ''}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-5 w-5" />
                        {employee.profile?.display_name || employee.profile?.username}
                      </div>
                      <Badge variant="outline">{employee.grade}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`phone-${employee.id}`} className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Téléphone
                        </Label>
                        <Input
                          id={`phone-${employee.id}`}
                          placeholder="+33 6 12 34 56 78"
                          value={qualification.phone || ''}
                          onChange={(e) => updateQualification(employee.id, 'phone', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`unique-id-${employee.id}`} className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          ID Unique
                        </Label>
                        <Input
                          id={`unique-id-${employee.id}`}
                          placeholder="ID unique de l'employé"
                          value={qualification.unique_identifier || ''}
                          onChange={(e) => updateQualification(employee.id, 'unique_identifier', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`start-date-${employee.id}`} className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Date de prise de poste
                        </Label>
                        <Input
                          id={`start-date-${employee.id}`}
                          type="date"
                          value={qualification.start_date || ''}
                          onChange={(e) => updateQualification(employee.id, 'start_date', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`arrival-date-${employee.id}`} className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Date d'arrivée
                        </Label>
                        <Input
                          id={`arrival-date-${employee.id}`}
                          type="date"
                          value={qualification.arrival_date || ''}
                          onChange={(e) => updateQualification(employee.id, 'arrival_date', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`rib-${employee.id}`} className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        RIB / Détails bancaires
                      </Label>
                      <Textarea
                        id={`rib-${employee.id}`}
                        placeholder="IBAN, BIC, nom de la banque..."
                        value={qualification.bank_details || ''}
                        onChange={(e) => updateQualification(employee.id, 'bank_details', e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => setEditingEmployee(null)}
                          >
                            Annuler
                          </Button>
                          <Button onClick={() => saveQualifications(employee.id)}>
                            <Save className="h-4 w-4 mr-2" />
                            Sauvegarder
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => setEditingEmployee(employee.id)}
                        >
                          Modifier
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="diplomas">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Gestion des Diplômes
              </CardTitle>
              <CardDescription>
                Gérez les certifications et diplômes de chaque employé
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Diplôme de Patronnat</TableHead>
                    <TableHead>Diplôme de Comptabilité</TableHead>
                    <TableHead>Diplôme de Management</TableHead>
                    <TableHead>Diplôme de RH</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => {
                    const qualification = qualifications[employee.id];

                    return (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {employee.profile?.display_name || employee.profile?.username}
                            </p>
                            <Badge variant="outline" className="mt-1">
                              {employee.grade}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={qualification.patronage_diploma}
                            onCheckedChange={(checked) => 
                              updateQualification(employee.id, 'patronage_diploma', checked)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={qualification.accounting_diploma}
                            onCheckedChange={(checked) => 
                              updateQualification(employee.id, 'accounting_diploma', checked)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={qualification.management_diploma}
                            onCheckedChange={(checked) => 
                              updateQualification(employee.id, 'management_diploma', checked)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={qualification.hr_diploma}
                            onCheckedChange={(checked) => 
                              updateQualification(employee.id, 'hr_diploma', checked)
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => saveQualifications()}>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder tous les Diplômes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {employees.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2" />
              <p>Aucun employé trouvé dans cette entreprise</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};