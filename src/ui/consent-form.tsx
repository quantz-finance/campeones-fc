// Edad y consentimiento antes de crear la cuenta: fecha de nacimiento, Términos, Aviso de privacidad
// y, de 13 a 17 años, el permiso de la madre, padre o tutor. Menores de 13 no pueden seguir.
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ageCheck, checkConsent, type ConsentDraft } from '../domain/consent';
import { Banner, Field } from './controls';
import { push } from './nav';
import { colors, space } from './theme';
import { T } from './text';

// Se conserva mientras la app esté abierta: si vas a leer los Términos y vuelves, no pierdes lo que marcaste.
let remembered: ConsentDraft = { birthDate: '', terms: false, privacy: false, parentalAck: false };

export function useConsentForm() {
  const [birth, setBirth] = useState(remembered.birthDate);
  const [terms, setTerms] = useState(remembered.terms);
  const [privacy, setPrivacy] = useState(remembered.privacy);
  const [parentalAck, setParentalAck] = useState(remembered.parentalAck);
  const draft: ConsentDraft = { birthDate: birth, terms, privacy, parentalAck };
  remembered = draft;
  const age = useMemo(() => ageCheck(birth), [birth]);
  const result = checkConsent(draft);
  return {
    birth, setBirth, terms, setTerms, privacy, setPrivacy, parentalAck, setParentalAck,
    age,
    draft,
    valid: result.ok,
    blocked: age.band === 'under_13',
  };
}

export type ConsentFormState = ReturnType<typeof useConsentForm>;

export function ConsentForm({ form }: { form: ConsentFormState }) {
  const typed = form.birth.trim().length >= 8;
  return (
    <View style={styles.box}>
      <Field label="Fecha de nacimiento" value={form.birth} onChangeText={form.setBirth} placeholder="DD/MM/AAAA" />
      {typed && form.age.band == null ? <T variant="tiny" color={colors.danger} style={styles.plain}>Escribe la fecha como DD/MM/AAAA.</T> : null}
      {form.blocked ? (
        <Banner
          tone="danger"
          title="Todavía no puedes entrar"
          body="Necesitas tener al menos 13 años para usar Campeones FC. No guardamos tu fecha ni ningún otro dato."
        />
      ) : (
        <>
          {form.age.band === '13_17' ? (
            <>
              <Banner
                tone="warn"
                title="Necesitas permiso"
                body="Como tienes menos de 18 años, necesitas el permiso de tu madre, padre o tutor para usar Campeones FC. Enséñales los Términos y el Aviso de privacidad."
              />
              <Check
                label="Mi madre, padre o tutor me dio permiso para usar Campeones FC."
                checked={form.parentalAck}
                onChange={form.setParentalAck}
              />
            </>
          ) : null}
          <Check label="Acepto los Términos de uso." checked={form.terms} onChange={form.setTerms} link={{ label: 'Leer los Términos', href: '/terminos' }} />
          <Check
            label="Leí y acepto el Aviso de privacidad (Ley 8968)."
            checked={form.privacy}
            onChange={form.setPrivacy}
            link={{ label: 'Leer el Aviso de privacidad', href: '/privacidad' }}
          />
        </>
      )}
    </View>
  );
}

function Check({
  label,
  checked,
  onChange,
  link,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  link?: { label: string; href: '/terminos' | '/privacidad' };
}) {
  return (
    <View style={styles.checkRow}>
      <Pressable role="checkbox" aria-checked={checked} aria-label={label} onPress={() => onChange(!checked)} style={styles.check} hitSlop={4}>
        <View style={[styles.square, checked && styles.squareOn]}>
          {checked ? <Ionicons name="checkmark" size={16} color={colors.ink} /> : null}
        </View>
        <T style={styles.checkText}>{label}</T>
      </Pressable>
      {link ? (
        <Pressable role="link" onPress={() => push(link.href)} hitSlop={6}>
          <T variant="tiny" color={colors.yellow} style={styles.link}>
            {link.label}
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: space.sm },
  plain: { textTransform: 'none', letterSpacing: 0 },
  checkRow: { gap: 4 },
  check: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, paddingVertical: 4 },
  square: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ skewX: '-8deg' }],
  },
  squareOn: { backgroundColor: colors.yellow, borderColor: colors.yellow },
  checkText: { flex: 1, textTransform: 'none', letterSpacing: 0 },
  link: { textTransform: 'none', letterSpacing: 0, textDecorationLine: 'underline', marginLeft: 32 },
});
