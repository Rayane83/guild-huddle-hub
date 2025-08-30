# Prompt de reproduction exacte du Portail Entreprise Flashback Fa

Créez un projet web complet de gestion d'entreprises Discord avec les spécifications suivantes :

## 🏗️ Architecture technique

**Frontend :**
- React 18 + TypeScript + Vite
- Tailwind CSS avec design system complet (tokens sémantiques HSL)
- Shadcn/ui pour les composants
- React Router pour la navigation
- React Query pour la gestion d'état
- Système de toasts (Sonner + Radix)

**Backend :**
- Supabase (authentification, base de données PostgreSQL, edge functions)
- Row Level Security (RLS) activé sur toutes les tables
- Edge functions Deno pour intégrations Discord

## 🎨 Design System

Créez un design system moderne avec :
- Tokens de couleurs HSL sémantiques (primary, secondary, success, warning, destructive, muted)
- Gradients subtils pour les cartes
- Animations fluides (fade-in, loading dots)
- Mode sombre/clair avec next-themes
- Classes utilitaires : `stat-card`, `loading-dots`
- Responsive design complet

## 🔐 Authentification & Autorisation

**Système de rôles hiérarchiques Discord :**
1. **Staff** (le plus élevé) - accès total
2. **Patron** - gestion entreprise complète
3. **Co-Patron** - gestion entreprise limitée
4. **DOT** - accès factures/diplômes + impôts
5. **Employé** - lecture seule dashboard

**Logique d'authentification :**
- OAuth Discord via Supabase
- Extraction automatique des rôles Discord via edge functions
- Détection intelligente de l'entreprise depuis les noms de rôles
- Sessions persistantes avec refresh automatique

## 📊 Structure de base de données

**Tables principales :**

```sql
-- Configuration Discord globale
discord_config (id, data jsonb, created_at, updated_at)

-- Entreprises par guilde
enterprises (id, guild_id, key, name, role_id, enterprise_guild_id, employee_role_id, created_at, updated_at)

-- Stockage unifié multi-scope
app_storage (id, user_id, guild_id, entreprise_key, scope, key, data jsonb, created_at, updated_at)

-- Rapports de dotation
dotation_reports (id, guild_id, entreprise_key, solde_actuel, totals jsonb, employees_count, created_by, archived_at, created_at, updated_at)

-- Lignes de dotation individuelles
dotation_rows (id, report_id, name, run, facture, vente, ca_total, salaire, prime)

-- Paliers d'imposition
tax_brackets (id, guild_id, entreprise_key, min, max, taux, sal_min_emp, sal_max_emp, sal_min_pat, sal_max_pat, pr_min_emp, pr_max_emp, pr_min_pat, pr_max_pat, created_at, updated_at)

-- Paliers de richesse
wealth_brackets (id, guild_id, entreprise_key, min, max, taux, created_at, updated_at)

-- Configuration d'entreprise avancée
company_configs (id, guild_id, entreprise_key, config jsonb, created_at, updated_at)

-- Paliers de primes d'entreprise
company_prime_tiers (id, guild_id, entreprise_key, seuil, prime, created_at, updated_at)

-- Règles de grades
grade_rules (id, guild_id, entreprise_key, grade, role_discord_id, pourcentage_ca, taux_horaire, created_at, updated_at)

-- Système de blanchiment
blanchiment_settings (id, guild_id, entreprise_key, enabled, use_global, perc_entreprise, perc_groupe, created_at, updated_at)
blanchiment_global (guild_id, perc_entreprise, perc_groupe, created_at, updated_at)
blanchiment_rows (id, guild_id, entreprise_key, employe, donneur_id, recep_id, somme, groupe, statut, duree, date_recu, date_rendu, created_at, updated_at)

-- Archives globales
archives (id, guild_id, entreprise_key, type, date, montant, statut, payload jsonb, created_at, updated_at)
```

## 🔧 Edge Functions Discord

**Fonctions Supabase requises :**

1. **discord-user-roles** : Récupère les rôles d'un utilisateur dans une guilde
2. **discord-role-counts** : Compte les membres par rôle
3. **discord-sync** : Synchronisation données Discord
4. **discord-health** : Vérification santé du bot

## 🎯 Fonctionnalités principales

### 1. Dashboard Multi-Entreprises
- Vue d'ensemble CA, dépenses, bénéfices, impôts par entreprise
- Comptage d'employés en temps réel (staff/dot) ou depuis rapports (patron/employé)
- Métriques semaine ISO courante
- Auto-refresh périodique
- Diagnostic système intégré

### 2. Système de Dotations
**Fonctionnalités :**
- Tableau employés avec colonnes : Nom, RUN, Facture, Vente, CA Total, Salaire, Prime
- Calcul automatique CA Total = RUN + Facture + Vente
- Calcul salaire/prime basé sur paliers configurables selon rôle (employé/patron)
- Gestion solde actuel entreprise
- Historique des rapports avec archivage
- Import/Export Excel avec parsing presse-papier intelligent
- Export PDF avec template professionnel

