import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Ellipse,
  Circle,
  Rect,
  Polygon,
  Line,
  G,
} from 'react-native-svg';

interface MascotProps {
  size?: number;
}

// The owl mascot from the design's inline SVG.
// Used on sprout/explorer home screens, lesson screen, quest map.
export const Mascot: React.FC<MascotProps> = ({ size = 118 }) => {
  if (size === 0) return null;
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <LinearGradient id="ob" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#8a6bff" />
          <Stop offset="1" stopColor="#6a4ff0" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="100" cy="178" rx="40" ry="9" fill="#000" opacity="0.08" />
      <Path d="M54 64 L46 30 L82 58 Z" fill="#6a4ff0" />
      <Path d="M146 64 L154 30 L118 58 Z" fill="#6a4ff0" />
      <Ellipse cx="100" cy="118" rx="62" ry="66" fill="url(#ob)" />
      <Ellipse cx="100" cy="132" rx="40" ry="48" fill="#fff" opacity="0.92" />
      <G transform="rotate(-12 46 126)">
        <Ellipse cx="46" cy="126" rx="13" ry="26" fill="#6a4ff0" />
      </G>
      <G transform="rotate(12 154 126)">
        <Ellipse cx="154" cy="126" rx="13" ry="26" fill="#6a4ff0" />
      </G>
      <Circle cx="78" cy="106" r="27" fill="#fff" />
      <Circle cx="122" cy="106" r="27" fill="#fff" />
      <Circle cx="83" cy="108" r="13" fill="#2c2550" />
      <Circle cx="117" cy="108" r="13" fill="#2c2550" />
      <Circle cx="87" cy="104" r="4.5" fill="#fff" />
      <Circle cx="121" cy="104" r="4.5" fill="#fff" />
      <Path d="M100 118 l-9 13 l18 0 Z" fill="#ff9d2e" />
      <Ellipse cx="86" cy="138" rx="9" ry="6" fill="#ff9ec4" opacity="0.7" />
      <Ellipse cx="114" cy="138" rx="9" ry="6" fill="#ff9ec4" opacity="0.7" />
      <Path
        d="M86 176 l-10 10 M92 178 l-3 12 M114 176 l10 10 M108 178 l3 12"
        stroke="#ff9d2e"
        strokeWidth={6}
        strokeLinecap="round"
        fill="none"
      />
      {/* Graduation cap */}
      <Polygon points="100,16 150,36 100,56 50,36" fill="#2c2550" />
      <Rect x="84" y="44" width="32" height="16" rx="3" fill="#2c2550" />
      <Line x1="150" y1="36" x2="150" y2="60" stroke="#ffd766" strokeWidth={3} />
      <Circle cx="150" cy="62" r="5" fill="#ffd766" />
    </Svg>
  );
};
