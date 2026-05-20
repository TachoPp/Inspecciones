import React from "react";
import { Inspection } from "../types";
import { AlertCircle, CheckCircle2, ClipboardList, Layers, ShieldCheck, Flame } from "lucide-react";
import { motion } from "motion/react";

interface StatsGridProps {
  inspections: Inspection[];
  onSelectCard: (type: "urgencia" | "estado" | "requisito" | "todas", value: string) => void;
  activeFilter: { type: string; value: string } | null;
}

export default function StatsGrid({ inspections, onSelectCard, activeFilter }: StatsGridProps) {
  const activeInspections = inspections.filter((i) => i.Estado !== "eliminado");
  const total = activeInspections.length;
  const pendientes = activeInspections.filter((i) => i.Estado === "pendiente").length;
  const enProceso = activeInspections.filter((i) => i.Estado === "en proceso").length;
  const corregidos = activeInspections.filter((i) => i.Estado === "corregido").length;
  
  const altaUrgencia = activeInspections.filter((i) => i.Urgencia === "Alta").length;
  const conRequisitoLegal = activeInspections.filter((i) => i["Requisito Legal S/N"] === "S").length;

  const stats = [
    {
      label: "Total Inspecciones",
      value: total,
      icon: Layers,
      color: "text-slate-600 bg-slate-50 border-slate-100",
      action: () => onSelectCard("todas", "all"),
      active: activeFilter === null,
      subtext: "Registros históricos"
    },
    {
      label: "Pendientes",
      value: pendientes,
      icon: ClipboardList,
      color: "text-red-600 bg-red-50 border-red-100/60",
      action: () => onSelectCard("estado", "pendiente"),
      active: activeFilter?.type === "estado" && activeFilter?.value === "pendiente",
      subtext: "Requieren evaluación"
    },
    {
      label: "En Proceso",
      value: enProceso,
      icon: AlertCircle,
      color: "text-amber-600 bg-amber-50 border-amber-100/60",
      action: () => onSelectCard("estado", "en proceso"),
      active: activeFilter?.type === "estado" && activeFilter?.value === "en proceso",
      subtext: "Reparación solicitada"
    },
    {
      label: "Corregidos",
      value: corregidos,
      icon: CheckCircle2,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100/60",
      action: () => onSelectCard("estado", "corregido"),
      active: activeFilter?.type === "estado" && activeFilter?.value === "corregido",
      subtext: "Conformidad técnica"
    },
    {
      label: "Urgencia Alta",
      value: altaUrgencia,
      icon: Flame,
      color: "text-rose-700 bg-rose-50 border-rose-100/80",
      action: () => onSelectCard("urgencia", "Alta"),
      active: activeFilter?.type === "urgencia" && activeFilter?.value === "Alta",
      subtext: "Riesgos inminentes"
    },
    {
      label: "Requisito Legal",
      value: conRequisitoLegal,
      icon: ShieldCheck,
      color: "text-indigo-600 bg-indigo-50 border-indigo-100/60",
      action: () => onSelectCard("requisito", "S"),
      active: activeFilter?.type === "requisito" && activeFilter?.value === "S",
      subtext: "Sujetos a normativa"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4" id="executive-stats-panel">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.button
            key={stat.label}
            onClick={stat.action}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            className={`flex flex-col justify-between p-4 rounded-xl border text-left cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
              stat.active
                ? "ring-2 ring-emerald-600 bg-white border-emerald-600 shadow-md transform -translate-y-0.5"
                : "bg-white hover:bg-slate-50 border-slate-100/80 hover:shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-[11px] font-sans font-medium text-slate-500 tracking-tight uppercase truncate">
                {stat.label}
              </span>
              <span className={`p-1.5 rounded-lg border ${stat.color} shrink-0`}>
                <Icon className="w-3.5 h-3.5" />
              </span>
            </div>
            
            <div className="mt-1">
              <span className="text-2xl font-bold text-slate-800 font-mono tracking-tight leading-none">
                {stat.value}
              </span>
              <p className="text-[10px] text-slate-400 mt-1 font-medium select-none truncate">
                {stat.subtext}
              </p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
