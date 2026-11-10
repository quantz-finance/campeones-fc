// Perfil → «Tus redes»: vista previa de tus redes y editor (usuario o enlace; se guarda el enlace https canónico).
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { normalizeSocial, SOCIAL_NETWORKS, socialInputValue, socialLabel, type SocialLinks, type SocialNetwork } from '../domain/social';
import type { Profile } from '../data/types';
import type { Repository } from '../data/repository';
import { SectionHead } from './broadcast';
import { Banner, Button } from './controls';
import { translate, useLang } from '../i18n/lang';
import { push } from './nav';
import { SocialButtons, SocialGlyph } from './social-icons';
import { T } from './text';
import { colors, layout, space } from './theme';

const placeholders: Record<SocialNetwork, string> = {
  tiktok: '@usuario o enlace',
  instagram: '@usuario o enlace',
  youtube: '@canal o enlace',
  twitch: 'usuario o enlace',
  kick: 'usuario o enlace',
  x: '@usuario o enlace',
  discord: 'usuario (opcional)',
};

function draftFrom(links: SocialLinks | null | undefined): Record<SocialNetwork, string> {
  return Object.fromEntries(SOCIAL_NETWORKS.map((n) => [n, socialInputValue(n, links?.[n])])) as Record<SocialNetwork, string>;
}

export function SocialEditor({ profile, repo, startOpen = false }: { profile: Profile; repo: Repository; startOpen?: boolean }) {
  const lang = useLang();
  const [open, setOpen] = useState(startOpen);
  const [draft, setDraft] = useState(() => draftFrom(profile.socialLinks));
  const [errors, setErrors] = useState<Partial<Record<SocialNetwork, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) setDraft(draftFrom(profile.socialLinks));
  }, [profile.socialLinks, open]);

  const has = profile.socialLinks && Object.keys(profile.socialLinks).length > 0;

  function save() {
    const next: SocialLinks = {};
    const bad: Partial<Record<SocialNetwork, string>> = {};
    for (const network of SOCIAL_NETWORKS) {
      const result = normalizeSocial(network, draft[network]);
      if (!result.ok) bad[network] = result.error;
      else if (result.value) next[network] = result.value;
    }
    setErrors(bad);
    setSaved(false);
    setFailure(null);
    if (Object.keys(bad).length) return;
    setBusy(true);
    void repo
      .updateProfile(profile.id, { socialLinks: next })
      .then(() => {
        setSaved(true);
        setDraft(draftFrom(next));
        setOpen(false);
      })
      .catch((cause: unknown) => setFailure(cause instanceof Error ? cause.message : 'No se pudo guardar.'))
      .finally(() => setBusy(false));
  }

  return (
    <View style={styles.box}>
      <SectionHead title="Tus redes" action={open ? 'Cerrar' : has ? 'Editar' : 'Agregar'} onAction={() => setOpen((v) => !v)} />
      {!open ? (
        has ? (
          <SocialButtons links={profile.socialLinks} />
        ) : (
          <T color={colors.muted}>Agrega tu TikTok, Instagram, Twitch o YouTube para que te sigan desde tu ficha.</T>
        )
      ) : (
        <View style={styles.form}>
          {SOCIAL_NETWORKS.map((network) => (
            <View key={network} style={styles.fieldBox}>
              <View style={[styles.row, errors[network] ? styles.rowBad : null]}>
                <View style={styles.icon}>
                  <SocialGlyph network={network} size={16} />
                </View>
                <View style={styles.flex}>
                  <T variant="tiny" color={colors.accentText}>
                    {socialLabel[network]}
                  </T>
                  <TextInput
                    value={draft[network]}
                    onChangeText={(value) => {
                      setDraft((current) => ({ ...current, [network]: value }));
                      if (errors[network]) setErrors((current) => ({ ...current, [network]: undefined }));
                    }}
                    placeholder={translate(placeholders[network], lang)}
                    placeholderTextColor={colors.faint}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType={network === 'discord' ? 'default' : 'url'}
                    maxLength={200}
                    style={styles.input}
                    accessibilityLabel={socialLabel[network]}
                  />
                </View>
              </View>
              {errors[network] ? (
                <T variant="tiny" color={colors.danger} style={styles.plain}>
                  {errors[network]!}
                </T>
              ) : null}
            </View>
          ))}
          <T variant="tiny" color={colors.faint} style={styles.plain}>
            Solo se muestra lo que escribas aquí. Deja un campo vacío para quitarlo.
          </T>
          {failure ? <Banner tone="danger" title="No se guardó" body={failure} /> : null}
          <Button label={busy ? 'Guardando…' : 'Guardar redes'} pending={busy} disabled={busy} onPress={save} />
        </View>
      )}
      {saved && !open ? <Banner tone="accent" title="Redes actualizadas" /> : null}
      <Button label="Ver mi ficha pública" tone="ghost" onPress={() => push(`/jugador/${profile.id}`)} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: layout.stack },
  form: { gap: layout.field },
  fieldBox: { gap: space.xs },
  flex: { flex: 1 },
  plain: { textTransform: 'none', letterSpacing: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 10, paddingVertical: 8 },
  rowBad: { borderColor: colors.danger },
  icon: { width: 32, height: 32, borderRadius: 999, backgroundColor: colors.violet, alignItems: 'center', justifyContent: 'center' },
  input: { color: colors.text, fontSize: 16, paddingVertical: 2, outlineStyle: 'none' } as never,
});
