export interface OracionesData {
  encargada9AM?: string;
  dom_ini?: string[];
  lun: string[];
  mar: string[];
  mie: string[];
  jue: string[];
  vie: string[];
  sab: string[];
  dom: string[];
}

export interface ListField { label: string; value: string }

export interface FloresItem {
  date?: string;
  dateLocked?: boolean;
  fields?: ListField[];
  dateStr: string;
  names: string;
  enabled?: boolean;
}

export interface VentasSunday {
  date?: string;
  dateLocked?: boolean;
  fields?: ListField[];
  dateStr: string;
  shortDateStr: string;
  cycleLabel: string;
  groups: string;
  highlight: boolean;
  enabled?: boolean;
}

export interface VentasData {
  startingCycleIndex: number;
  sundays?: VentasSunday[];
}

export interface SlideVisibility {
  oraciones5AM: boolean;
  oraciones9AM: boolean;
  oracionesTarde: boolean;
  aviso?: boolean;
  flores: boolean;
  ventas: boolean;
}

export interface WeekData {
  startDate: string;
  oraciones: OracionesData;
  flores: FloresItem[];
  floresCustomMessage?: string;
  notice?: { text: string; align: 'left' | 'center' | 'right'; position: 'top' | 'middle' | 'bottom'; size: 'compact' | 'normal' | 'large' };
  ventas: VentasData;
  visibleSlides?: SlideVisibility;
  visiblePages?: Record<string, boolean>;
}
