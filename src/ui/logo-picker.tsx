// Selector de logo: escudo (grupos, 23 piezas blanco/lila) o trofeo (torneos, 8 piezas en oro) del set v5,
// más «Subir tu foto». En la cuadrícula se usa la variante small (44 px); arriba, la vista previa grande.
import { Icon } from './icon';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { features } from '../content/features';
import { defaultLogo, isLogoId, logoSet, logoSource, resolveLogo, type LogoKind } from '../content/crests';
import { useApp } from '../state/app-provider';
import { Shield } from './broadcast';
import { Banner, Button } from './controls';
import { PhotoButton } from './photo-button';
import { SportPress } from './press';
import { colors, layout, radius, space } from './theme';
import { T } from './text';
import { humanError } from './errors';

const TILE = 56;
const ART = 44;

function LogoGrid({ kind, value, onChange }: { kind: LogoKind; value: string; onChange: (id: string) => void }) {
  return (
    <View style={styles.grid} accessibilityRole="radiogroup">
      {logoSet(kind).map((item) => {
        const on = item.id === value;
        return (
          <SportPress
            key={item.id}
            onPress={() => onChange(item.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={item.name}
            style={[styles.tile, on && styles.tileOn]}
          >
            <Image source={logoSource(item, ART)} style={styles.tileArt} contentFit="contain" accessible={false} />
          </SportPress>
        );
      })}
    </View>
  );
}

/** Vista previa + cuadrícula. `photo` controla la fila de «Subir tu foto». */
export function LogoPicker({
  kind,
  value,
  onChange,
  photo,
}: {
  kind: LogoKind;
  value: string;
  onChange: (id: string) => void;
  photo: { mode: 'create' } | { mode: 'edit'; targetId: string };
}) {
  const { mode } = useApp();
  const art = resolveLogo(kind, value, value);
  const noun = kind === 'groups' ? 'escudo' : 'trofeo';
  return (
    <View style={styles.picker}>
      <View style={styles.preview}>
        <Image source={logoSource(art, 88)} style={styles.previewArt} contentFit="contain" accessible={false} />
        <View style={styles.flex}>
          <T variant="tiny" color={colors.accentText}>
            {kind === 'groups' ? 'Escudo del grupo' : 'Trofeo del torneo'}
          </T>
          <T variant="title" numberOfLines={1}>
            {art.name}
          </T>
          <T variant="tiny" color={colors.muted} style={styles.plain}>
            {kind === 'groups' ? `Elige uno de los ${logoSet(kind).length} escudos o sube tu foto.` : `Elige uno de los ${logoSet(kind).length} trofeos o sube tu foto.`}
          </T>
        </View>
      </View>
      <LogoGrid kind={kind} value={value} onChange={onChange} />
      <View style={styles.photoRow}>
        <View style={styles.photoIcon}>
          <Icon name="camara" size={16} color={colors.text} />
        </View>
        <View style={styles.flex}>
          <T variant="strong">Subir tu foto</T>
          <T variant="tiny" color={colors.muted} style={styles.plain}>
            {!features.logoPhotoUpload
              ? 'Próximamente.'
              : photo.mode === 'create'
                ? `Podrás subirla cuando exista el ${kind === 'groups' ? 'grupo' : 'torneo'}.`
                : mode !== 'supabase'
                  ? 'Disponible con tu cuenta (no en el modo demostración).'
                  : `Tu foto reemplaza al ${noun} hasta que elijas otro.`}
          </T>
        </View>
        {features.logoPhotoUpload && photo.mode === 'edit' && mode === 'supabase' ? (
          <PhotoButton kind={kind} targetId={photo.targetId} label="Subir foto" />
        ) : (
          <View style={styles.soon}>
            <T variant="tiny" color={colors.faint}>
              {features.logoPhotoUpload ? (photo.mode === 'create' ? 'Después' : 'Con cuenta') : 'Próximamente'}
            </T>
          </View>
        )}
      </View>
    </View>
  );
}

/** Logo actual de un grupo/torneo y, para quien lo administra, «Cambiar escudo / trofeo» con el selector en línea. */
export function LogoEditor({
  kind,
  entity,
  canEdit,
  size = 64,
}: {
  kind: LogoKind;
  entity: { id: string; name: string; logo?: string | null; photoUrl?: string | null };
  canEdit: boolean;
  size?: number;
}) {
  const { repo, userId } = useApp();
  const current = isLogoId(kind, entity.logo) ? entity.logo! : defaultLogo(kind, entity.id);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = kind === 'groups' ? 'Cambiar escudo' : 'Cambiar trofeo';
  return (
    <View style={styles.editor}>
      <View style={styles.identity}>
        <Shield letters={entity.name.slice(0, 2)} photoUrl={entity.photoUrl} kind={kind} id={entity.id} logo={entity.logo} size={size} />
        {canEdit && !open ? (
          <SportPress
            style={styles.change}
            onPress={() => {
              setDraft(current);
              setError(null);
              setOpen(true);
            }}
            accessibilityRole="button"
          >
            <Icon name="galeria" size={14} color={colors.text} />
            <T variant="tiny" color={colors.text}>
              {label}
            </T>
          </SportPress>
        ) : null}
      </View>
      {open ? (
        <View style={styles.sheet}>
          <LogoPicker kind={kind} value={draft} onChange={setDraft} photo={{ mode: 'edit', targetId: entity.id }} />
          {error ? <Banner tone="danger" title="No se guardó" body={error} /> : null}
          <View style={styles.actions}>
            <View style={styles.flex}>
              <Button label="Cancelar" tone="ghost" onPress={() => setOpen(false)} />
            </View>
            <View style={styles.flex}>
              <Button
                label="Guardar"
                pending={busy}
                disabled={draft === current && !entity.photoUrl}
                onPress={() => {
                  setBusy(true);
                  setError(null);
                  void repo
                    .setLogo(kind, entity.id, draft, userId!)
                    .then(() => setOpen(false))
                    .catch((cause: unknown) => setError(humanError(cause)))
                    .finally(() => setBusy(false));
                }}
              />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  plain: { textTransform: 'none', letterSpacing: 0 },
  picker: { gap: layout.inCard },
  preview: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  previewArt: { width: 88, height: 88 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  // 5 por fila a todo el ancho (aire de 8 px entre piezas).
  tile: {
    width: '17.8%',
    aspectRatio: 1,
    minWidth: TILE - 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.wash,
  },
  tileOn: { borderColor: colors.accentText, backgroundColor: colors.bgDeep },
  tileArt: { width: ART, height: ART },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line },
  photoIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.wash },
  soon: { paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line },
  editor: { gap: layout.inCard },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  change: { flexDirection: 'row', alignItems: 'center', gap: layout.inline, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.lineStrong },
  sheet: { gap: layout.inCard, padding: space.md, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  actions: { flexDirection: 'row', gap: layout.button },
});
