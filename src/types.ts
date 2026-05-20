export interface Inspection {
  "Nº Inspección": string;
  "Fecha Detección": string;
  "Zona / Equipo": string;
  "Descripción": string;
  "Requisito Legal S/N": "S" | "N";
  "Urgencia": "Baja" | "Media" | "Alta";
  "URL Foto": string;
  "URL PDF Presupuesto": string;
  "Asignado a": string;
  "Estado": "pendiente" | "en proceso" | "corregido" | "eliminado";
  "Corregido por": string;
  "Fecha Corrección": string;
  "Material Empleado": string;
  "Observaciones": string;
  rowIndex?: number;
}

export interface InitialDataResponse {
  success: boolean;
  inspections: Inspection[];
  nextId: string;
  userEmail: string;
  error?: string;
}

export type ActiveTab = "dashboard" | "list" | "materiales" | "script";
