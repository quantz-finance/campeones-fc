import { Redirect } from 'expo-router';
import { useApp } from '../state/app-provider';
import { Landing } from '../ui/landing';

export default function Index() {
  const { ready, userId } = useApp();
  if (!ready) return null;
  if (userId) return <Redirect href="/inicio" />;
  return <Landing />;
}
