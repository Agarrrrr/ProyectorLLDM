import { addDays, mondayOf, formatCalendarDate } from '../calendar';
import React, { useEffect } from 'react';
import type { WeekData, OracionesData } from '../types';
import { AppContext } from './app-context';
import { useSharedLists } from './useSharedLists';
import { DEFAULT_SALES_GROUPS, formatDate, generateEmptyWeek, getMonday, normalizeWeekData } from './week-data';

function readLegacyValue(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); }
  catch { return null; }
}

function readLegacyWeek(): WeekData | null {
  const value = readLegacyValue('lldm_current_draft') as WeekData | null;
  if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.startDate !== 'string'
    || !value.oraciones || typeof value.oraciones !== 'object' || !Array.isArray(value.flores)
    || !value.ventas || typeof value.ventas !== 'object' || (value.ventas.sundays !== undefined && !Array.isArray(value.ventas.sundays))) return null;
  try { return normalizeWeekData(value); } catch { return null; }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { document, ready, error, update, initialize } = useSharedLists();
  const customSalesGroups = document.customSalesGroups ?? DEFAULT_SALES_GROUPS;
  const savedWeeks = document.weeks;
  const currentWeek = document.currentWeek
    ? normalizeWeekData(document.currentWeek)
    : generateEmptyWeek(formatDate(getMonday(new Date())), customSalesGroups);

  useEffect(() => {
    if (!ready || document.currentWeek) return;
    const savedGroups = readLegacyValue('lldm_custom_sales_groups');
    const groups = Array.isArray(savedGroups) && savedGroups.length >= 1 && savedGroups.length <= 24 && savedGroups.every(group => typeof group === 'string') ? savedGroups : DEFAULT_SALES_GROUPS;
    const initialWeek = readLegacyWeek() ?? generateEmptyWeek(formatDate(getMonday(new Date())), groups);
    void initialize(initialWeek, groups);
  }, [ready, document.currentWeek, initialize]);

  const setCurrentWeek = (change: WeekData | ((prev: WeekData) => WeekData)) => {
    update(current => {
      const base = current.currentWeek ? normalizeWeekData(current.currentWeek) : currentWeek;
      const nextWeek = normalizeWeekData(typeof change === 'function' ? change(base) : change);
      return {
        ...current,
        currentWeek: nextWeek
      };
    });
  };

  const updateCustomSalesGroups = (groups: string[]) => {
    update(current => {
      const base = current.currentWeek ? normalizeWeekData(current.currentWeek) : currentWeek;
      const currentCycle = (base.ventas.startingCycleIndex || 0) % groups.length;
      const updatedSundays = base.ventas.sundays?.map((s, i) => {
        const gIdx = (currentCycle + i) % groups.length;
        return { ...s, groups: groups[gIdx], cycleLabel: `Turno ${gIdx + 1}` };
      });
      return {
        ...current,
        customSalesGroups: groups,
        currentWeek: { ...base, ventas: { ...base.ventas, startingCycleIndex: currentCycle, sundays: updatedSundays } }
      };
    });
  };

  const setStartDate = (value: string) => {
    const dateStr = mondayOf(value);
    if (savedWeeks[dateStr]) { loadWeek(dateStr); return; }
    setCurrentWeek(prev => {
      const days = Math.round((Date.parse(dateStr) - Date.parse(mondayOf(prev.startDate))) / 86400000);
      function moveDate<T extends { date?: string; dateStr: string; dateLocked?: boolean }>(row: T): T {
        if (!row.date || row.dateLocked) return row;
        const date = addDays(row.date, days);
        return { ...row, date, dateStr: formatCalendarDate(date) };
      }
      return {
        ...prev, startDate: dateStr,
        flores: prev.flores.map(moveDate),
        ventas: { ...prev.ventas, sundays: prev.ventas.sundays?.map(moveDate) }
      };
    });
  };

  const updateOraciones = (day: keyof OracionesData, index: number, value: string) => {
    if (day === 'encargada9AM') return;
    setCurrentWeek(prev => {
      const currentArray = prev.oraciones[day] || (day === 'dom_ini' || day === 'jue' || day === 'dom' ? ["", "", "", "", "", "", ""] : ["", "", "", ""]);
      const dayArray = [...currentArray];
      dayArray[index] = value;
      return {
        ...prev,
        oraciones: {
          ...prev.oraciones,
          [day]: dayArray
        }
      };
    });
  };

  const updateEncargada9AM = (value: string) => {
    setCurrentWeek(prev => ({
      ...prev,
      oraciones: {
        ...prev.oraciones,
        encargada9AM: value
      }
    }));
  };

  const setVentasCycle = (cycleIndex: number) => {
    setCurrentWeek(prev => {
      const sundays = (prev.ventas.sundays || []).map((s, i) => {
        const gIdx = (cycleIndex + i) % customSalesGroups.length;
        return { ...s, cycleLabel: `Turno ${gIdx + 1}`, groups: customSalesGroups[gIdx] };
      });
      return {
        ...prev,
        ventas: {
          startingCycleIndex: cycleIndex,
          sundays
        }
      };
    });
  };

  const toggleSlideVisibility = (key: keyof NonNullable<WeekData['visibleSlides']>) => {
    setCurrentWeek(prev => {
      const currentVis = prev.visibleSlides || {
        oraciones5AM: true,
        oraciones9AM: true,
        oracionesTarde: true,
        flores: true,
        ventas: true
      };
      return {
        ...prev,
        visibleSlides: {
          ...currentVis,
          [key]: currentVis[key] === false
        }
      };
    });
  };

  const saveCurrentWeek = () => {
    update(current => ({
      ...current,
      currentWeek,
      weeks: { ...current.weeks, [currentWeek.startDate]: JSON.parse(JSON.stringify(currentWeek)) }
    }));
  };

  const loadWeek = (date: string) => {
    if (savedWeeks[date]) {
      setCurrentWeek(normalizeWeekData(JSON.parse(JSON.stringify(savedWeeks[date]))));
    }
  };

  const deleteWeek = (date: string) => {
    update(current => {
      const weeks = { ...current.weeks };
      delete weeks[date];
      return { ...current, weeks };
    });
  };

  const resetToBlankWeek = () => {
    const nextMonday = formatDate(getMonday(new Date()));
    setCurrentWeek(generateEmptyWeek(nextMonday, customSalesGroups));
  };

  if (!ready || !document.currentWeek) return <p className="list-loading" role="status">{error || "Cargando listas…"}</p>;

  return (
    <AppContext.Provider value={{
      currentWeek,
      savedWeeks,
      customSalesGroups,
      syncError: error,
      updateCustomSalesGroups,
      setStartDate,
      updateOraciones,
      updateEncargada9AM,
      editWeek: setCurrentWeek,
      setVentasCycle,
      toggleSlideVisibility,
      saveCurrentWeek,
      loadWeek,
      deleteWeek,
      resetToBlankWeek
    }}>
      {children}
    </AppContext.Provider>
  );
};
