// Mismos tokens que mobile/src/theme.ts, para que el panel web se vea como
// la app (mismo mockup de Figma). Si cambia uno, cambiar el otro.
export const colors = {
  primary: '#4F46E5',
  primaryLight: '#EEF2FF',
  primaryDark: '#4338CA',

  background: '#F8FAFC',
  card: '#FFFFFF',
  border: '#EEF0F4',

  textTitle: '#0F172A',
  textLabel: '#6366F1',
  textBody: '#334155',
  textMuted: '#94A3B8',

  success: '#10B981',
  successBg: '#D1FAE5',
  danger: '#EF4444',
  dangerBg: '#FEE2E2',
  warning: '#F59E0B',
  warningBg: '#FEF3C7',
};

export const avatarPalette = ['#4F46E5', '#0EA5E9', '#8B5CF6', '#EC4899', '#F59E0B'];

export function avatarColorFor(name: string) {
  const index = name.charCodeAt(0) % avatarPalette.length;
  return avatarPalette[index];
}

export function initialsFor(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}
