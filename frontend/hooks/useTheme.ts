import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export function useTheme() {
  const scheme = useColorScheme();
  return Colors[scheme];
}
