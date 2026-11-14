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
};

export const trophyCatalog: TrophyDef[] = [
  {
    code: 'primer-partido',
    title: 'Primer partido',
    description: 'Jugar y confirmar (los dos jugadores) tu primer partido.',
    section: 'debut',
    rarity: 'comun',
  },
  {
    code: 'primera-victoria',
    title: 'Primera victoria',
    description: 'Ganar tu primer partido confirmado.',
    section: 'debut',
    rarity: 'comun',
  },
  {
    code: 'debut-grupo',
    title: 'Nuevo en el grupo',
    description: 'Unirte a tu primer grupo (por invitación o creándolo).',
    section: 'debut',
    rarity: 'comun',
  },
  {
    code: 'en-el-ranking',
    title: 'En la tabla',
    description: 'Aparecer en el ranking de un grupo (mínimo 3 partidos confirmados).',
    section: 'debut',
    rarity: 'comun',
  },
  {
    code: 'racha-3',
    title: 'Racha de 3',
    description: 'Ganar 3 partidos confirmados seguidos.',
    section: 'rachas',
    rarity: 'comun',
  },
  {
    code: 'racha-5',
    title: 'Racha de 5',
    description: 'Ganar 5 partidos confirmados seguidos.',
    section: 'rachas',
    rarity: 'rara',
  },
  {
    code: 'racha-10',
    title: 'Racha de 10',
    description: 'Ganar 10 partidos confirmados seguidos.',
    section: 'rachas',
    rarity: 'epica',
  },
  {
    code: 'invicto',
    title: 'Invicto',
    description: 'Jugar 10 partidos confirmados seguidos sin perder (los empates cuentan).',
    section: 'rachas',
    rarity: 'rara',
  },
  {
    code: 'remontada',
    title: 'Remontada',
    description: 'Ganar un partido justo después de perder 3 seguidos.',
    section: 'rachas',
    rarity: 'rara',
  },
  {
    code: 'partidos-10',
    title: '10 partidos',
    description: 'Jugar 10 partidos confirmados.',
    section: 'constancia',
    rarity: 'comun',
  },
  {
    code: 'partidos-50',
    title: '50 partidos',
    description: 'Jugar 50 partidos confirmados.',
    section: 'constancia',
    rarity: 'rara',
  },
  {
    code: 'partidos-100',
    title: '100 partidos',
    description: 'Jugar 100 partidos confirmados.',
    section: 'constancia',
    rarity: 'epica',
  },
  {
    code: 'partidos-250',
    title: '250 partidos',
    description: 'Jugar 250 partidos confirmados.',
    section: 'constancia',
    rarity: 'legendaria',
  },
  {
    code: 'arco-en-cero',
    title: 'Arco en cero',
    description: 'Ganar un partido sin recibir goles (rival en 0).',
    section: 'goles',
    rarity: 'comun',
  },
  {
    code: 'goleada',
    title: 'Goleada',
    description: 'Ganar por 4 goles o más de diferencia.',
    section: 'goles',
    rarity: 'rara',
  },
  {
    code: 'manita',
    title: 'Manita',
    description: 'Ganar exactamente 5-0.',
    section: 'goles',
    rarity: 'epica',
  },
  {
    code: 'finalista',
    title: 'Finalista',
    description: 'Llegar a la final de un torneo de llaves (4, 8 o 16).',
    section: 'torneos',
    rarity: 'rara',
  },
  {
    code: 'campeon-torneo',
    title: 'Campeón',
    description: 'Ganar un torneo (llaves o liga).',
    section: 'torneos',
    rarity: 'legendaria',
  },
  {
    code: 'lider-grupo',
    title: 'Líder del grupo',
    description: 'Quedar #1 en el ranking de un grupo (con al menos 3 partidos).',
    section: 'torneos',
    rarity: 'epica',
  },
  {
    code: 'elo-100',
    title: '+100 de Elo',
    description: 'Subir 100 puntos de Elo sobre el inicial (llegar a 1300).',
    section: 'torneos',
    rarity: 'rara',
  },
  {
    code: 'anfitrion',
    title: 'Anfitrión',
    description: 'Un amigo se une a la app con tu enlace de invitación.',
    section: 'social',
    rarity: 'comun',
  },
  {
    code: 'capitan',
    title: 'Capitán',
    description: '5 amigos se unen con tus invitaciones.',
    section: 'social',
    rarity: 'rara',
  },
  {
    code: 'fundador',
    title: 'Fundador',
    description: 'Crear un grupo que llegue a 6 miembros.',
    section: 'social',
    rarity: 'rara',
  },
  {
    code: 'clasico',
    title: 'El clásico',
    description: 'Jugar 10 partidos confirmados contra el mismo rival.',
    section: 'social',
    rarity: 'rara',
  },
];

export const trophyByCode = Object.fromEntries(trophyCatalog.map((item) => [item.code, item])) as Record<
  AchievementCode,
  TrophyDef
>;
