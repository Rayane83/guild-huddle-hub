import { DotationManager } from './DotationManager';

interface DotationFormProps {
  guildId: string;
  currentRole?: string;
  entreprise?: string;
}

export function DotationForm({ guildId, currentRole, entreprise }: DotationFormProps) {
  return <DotationManager guildId={guildId} currentRole={currentRole} entreprise={entreprise} />;
}