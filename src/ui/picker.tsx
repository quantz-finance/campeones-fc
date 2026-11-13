// Selector reutilizable (rivales, grupos, miembros): buscador arriba, accesos rápidos (recientes / más jugados)
// como fichas, lista compacta con tope y «Ver todos» en un área con alto máximo, y la elección queda como
// tarjeta con «Cambiar» para que la pantalla no se haga larga. Modo `multi` para grupos y torneos.
import { useEffect, useState, type ReactNode } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Icon } from './icon';
import { SearchEmpty, SearchField, ListLabel } from './search-field';
import { colors, layout, radius, space } from './theme';
import { T } from './text';

export type PickItem = {
  id: string;
  title: string;
  /** Segunda línea (p. ej. «@usuario · 3 V · 1 E · 2 D» o «8 jugadores»). */
  detail?: string;
  /** Texto corto bajo la ficha rápida (p. ej. el primer nombre). */
  short?: string;
  /** Avatar o escudo; recibe el tamaño. */
  media: (size: number) => ReactNode;
  /** ¿Coincide con la búsqueda? */
  matches: (query: string) => boolean;
};

/** Opción «ninguno» del modo simple (p. ej. «Solo entre ustedes» cuando no cuenta para un grupo). */
export type NoneOption = { title: string; detail?: string; media?: (size: number) => ReactNode };

const ROW_AVATAR = 36;
const ROW_H = 56;
/** Filas visibles antes de «Ver todos». */
const LIMIT = 5;
/** Alto máximo de la lista completa: unas 6 filas y media, el resto se desliza dentro. */
const LIST_MAX = ROW_H * 6.5;
/** Desde cuántos elementos aparece el buscador. */
const SEARCH_FROM = 5;

