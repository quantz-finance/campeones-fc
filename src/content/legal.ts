// Textos legales. BORRADOR: los tiene que revisar un abogado antes de publicarse.
// Al cambiarlos, sube TERMS_VERSION / PRIVACY_VERSION en src/domain/consent.ts para pedir de nuevo la aceptación.
export type LegalSection = { title: string; body: string[] };
export type LegalDoc = { title: string; updated: string; intro: string; sections: LegalSection[] };

export const DRAFT_NOTICE =
  'BORRADOR. Este texto todavía no fue revisado por un abogado y puede cambiar antes de publicarse.';

const RESPONSABLE = '[Responsable del tratamiento: nombre legal y cédula jurídica, a completar por legal]';
const CONTACTO = '[correo de contacto de privacidad, a completar por legal]';

export const TERMS: LegalDoc = {
  title: 'Términos de uso',
  updated: '31 de octubre de 2026 (borrador)',
  intro:
    'Estos Términos explican cómo puedes usar Campeones FC, la app para llevar el marcador de tus partidos 1 contra 1 con tus amigos. Al crear tu cuenta confirmas que los leíste y los aceptas.',
  sections: [
    {
      title: '1. Qué es Campeones FC',
      body: [
        'Campeones FC es gratis. Sirve para registrar partidos de videojuegos entre amigos, confirmar el resultado entre los dos jugadores y ver grupos, torneos, ranking y trofeos.',
        'No hay dinero, apuestas, premios ni compras dentro de la app.',
        'Campeones FC no está afiliada a ningún videojuego ni a sus empresas. Solo mencionamos el nombre del juego como texto; no usamos sus logos ni su arte.',
      ],
    },
    {
      title: '2. Quién puede usarla',
      body: [
        'Necesitas tener al menos 13 años.',
        'Si tienes de 13 a 17 años, necesitas el permiso de tu madre, padre o tutor, y ellos deben leer estos Términos y el Aviso de privacidad contigo.',
        'Entras con tu cuenta de Google. Eres responsable de lo que pase con tu cuenta.',
      ],
    },
    {
      title: '3. Cómo te comportas',
      body: [
        'Registra resultados reales. Un resultado cuenta solo cuando los dos jugadores lo confirman.',
        'No uses nombres, fotos o mensajes ofensivos, que suplanten a otra persona o que no tengas derecho a usar.',
        'No intentes entrar a cuentas ajenas, alterar el ranking ni afectar el funcionamiento de la app.',
      ],
    },
    {
      title: '4. Tu contenido',
      body: [
        'Lo que subes (nombre de jugador, foto, nombres de grupos y torneos) sigue siendo tuyo. Nos das permiso para mostrarlo dentro de la app a las personas que pueden verlo.',
        'Podemos quitar contenido que incumpla estos Términos.',
      ],
    },
    {
      title: '5. Cambios, fallas y cierre',
      body: [
        'La app se ofrece tal como está. Puede tener fallas o dejar de estar disponible por un tiempo.',
        'Podemos cambiar estos Términos. Si el cambio es importante, te lo avisaremos y te pediremos aceptarlo de nuevo.',
        'Puedes dejar de usar la app cuando quieras. Podemos suspender cuentas que incumplan estos Términos.',
      ],
    },
    {
      title: '6. Ley aplicable',
      body: ['Estos Términos se rigen por las leyes de la República de Costa Rica.', `Contacto: ${CONTACTO}.`],
    },
  ],
};

export const PRIVACY: LegalDoc = {
  title: 'Aviso de privacidad',
  updated: '31 de octubre de 2026 (borrador)',
  intro:
    'Este Aviso explica qué datos personales trata Campeones FC, para qué y qué derechos tienes, conforme a la Ley N.° 8968 de Protección de la Persona frente al Tratamiento de sus Datos Personales de Costa Rica y su Reglamento.',
  sections: [
    {
      title: '1. Responsable',
      body: [`${RESPONSABLE}.`, `Para cualquier consulta o para ejercer tus derechos escribe a ${CONTACTO}.`],
    },
    {
      title: '2. Qué datos tratamos',
      body: [
        'De tu cuenta de Google: tu correo, un identificador de Google y, si Google lo comparte, tu nombre. No recibimos tu contraseña.',
        'De tu perfil: nombre de jugador, usuario, avatar y, si la subes, una foto.',
        'De tu uso: partidos, resultados, confirmaciones, amistades, grupos, torneos, rating Elo, trofeos y avisos.',
        'De tu consentimiento: la versión de estos textos que aceptaste y cuándo, tu año de nacimiento (no la fecha completa), tu rango de edad y, si tienes de 13 a 17 años, cuándo confirmaste el permiso de tu madre, padre o tutor.',
      ],
    },
    {
      title: '3. Para qué los usamos',
      body: [
        'Para crear tu cuenta, mostrar tu perfil a tus amigos y a los miembros de tus grupos, registrar y confirmar partidos, calcular el ranking y mostrar trofeos.',
        'Para comprobar que cumples la edad mínima y guardar prueba de tu consentimiento.',
        'No vendemos tus datos, no mostramos publicidad y hoy no usamos herramientas de analítica. Si algún día las usamos, te lo avisaremos en la app, no grabaremos tu sesión y podrás excluirte.',
      ],
    },
    {
      title: '4. Tu consentimiento',
      body: [
        'Tratamos tus datos con tu consentimiento libre, expreso e informado, que das al marcar las casillas antes de crear tu cuenta (artículo 5 de la Ley 8968).',
        'Puedes retirarlo en cualquier momento pidiendo que borremos tu cuenta. Sin consentimiento no puedes usar la app.',
      ],
    },
    {
      title: '5. Personas menores de edad',
      body: [
        'Campeones FC no es para menores de 13 años: si escribes una fecha que da menos de 13 años, no te dejamos seguir y no guardamos esa fecha.',
        'De 13 a 17 años necesitas el permiso de tu madre, padre o tutor. Ellos pueden pedir en cualquier momento ver, corregir o borrar tus datos.',
      ],
    },
    {
      title: '6. Quién más los ve y dónde se guardan',
      body: [
        'Tus amigos y los miembros de tus grupos ven tu nombre de jugador, avatar o foto, tus partidos con ellos y tu posición en el ranking.',
        'Usamos proveedores para alojar la app y la base de datos (Vercel y Supabase) y Google para la entrada. Sus servidores pueden estar fuera de Costa Rica; solo tratan los datos para darnos ese servicio.',
      ],
    },
    {
      title: '7. Cuánto tiempo',
      body: ['Guardamos tus datos mientras tengas tu cuenta. Si la borras, los eliminamos, salvo lo que la ley nos obligue a conservar.'],
    },
    {
      title: '8. Tus derechos',
      body: [
        'Tienes derecho de acceso, rectificación, supresión (cancelación) y oposición sobre tus datos (artículos 7 y siguientes de la Ley 8968).',
        `Escríbenos a ${CONTACTO}. Te responderemos en el plazo que fija la ley.`,
        'Si no quedas conforme, puedes acudir a la Agencia de Protección de Datos de los Habitantes (PRODHAB).',
      ],
    },
    {
      title: '9. Seguridad',
      body: [
        'Usamos conexiones cifradas y reglas de acceso en la base de datos para que cada persona vea solo lo que le corresponde. Ningún sistema es infalible; si hubiera un incidente que te afecte, te lo avisaremos.',
      ],
    },
  ],
};
