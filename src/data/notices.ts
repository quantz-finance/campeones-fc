// Avisos en la app (tabla notifications, escrita por triggers). Textos y destino de cada aviso.
export type NoticeKind =
  | 'friend_joined'
  | 'friend_request'
  | 'friend_accepted'
  | 'match_challenge'
  | 'match_accepted'
  | 'match_declined'
  | 'match_report'
  | 'match_disputed'
  | 'match_confirmed'
  | 'match_expired';

export type Notice = {
  id: string;
  kind: NoticeKind;
  actorId: string | null;
  actorName: string;
  matchId: string | null;
  createdAt: string;
  readAt: string | null;
};

const first = (name: string) => name.trim().split(/\s+/)[0] || 'Tu rival';

export function noticeCopy(notice: Pick<Notice, 'kind' | 'actorName' | 'matchId'>): { title: string; body: string; href: string } {
  const who = first(notice.actorName);
  const match = notice.matchId ? `/partido/${notice.matchId}` : '/amigos';
  switch (notice.kind) {
    case 'friend_joined':
      return { title: `${who} aceptó tu invitación`, body: 'Ya son amigos. Rétalo cuando quieras.', href: '/amigos' };
    case 'friend_request':
      return { title: `${who} quiere ser tu amigo`, body: 'Acepta o rechaza en Amigos.', href: '/amigos' };
    case 'friend_accepted':
      return { title: `${who} aceptó tu solicitud`, body: 'Ya son amigos. Rétalo cuando quieras.', href: '/amigos' };
    case 'match_challenge':
      return { title: `${who} te retó`, body: 'Te toca aceptar el partido.', href: match };
    case 'match_accepted':
      return { title: `${who} aceptó el partido`, body: 'A jugar. Al terminar, registren el resultado.', href: match };
    case 'match_declined':
      return { title: `${who} canceló el partido`, body: 'El reto quedó cancelado.', href: match };
    case 'match_report':
      return { title: `${who} registró el resultado`, body: 'Te toca confirmar.', href: match };
    case 'match_disputed':
      return { title: 'Resultado en disputa', body: `${who} votó distinto. Revisa y corrige tu voto.`, href: match };
    case 'match_confirmed':
      return { title: 'Partido confirmado', body: `${who} confirmó el resultado. Ya cuenta para el ranking.`, href: match };
    case 'match_expired':
      return { title: 'Reto vencido', body: `El partido con ${who} expiró sin aceptarse.`, href: match };
    default:
      return { title: 'Novedad', body: '', href: '/inicio' };
  }
}
