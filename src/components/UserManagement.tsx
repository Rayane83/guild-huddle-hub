import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, UserPlus, Building2, Shield, Search, Trash2, CheckCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface UserCredential {
  unique_id: string;
  email: string;
  registration_date: string;
  is_superstaff: boolean;
  has_hwid_registered: boolean;
}

interface Enterprise {
  id: string;
  name: string;
  key: string;
  discord_guild_id: string;
}

interface Employee {
  id: string;
  profile_id: string;
  enterprise_id: string;
  grade: string;
  salary: number;
  is_active: boolean;
  enterprises: {
    name: string;
  };
  profiles: {
    email: string;
    unique_id: string;
  };
}

export function UserManagement() {
  const [users, setUsers] = useState<UserCredential[]>([]);
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedEnterprise, setSelectedEnterprise] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'admin' | 'superadmin'>('user');
  const [employeeGrade, setEmployeeGrade] = useState('employe');
  const [employeeSalary, setEmployeeSalary] = useState('0');
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadUsers(),
        loadEnterprises(),
        loadEmployees()
      ]);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    const { data, error } = await supabase.rpc('list_users_safe');
    if (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      return;
    }
    setUsers(data || []);
  };

  const loadEnterprises = async () => {
    const { data, error } = await supabase
      .from('enterprises')
      .select('*')
      .order('name');
    if (error) {
      console.error('Erreur lors du chargement des entreprises:', error);
      return;
    }
    setEnterprises(data || []);
  };

  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        enterprises(name),
        profiles(email, unique_id)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erreur lors du chargement des employés:', error);
      return;
    }
    setEmployees(data || []);
  };

  const assignSuperadminRole = async (email: string, grant: boolean) => {
    // Récupérer le user_id basé sur l'email
    const { data: credentials, error: searchError } = await supabase
      .from('auth_credentials')
      .select('user_id')
      .eq('email', email)
      .single();

    if (searchError || !credentials) {
      toast({
        title: "Erreur",
        description: "Impossible de trouver l'utilisateur",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('auth_credentials')
        .update({ is_superstaff: grant })
        .eq('user_id', credentials.user_id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: `Rôle superadmin ${grant ? 'accordé' : 'retiré'} avec succès`,
      });

      await loadUsers();
    } catch (error) {
      console.error('Erreur lors de l\'attribution du rôle:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le rôle superadmin",
        variant: "destructive"
      });
    }
  };

  const assignUserRole = async (email: string, role: 'user' | 'admin' | 'superadmin') => {
    // Récupérer le user_id basé sur l'email
    const { data: credentials, error: searchError } = await supabase
      .from('auth_credentials')
      .select('user_id')
      .eq('email', email)
      .single();

    if (searchError || !credentials) {
      toast({
        title: "Erreur",
        description: "Impossible de trouver l'utilisateur",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({
          user_id: credentials.user_id,
          role: role,
          assigned_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast({
        title: "Succès",
        description: `Rôle ${role} attribué avec succès`,
      });
    } catch (error) {
      console.error('Erreur lors de l\'attribution du rôle:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'attribuer le rôle",
        variant: "destructive"
      });
    }
  };

  const assignUserToEnterprise = async () => {
    if (!selectedUser || !selectedEnterprise) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un utilisateur et une entreprise",
        variant: "destructive"
      });
      return;
    }

    try {
      // Récupérer le user_id basé sur l'email
      const { data: credentials, error: credentialsError } = await supabase
        .from('auth_credentials')
        .select('user_id')
        .eq('email', selectedUser)
        .single();

      if (credentialsError || !credentials) {
        toast({
          title: "Erreur",
          description: "Impossible de trouver l'utilisateur",
          variant: "destructive"
        });
        return;
      }

      // Récupérer le profile_id de l'utilisateur
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', credentials.user_id)
        .single();

      if (profileError) throw profileError;

      // Créer l'employé
      const { error } = await supabase
        .from('employees')
        .insert({
          profile_id: profiles.id,
          enterprise_id: selectedEnterprise,
          grade: employeeGrade,
          salary: parseFloat(employeeSalary),
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Utilisateur assigné à l'entreprise avec succès",
      });

      // Réinitialiser les sélections
      setSelectedUser('');
      setSelectedEnterprise('');
      setEmployeeGrade('employe');
      setEmployeeSalary('0');

      await loadEmployees();
    } catch (error) {
      console.error('Erreur lors de l\'assignation:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'assigner l'utilisateur à l'entreprise",
        variant: "destructive"
      });
    }
  };

  const removeEmployeeFromEnterprise = async (employeeId: string) => {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ is_active: false })
        .eq('id', employeeId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Employé retiré de l'entreprise",
      });

      await loadEmployees();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de retirer l'employé",
        variant: "destructive"
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.unique_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEmployees = employees.filter(employee =>
    employee.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.profiles?.unique_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.enterprises?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6" />
          Gestion des Utilisateurs
        </h2>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Shield className="w-4 h-4" />
          {users.length} utilisateurs
        </Badge>
      </div>

      {/* Barre de recherche */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Recherche
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Rechercher par email ou ID unique..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Attribution d'utilisateur à une entreprise */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Assigner Utilisateur à Entreprise
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Utilisateur</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un utilisateur" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.email} value={user.email}>
                      {user.email} ({user.unique_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Entreprise</Label>
              <Select value={selectedEnterprise} onValueChange={setSelectedEnterprise}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une entreprise" />
                </SelectTrigger>
                <SelectContent>
                  {enterprises.map((enterprise) => (
                    <SelectItem key={enterprise.id} value={enterprise.id}>
                      {enterprise.name} ({enterprise.key})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Grade</Label>
              <Select value={employeeGrade} onValueChange={setEmployeeGrade}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employe">Employé</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="directeur">Directeur</SelectItem>
                  <SelectItem value="pdg">PDG</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Salaire</Label>
              <Input
                type="number"
                value={employeeSalary}
                onChange={(e) => setEmployeeSalary(e.target.value)}
                placeholder="Salaire en $"
              />
            </div>
          </div>

          <Button onClick={assignUserToEnterprise} className="w-full">
            <Building2 className="w-4 h-4 mr-2" />
            Assigner à l'Entreprise
          </Button>
        </CardContent>
      </Card>

      {/* Liste des utilisateurs */}
      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs du Système</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>ID Unique</TableHead>
                <TableHead>Inscription</TableHead>
                <TableHead>HWID</TableHead>
                <TableHead>Superadmin</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.email}>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant="outline">{user.unique_id}</Badge>
                </TableCell>
                <TableCell>
                  {new Date(user.registration_date).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {user.has_hwid_registered ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <span className="text-muted-foreground">Non</span>
                  )}
                </TableCell>
                <TableCell>
                  {user.is_superstaff ? (
                    <Badge variant="destructive">Superadmin</Badge>
                  ) : (
                    <Badge variant="secondary">Utilisateur</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {!user.is_superstaff && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Shield className="w-4 h-4 mr-1" />
                            Promouvoir
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Promouvoir en Superadmin</AlertDialogTitle>
                            <AlertDialogDescription>
                              Êtes-vous sûr de vouloir accorder les privilèges de superadmin à {user.email} ?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => assignSuperadminRole(user.email, true)}
                            >
                              Promouvoir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    
                    {user.is_superstaff && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="w-4 h-4 mr-1" />
                            Rétrograder
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Rétrograder de Superadmin</AlertDialogTitle>
                            <AlertDialogDescription>
                              Êtes-vous sûr de vouloir retirer les privilèges de superadmin à {user.email} ?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => assignSuperadminRole(user.email, false)}
                            >
                              Rétrograder
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Liste des employés d'entreprises */}
      <Card>
        <CardHeader>
          <CardTitle>Employés d'Entreprises</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Entreprise</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Salaire</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{employee.profiles?.email}</div>
                      <div className="text-sm text-muted-foreground">
                        {employee.profiles?.unique_id}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{employee.enterprises?.name}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge>{employee.grade}</Badge>
                  </TableCell>
                  <TableCell>
                    ${employee.salary.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive">
                          <Trash2 className="w-4 h-4 mr-1" />
                          Retirer
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Retirer de l'Entreprise</AlertDialogTitle>
                          <AlertDialogDescription>
                            Êtes-vous sûr de vouloir retirer cet employé de l'entreprise ?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => removeEmployeeFromEnterprise(employee.id)}
                          >
                            Retirer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}