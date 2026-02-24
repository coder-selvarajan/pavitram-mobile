import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FONT_SCALE_KEY = 'pavitram_font_scale';

interface SettingsContextType {
  fontScale: number;
  setFontScale: (scale: number) => void;
}

const SettingsContext = createContext<SettingsContextType>({
  fontScale: 1.0,
  setFontScale: () => {},
});

export function useSettings() {
  return useContext(SettingsContext);
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [fontScale, setFontScaleState] = useState(1.0);

  useEffect(() => {
    AsyncStorage.getItem(FONT_SCALE_KEY).then((value) => {
      if (value) {
        setFontScaleState(parseFloat(value));
      }
    });
  }, []);

  function setFontScale(scale: number) {
    setFontScaleState(scale);
    AsyncStorage.setItem(FONT_SCALE_KEY, String(scale));
  }

  return (
    <SettingsContext.Provider value={{ fontScale, setFontScale }}>
      {children}
    </SettingsContext.Provider>
  );
}
