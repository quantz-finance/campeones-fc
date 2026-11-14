import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { colors, radius, space } from './theme';
import { T } from './text';
import {
  addDays,
  civilInZone,
  dayChipLabel,
  isoFromCostaRica,
  sameDay,
  snapMinute,
  startOfDayCostaRica,
  upcomingDays,
  type CivilTime,
} from './costa-rica-time';

export { isoFromCostaRica, civilInZone };

export function DateTimePicker({
  value,
  onChange,
  label = 'Inicio (opcional)',
}: {
  value: string | null;
  onChange: (iso: string | null) => void;
  label?: string;
}) {
  const today = startOfDayCostaRica();
  const scroller = useRef<ScrollViewInstance>(null);
  // Al abrir, la fila se corre hasta el día elegido (una sola vez, para no pelear con el dedo).
  const scrolled = useRef(false);
  const selected: CivilTime | null = value ? civilInZone(value) : null;
  // Dos meses de días; si la fecha guardada queda fuera (más lejos o ya pasada), se agrega su chip
  // para que se vea marcada y no parezca que el torneo no tiene fecha.
  const upcoming = upcomingDays(60);
  const days =
    selected && !upcoming.some((day) => sameDay(selected, day))
      ? [...upcoming, { year: selected.year, month: selected.month, day: selected.day }].sort(
          (a, b) => a.year - b.year || a.month - b.month || a.day - b.day,
        )
      : upcoming;
  const hour = selected?.hour ?? 21;
  const minute = selected ? snapMinute(selected.minute) : 0;

  const setDay = (year: number, month: number, day: number) => {
    onChange(isoFromCostaRica(year, month, day, hour, minute));
  };
  const setTime = (nextHour: number, nextMinute: number) => {
    const day = selected ?? { ...today, hour: nextHour, minute: nextMinute };
    let h = nextHour;
    let m = nextMinute;
    if (m >= 60) {
      m = 0;
      h += 1;
    }
    if (m < 0) {
      m = 45;
      h -= 1;
    }
    if (h >= 24) h = 0;
    if (h < 0) h = 23;
    onChange(isoFromCostaRica(day.year, day.month, day.day, h, m));
  };

  return (
    <View style={styles.wrap}>
      <T variant="tiny">{label}</T>
      <ScrollView ref={scroller} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
        <Pressable
          onPress={() => onChange(null)}
          accessibilityRole="button"
          accessibilityLabel="Sin fecha"
          style={[styles.chip, !selected ? styles.chipOn : styles.chipOff]}
        >
          <T variant="label" color={!selected ? colors.ink : colors.text}>
            Sin fecha
          </T>
        </Pressable>
        {days.map((day) => {
          const on = Boolean(selected && sameDay(selected, day));
          const tag = dayChipLabel(day.year, day.month, day.day, today);
          return (
            <Pressable
              key={`${day.year}-${day.month}-${day.day}`}
              onPress={() => setDay(day.year, day.month, day.day)}
              accessibilityRole="button"
              accessibilityLabel={tag}
              onLayout={
                on
                  ? (event) => {
                      if (scrolled.current) return;
                      scrolled.current = true;
                      scroller.current?.scrollTo({ x: Math.max(0, event.nativeEvent.layout.x - 80), animated: false });
                    }
                  : undefined
              }
              style={[styles.chip, on ? styles.chipOn : styles.chipOff]}
            >
              <T variant="label" color={on ? colors.ink : colors.text}>
                {tag}
              </T>
            </Pressable>
          );
        })}
      </ScrollView>
      {selected ? (
        <View style={styles.time}>
          <T variant="tiny">Hora</T>
          <View style={styles.timeRow}>
            <Stepper label="Hora" value={hour} format={(n) => String(n).padStart(2, '0')} onStep={(d) => setTime(hour + d, minute)} />
            <T variant="strong">:</T>
            <Stepper
              label="Minutos"
              value={minute}
              format={(n) => String(n).padStart(2, '0')}
              onStep={(d) => setTime(hour, minute + d * 15)}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Stepper({
  label,
  value,
  format,
  onStep,
}: {
  label: string;
  value: number;
  format: (value: number) => string;
  onStep: (dir: number) => void;
}) {
  return (
    <View style={styles.step} accessibilityLabel={label}>
      <Pressable onPress={() => onStep(-1)} accessibilityRole="button" accessibilityLabel={`Bajar ${label}`} style={styles.stepBtn} hitSlop={8}>
        <T variant="strong">−</T>
      </Pressable>
      <T variant="title" style={styles.stepVal}>
        {format(value)}
      </T>
      <Pressable onPress={() => onStep(1)} accessibilityRole="button" accessibilityLabel={`Subir ${label}`} style={styles.stepBtn} hitSlop={8}>
        <T variant="strong">+</T>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  days: { gap: space.sm, paddingRight: space.sm, alignItems: 'center' },
  chip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipOff: { backgroundColor: colors.wash, borderColor: colors.lineStrong },
  time: { gap: space.sm },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.wash,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepVal: { minWidth: 36, textAlign: 'center', fontStyle: 'normal' },
});
