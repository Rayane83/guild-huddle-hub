import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Settings, Save, RefreshCw } from 'lucide-react';
import { configRepo } from '@/lib/configRepo';

export function SuperadminDiscordConfig() {
  const [config, setConfig] = useState({
    clientId: '',
    principalGuildId: '1404608015230832742',
    botToken: '',
    enterprises: {} as Record<string, any>
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const data = await configRepo.get();
      setConfig({
        clientId: data.clientId || '',
        principalGuildId: data.principalGuildId || '1404608015230832742',
        botToken: '',
        enterprises: data.enterprises || {}
      });
    } catch (error) {
      console.error('Error loading config:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger la configuration',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const { botToken, ...configToSave } = config;
      await configRepo.save(configToSave);
      
      toast({
        title: 'Succès',
        description: 'Configuration sauvegardée avec succès',
      });
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la sauvegarde',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Configuration Discord</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="ml-2">Chargement...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="w-5 h-5" />
          <span>Configuration Discord</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="clientId">Client ID Discord</Label>
            <Input
              id="clientId"
              value={config.clientId}
              onChange={(e) => setConfig(prev => ({ ...prev, clientId: e.target.value }))}
              placeholder="ID du client Discord"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="principalGuildId">ID Serveur Principal</Label>
            <Input
              id="principalGuildId"
              value={config.principalGuildId}
              onChange={(e) => setConfig(prev => ({ ...prev, principalGuildId: e.target.value }))}
              placeholder="ID du serveur Discord principal"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="botToken">Token Bot (optionnel - géré via secrets)</Label>
          <Input
            id="botToken"
            type="password"
            value={config.botToken}
            onChange={(e) => setConfig(prev => ({ ...prev, botToken: e.target.value }))}
            placeholder="Token du bot Discord (géré de manière sécurisée)"
            disabled
          />
          <p className="text-sm text-muted-foreground">
            Le token du bot est géré de manière sécurisée via les secrets Supabase
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="enterprises">Configuration des Entreprises (JSON)</Label>
          <Textarea
            id="enterprises"
            value={JSON.stringify(config.enterprises, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setConfig(prev => ({ ...prev, enterprises: parsed }));
              } catch (error) {
                // Ignore JSON parsing errors while typing
              }
            }}
            rows={8}
            placeholder='{"entreprise1": {"roleId": "123", "guildId": "456"}}'
            className="font-mono text-sm"
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={loadConfig} disabled={isLoading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Recharger
          </Button>
          <Button onClick={saveConfig} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}