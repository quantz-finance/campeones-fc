import type { AchievementCode } from '../domain/types';

export type TrophySectionId = 'debut' | 'rachas' | 'constancia' | 'goles' | 'torneos' | 'social';
export type TrophyRarity = 'comun' | 'rara' | 'epica' | 'legendaria';

export const trophySections: { id: TrophySectionId; title: string }[] = [
  { id: 'debut', title: 'Debut' },
  { id: 'rachas', title: 'Rachas' },
  { id: 'constancia', title: 'Constancia' },
  { id: 'goles', title: 'Goles y marcadores' },
  { id: 'torneos', title: 'Torneos y ranking' },
  { id: 'social', title: 'Social' },
];

export const RARITY_RANK: Record<TrophyRarity, number> = {
  legendaria: 4,
  epica: 3,
  rara: 2,
  comun: 1,
};

export const RARITY_LABEL: Record<TrophyRarity, string> = {
  comun: 'común',
  rara: 'rara',
  epica: 'épica',
  legendaria: 'legendaria',
};

export const RARITY_TONE: Record<TrophyRarity, { text: string; chip: string }> = {
  comun: { text: '#D8CCE6', chip: 'rgba(216,204,230,0.12)' },
  rara: { text: '#00FF87', chip: 'rgba(0,255,135,0.12)' },
  epica: { text: '#C58BFF', chip: 'rgba(197,139,255,0.12)' },
  legendaria: { text: '#F1D27A', chip: 'rgba(241,210,122,0.12)' },
};

export type TrophyDef = {
  code: AchievementCode;
  title: string;
  description: string;
  section: TrophySectionId;
  rarity: TrophyRarity;
  animal: string;
  why: string;
};

