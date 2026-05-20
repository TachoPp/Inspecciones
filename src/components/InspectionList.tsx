import React, { useState, useEffect } from "react";
import { Inspection } from "../types";
import { 
  Search, Grid, List as ListIcon, AlertCircle, Calendar, User, 
  CheckCircle2, FileImage, FileText, ArrowUpCircle, Info, Edit3, Trash2, 
  MapPin, ShieldAlert, ExternalLink, RefreshCw, X, Eye, Trash, Award,
  Send, FolderUp, MailWarning, Loader2, Mail
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { sendGmail, uploadToDrive } from "../lib/googleWorkspace";

interface InspectionListProps {
  inspections: Inspection[];
  onEdit: (inspection: Inspection) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
  onClearFilter: () => void;
  activeFilter: { type: string; value: string } | null;
  accessToken?: string | null;
}

export default function InspectionList({ 
  inspections, 
  onEdit, 
  onDelete, 
  onAddNew, 
  onClearFilter,
  activeFilter,
  accessToken
}: InspectionListProps) {
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pendiente" | "en proceso" | "corregido" | "eliminado">("all");
  const [urgencyFilter, setUrgencyFilter] = useState<"all" | "Alta" | "Media" | "Baja">("all");

  // Excel-like column filters for the table view
  const [colFilterId, setColFilterId] = useState("");
  const [colFilterEstado, setColFilterEstado] = useState<"all" | "pendiente" | "en proceso" | "corregido" | "eliminado">("all");
  const [colFilterZona, setColFilterZona] = useState("");
  const [colFilterUrgencia, setColFilterUrgencia] = useState<"all" | "Alta" | "Media" | "Baja">("all");

  // Selected inspection for detalled preview
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);

  // Google Workspace sub-states
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailExtraMessage, setEmailExtraMessage] = useState("");
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ text: string; success: boolean } | null>(null);
  
  const [isDriveReportUploading, setIsDriveReportUploading] = useState(false);
  const [driveReportLink, setDriveReportLink] = useState<string | null>(null);

  // Initialize/reset states when active inspection changes
  useEffect(() => {
    if (selectedInspection) {
      setEmailRecipient(selectedInspection["Asignado a"] || "mantenimiento@ponienteplast.es");
      setEmailExtraMessage("");
      setEmailStatus(null);
      setDriveReportLink(null);
    }
  }, [selectedInspection]);

  const handleSendGmailReport = async () => {
    if (!accessToken || !selectedInspection) return;
    if (!emailRecipient) {
      setEmailStatus({ text: "Introduce una dirección de correo válida.", success: false });
      return;
    }

    setIsEmailSending(true);
    setEmailStatus(null);

    try {
      const subject = `INFORME PRL - Ficha Técnica ${selectedInspection["Nº Inspección"]} [Ponienteplast S.A.]`;
      const htmlContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; color: #1e293b; background-color: #ffffff;">
          <div style="border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 16px;">
            <h2 style="color: #059669; margin: 0; font-size: 18px; font-weight: 800;">Ponienteplast S.A.</h2>
            <p style="color: #64748b; font-size: 11px; margin: 2px 0 0 0; text-transform: uppercase; letter-spacing: 0.5px;">Control de Prevención de Riesgos Laborales</p>
          </div>
          
          <p style="font-size: 13px; font-weight: bold; color: #334155; margin-bottom: 8px;">Ficha Compartida desde el Panel de Seguridad:</p>
          ${emailExtraMessage ? `<div style="background-color: #f1f5f9; border-left: 4px solid #0f766e; padding: 12px; font-style: italic; font-size: 12px; color: #334155; border-radius: 0 8px 8px 0; margin-bottom: 16px;">"${emailExtraMessage}"</div>` : ""}

          <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px;">
            <tr style="background-color: #f8fafc;">
              <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-weight: bold; width: 40%;">ID Inspección</th>
              <td style="padding: 8px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold;">${selectedInspection["Nº Inspección"]}</td>
            </tr>
            <tr>
              <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-weight: bold;">Zona de Fábrica</th>
              <td style="padding: 8px; border: 1px solid #e2e8f0;">${selectedInspection["Zona / Equipo"]}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-weight: bold;">Fecha Registro</th>
              <td style="padding: 8px; border: 1px solid #e2e8f0;">${selectedInspection["Fecha Detección"]}</td>
            </tr>
            <tr>
              <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-weight: bold;">Nivel Urgencia</th>
              <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; color: ${selectedInspection.Urgencia === "Alta" ? "#b91c1c" : selectedInspection.Urgencia === "Media" ? "#b45309" : "#1d4ed8"};">${selectedInspection.Urgencia}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-weight: bold;">Estado</th>
              <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; text-transform: uppercase; color: ${selectedInspection.Estado === "corregido" ? "#15803d" : "#b45309"}">${selectedInspection.Estado}</td>
            </tr>
            <tr>
              <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-weight: bold;">Asignado a</th>
              <td style="padding: 8px; border: 1px solid #e2e8f0; font-family: monospace;">${selectedInspection["Asignado a"] || "Sin asignar"}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-weight: bold;">Materiales Empleados</th>
              <td style="padding: 8px; border: 1px solid #e2e8f0;">${selectedInspection["Material Empleado"] || "Ninguno"}</td>
            </tr>
          </table>

          <div style="margin: 15px 0;">
            <p style="color: #64748b; font-size: 11px; font-weight: bold; margin: 0 0 4px 0; text-transform: uppercase;">Detalles de la Deficiencia:</p>
            <div style="background-color: #fafafa; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 12px; line-height: 1.5;">
              ${selectedInspection.Descripción}
            </div>
          </div>

          ${selectedInspection.Observaciones ? `
          <div style="margin: 15px 0;">
            <p style="color: #64748b; font-size: 11px; font-weight: bold; margin: 0 0 4px 0; text-transform: uppercase;">Observaciones del Técnico:</p>
            <div style="background-color: #fafafa; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 12px; font-style: italic;">
              ${selectedInspection.Observaciones}
            </div>
          </div>
          ` : ""}

          ${selectedInspection["URL Foto"] ? `
          <div style="margin-top: 20px; text-align: center;">
            <a href="${selectedInspection["URL Foto"]}" style="display: inline-block; padding: 8px 16px; background-color: #059669; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 11px; font-weight: bold;">Ver Foto de Evidencia Técnica</a>
          </div>
          ` : ""}

          <div style="margin-top: 25px; border-top: 1px solid #f1f5f9; padding-top: 12px; text-align: center; font-size: 10px; color: #94a3b8;">
            Atentamente, Ponienteplast S.A.
          </div>
        </div>
      `;

      await sendGmail(accessToken, emailRecipient, subject, htmlContent);
      setEmailStatus({ text: "¡Email de reporte enviado con éxito!", success: true });
    } catch (err: any) {
      console.error(err);
      setEmailStatus({ text: "Error de envío: " + err.message, success: false });
    } finally {
      setIsEmailSending(false);
    }
  };

  const handleExportReportToDrive = async () => {
    if (!accessToken || !selectedInspection) return;
    setIsDriveReportUploading(true);
    setDriveReportLink(null);

    try {
      const fileName = `Informe_PRL_Ficha_${selectedInspection["Nº Inspección"]}.txt`;
      const reportText = `====================================================================
INFORME TÉCNICO DE SEGURIDAD INDUSTRIAL - PONIENTEPLAST S.A.
====================================================================
Número Ficha:          ${selectedInspection["Nº Inspección"]}
Fecha Creación:        ${selectedInspection["Fecha Detección"]}
Zona / Sección Planta: ${selectedInspection["Zona / Equipo"]}
Urgencia Evaluada:     ${selectedInspection.Urgencia}
Estado Actual:          ${selectedInspection.Estado.toUpperCase()}
Normativa / Requisito Legal: ${selectedInspection["Requisito Legal S/N"] === "S" ? "SÍ" : "NO"}
Técnico Asignado:      ${selectedInspection["Asignado a"] || "Sin asignar"}

--------------------------------------------------------------------
DESCRIPCIÓN DE INCIDENCIA:
--------------------------------------------------------------------
${selectedInspection.Descripción}

--------------------------------------------------------------------
MATERIAL Y REPUESTOS:
--------------------------------------------------------------------
${selectedInspection["Material Empleado"] || "Ninguno asignado."}

--------------------------------------------------------------------
COMENTARIOS Y OBSERVACIONES:
--------------------------------------------------------------------
${selectedInspection.Observaciones || "Ninguna registrada."}

--------------------------------------------------------------------
ESTADO DE CIERRE:
--------------------------------------------------------------------
${selectedInspection.Estado === "corregido" ? `SÍ - Reparación finalizada por ${selectedInspection["Corregido por"]} el ${selectedInspection["Fecha Corrección"]}.` : "Plaficado / En proceso."}

====================================================================
Copia de respaldo subida el ${new Date().toLocaleString()}
Prevención de Riesgos Laborales Ponienteplast S.A.
====================================================================`;

      const res = await uploadToDrive(accessToken, fileName, "text/plain", reportText);
      if (res.webViewLink) {
        setDriveReportLink(res.webViewLink);
      }
    } catch (err: any) {
      console.error(err);
      alert("Error al subir a Google Drive: " + err.message);
    } finally {
      setIsDriveReportUploading(false);
    }
  };

  // Filter inspections based on all active criteria
  const filteredInspections = inspections.filter((ins) => {
    // 0. Soft-delete filter rule:
    // If we're looking at statusFilter === "all" or colFilterEstado === "all", 
    // hide "eliminado" records by default. If they explicitly filter "eliminado", show them.
    const isEliminated = ins.Estado === "eliminado";
    const wantsEliminated = statusFilter === "eliminado" || colFilterEstado === "eliminado" || (activeFilter?.type === "estado" && activeFilter?.value === "eliminado");
    
    if (isEliminated && !wantsEliminated) {
      return false;
    }

    // 1. General search query (across multiple fields)
    const textFields = [
      ins["Nº Inspección"],
      ins["Zona / Equipo"],
      ins.Descripción,
      ins["Asignado a"],
      ins.Observaciones,
      ins["Corregido por"],
      ins["Material Empleado"]
    ].join(" ").toLowerCase();
    const matchesSearch = textFields.includes(searchQuery.toLowerCase());

    // 2. Executive filter (Stats Grid or Charts selectors)
    let matchesExecutive = true;
    if (activeFilter) {
      if (activeFilter.type === "estado") {
        matchesExecutive = ins.Estado === activeFilter.value;
      } else if (activeFilter.type === "urgencia") {
        matchesExecutive = ins.Urgencia === activeFilter.value;
      } else if (activeFilter.type === "requisito") {
        matchesExecutive = ins["Requisito Legal S/N"] === activeFilter.value;
      } else if (activeFilter.type === "zona") {
        if (activeFilter.value === "requisito_legal") {
          matchesExecutive = ins["Requisito Legal S/N"] === "S";
        } else if (activeFilter.value === "Inyección / Moldes") {
          matchesExecutive = ins["Zona / Equipo"].toLowerCase().includes("inyección") || ins["Zona / Equipo"].toLowerCase().includes("molde");
        } else if (activeFilter.value === "Materia Prima / Silos") {
          matchesExecutive = ins["Zona / Equipo"].toLowerCase().includes("silo") || ins["Zona / Equipo"].toLowerCase().includes("granulado") || ins["Zona / Equipo"].toLowerCase().includes("materia");
        } else if (activeFilter.value === "Almacén y Logística") {
          matchesExecutive = ins["Zona / Equipo"].toLowerCase().includes("almacén") || ins["Zona / Equipo"].toLowerCase().includes("expedición") || ins["Zona / Equipo"].toLowerCase().includes("muelle");
        } else if (activeFilter.value === "Extrusión y Servicios") {
          matchesExecutive = ins["Zona / Equipo"].toLowerCase().includes("extrusión") || ins["Zona / Equipo"].toLowerCase().includes("refriger");
        } else {
          const otherKeywords = ["inyección", "molde", "silo", "granulado", "materia", "almacén", "expedición", "muelle", "extrusión", "refriger"];
          matchesExecutive = !otherKeywords.some(kw => ins["Zona / Equipo"].toLowerCase().includes(kw));
        }
      }
    }

    // 3. General top filters
    const matchesStatus = statusFilter === "all" ? true : ins.Estado === statusFilter;
    const matchesUrgency = urgencyFilter === "all" ? true : ins.Urgencia === urgencyFilter;

    // 4. Excel-like column filters (specific for columns)
    const matchesColId = ins["Nº Inspección"].toLowerCase().includes(colFilterId.toLowerCase());
    const matchesColEstado = colFilterEstado === "all" ? true : ins.Estado === colFilterEstado;
    const matchesColZona = ins["Zona / Equipo"].toLowerCase().includes(colFilterZona.toLowerCase());
    const matchesColUrgencia = colFilterUrgencia === "all" ? true : ins.Urgencia === colFilterUrgencia;

    return matchesSearch && matchesExecutive && matchesStatus && matchesUrgency && 
           matchesColId && matchesColEstado && matchesColZona && matchesColUrgencia;
  });

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "Alta":
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-150 text-red-800 border border-red-300">ALTA</span>;
      case "Media":
        return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">MEDIA</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">BAJA</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendiente":
        return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-red-55 border border-red-200 text-red-650">Pendiente</span>;
      case "en proceso":
        return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-55 border border-amber-200 text-amber-655">En Proceso</span>;
      case "corregido":
        return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-55 border border-emerald-200 text-emerald-650">Corregido</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-150 border border-slate-300 text-slate-600 line-through">Eliminado</span>;
    }
  };

  const handleRowClick = (ins: Inspection) => {
    setSelectedInspection(ins);
  };

  const resetAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setUrgencyFilter("all");
    setColFilterId("");
    setColFilterEstado("all");
    setColFilterZona("");
    setColFilterUrgencia("all");
    onClearFilter();
  };

  return (
    <div className="space-y-4" id="inspection-list-section">
      {/* 1. Filtering controls panel */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs space-y-4" id="filters-container">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 gap-y-4">
          
          {/* Action and Indicators */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onAddNew}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs tracking-wide transition shadow-xs flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              id="btn-new-inspection-primary"
            >
              + Nueva Inspección
            </button>

            {activeFilter && (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 font-medium border border-emerald-100 px-3 py-1.5 rounded-lg animate-fade-in">
                Filtro rápido activo: <strong>{activeFilter.value}</strong>
                <button 
                  onClick={onClearFilter}
                  className="hover:bg-emerald-100 text-emerald-600 rounded-full p-0.5"
                  title="Quitar filtro"
                >
                  ✕
                </button>
              </span>
            )}
          </div>

          {/* Toggle View & Search */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-3.5 w-3.5 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="Buscar por ID, descripción, material..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:outline-hidden rounded-lg text-xs text-slate-800 placeholder:text-slate-400 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 text-xs font-semibold"
                >
                  Limpiar
                </button>
              )}
            </div>

            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition ${viewMode === "grid" ? "bg-white text-slate-800 shadow-xs" : "text-slate-400 hover:text-slate-600"}`}
                title="Vista de Tarjetas"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-md transition ${viewMode === "table" ? "bg-white text-slate-800 shadow-xs" : "text-slate-400 hover:text-slate-600"}`}
                title="Vista de Tabla (Excel)"
              >
                <ListIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Global/Quick Status & Urgency tabs */}
        <div className="flex flex-wrap items-center gap-y-3 gap-x-6 pt-3 border-t border-slate-100 text-xs">
          {/* Status Tabs */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Estado rápido:</span>
            <div className="flex bg-slate-50 border border-slate-100 p-0.5 rounded-lg">
              {(["all", "pendiente", "en proceso", "corregido", "eliminado"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setStatusFilter(status);
                    setColFilterEstado(status); // Sync with column filter as well
                  }}
                  className={`px-3 py-1 rounded-md text-[11px] capitalize font-medium transition ${
                    statusFilter === status
                      ? "bg-white text-emerald-750 font-semibold shadow-xs border border-slate-200/40"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {status === "all" ? "Activas" : status}
                </button>
              ))}
            </div>
          </div>

          {/* Urgencia Tabs */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Urgencia rápida:</span>
            <div className="flex bg-slate-50 border border-slate-100 p-0.5 rounded-lg">
              {(["all", "Alta", "Media", "Baja"] as const).map((urgency) => (
                <button
                  key={urgency}
                  onClick={() => {
                    setUrgencyFilter(urgency);
                    setColFilterUrgencia(urgency); // Sync with Excel option
                  }}
                  className={`px-3 py-1 rounded-md text-[11px] font-medium transition ${
                    urgencyFilter === urgency
                      ? "bg-white text-emerald-750 font-semibold shadow-xs border border-slate-200/40"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {urgency === "all" ? "Todas" : urgency}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Results Count */}
      <div className="flex justify-between items-center text-xs text-slate-500 font-mono">
        <span>Se muestran {filteredInspections.length} de {inspections.length} incidencias</span>
        {(searchQuery || statusFilter !== "all" || urgencyFilter !== "all" || colFilterId || colFilterEstado !== "all" || colFilterZona || colFilterUrgencia !== "all") && (
          <button 
            type="button" 
            onClick={resetAllFilters}
            className="text-emerald-600 font-bold hover:underline"
          >
            Limpiar todos los filtros (Excel + General)
          </button>
        )}
      </div>

      {/* 3. Render content dynamically */}
      {filteredInspections.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-16 text-center shadow-xs">
          <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="font-sans font-semibold text-slate-700 text-sm">No se encontraron registros</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            No hay incidencias que coincidan con la combinación de filtros de Excel o texto ingresado.
          </p>
          <button
            onClick={resetAllFilters}
            className="mt-4 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg text-xs transition"
          >
            Limpiar Filtros
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* --- GRID VIEW --- */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in" id="view-inspections-grid">
          <AnimatePresence mode="popLayout">
            {filteredInspections.map((ins) => (
              <motion.div
                key={ins["Nº Inspección"]}
                layoutId={`card-${ins["Nº Inspección"]}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => handleRowClick(ins)}
                className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs hover:shadow-md hover:border-slate-200 transition duration-200 flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-mono text-xs font-bold text-slate-400 tracking-wider">
                      {ins["Nº Inspección"]}
                    </span>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {ins["Requisito Legal S/N"] === "S" && (
                        <span className="inline-flex text-[9px] items-center gap-1 tracking-tight font-extrabold px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700">
                          LEGAL
                        </span>
                      )}
                      {getUrgencyBadge(ins.Urgencia)}
                      {getStatusBadge(ins.Estado)}
                    </div>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5 mb-2 group-hover:text-emerald-700 transition">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 group-hover:text-emerald-600" />
                    {ins["Zona / Equipo"]}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">
                    {ins.Descripción}
                  </p>

                  {/* Metadata Indicators Row */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 py-2 border-t border-slate-50 mb-3 font-mono">
                    <div className="flex items-center gap-1.5 truncate">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{ins["Fecha Detección"]}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{ins["Asignado a"] || "Sin asignar"}</span>
                    </div>
                  </div>
                </div>

                {/* Attachments & Operations buttons */}
                <div onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between py-1.5 border-t border-slate-100 mb-2">
                    <div className="flex items-center gap-1">
                      {ins["URL Foto"] ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 border border-slate-150 rounded text-[9px] font-mono text-slate-600">
                          <FileImage className="w-2.5 h-2.5 text-emerald-600" /> Foto
                        </span>
                      ) : null}
                      {ins["URL PDF Presupuesto"] ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 border border-slate-150 rounded text-[9px] font-mono text-slate-600">
                          <FileText className="w-2.5 h-2.5 text-indigo-600" /> PDF
                        </span>
                      ) : null}
                      {ins["Material Empleado"] ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 border border-emerald-100 rounded text-[9px] font-mono text-emerald-800" title={ins["Material Empleado"]}>
                          Materiales
                        </span>
                      ) : null}
                    </div>

                    <div className="text-[10px] font-mono text-slate-400">
                      Fila Sheet: {ins.rowIndex || "?"}
                    </div>
                  </div>

                  {ins.Estado === "corregido" && ins["Fecha Corrección"] && (
                    <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-100/40 mb-3 text-[10px] text-emerald-800">
                      <span className="font-bold">✓ Corregido</span> por <span className="font-semibold">{ins["Corregido por"]}</span> el {ins["Fecha Corrección"]}
                    </div>
                  )}

                  {/* Operational actions */}
                  <div className="flex items-center gap-1.5 mt-2 justify-end">
                    <button
                      onClick={() => onEdit(ins)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition duration-150 flex items-center gap-1 focus:outline-none"
                    >
                      <Edit3 className="w-3 h-3" />
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`¿Seguro que deseas eliminar el registro de inspección permanentemente en Google Sheets y localmente (${ins["Nº Inspección"]})?`)) {
                          onDelete(ins["Nº Inspección"]);
                        }
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition duration-150 flex items-center gap-1 focus:outline-none"
                    >
                      <Trash2 className="w-3 h-3" />
                      Eliminar
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        /* --- TABULAR/TABLE VIEW (ONLY Display ID, Estado, Zona, Urgencia) --- */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden animate-fade-in" id="view-inspections-table">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                {/* 1st Row: Columns naming */}
                <tr className="bg-slate-50 text-slate-600 font-mono border-b border-slate-200">
                  <th className="p-3 font-semibold whitespace-nowrap text-slate-800 w-1/6">
                    Nº Inspección (ID)
                  </th>
                  <th className="p-3 font-semibold whitespace-nowrap text-slate-800 w-1/6">
                    Estado
                  </th>
                  <th className="p-3 font-semibold whitespace-nowrap text-slate-800 w-1/3">
                    Zona / Máquina / Equipo
                  </th>
                  <th className="p-3 font-semibold whitespace-nowrap text-slate-800 w-1/6">
                    Urgencia
                  </th>
                </tr>

                {/* 2nd Row: Excel-like Interactive filters built directly in the column itself */}
                <tr className="bg-slate-100/80 border-b border-slate-200">
                  {/* ID Column filter */}
                  <td className="p-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="🔍 Filtrar ID..."
                        value={colFilterId}
                        onChange={(e) => setColFilterId(e.target.value)}
                        className="w-full text-[11px] px-2 py-1 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                      />
                      {colFilterId && (
                        <button onClick={() => setColFilterId("")} className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600">×</button>
                      )}
                    </div>
                  </td>

                  {/* Estado Column Filter */}
                  <td className="p-2">
                    <select
                      value={colFilterEstado}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setColFilterEstado(val);
                        setStatusFilter(val); // Sync to global status tab
                      }}
                      className="w-full text-[11px] px-1 py-1 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium capitalize"
                    >
                      <option value="all">🔋 Todos</option>
                      <option value="pendiente">🔴 Pendiente</option>
                      <option value="en proceso">🟡 En Proceso</option>
                      <option value="corregido">🟢 Corregido</option>
                      <option value="eliminado">⚫ Eliminados</option>
                    </select>
                  </td>

                  {/* Zona Column Filter */}
                  <td className="p-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="🔍 Filtrar por zona/máquina..."
                        value={colFilterZona}
                        onChange={(e) => setColFilterZona(e.target.value)}
                        className="w-full text-[11px] px-2 py-1 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                      />
                      {colFilterZona && (
                        <button onClick={() => setColFilterZona("")} className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600">×</button>
                      )}
                    </div>
                  </td>

                  {/* Urgencia Column Filter */}
                  <td className="p-2">
                    <select
                      value={colFilterUrgencia}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setColFilterUrgencia(val);
                        setUrgencyFilter(val); // Sync to global urgency tab
                      }}
                      className="w-full text-[11px] px-1 py-1 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                    >
                      <option value="all">⚡ Todas</option>
                      <option value="Alta">🔴 Alta</option>
                      <option value="Media">🟡 Media</option>
                      <option value="Baja">⚪ Baja</option>
                    </select>
                  </td>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredInspections.map((ins) => (
                  <tr 
                    key={ins["Nº Inspección"]} 
                    onClick={() => handleRowClick(ins)}
                    className="hover:bg-emerald-50/40 cursor-pointer transition select-none group text-slate-800"
                  >
                    {/* ID */}
                    <td className="p-3 font-mono font-bold text-slate-500 group-hover:text-emerald-700">
                      {ins["Nº Inspección"]}
                    </td>

                    {/* Estado */}
                    <td className="p-3">
                      {getStatusBadge(ins.Estado)}
                    </td>

                    {/* Zona / Equipo */}
                    <td className="p-3 font-semibold text-slate-900 truncate max-w-sm">
                      {ins["Zona / Equipo"]}
                    </td>

                    {/* Urgencia */}
                    <td className="p-3">
                      {getUrgencyBadge(ins.Urgencia)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 p-3 text-slate-400 text-[10px] text-center font-mono border-t border-slate-100">
            💡 Consejo: Haz clic sobre cualquier fila para ver el informe al completo, ver adjuntos o editarla.
          </div>
        </div>
      )}

      {/* 4. DETAILS FULL MODAL DIALOG (Read-Only Detail modal before toggle into Edit state) */}
      <AnimatePresence>
        {selectedInspection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Modal backdrop backdrop blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInspection(null)}
              className="absolute inset-0 bg-slate-950 backdrop-blur-xs"
            />

            {/* Modal body sheet */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col z-10 max-h-[90vh]"
            >
              {/* Colored top indicator */}
              <div className={`h-2 rounded-t-2xl ${
                selectedInspection.Estado === "corregido" ? "bg-emerald-600" :
                selectedInspection.Estado === "en proceso" ? "bg-amber-500" :
                selectedInspection.Estado === "eliminado" ? "bg-slate-400" :
                "bg-red-500"
              }`} />

              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex items-start justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                      {selectedInspection["Nº Inspección"]}
                    </span>
                    {selectedInspection["Requisito Legal S/N"] === "S" && (
                      <span className="text-[9px] tracking-wider font-extrabold bg-indigo-50 border border-indigo-200 text-indigo-700 px-1.5 rounded uppercase">Requisito Legal</span>
                    )}
                    {selectedInspection.Estado === "eliminado" && (
                      <span className="text-[9px] tracking-wider font-extrabold bg-red-100 border border-red-200 text-red-700 px-1.5 rounded uppercase">Registro Eliminado</span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight mt-1">
                    Ficha Técnica de Inspección
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedInspection(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-150 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable contents */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
                {/* Zona de planta */}
                <div>
                  <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Zona / Máquina / Equipo</h4>
                  <p className="text-sm text-slate-900 font-bold flex items-center gap-1.5 p-2 bg-slate-50 border border-slate-100 rounded-lg">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    {selectedInspection["Zona / Equipo"]}
                  </p>
                </div>

                {/* Metadata cards */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Urgencia</span>
                    <div>{getUrgencyBadge(selectedInspection.Urgencia)}</div>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Estado actual</span>
                    <div>{getStatusBadge(selectedInspection.Estado)}</div>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5 mt-2">Detección</span>
                    <p className="font-mono font-semibold text-slate-700">{selectedInspection["Fecha Detección"] || "-"}</p>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5 mt-2">Responsable</span>
                    <p className="font-mono font-semibold truncate text-slate-755">{selectedInspection["Asignado a"] || "Sin asignar"}</p>
                  </div>
                </div>

                {/* Descripcion */}
                <div>
                  <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Descripción de la Incidencia / Peligro</h4>
                  <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl leading-relaxed text-slate-800 font-medium">
                    {selectedInspection.Descripción}
                  </div>
                </div>

                {/* Material Empleado - ALWAYS VISIBLE AS REQUESTED */}
                <div>
                  <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Material Empleado / Repuestos</h4>
                  <div className="p-3.5 bg-emerald-50/30 border border-emerald-100 rounded-xl font-mono text-emerald-950 font-semibold">
                    {selectedInspection["Material Empleado"] ? (
                      selectedInspection["Material Empleado"]
                    ) : (
                      <span className="text-slate-400 italic font-sans font-normal">Ningún material asignado todavía.</span>
                    )}
                  </div>
                </div>

                {/* Observaciones */}
                {selectedInspection.Observaciones && (
                  <div>
                    <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Observaciones / Comentarios adicionales</h4>
                    <p className="p-3 bg-slate-50 border border-slate-100 rounded-xl italic text-slate-600">
                      {selectedInspection.Observaciones}
                    </p>
                  </div>
                )}

                {/* Corregido Info column */}
                {selectedInspection.Estado === "corregido" && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3.5 text-emerald-900">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-xs uppercase text-emerald-800">Cierre de inspección verificado</p>
                      <p className="mt-0.5 font-medium">
                        Reparado por <strong>{selectedInspection["Corregido por"] || "Técnico PRL/Mantenimiento"}</strong> el {selectedInspection["Fecha Corrección"]}
                      </p>
                    </div>
                  </div>
                )}

                {/* Adjuntos Visual Box */}
                {(selectedInspection["URL Foto"] || selectedInspection["URL PDF Presupuesto"]) && (
                  <div>
                    <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Documentos y Evidencias Adjuntas</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedInspection["URL Foto"] ? (
                        <a 
                          href={selectedInspection["URL Foto"]} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition"
                        >
                          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                            <FileImage className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 block text-[10px]">Fotografía</span>
                            <span className="text-[9px] text-slate-400 flex items-center gap-0.5">Ver foto <ExternalLink className="w-2.5 h-2.5" /></span>
                          </div>
                        </a>
                      ) : null}

                      {selectedInspection["URL PDF Presupuesto"] ? (
                        <a 
                          href={selectedInspection["URL PDF Presupuesto"]} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition"
                        >
                          <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 block text-[10px]">Presupuesto</span>
                            <span className="text-[9px] text-slate-400 flex items-center gap-0.5">PDF <ExternalLink className="w-2.5 h-2.5" /></span>
                          </div>
                        </a>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* --- GOOGLE WORKSPACE TOOL INTEGRATION --- */}
                <div className="border-t border-slate-100 pt-4 mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1 bg-emerald-50 text-emerald-700 rounded-md">
                      <Mail className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Módulos Google Workspace (Drive & Gmail)</h4>
                  </div>

                  {!accessToken ? (
                    <div className="p-3 bg-amber-50/55 border border-amber-200/50 rounded-xl text-[11px] text-amber-850">
                      <p className="font-semibold flex items-center gap-1.5 text-amber-900">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Google Workspace desconectado
                      </p>
                      <p className="mt-1 font-medium text-slate-500 leading-normal">
                        Utiliza el botón <strong>"Conectar Google Workspace"</strong> del menú superior para habilitar el envío automatizado de correos por Gmail y exportación directa de informes a Google Drive.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 bg-slate-50 border border-slate-200/40 p-4 rounded-xl">
                      {/* Sub-action 1: Send via Gmail */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-700 block">📧 Enviar Ficha por Gmail</span>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <div className="flex-1 space-y-1.5">
                            <input
                              type="email"
                              placeholder="correo@ejemplo.com"
                              value={emailRecipient}
                              onChange={(e) => setEmailRecipient(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-emerald-500"
                            />
                            <input
                              type="text"
                              placeholder="Añadir comentario personal (opcional)"
                              value={emailExtraMessage}
                              onChange={(e) => setEmailExtraMessage(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-emerald-500"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleSendGmailReport}
                            disabled={isEmailSending}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold px-3 py-2 rounded-lg text-xs transition duration-150 flex items-center justify-center gap-1.5 self-start uppercase tracking-wider shrink-0"
                          >
                            {isEmailSending ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Enviando...
                              </>
                            ) : (
                              <>
                                <Send className="w-3 h-3" />
                                Enviar
                              </>
                            )}
                          </button>
                        </div>
                        {emailStatus && (
                          <p className={`text-[10px] font-bold font-mono ${emailStatus.success ? "text-emerald-700" : "text-red-700"}`}>
                            {emailStatus.success ? "✓ " : "✗ "} {emailStatus.text}
                          </p>
                        )}
                      </div>

                      {/* Sub-action 2: Export Report to Google Drive */}
                      <div className="border-t border-slate-200/50 pt-3 space-y-2">
                        <span className="text-[10px] font-bold text-slate-700 block">💾 Exportar Ficha a Google Drive</span>
                        {!driveReportLink ? (
                          <button
                            type="button"
                            onClick={handleExportReportToDrive}
                            disabled={isDriveReportUploading}
                            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold rounded-lg transition"
                          >
                            {isDriveReportUploading ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Creando informe en Drive...
                              </>
                            ) : (
                              <>
                                <FolderUp className="w-3.5 h-3.5 text-slate-500" />
                                Guardar informe técnico .TXT en Google Drive
                              </>
                            )}
                          </button>
                        ) : (
                          <div className="p-2.5 bg-emerald-100/50 border border-emerald-300/60 rounded-lg flex items-center justify-between gap-2">
                            <span className="text-[10px] text-emerald-800 font-bold flex items-center gap-1">
                              ✓ Informe subido a Google Drive con éxito
                            </span>
                            <a
                              href={driveReportLink}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold rounded flex items-center gap-1 transition shadow-xs uppercase font-sans leading-none shrink-0"
                            >
                              <ExternalLink className="w-2.5 h-2.5" /> Abrir informe
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom footer buttons */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl flex items-center justify-between">
                <div className="font-mono text-[9px] text-slate-400">
                  Fila google: {selectedInspection.rowIndex || "?"}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedInspection(null)}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={() => {
                      setSelectedInspection(null);
                      onEdit(selectedInspection);
                    }}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar Ficha
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
