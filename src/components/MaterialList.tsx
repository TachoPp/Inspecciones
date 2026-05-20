import React, { useState } from "react";
import { Inspection } from "../types";
import { Search, FileSpreadsheet, ClipboardList, Edit3, ArrowUpRight, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "motion/react";

interface MaterialListProps {
  inspections: Inspection[];
  onEdit: (inspection: Inspection) => void;
}

export default function MaterialList({ inspections, onEdit }: MaterialListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Get all inspections that are either corrected, or have any material listed!
  // The user says "Aunque no la marque como corregida siempre tengo la opción de añadir los materiales"
  // So we display all inspections that have any non-empty materials or are corrected.
  const recordsWithMaterials = inspections.filter((ins) => {
    const hasMaterials = (ins["Material Empleado"] || "").trim().length > 0;
    // We also want to let them see items where they *could* add materials, but to avoid cluttering, 
    // we show all items with material, and also let them quickly view/search other active inspections 
    // to add materials to them! This is incredibly helpful.
    
    if (searchQuery) {
      const matchSearch = 
        (ins["Material Empleado"] || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ins["Zona / Equipo"] || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ins["Nº Inspección"] || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    }

    return hasMaterials;
  });

  // Also get pending/in-progress items so they can easily click and add materials!
  const pendingToInjectMaterials = inspections.filter((ins) => {
    const isEmptyMaterials = !(ins["Material Empleado"] || "").trim();
    const isNotCorrected = ins.Estado !== "corregido" && ins.Estado !== "eliminado";
    return isEmptyMaterials && isNotCorrected;
  });

  return (
    <div className="space-y-6" id="material-list-section">
      
      {/* Search Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-emerald-600" />
              Gestión e Historial de Materiales Empleados
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Registro del stock consumido, repuestos utilizados y señalización instalada en la fábrica.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-3.5 w-3.5 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Buscar por repuesto, zona o ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:outline-hidden rounded-lg text-xs"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left/Middle: Current registered materials */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Reporte de Consumo ({recordsWithMaterials.length})
            </h4>
          </div>

          {recordsWithMaterials.length === 0 ? (
            <div className="bg-white border border-slate-100 p-12 text-center rounded-2xl shadow-xs">
              <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-xs font-semibold text-slate-600">No hay materiales registrados</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Escribe en el buscador o usa el panel lateral para añadir materiales a una incidencia.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {recordsWithMaterials.map((ins) => (
                <motion.div
                  key={ins["Nº Inspección"]}
                  whileHover={{ y: -1 }}
                  className="bg-white border border-slate-100 rounded-xl p-4 shadow-xs flex flex-col justify-between hover:shadow-sm"
                >
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs font-extrabold text-slate-400">
                        {ins["Nº Inspección"]}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        ins.Estado === "corregido" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      }`}>
                        {ins.Estado.toUpperCase()}
                      </span>
                    </div>

                    <div className="mt-2 text-xs">
                      <span className="text-slate-400 font-medium">Zona / Máquina:</span>{" "}
                      <span className="font-semibold text-slate-800">{ins["Zona / Equipo"]}</span>
                    </div>

                    <div className="mt-3 bg-slate-50 border border-slate-100 p-3 rounded-lg">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Materiales Utilizados:</p>
                      <p className="text-xs text-slate-700 font-medium font-mono">{ins["Material Empleado"]}</p>
                    </div>

                    {ins.Observaciones && (
                      <p className="text-[11px] text-slate-500 mt-2 italic">
                        Nota: {ins.Observaciones}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <div className="text-slate-400">
                      {ins["Fecha Corrección"] ? (
                        <span>Instalado el <strong>{ins["Fecha Corrección"]}</strong></span>
                      ) : (
                        <span>Registrado sin fecha de cierre</span>
                      )}
                      {ins["Corregido por"] && <span> por <em>{ins["Corregido por"]}</em></span>}
                    </div>

                    <button
                      onClick={() => onEdit(ins)}
                      className="px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded bg-emerald-50/40 transition flex items-center gap-1"
                    >
                      Editar Ficha
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Right column: Rapid portal to Add materials directly to ongoing inspections! */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Añadir Material a Incidencia Activa
          </h4>

          <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs space-y-3">
            <p className="text-xs text-slate-500 leading-relaxed">
              Selecciona una de las siguientes incidencias activas en planta para registrarle materiales de mantenimiento inmediatamente:
            </p>

            <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto pr-1">
              {pendingToInjectMaterials.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No hay incidencias activas sin materiales asignados.
                </div>
              ) : (
                pendingToInjectMaterials.map((ins) => (
                  <div
                    key={ins["Nº Inspección"]}
                    className="py-3 first:pt-0 last:pb-0 hover:bg-slate-50/50 rounded-lg p-2 transition group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400 group-hover:text-emerald-700">
                        {ins["Nº Inspección"]}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        ins.Urgencia === "Alta" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"
                      }`}>
                        {ins.Urgencia}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 truncate mt-1">{ins["Zona / Equipo"]}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{ins.Descripción}</p>
                    
                    <button
                      onClick={() => onEdit(ins)}
                      className="mt-2 w-full text-center py-1 bg-slate-100 hover:bg-emerald-600 hover:text-white rounded-md text-[11px] font-semibold text-slate-700 transition flex items-center justify-center gap-1"
                    >
                      Asignar Materiales
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
