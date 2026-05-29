import { useThemeContext } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';

export function useTheme() {
  const { theme } = useThemeContext();
  return Colors[theme];
}

