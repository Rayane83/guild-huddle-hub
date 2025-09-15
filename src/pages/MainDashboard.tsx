import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProtectedPage } from '@/components/ProtectedPage';
import { useDiscordAuth } from '@/hooks/useDiscordAuth';

// Composants
import { DashboardSummary } from '@/components/DashboardSummary';
import { DotationForm } from '@/components/DotationForm';
import { ImpotForm } from '@/components/ImpotForm';
import { BlanchimentToggle } from '@/components/BlanchimentToggle';
import { ArchiveTable } from '@/components/ArchiveTable';
import { DocsUpload } from '@/components/DocsUpload';
import { StaffConfig } from '@/components/StaffConfig';
import { AccountingManager } from '@/components/AccountingManager';
import { AdvancedSalaryCalculatorWithFiscal } from '@/components/AdvancedSalaryCalculatorWithFiscal';
import { EmployeeQualifications } from '@/components/EmployeeQualifications';

// Icons
import { 
  BarChart3, 
  Calculator, 
  FileText, 
  Shield, 
  Archive, 
  Settings,
  Upload,
  DollarSign,
  GraduationCap
} from 'lucide-react';

// Utils pour les permissions
const canAccessDotation = (role: string | null, isStaff = false) => {
  if (isStaff) return true; // Staff en lecture seule
  return ['patron', 'co-patron', 'employe', 'dot'].includes(role || '');
};

const canAccessImpot = (role: string | null) => {
  return ['superadmin', 'admin', 'patron', 'co-patron', 'employe'].includes(role || '');
};

const canAccessBlanchiment = (role: string | null, isStaff = false) => {
  if (isStaff) return true; // Staff en lecture seule
  return ['patron', 'co-patron'].includes(role || '');
};

const canAccessArchives = (role: string | null) => {
  return ['superadmin', 'admin', 'patron', 'co-patron'].includes(role || '');
};

const canAccessStaffConfig = (role: string | null) => {
  return ['superadmin', 'admin'].includes(role || '');
};

const canAccessAdvancedFeatures = (role: string | null) => {
  return ['superadmin', 'admin', 'patron', 'co-patron'].includes(role || '');
};

const MainDashboard: React.FC = () => {
  const { userRole, enterprise, profile } = useDiscordAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  const isStaff = ['superadmin', 'admin'].includes(userRole || '');
  const isStaffReadOnly = isStaff && !['dotation', 'blanchiment'].includes(activeTab);

  // Déterminer la guilde ID et l'entreprise ID
  const guildId = enterprise?.guild_id || '';
  const enterpriseId = enterprise?.id || '';
  const enterpriseKey = enterprise?.key || '';

  return (
    <ProtectedPage pageTitle="Dashboard Principal">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-10 mb-8">
          {/* Dashboard - accessible à tous */}
          <TabsTrigger value="dashboard" className="flex items-center gap-1">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          
          {/* Dotations */}
          {canAccessDotation(userRole, isStaff) && (
            <TabsTrigger value="dotation" className="flex items-center gap-1">
              <Calculator className="w-4 h-4" />
              <span className="hidden sm:inline">Dotations</span>
            </TabsTrigger>
          )}
          
          {/* Impôts */}
          {canAccessImpot(userRole) && (
            <TabsTrigger value="impot" className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Impôts</span>
            </TabsTrigger>
          )}
          
          {/* Blanchiment */}
          {canAccessBlanchiment(userRole, isStaff) && (
            <TabsTrigger value="blanchiment" className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Blanchiment</span>
            </TabsTrigger>
          )}
          
          {/* Archives */}
          {canAccessArchives(userRole) && (
            <TabsTrigger value="archives" className="flex items-center gap-1">
              <Archive className="w-4 h-4" />
              <span className="hidden sm:inline">Archives</span>
            </TabsTrigger>
          )}
          
          {/* Documents */}
          <TabsTrigger value="docs" className="flex items-center gap-1">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Docs</span>
          </TabsTrigger>
          
          {/* Comptabilité avancée */}
          {canAccessAdvancedFeatures(userRole) && (
            <>
              <TabsTrigger value="accounting" className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                <span className="hidden sm:inline">Comptabilité</span>
              </TabsTrigger>
              
              <TabsTrigger value="advanced-salary" className="flex items-center gap-1">
                <Calculator className="w-4 h-4" />
                <span className="hidden sm:inline">Salaires</span>
              </TabsTrigger>
              
              <TabsTrigger value="qualifications" className="flex items-center gap-1">
                <GraduationCap className="w-4 h-4" />
                <span className="hidden sm:inline">Qualifications</span>
              </TabsTrigger>
            </>
          )}
          
          {/* Config Staff */}
          {canAccessStaffConfig(userRole) && (
            <TabsTrigger value="staff-config" className="flex items-center gap-1">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Config</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Contenu des onglets */}
        <TabsContent value="dashboard">
          <DashboardSummary guildId={guildId} />
        </TabsContent>

        {canAccessDotation(userRole, isStaff) && (
          <TabsContent value="dotation">
            <DotationForm guildId={guildId} />
          </TabsContent>
        )}

        {canAccessImpot(userRole) && (
          <TabsContent value="impot">
            <ImpotForm guildId={guildId} />
          </TabsContent>
        )}

        {canAccessBlanchiment(userRole, isStaff) && (
          <TabsContent value="blanchiment">
            <BlanchimentToggle 
              guildId={guildId} 
              entrepriseKey={enterpriseKey}
            />
          </TabsContent>
        )}

        {canAccessArchives(userRole) && (
          <TabsContent value="archives">
            <ArchiveTable guildId={guildId} />
          </TabsContent>
        )}

        <TabsContent value="docs">
          <DocsUpload 
            guildId={guildId} 
            role={userRole || 'employe' as any} 
          />
        </TabsContent>

        {canAccessAdvancedFeatures(userRole) && (
          <>
            <TabsContent value="accounting">
              {enterpriseId ? (
                <AccountingManager 
                  enterpriseId={enterpriseId} 
                  guildId={guildId} 
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Aucune entreprise sélectionnée. Contactez un administrateur.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="advanced-salary">
              {enterpriseId ? (
                <AdvancedSalaryCalculatorWithFiscal 
                  enterpriseId={enterpriseId} 
                  guildId={guildId}
                  currentProfit={0}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Aucune entreprise sélectionnée. Contactez un administrateur.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="qualifications">
              {enterpriseId ? (
                <EmployeeQualifications enterpriseId={enterpriseId} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Aucune entreprise sélectionnée. Contactez un administrateur.</p>
                </div>
              )}
            </TabsContent>
          </>
        )}

        {canAccessStaffConfig(userRole) && (
          <TabsContent value="staff-config">
            <StaffConfig guildId={guildId} />
          </TabsContent>
        )}
      </Tabs>
    </ProtectedPage>
  );
};

export default MainDashboard;