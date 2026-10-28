import { Button } from '../ui/controls';
import { Screen, Top } from '../ui/screen';
import { T } from '../ui/text';
import { colors } from '../ui/theme';
import { replace } from '../ui/nav';

export default function NotFound() {
  return (
    <Screen>
      <Top title="Esa pantalla no existe" />
      <T color={colors.muted}>El marcador sigue en inicio.</T>
      <Button label="Volver al inicio" onPress={() => replace('/')} />
    </Screen>
  );
}
