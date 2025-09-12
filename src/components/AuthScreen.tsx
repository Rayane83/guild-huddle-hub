import { AuthScreenTransition } from './AuthScreenTransition';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  return <AuthScreenTransition onAuthSuccess={onAuthSuccess} />;
}