export function Picker({
  items,
  selected,
  onChange,
  multi = false,
  ordered = false,
  quick = [],
  quickLabel = 'Recientes',
  none,
  searchPlaceholder = 'Busca por nombre o @usuario',
  noMatchHint,
  allLabel = 'Todos',
  testID,
}: {
  items: PickItem[];
  /** Ids elegidos (en modo simple, 0 o 1). */
  selected: string[];
  onChange: (ids: string[]) => void;
  multi?: boolean;
  /** Multi: muestra el número de orden en vez del check (cuadro del torneo). */
  ordered?: boolean;
  /** Ids para las fichas rápidas, en orden. */
  quick?: string[];
  quickLabel?: string;
  none?: NoneOption;
  searchPlaceholder?: string;
  noMatchHint?: string;
  allLabel?: string;
  testID?: string;
}) {
  const [search, setSearch] = useState('');
  const [all, setAll] = useState(false);
  // Modo simple: abierto mientras no hay elección; con «ninguno», arranca cerrado mostrando esa opción.
  const [open, setOpen] = useState(() => !multi && selected.length === 0 && !none);
  // Modo simple: si la elección cambia desde fuera (p. ej. un enlace con el rival ya puesto), también se cierra.
  const first = selected[0];
  useEffect(() => {
    if (!multi && first) setOpen(false);
  }, [multi, first]);
  const byId = new Map(items.map((i) => [i.id, i]));
  const chosen = selected.map((id) => byId.get(id)).filter((i): i is PickItem => Boolean(i));
  const isOn = (id: string) => selected.includes(id);
  const q = search.trim();

  const pick = (id: string | null) => {
    if (multi) {
      if (!id) return;
      onChange(isOn(id) ? selected.filter((x) => x !== id) : [...selected, id]);
      return;
    }
    onChange(id ? [id] : []);
    setOpen(false);
    setSearch('');
    setAll(false);
    Keyboard.dismiss();
  };

  // Modo simple cerrado: la elección como tarjeta con «Cambiar».
  if (!multi && !open && (chosen[0] || none)) {
    const item = chosen[0];
    return (
      <View style={[styles.selected]} testID={testID ? `${testID}-selected` : undefined}>
        {item ? item.media(44) : none?.media ? none.media(44) : <View style={styles.noneMedia}><Icon name="usuario" size={22} color={colors.muted} /></View>}
        <View style={styles.flex}>
          <T variant="strong" numberOfLines={1}>
            {item ? item.title : none!.title}
          </T>
          {(item ? item.detail : none?.detail) ? (
            <T variant="tiny" color={colors.muted} style={styles.plain} numberOfLines={1}>
              {item ? item.detail : none!.detail}
            </T>
          ) : null}
        </View>
        <Pressable onPress={() => setOpen(true)} hitSlop={10} style={styles.change} accessibilityRole="button" accessibilityLabel="Cambiar">
          <T variant="label" color={colors.accentText}>
            Cambiar
          </T>
        </Pressable>
      </View>
    );
  }

  const quickItems = q ? [] : quick.map((id) => byId.get(id)).filter((i): i is PickItem => Boolean(i));
  const shown = q ? items.filter((i) => i.matches(q)) : items;
  const capped = all || q ? shown : shown.slice(0, LIMIT);
  const rows = (
    <>
      {none && !q ? <Row title={none.title} detail={none.detail} media={none.media?.(ROW_AVATAR) ?? <View style={[styles.noneMedia, styles.noneSmall]}><Icon name="usuario" size={18} color={colors.muted} /></View>} on={selected.length === 0} onPress={() => pick(null)} /> : null}
      {capped.map((item) => (
        <Row
          key={item.id}
          title={item.title}
          detail={item.detail}
          media={item.media(ROW_AVATAR)}
          on={isOn(item.id)}
          order={multi && ordered && isOn(item.id) ? selected.indexOf(item.id) + 1 : undefined}
          onPress={() => pick(item.id)}
        />
      ))}
    </>
  );

  return (
    <View style={styles.root} testID={testID}>
      {multi && chosen.length > 0 ? (
        <View style={styles.tags}>
          {chosen.map((item, index) => (
            <Pressable key={item.id} onPress={() => pick(item.id)} style={styles.tag} accessibilityRole="button" accessibilityLabel={`Quitar a ${item.title}`}>
              {ordered ? (
                <T variant="tiny" color={colors.accentText} style={styles.plain}>
                  {String(index + 1)}
                </T>
              ) : null}
              <T variant="tiny" style={styles.plain} numberOfLines={1}>
                {item.short ?? item.title}
              </T>
              <Icon name="cerrar" size={14} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      ) : null}
      {items.length >= SEARCH_FROM ? <SearchField value={search} onChange={setSearch} placeholder={searchPlaceholder} /> : null}
      {quickItems.length > 0 ? (
        <View style={styles.quickWrap}>
          <ListLabel>{quickLabel}</ListLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.quick}>
            {quickItems.map((item) => {
              const on = isOn(item.id);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => pick(item.id)}
                  style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
                  accessibilityRole={multi ? 'checkbox' : 'radio'}
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={item.title}
                >
                  <View style={[styles.ring, on && styles.ringOn]}>{item.media(48)}</View>
                  <T variant="tiny" color={on ? colors.accentText : colors.text} style={[styles.plain, styles.chipText]} numberOfLines={1}>
                    {item.short ?? item.title}
                  </T>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
      {quickItems.length > 0 && !q ? <ListLabel>{allLabel}</ListLabel> : null}
      {all && !q && shown.length > LIMIT ? (
        <ScrollView style={styles.scroll} nestedScrollEnabled keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
          {rows}
        </ScrollView>
      ) : (
        <View style={styles.list}>{rows}</View>
      )}
      {q && shown.length === 0 ? <SearchEmpty query={q} hint={noMatchHint} /> : null}
      {(!q && shown.length > LIMIT) || (!multi && (chosen[0] || none)) ? (
      <View style={styles.foot}>
        {!q && shown.length > LIMIT ? (
          <Pressable onPress={() => setAll((v) => !v)} hitSlop={8} style={styles.more} accessibilityRole="button">
            <T variant="label" color={colors.accentText}>
              {all ? 'Ver menos' : `Ver todos (${shown.length})`}
            </T>
            <Icon name={all ? 'chevron-arriba' : 'chevron-abajo'} size={16} color={colors.accentText} />
          </Pressable>
        ) : (
          <View />
        )}
        {!multi && (chosen[0] || none) ? (
          <Pressable onPress={() => { setOpen(false); setSearch(''); setAll(false); }} hitSlop={8} style={styles.more} accessibilityRole="button">
            <T variant="label" color={colors.muted}>
              Cancelar
            </T>
          </Pressable>
        ) : null}
      </View>
      ) : null}
    </View>
  );
}

function Row({ title, detail, media, on, order, onPress }: { title: string; detail?: string; media: ReactNode; on: boolean; order?: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, on && styles.on, pressed && styles.pressed]}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={title}
    >
      {media}
      <View style={styles.flex}>
        <T variant="strong" numberOfLines={1}>
          {title}
        </T>
        {detail ? (
          <T variant="tiny" color={colors.muted} style={styles.plain} numberOfLines={1}>
            {detail}
          </T>
        ) : null}
      </View>
      {on && order ? (
        <View style={styles.order}>
          <T variant="label" color={colors.accentInk}>
            {String(order)}
          </T>
        </View>
      ) : on ? (
        <Icon name="confirmado" size={22} color={colors.accentText} />
      ) : (
        <View style={styles.radioOff} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { gap: layout.card },
  flex: { flex: 1, minWidth: 0 },
  plain: { textTransform: 'none', letterSpacing: 0 },
  pressed: { opacity: 0.85 },
  selected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.bg,
  },
  change: { minHeight: 36, paddingHorizontal: space.sm, justifyContent: 'center' },
  noneMedia: { width: 44, height: 44, borderRadius: 999, borderWidth: 1, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  noneSmall: { width: ROW_AVATAR, height: ROW_AVATAR },
  quickWrap: { gap: space.sm },
  quick: { gap: space.md, paddingRight: space.sm },
  chip: { width: 64, alignItems: 'center', gap: space.xs },
  ring: { padding: 2, borderRadius: 999, borderWidth: 2, borderColor: 'transparent' },
  ringOn: { borderColor: colors.accentText },
  chipText: { maxWidth: 64, textAlign: 'center' },
  list: { gap: space.xxs },
  scroll: { maxHeight: LIST_MAX },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: ROW_H - space.xxs,
    paddingHorizontal: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  on: { borderColor: colors.accent, backgroundColor: colors.bg },
  radioOff: { width: 20, height: 20, margin: 1, borderRadius: 999, borderWidth: 1.75, borderColor: colors.faint },
  order: { width: 24, height: 24, borderRadius: 999, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center' },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  more: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 32 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    minHeight: 32,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.bg,
  },
});