**Logique de calcul :**
- Paliers d'imposition avec seuils min/max
- Différenciation employé/patron pour salaires et primes
- Sauvegarde incrémentale (create/update/delete lignes)

### 3. Système d'Impôts
- Calcul automatique basé sur CA et paliers
- Configuration paliers par entreprise
- Support paliers de richesse
- Génération fiches d'impôt PDF
- Archivage automatique

### 4. Système de Blanchiment
**Configuration globale (staff uniquement) :**
- Pourcentages entreprise/groupe par guilde
- Settings par entreprise (utilisation globale ou personnalisée)

**Fonctionnalités :**
- Tableau suivi : employé, donneur/receveur ID, somme, groupe, statut, durée, dates
- Calculs automatiques récupération argent sale
- Export rapports avec détails par employé
- Gestion états employé et répartition gains

### 5. Configuration Staff (staff uniquement)
- Gestion entreprises par guilde
- Configuration paliers d'imposition
- Configuration système de blanchiment global
- Configuration système de salaire par entreprise :
  - Pourcentage CA employé
  - Modes calcul (CA employé, heures service, addition)
  - Prime de base
  - Paliers de primes
  - Règles de grades avec rôles Discord
  - Paramètres de calcul (RUN, FACTURE, VENTE, CA_TOTAL, GRADE, HEURES_SERVICE)

### 6. Configuration Patron
- Configuration avancée entreprise (patron/co-patron)
- Gestion employés et grades
- Configuration paliers de primes
- Règles de calcul salariales

### 7. Upload Documents (DOT uniquement)
- Upload factures/diplômes
- Organisation par entreprise
- Stockage Supabase Storage

### 8. Archives
- Historique toutes opérations
- Filtres par type, entreprise, date
- Export historique

### 9. Espace Superadmin
- Vue globale toutes guildes
- Gestion configuration Discord
- Outils diagnostic avancés

## 🔄 Système de Stockage Unifié

**Architecture :**
- Cache mémoire avec TTL
- Scopes : global, guild, enterprise, user
- Synchronisation temps réel via événements
- Fallback Supabase direct (plus de localStorage)

## 📱 Interface Utilisateur

### Header
- Logo Flashback Fa
- Titre "Portail Entreprise Flashback Fa"
- Info utilisateur avec avatar Discord
- Badge rôle avec couleur hiérarchique
- Badge entreprise actuelle
- Menu dropdown admin (Superadmin, Config Staff, Config Patron)
- Bouton déconnexion

### Navigation par onglets
- Dashboard (tous)
- Dotations (staff, patron)
- Impôts (staff, patron, dot)
- Factures/Diplômes (dot uniquement)
- Blanchiment (staff, patron)
- Archives (tous)
- Config (staff uniquement, onglet dynamique)

### Composants réutilisables
- **RoleGate** : Contrôle d'accès conditionnel
- **GuildSwitcher** : Sélection guilde (si nécessaire)
- **SystemDiagnostic** : Tests santé système
- **SEOHead** : Métadonnées SEO dynamiques
- **LoadingStates** : États de chargement élégants

## 🎨 Animations & UX

- Transitions fluides entre onglets
- Loading states avec animations de points
- Toasts informatifs pour actions utilisateur
- États d'erreur explicites avec actions de récupération
- Auto-refresh avec indicateurs visuels
- Responsive design mobile-first

## 🔧 Hooks personnalisés

- **useAuth** : Gestion authentification Discord
- **useGuilds** : Gestion sélection guilde
- **useGuildRoles** : Résolution rôles utilisateur
- **useUnifiedStorage** : Stockage unifié avec cache
- **useConfigSync** : Synchronisation temps réel
- **useDebounce** : Anti-rebond pour inputs

## 📊 Système de Diagnostic

Tests automatiques :
- Connexion Supabase
- Authentification utilisateur
- Accès tables par rôle
- Cache mémoire vs base de données
- Edge functions Discord
- Synchronisation cross-session
- Performance requêtes

## 🚀 Performance & SEO

- Lazy loading composants
- Code splitting intelligent
- Meta tags dynamiques par page
- Sitemap et robots.txt
- Images optimisées avec alt descriptifs
- Lighthouse score 90+

## 📦 Configuration finale

**Secrets Supabase requis :**
- DISCORD_BOT_TOKEN
- DISCORD_CLIENT_SECRET

**Variables d'environnement :**
- URL et clé Supabase en dur (pas de VITE_*)
- Configuration build optimisée
- Support PWA optionnel

**Structure dossiers :**
```
src/
├── components/          # Composants réutilisables
│   ├── ui/             # Composants Shadcn
│   └── export/         # Templates d'export
├── pages/              # Pages principales
├── hooks/              # Hooks personnalisés
├── lib/                # Utilitaires et logique métier
├── integrations/       # Client Supabase
└── assets/            # Images et ressources

supabase/
├── functions/         # Edge functions
└── migrations/        # Migrations base de données
```

Ce projet doit reproduire exactement toutes les fonctionnalités, l'interface, les calculs, les rôles, et l'architecture du système existant. L'accent doit être mis sur la robustesse, la sécurité, et l'expérience utilisateur fluide.