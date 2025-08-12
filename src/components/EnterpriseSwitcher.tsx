import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2 } from 'lucide-react';

interface Enterprise {
  key: string;
  name: string;
}

interface EnterpriseSwitcherProps {
  enterprises: Enterprise[];
  selectedKey?: string;
  onEnterpriseChange: (key: string) => void;
  isLoading?: boolean;
}

export function EnterpriseSwitcher({
  enterprises,
  selectedKey,
  onEnterpriseChange,
  isLoading = false
}: EnterpriseSwitcherProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Building2 className="w-4 h-4 text-muted-foreground" />
        <div className="w-48 h-10 bg-muted animate-pulse rounded-md" />
      </div>
    );
  }

  if (enterprises.length === 0) {
    return (
      <div className="flex items-center space-x-2">
        <Building2 className="w-4 h-4 text-muted-foreground" />
        <Badge variant="outline" className="text-muted-foreground">
          Aucune entreprise
        </Badge>
      </div>
    );
  }

  const selected = enterprises.find(e => e.key === selectedKey);

  return (
    <div className="flex items-center space-x-2">
      <Building2 className="w-4 h-4 text-muted-foreground" />
      <Select value={selectedKey} onValueChange={onEnterpriseChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Sélectionner une entreprise">
            {selected && <span className="truncate">{selected.name}</span>}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {enterprises.map((ent) => (
            <SelectItem key={ent.key} value={ent.key}>
              {ent.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {enterprises.length > 0 && (
        <Badge variant="secondary" className="text-xs">
          {enterprises.length} entreprise{enterprises.length > 1 ? 's' : ''}
        </Badge>
      )}
    </div>
  );
}