export const trophyCatalog: TrophyDef[] = [
  {
    code: 'primer-partido',
    title: 'Primer partido',
    description: 'Jugar y confirmar (los dos jugadores) tu primer partido.',
    section: 'debut',
    rarity: 'comun',
    animal: "potrillo",
    why: "El primer paso: el potro recién parado que ya quiere correr.",
  },
  {
    code: 'primera-victoria',
    title: 'Primera victoria',
    description: 'Ganar tu primer partido confirmado.',
    section: 'debut',
    rarity: 'comun',
    animal: "gallo",
    why: "Canta al amanecer: anuncia tu primer triunfo.",
  },
  {
    code: 'debut-grupo',
    title: 'Nuevo en el grupo',
    description: 'Unirte a tu primer grupo (por invitación o creándolo).',
    section: 'debut',
    rarity: 'comun',
    animal: "abeja",
    why: "Nadie es colmena solo: unirte a un grupo es entrar a la colmena.",
  },
  {
    code: 'en-el-ranking',
    title: 'En la tabla',
    description: 'Aparecer en el ranking de un grupo (mínimo 3 partidos confirmados).',
    section: 'debut',
    rarity: 'comun',
    animal: "íbice",
    why: "Trepa riscos: empezás a subir la tabla.",
  },
  {
    code: 'racha-3',
    title: 'Racha de 3',
    description: 'Ganar 3 partidos confirmados seguidos.',
    section: 'rachas',
    rarity: 'comun',
    animal: "liebre",
    why: "Arranque veloz: la primera racha.",
  },
  {
    code: 'racha-5',
    title: 'Racha de 5',
    description: 'Ganar 5 partidos confirmados seguidos.',
    section: 'rachas',
    rarity: 'rara',
    animal: "galgo",
    why: "Velocidad sostenida, más que la liebre.",
  },
  {
    code: 'racha-10',
    title: 'Racha de 10',
    description: 'Ganar 10 partidos confirmados seguidos.',
    section: 'rachas',
    rarity: 'epica',
    animal: "guepardo",
    why: "El animal más rápido: la racha máxima.",
  },
  {
    code: 'invicto',
    title: 'Invicto',
    description: 'Jugar 10 partidos confirmados seguidos sin perder (los empates cuentan).',
    section: 'rachas',
    rarity: 'rara',
    animal: "rinoceronte",
    why: "Coraza impenetrable: nadie te tumba.",
  },
  {
    code: 'remontada',
    title: 'Remontada',
    description: 'Ganar un partido justo después de perder 3 seguidos.',
    section: 'rachas',
    rarity: 'rara',
    animal: "fénix",
    why: "Renace de sus cenizas después de caer tres veces.",
  },
  {
    code: 'partidos-10',
    title: '10 partidos',
    description: 'Jugar 10 partidos confirmados.',
    section: 'constancia',
    rarity: 'comun',
    animal: "hormiga",
    why: "Trabajo diario, partido a partido.",
  },
  {
    code: 'partidos-50',
    title: '50 partidos',
    description: 'Jugar 50 partidos confirmados.',
    section: 'constancia',
    rarity: 'rara',
    animal: "tortuga",
    why: "Constancia y largo aliento.",
  },
  {
    code: 'partidos-100',
    title: '100 partidos',
    description: 'Jugar 100 partidos confirmados.',
    section: 'constancia',
    rarity: 'epica',
    animal: "elefante",
    why: "Memoria y peso: cien partidos se notan.",
  },
  {
    code: 'partidos-250',
    title: '250 partidos',
    description: 'Jugar 250 partidos confirmados.',
    section: 'constancia',
    rarity: 'legendaria',
    animal: "mamut",
    why: "Leyenda ancestral: muy pocos llegan a 250.",
  },
  {
    code: 'arco-en-cero',
    title: 'Arco en cero',
    description: 'Ganar un partido sin recibir goles (rival en 0).',
    section: 'goles',
    rarity: 'comun',
    animal: "búho",
    why: "El guardián que todo lo ve: no se le escapa nada.",
  },
  {
    code: 'goleada',
    title: 'Goleada',
    description: 'Ganar por 4 goles o más de diferencia.',
    section: 'goles',
    rarity: 'rara',
    animal: "orca",
    why: "Depredador del océano que caza sin piedad: ganar por 4 o más.",
  },
  {
    code: 'manita',
    title: 'Manita',
    description: 'Ganar exactamente 5-0.',
    section: 'goles',
    rarity: 'epica',
    animal: "gorila",
    why: "La mano abierta de cinco dedos del espalda plateada: dominio total, 5-0.",
  },
  {
    code: 'finalista',
    title: 'Finalista',
    description: 'Llegar a la final de un torneo de llaves (4, 8 o 16).',
    section: 'torneos',
    rarity: 'rara',
    animal: "puma",
    why: "Llega a la cima de la montaña: la final.",
  },
  {
    code: 'campeon-torneo',
    title: 'Campeón',
    description: 'Ganar un torneo (llaves o liga).',
    section: 'torneos',
    rarity: 'legendaria',
    animal: "toro",
    why: "La marca de la casa para el logro más alto: campeón de un torneo.",
  },
  {
    code: 'lider-grupo',
    title: 'Líder del grupo',
    description: 'Quedar #1 en el ranking de un grupo (con al menos 3 partidos).',
    section: 'torneos',
    rarity: 'epica',
    animal: "león",
    why: "El rey de la manada: #1 del ranking de tu grupo. Va sin corona y de busto 3/4, distinto del león rampante de los escudos.",
  },
  {
    code: 'elo-100',
    title: '+100 de Elo',
    description: 'Subir 100 puntos de Elo sobre el inicial (llegar a 1300).',
    section: 'torneos',
    rarity: 'rara',
    animal: "cóndor",
    why: "Vuela más alto que nadie: tu Elo sube 100.",
  },
  {
    code: 'anfitrion',
    title: 'Anfitrión',
    description: 'Un amigo se une a la app con tu enlace de invitación.',
    section: 'social',
    rarity: 'comun',
    animal: "perro",
    why: "El que recibe a todos en la puerta: un amigo entra con tu invitación.",
  },
  {
    code: 'capitan',
    title: 'Capitán',
    description: '5 amigos se unen con tus invitaciones.',
    section: 'social',
    rarity: 'rara',
    animal: "lobo",
    why: "El lobo que aúlla y la manada responde: cinco amigos te siguen.",
  },
  {
    code: 'fundador',
    title: 'Fundador',
    description: 'Crear un grupo que llegue a 6 miembros.',
    section: 'social',
    rarity: 'rara',
    animal: "castor",
    why: "Constructor: levanta la represa donde vive toda la colonia.",
  },
  {
    code: 'clasico',
    title: 'El clásico',
    description: 'Jugar 10 partidos confirmados contra el mismo rival.',
    section: 'social',
    rarity: 'rara',
    animal: "ciervo",
    why: "El ciervo que choca astas temporada tras temporada con el mismo rival.",
  },
];

export const trophyByCode = Object.fromEntries(trophyCatalog.map((item) => [item.code, item])) as Record<
  AchievementCode,
  TrophyDef
>;

export const trophySeries: AchievementCode[][] = [
  ['racha-3', 'racha-5', 'racha-10'],
  ['arco-en-cero', 'goleada', 'manita'],
  ['partidos-10', 'partidos-50', 'partidos-100', 'partidos-250'],
];

export function siblingsOf(code: AchievementCode): TrophyDef[] {
  const series = trophySeries.find((row) => row.includes(code));
  return series ? series.map((item) => trophyByCode[item]) : [];
}

const FEMININE_ANIMALS = new Set(['abeja', 'liebre', 'hormiga', 'tortuga', 'orca']);

export function whyTitle(animal: string): string {
  return FEMININE_ANIMALS.has(animal) ? `Por qué la ${animal}` : `Por qué el ${animal}`;
}
