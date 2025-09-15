import { TaxManager } from './TaxManager';

interface ImpotFormProps {
  guildId: string;
  currentRole?: string;
  entreprise?: string;
}

export function ImpotForm({ guildId, currentRole, entreprise }: ImpotFormProps) {
  return <TaxManager guildId={guildId} currentRole={currentRole} entreprise={entreprise} />;
}