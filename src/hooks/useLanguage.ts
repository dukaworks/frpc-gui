import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/store/settingsStore';

export function useLanguage() {
  const { i18n } = useTranslation();
  const { language } = useSettingsStore();

  useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);
}
