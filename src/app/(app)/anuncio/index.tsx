// «Pide tu espacio»: formulario de la tarjeta «Quiero ver mi anuncio aquí» (maqueta de Stan,
// assets/anuncios/formulario-solicitud.png). Guarda la solicitud en revisión; el equipo la publica a mano.
import { useLocalSearchParams, type Href } from 'expo-router';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Keyboard, StyleSheet, TextInput, View } from 'react-native';
import { AD_LIMITS, AD_SECTIONS, AD_SPACE, adRequestProblem, isAdSection, type AdSection } from '../../../domain/ad-request';
import { pickAdImage, type AdImage } from '../../../lib/photos';
import { track } from '../../../lib/analytics';
import { useApp } from '../../../state/app-provider';
import { Banner } from '../../../ui/controls';
import { humanError } from '../../../ui/errors';
import { Icon } from '../../../ui/icon';
import { back, replace } from '../../../ui/nav';
import { SportPress } from '../../../ui/press';
import { Screen } from '../../../ui/screen';
import { T } from '../../../ui/text';
import { colors, font, space } from '../../../ui/theme';
import { translate, useLang } from '../../../i18n/lang';

export default function AdRequestForm() {
  const { repo, userId } = useApp();
  const params = useLocalSearchParams<{ espacio?: string }>();
  const [business, setBusiness] = useState('');
  const [contactName, setContactName] = useState('');
  const [contact, setContact] = useState('');
  const [section, setSection] = useState<AdSection>(isAdSection(params.espacio) ? params.espacio : 'inicio-franja');
  const [message, setMessage] = useState('');
  const [image, setImage] = useState<AdImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const space_ = AD_SPACE[section];

  const submit = () => {
    Keyboard.dismiss();
    const input = { business, contactName, contact, section, message };
    const problem = adRequestProblem(input);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    void repo
      .submitAdRequest(userId!, input, image)
      .then(() => {
        track('ad_request_sent', { section });
        const q = new URLSearchParams({ negocio: business.trim(), espacio: section, contacto: contact.trim() });
        replace(`/anuncio/enviado?${q.toString()}` as Href);
      })
      .catch((cause: unknown) => setError(humanError(cause)))
      .finally(() => setBusy(false));
  };

  const choosePhoto = () => {
    setError(null);
    void pickAdImage()
      .then((picked) => picked && setImage(picked))
      .catch((cause: unknown) => setError(humanError(cause)));
  };

  return (
    <Screen>
      <View style={styles.head}>
        <SportPress onPress={() => back()} hitSlop={8} style={styles.close} accessibilityRole="button" accessibilityLabel="Cerrar">
          <Icon name="cerrar" size={22} color={colors.text} />
        </SportPress>
        <View style={styles.flex}>
          <T variant="label" color={colors.accentText}>
            Quiero ver mi anuncio aquí
          </T>
          <T variant="display" style={styles.title}>
            Pide tu espacio
          </T>
        </View>
      </View>

      <View style={styles.form}>
        <Input label="Negocio" value={business} onChange={setBusiness} placeholder="Nombre de tu negocio" max={AD_LIMITS.business.max} capitalize="words" />
        <Input label="Nombre de contacto" value={contactName} onChange={setContactName} placeholder="¿Con quién hablamos?" max={AD_LIMITS.contactName.max} capitalize="words" />
        <Input
          label="Correo o teléfono"
          value={contact}
          onChange={setContact}
          placeholder="tucorreo@ejemplo.com o tu número"
          max={AD_LIMITS.contact.max}
          keyboard="email-address"
        />

        <View style={styles.group}>
          <LabelRow label="Sección donde lo quieres" right="Elige una" />
          <View style={styles.options} accessibilityRole="radiogroup">
            {AD_SECTIONS.map((id) => {
              const on = id === section;
              const s = AD_SPACE[id];
              return (
                <SportPress
                  key={id}
                  onPress={() => setSection(id)}
                  style={[styles.option, on && styles.optionOn]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${s.label}, ${s.width} por ${s.height} puntos`}
                >
                  <View style={styles.shapeBox}>
                    <View style={[styles.shape, { aspectRatio: s.width / s.height }, s.width / s.height > 1 ? { width: 30 } : { height: 22 }, on && styles.shapeOn]} />
                  </View>
                  <T variant="strong" color={on ? colors.accentInk : colors.text} style={styles.flex} numberOfLines={1}>
                    {s.label}
                  </T>
                  <T variant="tiny" color={on ? colors.accentInk : colors.muted} style={styles.plain}>
                    {`${s.width}×${s.height} pt`}
                  </T>
                  {on ? <Icon name="confirmado" size={16} color={colors.accentInk} /> : <View style={styles.checkSpace} />}
                </SportPress>
              );
            })}
          </View>
        </View>

        <View style={styles.group}>
          <LabelRow label="Texto del anuncio" right={`${message.length} / ${AD_LIMITS.message.max}`} />
          <Field value={message} onChange={setMessage} placeholder="Ej.: Tacos para cancha sintética. Ven a probarlos." max={AD_LIMITS.message.max} multiline label="Texto del anuncio" />
        </View>

        <View style={styles.group}>
          <LabelRow label="Imagen (opcional)" right={`Proporción ${space_.ratio}`} />
          {image ? (
            <View style={styles.preview}>
              <Image source={{ uri: image.uri }} style={[styles.previewImg, { aspectRatio: space_.width / space_.height }]} contentFit="cover" accessibilityLabel="Imagen elegida para tu anuncio" />
              <View style={styles.previewActions}>
                <SmallAction label="Cambiar" onPress={choosePhoto} />
                <SmallAction label="Quitar" onPress={() => setImage(null)} />
              </View>
            </View>
          ) : (
            <SportPress onPress={choosePhoto} style={styles.upload} accessibilityRole="button" accessibilityLabel="Sube una foto de tu producto. JPG o PNG, sin logos de terceros.">
              <View style={styles.uploadIcon}>
                <Icon name="camara" size={22} color={colors.gold} />
              </View>
              <View style={styles.flex}>
                <T variant="strong">Sube una foto de tu producto</T>
                <T variant="tiny" color={colors.muted} style={styles.plain}>
                  JPG o PNG, sin logos de terceros
                </T>
              </View>
            </SportPress>
          )}
        </View>

        {error ? <Banner tone="danger" title="No se envió" body={error} /> : null}

        <View style={styles.group}>
          <SportPress onPress={busy ? undefined : submit} disabled={busy} style={[styles.send, busy && styles.sendBusy]} accessibilityRole="button" accessibilityLabel="Enviar solicitud" accessibilityState={{ busy, disabled: busy }}>
            <T style={styles.sendLabel} color={colors.accentInk}>
              {busy ? 'Enviando…' : 'Enviar solicitud'}
            </T>
            {busy ? null : <Icon name="adelante" size={20} color={colors.accentInk} />}
          </SportPress>
          <T variant="tiny" color={colors.muted} style={[styles.plain, styles.center]}>
            La revisamos y te contactamos por el medio que nos dejes.
          </T>
        </View>
      </View>
    </Screen>
  );
}

function LabelRow({ label, right }: { label: string; right?: string }) {
  return (
    <View style={styles.labelRow}>
      <T variant="label" color={colors.muted} style={styles.flex}>
        {label}
      </T>
      {right ? (
        <T variant="tiny" color={colors.muted} style={styles.plain}>
          {right}
        </T>
      ) : null}
    </View>
  );
}

function Input(props: { label: string; value: string; onChange: (v: string) => void; placeholder: string; max: number; capitalize?: 'none' | 'words'; keyboard?: 'default' | 'email-address' }) {
  return (
    <View style={styles.group}>
      <LabelRow label={props.label} />
      <Field {...props} />
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  max,
  multiline = false,
  capitalize = 'none',
  keyboard = 'default',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  max: number;
  multiline?: boolean;
  capitalize?: 'none' | 'words' | 'sentences';
  keyboard?: 'default' | 'email-address';
}) {
  const lang = useLang();
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={translate(placeholder, lang)}
      placeholderTextColor={colors.faint}
      maxLength={max}
      multiline={multiline}
      autoCapitalize={multiline ? 'sentences' : capitalize}
      autoCorrect={multiline}
      keyboardType={keyboard}
      accessibilityLabel={translate(label, lang)}
      returnKeyType="done"
      submitBehavior={multiline ? 'blurAndSubmit' : undefined}
      style={[styles.input, multiline && styles.inputMulti]}
    />
  );
}

function SmallAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <SportPress onPress={onPress} style={styles.smallAction} accessibilityRole="button" accessibilityLabel={label}>
      <T variant="label">{label}</T>
    </SportPress>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  plain: { textTransform: 'none', letterSpacing: 0 },
  center: { textAlign: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  close: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 30, lineHeight: 34 },
  form: { gap: 18 },
  group: { gap: space.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: 14,
    backgroundColor: colors.bgDeep,
    paddingHorizontal: space.lg,
    color: colors.text,
    fontFamily: font.body,
    fontSize: 16,
  },
  inputMulti: { minHeight: 64, paddingTop: 14, paddingBottom: 14, textAlignVertical: 'top' },
  options: { gap: space.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 40,
    paddingHorizontal: space.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bgDeep,
  },
  optionOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  shapeBox: { width: 34, alignItems: 'center', justifyContent: 'center' },
  shape: { borderWidth: 1.5, borderColor: colors.gold, borderRadius: 3 },
  shapeOn: { borderColor: colors.accentInk },
  checkSpace: { width: 16 },
  upload: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.gold,
    backgroundColor: colors.bgDeep,
  },
  uploadIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  preview: { gap: space.sm },
  previewImg: { width: '100%', borderRadius: 14, backgroundColor: colors.bgDeep },
  previewActions: { flexDirection: 'row', gap: space.sm },
  smallAction: { paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: 999, borderWidth: 1, borderColor: colors.lineStrong },
  send: { minHeight: 58, borderRadius: 16, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  sendBusy: { opacity: 0.7 },
  sendLabel: { fontFamily: font.bold, fontSize: 18 },
});
