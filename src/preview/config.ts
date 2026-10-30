// Experimental presentation screens can run only in an explicitly isolated web export.
import { Platform } from 'react-native';
export const ideasPreview =
  Platform.OS === 'web' &&
  process.env.EXPO_PUBLIC_IDEAS_PREVIEW === '1' &&
  process.env.EXPO_PUBLIC_SUPABASE_URL === 'https://closet-test.supabase.co';
