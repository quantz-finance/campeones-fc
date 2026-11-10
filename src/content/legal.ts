// Textos legales. BORRADOR: Harvey (legal) los revisa antes de publicarse.
// Al cambiarlos, sube TERMS_VERSION / PRIVACY_VERSION en src/domain/consent.ts para pedir de nuevo la aceptación.
// Los textos entre [CORCHETES] son datos que faltan: no se inventan.
export type LegalSection = { title: string; body: string[] };
export type LegalDoc = { title: string; updated: string; intro: string; sections: LegalSection[] };

export const RESPONSABLE = '[PENDIENTE: nombre legal y cédula jurídica del responsable]';
export const CONTACTO = '[PENDIENTE: correo de privacidad, lo define Rolando]';

export const DRAFT_NOTICE = {
  es: 'BORRADOR. Este texto todavía no fue revisado por legal y puede cambiar antes de publicarse.',
  en: 'DRAFT. This text has not been reviewed by legal yet and may change before it is published.',
};

const TERMS_ES: LegalDoc = {
  title: 'Términos de uso',
  updated: '9 de noviembre de 2026 (borrador)',
  intro:
    'Estos Términos explican cómo puedes usar Campeones FC, la app para llevar el marcador de tus partidos 1 contra 1 con tus amigos. Al crear tu cuenta confirmas que los leíste y los aceptas.',
  sections: [
    {
      title: '1. Qué es Campeones FC',
      body: [
        'Campeones FC es gratis. Sirve para registrar partidos de videojuegos entre amigos, confirmar el resultado entre los dos jugadores y ver grupos, torneos, ranking y trofeos.',
        'Hoy la app funciona en fase de prueba, en la red de prueba (testnet) de Stellar. No hay dinero real, apuestas, premios ni compras dentro de la app.',
        'Campeones FC no está afiliada a ningún videojuego, liga ni a sus empresas. No usamos sus logos ni su arte.',
      ],
    },
    {
      title: '2. Quién puede usarla',
      body: [
        'Necesitas tener al menos 13 años. Si al crear tu cuenta indicas que tienes menos de 13 años, borramos tu cuenta y sus datos de inmediato.',
        'Si tienes de 13 a 17 años, necesitas el permiso de tu madre, padre o tutor, y ellos deben leer estos Términos y el Aviso de privacidad contigo.',
        'Entras con Cavos (Google, Apple o un código a tu correo). Eres responsable de lo que pase con tu cuenta y tu dispositivo.',
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
      title: '5. Verificación en Stellar',
      body: [
        'Cuando un resultado queda confirmado, guardamos una huella digital (hash) del resultado en la red de prueba de Stellar, que es pública. La huella no lleva tu nombre ni tu correo, pero una vez escrita no se puede borrar de esa red.',
      ],
    },
    {
      title: '6. Cambios, fallas y cierre',
      body: [
        'La app se ofrece tal como está y está en fase de prueba. Puede tener fallas, perder datos de prueba o dejar de estar disponible por un tiempo.',
        'Podemos cambiar estos Términos. Si el cambio es importante, te lo avisaremos y te pediremos aceptarlo de nuevo.',
        'Puedes dejar de usar la app cuando quieras y pedir que borremos tu cuenta. Podemos suspender cuentas que incumplan estos Términos.',
      ],
    },
    {
      title: '7. Ley aplicable y contacto',
      body: ['Estos Términos se rigen por las leyes de la República de Costa Rica.', `Contacto: ${CONTACTO}.`],
    },
  ],
};

const PRIVACY_ES: LegalDoc = {
  title: 'Aviso de privacidad',
  updated: '9 de noviembre de 2026 (borrador)',
  intro:
    'Este Aviso explica qué datos personales trata Campeones FC, para qué y qué derechos tienes, conforme a la Ley N.° 8968 de Protección de la Persona frente al Tratamiento de sus Datos Personales de Costa Rica y su Reglamento.',
  sections: [
    {
      title: '1. Responsable',
      body: [`${RESPONSABLE}.`, `Para cualquier consulta, o para pedir una copia de tus datos o que los borremos, escribe a ${CONTACTO}.`],
    },
    {
      title: '2. Qué datos tratamos',
      body: [
        'De tu entrada con Cavos: tu correo (si lo verificaste), un identificador de tu cuenta de Cavos y, si lo comparte Google o Apple, tu nombre. No recibimos tu contraseña.',
        'De tu billetera: la dirección pública de la billetera de Stellar que Cavos crea para ti. Las llaves quedan en tu dispositivo y en Cavos; nosotros no las tenemos.',
        'De tu perfil: nombre de jugador, usuario, avatar y, si la subes, una foto.',
        'De tu uso: partidos, resultados, confirmaciones, firmas de resultados, amistades, grupos, torneos, rating Elo, trofeos y avisos.',
        'De tu consentimiento: la versión de estos textos que aceptaste y cuándo, tu año de nacimiento (no la fecha completa), tu rango de edad y, si tienes de 13 a 17 años, cuándo confirmaste el permiso de tu madre, padre o tutor.',
        'Analítica: eventos de uso (por ejemplo, entrar, crear una invitación, registrar un resultado) y errores técnicos de la app. No grabamos tu sesión ni tu pantalla.',
      ],
    },
    {
      title: '3. Para qué los usamos',
      body: [
        'Para crear tu cuenta, mostrar tu perfil a tus amigos y a los miembros de tus grupos, registrar y confirmar partidos, calcular el ranking y mostrar trofeos.',
        'Para verificar resultados en la red de prueba de Stellar (solo una huella digital, sin nombres ni correos).',
        'Para comprobar que cumples la edad mínima y guardar prueba de tu consentimiento.',
        'Para encontrar y arreglar fallas y entender qué partes de la app se usan. No vendemos tus datos ni mostramos publicidad.',
      ],
    },
    {
      title: '4. Tu consentimiento',
      body: [
        'Tratamos tus datos con tu consentimiento libre, expreso e informado, que das al marcar las casillas al crear tu cuenta (artículo 5 de la Ley 8968).',
        'Puedes retirarlo en cualquier momento pidiendo que borremos tu cuenta. Sin consentimiento no puedes usar la app.',
      ],
    },
    {
      title: '5. Personas menores de edad',
      body: [
        'Campeones FC no es para menores de 13 años. Si indicas una fecha que da menos de 13 años, borramos tu cuenta y sus datos de inmediato y no guardamos esa fecha.',
        'De 13 a 17 años necesitas el permiso de tu madre, padre o tutor. Ellos pueden pedir en cualquier momento ver, corregir o borrar tus datos.',
      ],
    },
    {
      title: '6. Quién más los ve y dónde se guardan',
      body: [
        'Tus amigos y los miembros de tus grupos ven tu nombre de jugador, avatar o foto, tus partidos con ellos y tu posición en el ranking.',
        'La página pública de verificación de un partido muestra el resultado, identificadores internos y las direcciones públicas de las billeteras, sin nombres ni correos.',
        'Usamos proveedores para alojar la app y la base de datos (Vercel y Supabase), para la entrada y las billeteras (Cavos), para la analítica y los errores (PostHog) y la red de prueba de Stellar. Sus servidores pueden estar fuera de Costa Rica; solo tratan los datos para darnos ese servicio.',
      ],
    },
    {
      title: '7. Cuánto tiempo',
      body: [
        'Guardamos tus datos mientras tengas tu cuenta. Si la borras, los eliminamos de nuestra base de datos, salvo lo que la ley nos obligue a conservar.',
        'Las huellas digitales ya escritas en la red de Stellar no se pueden borrar, pero sin nuestra base de datos no permiten saber quién jugó.',
      ],
    },
    {
      title: '8. Tus derechos',
      body: [
        'Tienes derecho de acceso, rectificación, supresión (cancelación) y oposición sobre tus datos (artículos 7 y siguientes de la Ley 8968). También puedes pedir una copia de tus datos.',
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

const TERMS_EN: LegalDoc = {
  title: 'Terms of use',
  updated: 'November 9, 2026 (draft)',
  intro:
    'These Terms explain how you can use Campeones FC, the app to keep score of your 1v1 matches with your friends. By creating your account you confirm you read and accept them.',
  sections: [
    { title: '1. What Campeones FC is', body: [
      'Campeones FC is free. It lets you log video game matches between friends, confirm the result between both players and see groups, tournaments, rankings and trophies.',
      'The app is currently in a test phase, on the Stellar test network (testnet). There is no real money, betting, prizes or in-app purchases.',
      'Campeones FC is not affiliated with any video game, league or their companies. We do not use their logos or art.',
    ] },
    { title: '2. Who can use it', body: [
      'You must be at least 13. If you tell us you are under 13 when you create your account, we delete your account and its data right away.',
      'If you are 13 to 17, you need permission from your mother, father or guardian, and they should read these Terms and the Privacy notice with you.',
      'You sign in with Cavos (Google, Apple or a code sent to your email). You are responsible for what happens with your account and device.',
    ] },
    { title: '3. How you behave', body: [
      'Log real results. A result only counts when both players confirm it.',
      'Do not use offensive names, photos or messages, impersonate someone or use content you have no right to use.',
      'Do not try to access other accounts, tamper with the ranking or disrupt the app.',
    ] },
    { title: '4. Your content', body: [
      'What you upload (player name, photo, group and tournament names) stays yours. You let us show it in the app to the people who can see it.',
      'We may remove content that breaks these Terms.',
    ] },
    { title: '5. Verification on Stellar', body: [
      'When a result is confirmed, we store a digital fingerprint (hash) of it on the Stellar test network, which is public. The fingerprint has no name or email, but once written it cannot be erased from that network.',
    ] },
    { title: '6. Changes, failures and closing', body: [
      'The app is provided as is and is in a test phase. It may fail, lose test data or be unavailable for a while.',
      'We may change these Terms. If the change is important, we will tell you and ask you to accept it again.',
      'You can stop using the app whenever you want and ask us to delete your account. We may suspend accounts that break these Terms.',
    ] },
    { title: '7. Governing law and contact', body: ['These Terms are governed by the laws of the Republic of Costa Rica.', `Contact: ${CONTACTO}.`] },
  ],
};

const PRIVACY_EN: LegalDoc = {
  title: 'Privacy notice',
  updated: 'November 9, 2026 (draft)',
  intro:
    'This notice explains what personal data Campeones FC processes, why, and what rights you have, under Costa Rica Law No. 8968 on the Protection of Individuals regarding the Processing of their Personal Data and its Regulations.',
  sections: [
    { title: '1. Controller', body: [`${RESPONSABLE}.`, `For any question, or to ask for a copy of your data or for us to delete it, write to ${CONTACTO}.`] },
    { title: '2. What data we process', body: [
      'From your Cavos sign-in: your email (if verified), an identifier of your Cavos account and, if Google or Apple share it, your name. We never receive your password.',
      'From your wallet: the public address of the Stellar wallet Cavos creates for you. The keys stay on your device and with Cavos; we do not have them.',
      'From your profile: player name, username, avatar and, if you upload one, a photo.',
      'From your use: matches, results, confirmations, result signatures, friendships, groups, tournaments, Elo rating, trophies and notices.',
      'From your consent: the version of these texts you accepted and when, your birth year (not the full date), your age range and, if you are 13 to 17, when you confirmed your parent or guardian’s permission.',
      'Analytics: usage events (for example signing in, creating an invite, logging a result) and technical errors. We do not record your session or screen.',
    ] },
    { title: '3. What we use it for', body: [
      'To create your account, show your profile to your friends and group members, log and confirm matches, compute the ranking and show trophies.',
      'To verify results on the Stellar test network (only a digital fingerprint, no names or emails).',
      'To check you meet the minimum age and keep proof of your consent.',
      'To find and fix failures and understand which parts of the app are used. We do not sell your data or show ads.',
    ] },
    { title: '4. Your consent', body: [
      'We process your data with your free, express and informed consent, which you give by ticking the boxes when you create your account (article 5 of Law 8968).',
      'You can withdraw it at any time by asking us to delete your account. Without consent you cannot use the app.',
    ] },
    { title: '5. Minors', body: [
      'Campeones FC is not for children under 13. If you enter a date that makes you under 13, we delete your account and its data right away and do not keep that date.',
      'From 13 to 17 you need your parent or guardian’s permission. They can ask at any time to see, correct or delete your data.',
    ] },
    { title: '6. Who else sees it and where it is stored', body: [
      'Your friends and group members see your player name, avatar or photo, your matches with them and your ranking position.',
      'A match’s public verification page shows the result, internal identifiers and public wallet addresses, with no names or emails.',
      'We use providers to host the app and database (Vercel and Supabase), for sign-in and wallets (Cavos), for analytics and errors (PostHog) and the Stellar test network. Their servers may be outside Costa Rica; they only process data to provide that service.',
    ] },
    { title: '7. How long', body: [
      'We keep your data while you have your account. If you delete it, we remove it from our database, except what the law requires us to keep.',
      'Fingerprints already written on the Stellar network cannot be erased, but without our database they do not reveal who played.',
    ] },
    { title: '8. Your rights', body: [
      'You have the right to access, rectify, delete (cancel) and object to the processing of your data (articles 7 and following of Law 8968). You can also ask for a copy of your data.',
      `Write to ${CONTACTO}. We will answer within the legal deadline.`,
      'If you are not satisfied, you can contact the Agency for the Protection of Personal Data (PRODHAB).',
    ] },
    { title: '9. Security', body: [
      'We use encrypted connections and database access rules so each person only sees what they should. No system is perfect; if an incident affects you, we will tell you.',
    ] },
  ],
};

export const TERMS = { es: TERMS_ES, en: TERMS_EN };
export const PRIVACY = { es: PRIVACY_ES, en: PRIVACY_EN };
