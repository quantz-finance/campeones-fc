// Nativo: la entrada por correo la sirve la web (email-handoff-page.web.tsx). En la app esta ruta vuelve a /entrar.
import { Redirect } from 'expo-router';

export default function EmailHandoffPage() {
  return <Redirect href="/entrar" />;
}
