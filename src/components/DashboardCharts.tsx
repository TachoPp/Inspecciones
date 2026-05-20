import React, { useState } from "react";
import { Inspection } from "../types";
import { AlertTriangle, CheckCircle, Clock, ShieldAlert, BarChart3, PieChart } from "lucide-react";
import { motion } from "motion/react";

interface DashboardChartsProps {
  inspections: Inspection[];
  onSelectFilter: (type: "urgencia" | "estado" | "zona", value: string) => void;
}

export default function DashboardCharts({ inspections, onSelectFilter }: DashboardChartsProps) {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  // 1. Calculate Statistics
  const total = inspections.length;
  const pendiente = inspections.filter((i) => i.Estado === "pendiente").length;
  const enProceso = inspections.filter((i) => i.Estado === "en proceso").length;
  const corregido = inspections.filter((i) => i.Estado === "corregido").length;

  const altaUrgencia = inspections.filter((i) => i.Urgencia === "Alta").length;
  const mediaUrgencia = inspections.filter((i) => i.Urgencia === "Media").length;
  const bajaUrgencia = inspections.filter((i) => i.Urgencia === "Baja").length;

  const conRequisitoLegal = inspections.filter((i) => i["Requisito Legal S/N"] === "S").length;

  // 2. Count by Zone/Equipment
  const zoneCounts: { [key: string]: number } = {};
  inspections.forEach((ins) => {
    // Group zones slightly to avoid clutter
    let zone = ins["Zona / Equipo"] || "Otros";
    if (zone.toLowerCase().includes("inyección") || zone.toLowerCase().includes("molde")) {
      zone = "Inyección / Moldes";
    } else if (zone.toLowerCase().includes("silo") || zone.toLowerCase().includes("granulado") || zone.toLowerCase().includes("materia")) {
      zone = "Materia Prima / Silos";
    } else if (zone.toLowerCase().includes("almacén") || zone.toLowerCase().includes("expedición") || zone.toLowerCase().includes("muelle")) {
      zone = "Almacén y Logística";
    } else if (zone.toLowerCase().includes("extrusión") || zone.toLowerCase().includes("refriger")) {
      zone = "Extrusión y Servicios";
    } else {
      zone = "Otras Áreas";
    }
    zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
  });

  const zonesData = Object.entries(zoneCounts).map(([name, count]) => ({
    name,
    count,
  })).sort((a, b) => b.count - a.count);

  // Donut chart calculations for Estado
  const stateData = [
    { name: "Pendiente", count: pendiente, color: "#ef4444", bgClass: "bg-red-500" },
    { name: "En Proceso", count: enProceso, color: "#f59e0b", bgClass: "bg-amber-500" },
    { name: "Corregido", count: corregido, color: "#10b981", bgClass: "bg-emerald-500" },
  ].filter(d => total > 0);

  let cumulativePercent = 0;
  const donutSegments = stateData.map((d) => {
    const percent = total > 0 ? (d.count / total) * 100 : 0;
    const startAngle = (cumulativePercent * 360) / 100;
    cumulativePercent += percent;
    const endAngle = (cumulativePercent * 360) / 100;
    
    // Convert polar coordinates to Cartesian
    const radius = 65;
    const cx = 100;
    const cy = 100;
    
    const x1 = cx + radius * Math.cos((startAngle - 90) * Math.PI / 180);
    const y1 = cy + radius * Math.sin((startAngle - 90) * Math.PI / 180);
    const x2 = cx + radius * Math.cos((endAngle - 90) * Math.PI / 180);
    const y2 = cy + radius * Math.sin((endAngle - 90) * Math.PI / 180);
    
    const largeArcFlag = percent > 50 ? 1 : 0;
    
    const pathData = percent === 100
      ? `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius}`
      : `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;

    return {
      ...d,
      percent,
      pathData,
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-graphics">
      {/* 1. Left side - Estado Donut Chart & Urgencia level indicators */}
      <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between" id="chart-states-card">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-sans font-semibold text-slate-800 text-sm tracking-tight flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-600" />
              Distribución por Estado
            </h3>
            <span className="text-xs font-mono text-slate-500">PRL Activo</span>
          </div>

          <div className="flex items-center justify-center py-4 relative">
            {total === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">No hay inspecciones registradas</div>
            ) : (
              <div className="relative w-48 h-48">
                <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-0">
                  {donutSegments.map((seg, i) => (
                    <motion.path
                      key={seg.name}
                      d={seg.pathData}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={24}
                      strokeLinecap="round"
                      className="cursor-pointer transition-all duration-200 hover:stroke-[28px]"
                      onMouseEnter={() => setHoveredSegment(seg.name)}
                      onMouseLeave={() => setHoveredSegment(null)}
                      onClick={() => onSelectFilter("estado", seg.name.toLowerCase())}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.8, delay: i * 0.15 }}
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  {hoveredSegment ? (
                    <>
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">
                        {hoveredSegment}
                      </span>
                      <span className="text-2xl font-bold text-slate-800">
                        {hoveredSegment === "Pendiente" && pendiente}
                        {hoveredSegment === "En Proceso" && enProceso}
                        {hoveredSegment === "Corregido" && corregido}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {Math.round(
                          (hoveredSegment === "Pendiente" ? pendiente : hoveredSegment === "En Proceso" ? enProceso : corregido) / total * 100
                        )}% del total
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-slate-800">{total}</span>
                      <span className="text-[11px] text-slate-400 font-medium tracking-wider uppercase">Inspecciones</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
          {stateData.map((d) => (
            <button
              onClick={() => onSelectFilter("estado", d.name.toLowerCase())}
              key={d.name}
              className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 transition text-left group"
            >
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${d.bgClass}`}></span>
                <span className="text-xs text-slate-600 group-hover:text-slate-900 transition font-medium">{d.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-slate-700">{d.count}</span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-sm">
                  {total > 0 ? Math.round((d.count / total) * 100) : 0}%
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Middle - Urgencia level indicators & Legal requirements */}
      <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between" id="chart-urgency-card">
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-sans font-semibold text-slate-800 text-sm tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              Gravedad y Requisitos Legales
            </h3>
            <span className="text-xs font-mono text-slate-500">Nivel de Riesgo</span>
          </div>

          <div className="space-y-4">
            {/* Alta */}
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1.5">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span> Alta (Inmediata)</span>
                <span className="font-mono">{altaUrgencia} ({total > 0 ? Math.round((altaUrgencia / total) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <motion.div
                  className="bg-red-500 h-full rounded-full cursor-pointer"
                  onClick={() => onSelectFilter("urgencia", "Alta")}
                  initial={{ width: 0 }}
                  animate={{ width: `${total > 0 ? (altaUrgencia / total) * 100 : 0}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
            </div>

            {/* Media */}
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1.5">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> Media (Programar)</span>
                <span className="font-mono">{mediaUrgencia} ({total > 0 ? Math.round((mediaUrgencia / total) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <motion.div
                  className="bg-amber-500 h-full rounded-full cursor-pointer"
                  onClick={() => onSelectFilter("urgencia", "Media")}
                  initial={{ width: 0 }}
                  animate={{ width: `${total > 0 ? (mediaUrgencia / total) * 100 : 0}%` }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                />
              </div>
            </div>

            {/* Baja */}
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1.5">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-500 inline-block"></span> Baja / Preventiva</span>
                <span className="font-mono">{bajaUrgencia} ({total > 0 ? Math.round((bajaUrgencia / total) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <motion.div
                  className="bg-slate-500 h-full rounded-full cursor-pointer"
                  onClick={() => onSelectFilter("urgencia", "Baja")}
                  initial={{ width: 0 }}
                  animate={{ width: `${total > 0 ? (bajaUrgencia / total) * 100 : 0}%` }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Legal indicator banner */}
        <div className="mt-6 p-4 rounded-xl bg-orange-50 border border-orange-100/60 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-orange-950">Afectados por Normativa Legal</h4>
            <p className="text-[11px] text-orange-850 mt-1">
              Hay <strong className="font-bold">{conRequisitoLegal} incidencias</strong> asociadas a requisitos normativos estatales y de PRL. Estas requieren corrección prioritaria.
            </p>
            <button
              onClick={() => onSelectFilter("zona", "requisito_legal")}
              className="mt-2 text-[10px] font-semibold text-orange-800 hover:text-orange-950 hover:underline transition uppercase tracking-wide flex items-center gap-1"
            >
              Filtrar incidencias legales →
            </button>
          </div>
        </div>
      </div>

      {/* 3. Right - Top Affected Zones (Palletizing, Injection, Extrusion) */}
      <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs" id="chart-zones-card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-sans font-semibold text-slate-800 text-sm tracking-tight flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            Incidencias por Área
          </h3>
          <span className="text-xs font-mono text-slate-500">Zonas Industriales</span>
        </div>

        {total === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">No hay datos por zona</div>
        ) : (
          <div className="space-y-4">
            {zonesData.map((zone, idx) => {
              const maxCount = Math.max(...zonesData.map(d => d.count));
              const widthPct = maxCount > 0 ? (zone.count / maxCount) * 100 : 0;
              return (
                <div key={zone.name} className="group">
                  <div className="flex justify-between items-center text-xs text-slate-700 font-medium mb-1.5">
                    <span className="truncate text-slate-600 group-hover:text-slate-900 transition">{zone.name}</span>
                    <span className="font-mono text-slate-500 font-bold bg-slate-50 px-2 py-0.5 rounded-sm shrink-0 ml-2">
                      {zone.count} {zone.count === 1 ? "inspección" : "inspecciones"}
                    </span>
                  </div>
                  <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden">
                    <motion.div
                      className="bg-emerald-600 h-full rounded-full cursor-pointer group-hover:bg-emerald-700 transition-colors"
                      onClick={() => onSelectFilter("zona", zone.name)}
                      initial={{ width: 0 }}
                      animate={{ width: `${widthPct}%` }}
                      transition={{ duration: 0.6, delay: idx * 0.08 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
