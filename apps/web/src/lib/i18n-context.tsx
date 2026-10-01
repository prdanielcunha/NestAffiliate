import { createContext, useContext, type ReactNode } from 'react';
import { createTranslator, type Locale, type Translator } from './i18n';

const I18nContext=createContext<{locale:Locale;t:Translator}>({
  locale:'pt-BR',
  t:createTranslator('pt-BR'),
});

export function I18nProvider({locale,children}:{locale:Locale;children:ReactNode}){
  return <I18nContext.Provider value={{locale,t:createTranslator(locale)}}>{children}</I18nContext.Provider>;
}

export function useI18n(){
  return useContext(I18nContext);
}
