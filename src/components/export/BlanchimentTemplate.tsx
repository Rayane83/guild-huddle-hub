import React from 'react';

interface BlanchimentRow {
  id: string;
  employe: string;
  groupe: string;
  statut: string;
  somme: number;
  date_recu?: string;
  date_rendu?: string;
  duree?: number;
  donneur_id?: string;
  recep_id?: string;
}

interface BlanchimentTemplateData {
  rows: BlanchimentRow[];
  percEntreprise: number;
  percGroupe: number;
  entreprise: string;
  periode: string;
}

interface BlanchimentTemplateProps {
  data: BlanchimentTemplateData;
  ref?: React.Ref<HTMLDivElement>;
}

export const BlanchimentTemplate = React.forwardRef<HTMLDivElement, BlanchimentTemplateProps>(
  ({ data }, ref) => {
    const formatCurrencyDollar = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
    };

    const formatDate = (dateStr?: string) => {
      if (!dateStr) return '';
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('fr-FR');
      } catch {
        return dateStr;
      }
    };

    // Grouper par statut pour l'affichage
    const statusGroups = data.rows.reduce((groups, row) => {
      const status = row.statut || 'Aucun statut';
      if (!groups[status]) groups[status] = [];
      groups[status].push(row);
      return groups;
    }, {} as Record<string, BlanchimentRow[]>);

    // Calculer les totaux par employé
    const employeeTotals = data.rows.reduce((totals, row) => {
      if (row.employe && row.somme) {
        totals.set(row.employe, (totals.get(row.employe) || 0) + row.somme);
      }
      return totals;
    }, new Map<string, number>());

    return (
      <div ref={ref} className="p-8 bg-background text-foreground max-w-4xl mx-auto print:max-w-none print:mx-0 print:p-4">
        <div className="text-center mb-6 p-3 border-2 border-border bg-muted">
          <h1 className="text-lg font-bold mb-1">RAPPORT DE BLANCHIMENT D'ARGENT</h1>
          <p className="text-sm">Entreprise: {data.entreprise || 'Non spécifiée'}</p>
          <p className="text-sm">Période: {data.periode || 'Non spécifiée'}</p>
          <p className="text-xs text-muted-foreground">Généré le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}</p>
        </div>

        {/* HISTORIQUE PAR STATUT */}
        <div className="mb-8">
          <h2 className="text-sm font-bold mb-3">HISTORIQUE DES OPÉRATIONS PAR STATUT</h2>
          
          {Object.keys(statusGroups).length > 0 ? (
            Object.entries(statusGroups).map(([status, rows]) => (
              <div key={status} className="mb-6">
                <h3 className="text-sm font-semibold mb-2 text-primary">{status} ({rows.length} opération{rows.length > 1 ? 's' : ''})</h3>
                
                <table className="w-full border-collapse border border-border">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border border-border p-1 text-xs font-bold w-8">#</th>
                      <th className="border border-border p-1 text-xs font-bold">Statut</th>
                      <th className="border border-border p-1 text-xs font-bold">Date Reçu</th>
                      <th className="border border-border p-1 text-xs font-bold">Date Rendu</th>
                      <th className="border border-border p-1 text-xs font-bold">Durée</th>
                      <th className="border border-border p-1 text-xs font-bold">Nom</th>
                      <th className="border border-border p-1 text-xs font-bold">Groupe</th>
                      <th className="border border-border p-1 text-xs font-bold">Somme</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const dateRecu = formatDate(row.date_recu);
                      const dateRendu = formatDate(row.date_rendu);
                      const duree = row.duree;
                      
                      return (
                        <tr key={i} className={i % 2 === 1 ? 'bg-muted/50' : ''}>
                          <td className="border border-border p-1 text-xs text-center font-semibold">{i + 1}</td>
                          <td className="border border-border p-1 text-xs">{row?.statut || ''}</td>
                          <td className="border border-border p-1 text-xs text-center">{dateRecu}</td>
                          <td className="border border-border p-1 text-xs text-center">{dateRendu}</td>
                          <td className="border border-border p-1 text-xs text-center">{duree ? `${duree} j` : ''}</td>
                          <td className="border border-border p-1 text-xs">{row?.employe || ''}</td>
                          <td className="border border-border p-1 text-xs">{row?.groupe || ''}</td>
                          <td className="border border-border p-1 text-xs text-right">{row?.somme ? formatCurrencyDollar(row.somme) : ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Aucune opération enregistrée.</p>
          )}
        </div>

      {/* Nouvelle page pour les blocs de suivi */}
      <div className="print:break-before-page">
        {/* SUIVI ARGENT SALE RÉCUPÉRÉ */}
        <div className="mb-8">
          <h2 className="text-sm font-bold mb-3">SUIVI ARGENT SALE RÉCUPÉRÉ</h2>
          
          {Array.from(employeeTotals.entries()).length > 0 ? (
            <table className="w-full border-collapse border border-border">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border p-2 text-xs font-bold">Employé</th>
                  <th className="border border-border p-2 text-xs font-bold">Somme Totale</th>
                  <th className="border border-border p-2 text-xs font-bold">Entreprise ({data.percEntreprise}%)</th>
                  <th className="border border-border p-2 text-xs font-bold">Groupe ({data.percGroupe}%)</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(employeeTotals.entries()).map(([name, total], idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-muted/50' : ''}>
                    <td className="border border-border p-2 text-xs font-semibold">{name}</td>
                    <td className="border border-border p-2 text-xs text-right">{formatCurrencyDollar(total)}</td>
                    <td className="border border-border p-2 text-xs text-right">{formatCurrencyDollar(total * data.percEntreprise / 100)}</td>
                    <td className="border border-border p-2 text-xs text-right">{formatCurrencyDollar(total * data.percGroupe / 100)}</td>
                  </tr>
                ))}
                <tr className="bg-secondary font-bold">
                  <td className="border border-border p-2 text-xs">TOTAL</td>
                  <td className="border border-border p-2 text-xs text-right">
                    {formatCurrencyDollar(Array.from(employeeTotals.values()).reduce((s, t) => s + t, 0))}
                  </td>
                  <td className="border border-border p-2 text-xs text-right">
                    {formatCurrencyDollar(Array.from(employeeTotals.values()).reduce((s, t) => s + t, 0) * data.percEntreprise / 100)}
                  </td>
                  <td className="border border-border p-2 text-xs text-right">
                    {formatCurrencyDollar(Array.from(employeeTotals.values()).reduce((s, t) => s + t, 0) * data.percGroupe / 100)}
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div className="text-center p-8 border border-border bg-muted/50">
              <p className="text-sm text-muted-foreground">Aucune donnée de récupération disponible</p>
            </div>
          )}
        </div>

        {/* ANALYSE PAR STATUT */}
        <div className="mb-8">
          <h2 className="text-sm font-bold mb-3">ANALYSE PAR STATUT</h2>
          
          {Object.keys(statusGroups).length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(statusGroups).map(([status, rows]) => (
                <div key={status} className="border border-border p-3">
                  <h3 className="font-bold text-sm mb-2 text-center bg-muted p-1">
                    {status}
                  </h3>
                  <div className="space-y-1">
                    <p className="text-xs">Opérations: {rows.length}</p>
                    {rows.map((row, idx) => (
                      <div key={idx} className="flex items-center text-xs text-muted-foreground">
                        <span className="w-2 h-2 bg-muted-foreground rounded-full mr-2"></span>
                        <span>{row.employe} - {row.somme ? formatCurrencyDollar(row.somme) : 'N/A'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 border border-border bg-muted/50">
              <p className="text-sm text-muted-foreground">Aucune donnée d'analyse disponible</p>
            </div>
          )}
        </div>

        {/* DÉTAIL COMPLET DES TRANSACTIONS */}
        <div className="mb-8">
          <h2 className="text-sm font-bold mb-3">DÉTAIL COMPLET DES TRANSACTIONS</h2>
          
          {data.rows.length > 0 ? (
            <table className="w-full border-collapse border border-border">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border p-1 text-xs font-bold">Employé</th>
                  <th className="border border-border p-1 text-xs font-bold">Joueur qui donne</th>
                  <th className="border border-border p-1 text-xs font-bold">Joueur qui récupère</th>
                  <th className="border border-border p-1 text-xs font-bold">Somme</th>
                  <th className="border border-border p-1 text-xs font-bold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-muted/50' : ''}>
                    <td className="border border-border p-1 text-xs">{row.employe || ''}</td>
                    <td className="border border-border p-1 text-xs text-center">{row.donneur_id || ''}</td>
                    <td className="border border-border p-1 text-xs text-center">{row.recep_id || ''}</td>
                    <td className="border border-border p-1 text-xs text-right">{row.somme ? formatCurrencyDollar(row.somme) : ''}</td>
                    <td className="border border-border p-1 text-xs">{row.statut || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center p-8 border border-border bg-muted/50">
              <p className="text-sm text-muted-foreground">Aucune transaction disponible</p>
            </div>
          )}
        </div>
      </div>
      </div>
    );
  }
);

BlanchimentTemplate.displayName = 'BlanchimentTemplate';