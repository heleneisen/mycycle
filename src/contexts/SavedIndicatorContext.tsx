import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

type SavedIndicatorContextValue = {
  saved: boolean;
  triggerSaved: () => void;
};

const SavedIndicatorContext = createContext<SavedIndicatorContextValue | null>(null);

export function SavedIndicatorProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSaved = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSaved(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setSaved(false);
    }, 2000);
  }, []);

  return (
    <SavedIndicatorContext.Provider value={{ saved, triggerSaved }}>
      {children}
    </SavedIndicatorContext.Provider>
  );
}

export function useSavedIndicator() {
  const ctx = useContext(SavedIndicatorContext);
  return ctx;
}
