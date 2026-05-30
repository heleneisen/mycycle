import { useWindowDimensions, Platform } from 'react-native';

export const MAX_PHONE_WIDTH = 430;

/**
 * Like useWindowDimensions, but on web clamps width to MAX_PHONE_WIDTH so that
 * layout calculations match the centered phone-frame container.
 */
export function useAppDimensions() {
  const dims = useWindowDimensions();
  if (Platform.OS !== 'web') return dims;
  return { ...dims, width: Math.min(dims.width, MAX_PHONE_WIDTH) };
}
