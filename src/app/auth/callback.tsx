import { Redirect } from 'expo-router';
import { useApp } from '../../state/app-provider';
import { Loading } from '../../ui/controls';
import { Screen } from '../../ui/screen';

export default function Callback() {
  const { ready, userId } = useApp();
  if (ready && userId) return <Redirect href="/inicio" />;
  return (
    <Screen>
      <Loading label="Confirmando tu entrada…" />
    </Screen>
  );
}
