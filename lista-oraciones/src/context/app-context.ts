import { createContext, useContext } from 'react';
import type { WeekData, OracionesData } from '../types';

interface AppContextType {
  currentWeek: WeekData;
  savedWeeks: Record<string, WeekData>;
  customSalesGroups: string[];
  syncError: string;
  updateCustomSalesGroups: (groups: string[]) => void;
  setStartDate: (date: string) => void;
  updateOraciones: (day: keyof OracionesData, index: number, value: string) => void;
  updateEncargada9AM: (value: string) => void;
  editWeek: (change: (week: WeekData) => WeekData) => void;
  setVentasCycle: (cycleIndex: number) => void;
  toggleSlideVisibility: (key: keyof NonNullable<WeekData['visibleSlides']>) => void;
  saveCurrentWeek: () => void;
  loadWeek: (date: string) => void;
  deleteWeek: (date: string) => void;
  resetToBlankWeek: () => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};
