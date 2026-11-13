// Iconos de interfaz de Campeones FC (paquete de Stan, assets/iconos-ui). Se tiñen con `color`.
// Los sets de escudos de grupo, torneo y logros (v5) no pasan por aquí.
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { navIcons, uiIcons, type NavIconName, type UiIconEl, type UiIconName } from './ui-icons-data';
import { colors } from './theme';
import { useResolvedColor } from './theme-mode';

export type { NavIconName, UiIconName };

function Glyph({ els, size, color, stroke }: { els: readonly UiIconEl[]; size: number; color: string; stroke: boolean }) {
  const c = useResolvedColor(color);
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke ? c : 'none'}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {els.map((el, i) => {
        const fill = el[1] ? c : 'none';
        const line = el[1] ? 'none' : c;
        if (el[0] === 'p') return <Path key={i} d={el[2]} fill={fill} stroke={line} fillRule={el[3] ? 'evenodd' : 'nonzero'} clipRule={el[3] ? 'evenodd' : 'nonzero'} />;
        if (el[0] === 'c') return <Circle key={i} cx={el[2]} cy={el[3]} r={el[4]} fill={fill} stroke={line} />;
        return <Rect key={i} x={el[2]} y={el[3]} width={el[4]} height={el[5]} rx={el[6]} fill={fill} stroke={line} />;
      })}
    </Svg>
  );
}

/** Icono de la app por nombre (p. ej. «buscar», «compartir», «notificaciones»). */
export function Icon({ name, size = 22, color = colors.text }: { name: UiIconName; size?: number; color?: string }) {
  return <Glyph els={uiIcons[name] as unknown as UiIconEl[]} size={size} color={color} stroke />;
}

/** Icono de pestaña: trazo cuando está inactiva, sólido cuando está activa. */
export function NavIcon({ name, active, size = 24, color = colors.text }: { name: NavIconName; active: boolean; size?: number; color?: string }) {
  const els = navIcons[`${name}-${active ? 'activo' : 'inactivo'}`] as unknown as UiIconEl[];
  return <Glyph els={els} size={size} color={color} stroke={!active} />;
}
