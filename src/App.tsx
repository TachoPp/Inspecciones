import React, { useState, useEffect } from "react";
import { 
  Plus, Search, RefreshCw, Copy, Check, ClipboardList, ShieldAlert, 
  HelpCircle, Eye, FileSpreadsheet, PlusCircle, ArrowUpRight, 
  ShieldCheck, CheckCircle2, AlertTriangle, Clock, X, FileImage, 
  FileText, LogOut, Upload, Mail, Map, Activity, Lock, Unlock, Trash2,
  Cloud, Send, FolderUp, Loader2, Link2, ExternalLink
} from "lucide-react";
import { Inspection, ActiveTab } from "./types";
import StatsGrid from "./components/StatsGrid";
import DashboardCharts from "./components/DashboardCharts";
import InspectionList from "./components/InspectionList";
import MaterialList from "./components/MaterialList";
import { motion, AnimatePresence } from "motion/react";
import { googleSignIn, logout as googleLogout, initAuth } from "./lib/googleAuth";
import { uploadToDrive } from "./lib/googleWorkspace";
import { User } from "firebase/auth";

// Initial state for form fields
const initialFormState = {
  id: "",
  fechaDeteccion: "",
  zonaEquipo: "",
  descripcion: "",
  requisitoLegal: false,
  urgencia: "Media" as "Baja" | "Media" | "Alta",
  urlFoto: "",
  urlPdf: "",
  fotoBase64: "",
  fotoName: "",
  pdfBase64: "",
  pdfName: "",
  asignadoA: "",
  estado: "pendiente" as "pendiente" | "en proceso" | "corregido",
  corregidoPor: "",
  fechaCorreccion: "",
  materialEmpleado: "",
  observaciones: "",
};

export default function App() {
  // State variables
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [nextId, setNextId] = useState("INS-001");
  const [userEmail, setUserEmail] = useState("personal@ponienteplast.es");
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  
  // Google Auth states
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isUploadingDrive, setIsUploadingDrive] = useState<{ [key: string]: boolean }>({});
  const [isGoogleBackupLoading, setIsGoogleBackupLoading] = useState(false);

  // Executive active filter
  const [activeFilter, setActiveFilter] = useState<{ type: string; value: string } | null>(null);

  // Modal control
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(true);
  const [formState, setFormState] = useState(typeof initialFormState);

  // Copy state for the Apps Script instructions
  const [copiedScript, setCopiedScript] = useState(false);

  // Apps Script locks / PIN state
  const [isScriptUnlocked, setIsScriptUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  const handlePinKey = (num: string) => {
    setPinError("");
    if (pinInput.length >= 4) return;
    const newVal = pinInput + num;
    setPinInput(newVal);
    
    // Automatically verify when exactly 4 characters are reached
    if (newVal === "7896") {
      setTimeout(() => {
        setIsScriptUnlocked(true);
        showNotification("Acceso Autorizado a Google Apps Script", "success");
      }, 150);
    } else if (newVal.length === 4) {
      setTimeout(() => {
        setPinError("PIN Incorrecto");
        setPinInput("");
      }, 500);
    }
  };

  // Load all initial data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const resp = await fetch("/api/initial-data");
      const res = await resp.json();
      if (res.success) {
        setInspections(res.inspections);
        setNextId(res.nextId);
        setUserEmail(res.userEmail);
      } else {
        showNotification(res.error || "Error al cargar datos", "error");
      }
    } catch (err: any) {
      showNotification("No se pudo conectar con el servidor local. Usando datos por defecto.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        if (currentUser.email) {
          setUserEmail(currentUser.email);
        }
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Show status toasts
  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Clear current active statistic dashboard filter
  const handleClearFilter = () => {
    setActiveFilter(null);
  };

  const handleGoogleLogin = async () => {
    try {
      showNotification("Iniciando sesión con Google...", "success");
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        if (result.user.email) {
          setUserEmail(result.user.email);
        }
        showNotification(`Sesión iniciada como ${result.user.displayName || result.user.email}`, "success");
      }
    } catch (err: any) {
      console.error(err);
      showNotification("Error en autenticación de Google: " + err.message, "error");
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await googleLogout();
      setUser(null);
      setAccessToken(null);
      setUserEmail("personal@ponienteplast.es");
      showNotification("Sesión de Google cerrada con éxito.", "success");
    } catch (err: any) {
      console.error(err);
      showNotification("Error al cerrar sesión.", "error");
    }
  };

  const handleBackupToDrive = async () => {
    if (!accessToken) {
      showNotification("Por favor, conecta Google Workspace.", "error");
      return;
    }
    setIsGoogleBackupLoading(true);
    try {
      const dateStr = new Date().toISOString().split("T")[0];
      const fileName = `Ponienteplast_Backup_Inspecciones_${dateStr}.json`;
      const fileContent = JSON.stringify(inspections, null, 2);

      showNotification("Generando copia de respaldo en Google Drive...", "success");
      const res = await uploadToDrive(accessToken, fileName, "application/json", fileContent);

      if (res.webViewLink) {
        showNotification("¡Copia de seguridad guardada con éxito en Google Drive!", "success");
        window.open(res.webViewLink, "_blank");
      }
    } catch (err: any) {
      console.error(err);
      showNotification("Error de respaldo: " + err.message, "error");
    } finally {
      setIsGoogleBackupLoading(false);
    }
  };

  const handleUploadFileDirectlyToDrive = async (type: "foto" | "pdf") => {
    if (!accessToken) {
      showNotification("Por favor, conecta Google Workspace primero.", "error");
      return;
    }

    const base64Data = type === "foto" ? formState.fotoBase64 : formState.pdfBase64;
    const fileName = type === "foto" ? formState.fotoName : formState.pdfName;

    if (!base64Data || !fileName) {
      showNotification("No hay ningún archivo adjunto para subir.", "error");
      return;
    }

    setIsUploadingDrive((prev) => ({ ...prev, [type]: true }));

    try {
      const mimeMatch = base64Data.match(/^data:(.*);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : (type === "foto" ? "image/jpeg" : "application/pdf");

      showNotification(`Subiendo '${fileName}' a Google Drive...`, "success");
      const res = await uploadToDrive(accessToken, fileName, mimeType, base64Data);

      if (res.webViewLink) {
        setFormState((prev) => ({
          ...prev,
          ...(type === "foto"
            ? { urlFoto: res.webViewLink, fotoBase64: "", fotoName: `[Drive URL] ${fileName}` }
            : { urlPdf: res.webViewLink, pdfBase64: "", pdfName: `[Drive URL] ${fileName}` })
        }));
        showNotification("¡Archivo guardado en Google Drive y enlazado con éxito!", "success");
      } else {
        showNotification("Error: No se recibió enlace de visualización de Google Drive.", "error");
      }
    } catch (err: any) {
      console.error(err);
      showNotification("Error al subir a Drive: " + err.message, "error");
    } finally {
      setIsUploadingDrive((prev) => ({ ...prev, [type]: false }));
    }
  };

  // Handler for cards clicks in StatsGrid
  const handleSelectStatCard = (type: string, value: string) => {
    if (type === "todas") {
      setActiveFilter(null);
    } else {
      setActiveFilter({ type, value });
    }
    setActiveTab("list");
  };

  // Handler for charts clicks in DashboardCharts
  const handleSelectChartFilter = (type: "urgencia" | "estado" | "zona", value: string) => {
    setActiveFilter({ type, value });
    setActiveTab("list");
  };

  // Open modal for creating a new item
  const handleAddNewClick = () => {
    setIsNewRecord(true);
    const today = new Date().toISOString().split("T")[0];
    setFormState({
      ...initialFormState,
      id: nextId,
      fechaDeteccion: today,
      asignadoA: "prl@ponienteplast.es",
    });
    setIsModalOpen(true);
  };

  // Open modal to EDIT a record
  const handleEditClick = (inspection: Inspection) => {
    setIsNewRecord(false);
    setFormState({
      id: inspection["Nº Inspección"],
      fechaDeteccion: inspection["Fecha Detección"] || "",
      zonaEquipo: inspection["Zona / Equipo"] || "",
      descripcion: inspection.Descripción || "",
      requisitoLegal: inspection["Requisito Legal S/N"] === "S",
      urgencia: inspection.Urgencia || "Media",
      urlFoto: inspection["URL Foto"] || "",
      urlPdf: inspection["URL PDF Presupuesto"] || "",
      fotoBase64: "",
      fotoName: "",
      pdfBase64: "",
      pdfName: "",
      asignadoA: inspection["Asignado a"] || "",
      estado: inspection.Estado || "pendiente",
      corregidoPor: inspection["Corregido por"] || "",
      fechaCorreccion: inspection["Fecha Corrección"] || "",
      materialEmpleado: inspection["Material Empleado"] || "",
      observaciones: inspection.Observaciones || "",
    });
    setIsModalOpen(true);
  };

  // Delete a record
  const handleDeleteClick = async (id: string) => {
    try {
      const response = await fetch("/api/delete-inspection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (result.success) {
        showNotification(`Inspección ${id} eliminada con éxito`, "success");
        loadData();
      } else {
        showNotification(result.error || "Error al eliminar la inspección", "error");
      }
    } catch (err) {
      showNotification("Error de conexión al eliminar", "error");
    }
  };

  // Soft Delete a record (marks Estado = "eliminado" so it remains recorded on the sheet)
  const handleSoftDelete = async () => {
    if (!formState.id) return;
    if (!confirm(`¿Seguro que deseas marcar la inspección ${formState.id} como ELIMINADA? Se guardará el registro correspondiente en la hoja histórica.`)) {
      return;
    }
    setIsSubmitLoading(true);
    try {
      const payload = {
        id: formState.id,
        isNew: false,
        fechaDeteccion: formState.fechaDeteccion,
        zonaEquipo: formState.zonaEquipo,
        descripcion: formState.descripcion,
        requisitoLegal: formState.requisitoLegal ? "S" : "N",
        urgencia: formState.urgencia,
        urlFoto: formState.urlFoto,
        urlPdf: formState.urlPdf,
        fotoBase64: formState.fotoBase64,
        fotoName: formState.fotoName,
        pdfBase64: formState.pdfBase64,
        pdfName: formState.pdfName,
        asignadoA: formState.asignadoA,
        estado: "eliminado", // MARK AS ELIMINADO
        corregidoPor: formState.corregidoPor,
        fechaCorreccion: formState.fechaCorreccion,
        materialEmpleado: formState.materialEmpleado,
        observaciones: formState.observaciones ? `${formState.observaciones} [Registro marcado como eliminado]` : "[Registro marcado como eliminado]",
      };

      const response = await fetch("/api/save-inspection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        showNotification(`Inspección '${formState.id}' guardada como eliminada.`, "success");
        setIsModalOpen(false);
        loadData();
      } else {
        showNotification(result.error || "Error al eliminar el registro", "error");
      }
    } catch (err: any) {
      showNotification("Error de red al procesar el borrado.", "error");
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // Handle files converts to base64
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "foto" | "pdf") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (type === "foto") {
        setFormState((prev) => ({
          ...prev,
          fotoBase64: base64,
          fotoName: file.name,
        }));
      } else {
        setFormState((prev) => ({
          ...prev,
          pdfBase64: base64,
          pdfName: file.name,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag-and-drop support helpers
  const [isDraggingFile, setIsDraggingFile] = useState<{ [key: string]: boolean }>({});

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setIsDraggingFile((prev) => ({ ...prev, [id]: true }));
  };

  const handleDragLeave = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setIsDraggingFile((prev) => ({ ...prev, [id]: false }));
  };

  const handleDrop = (e: React.DragEvent, type: "foto" | "pdf") => {
    e.preventDefault();
    setIsDraggingFile((prev) => ({ ...prev, [type]: false }));

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (type === "foto") {
        setFormState((prev) => ({
          ...prev,
          fotoBase64: base64,
          fotoName: file.name,
        }));
      } else {
        setFormState((prev) => ({
          ...prev,
          pdfBase64: base64,
          pdfName: file.name,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Save/Submit Form data
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.id || !formState.fechaDeteccion || !formState.zonaEquipo || !formState.descripcion) {
      showNotification("Rellene todos los campos obligatorios (*) antes de guardar.", "error");
      return;
    }

    setIsSubmitLoading(true);

    try {
      const payload = {
        id: formState.id,
        isNew: isNewRecord,
        fechaDeteccion: formState.fechaDeteccion,
        zonaEquipo: formState.zonaEquipo,
        descripcion: formState.descripcion,
        requisitoLegal: formState.requisitoLegal ? "S" : "N",
        urgencia: formState.urgencia,
        urlFoto: formState.urlFoto,
        urlPdf: formState.urlPdf,
        fotoBase64: formState.fotoBase64,
        fotoName: formState.fotoName,
        pdfBase64: formState.pdfBase64,
        pdfName: formState.pdfName,
        asignadoA: formState.asignadoA,
        estado: formState.estado,
        corregidoPor: formState.estado === "corregido" ? formState.corregidoPor : "",
        fechaCorreccion: formState.estado === "corregido" ? formState.fechaCorreccion : "",
        materialEmpleado: formState.materialEmpleado,
        observaciones: formState.observaciones,
      };

      const response = await fetch("/api/save-inspection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        showNotification(
          `Inspección '${formState.id}' ${isNewRecord ? "registrada" : "actualizada"} con éxito.`,
          "success"
        );
        setIsModalOpen(false);
        setFormState(initialFormState);
        loadData();
      } else {
        showNotification(result.error || "Error al guardar el registro", "error");
      }
    } catch (err: any) {
      showNotification("Error de red no se pudo conectar con el servidor.", "error");
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // Google Apps Script source code snippet
  const gasCode = `/**
 * ====================================================================
 * CONFIGURACIÓN DE LA APP DE INSPECCIONES - PONIENTEPLAST
 * ====================================================================
 * Instala este código en tu editor de Google Apps Script.
 * Asegúrate de rellenar los IDs de tu hoja de cálculo y carpetas de Drive.
 */

const CONFIG = {
  SPREADSHEET_ID: "14tVSdRw5G8pshoztxJ2q4N7pm0S-BhwrFK4I5fT10KA", // ID de tu Google Sheet
  SHEET_NAME: "Base de Datos Inspecciones",
  // IDs de carpetas de Google Drive de personal@ponienteplast.es
  FOLDER_FOTOS_ID: "1CaJnfKYc7_91oGO_pZak3Y6mJjfqOd7t", 
  FOLDER_PDFS_ID: "1sPvFQz2VqwdSAfjiGojLx9wvidr4q83W"
};

function doGet() {
  const htmlService = HtmlService.createTemplateFromFile('index');
  return htmlService.evaluate()
    .setTitle('Ponienteplast - Inspecciones PRL & Medio Ambiente')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getSheet() {
  let ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    const headers = [
      "Nº Inspección", "Fecha Detección", "Zona / Equipo", "Descripción", 
      "Requisito Legal S/N", "Urgencia", "URL Foto", "URL PDF Presupuesto", 
      "Asignado a", "Estado", "Corregido por", "Fecha Corrección", 
      "Material Empleado", "Observaciones"
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
         .setFontWeight("bold")
         .setBackground("#1e293b")
         .setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getInitialData() {
  try {
    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    let userEmail = "invitado@ponienteplast.es";
    try {
      const email = Session.getActiveUser().getEmail();
      if (email) userEmail = email;
    } catch(e) {}
    
    const inspections = rows.map((row, index) => {
      const obj = { rowIndex: index + 2 };
      headers.forEach((header, colIndex) => {
        let value = row[colIndex];
        if (value instanceof Date) {
          value = Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
        }
        obj[header] = value;
      });
      return obj;
    });

    let nextId = "INS-001";
    if (inspections.length > 0) {
      let maxNum = 0;
      inspections.forEach(ins => {
        const match = String(ins["Nº Inspección"]).match(/INS-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      });
      nextId = "INS-" + String(maxNum + 1).padStart(3, '0');
    }

    return { success: true, inspections, nextId, userEmail };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function saveInspection(payload) {
  try {
    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    let rowIndex = -1;
    
    if (payload.isNew) {
      const exists = rows.some(row => String(row[0]).trim().toUpperCase() === String(payload.id).trim().toUpperCase());
      if (exists) throw new Error("El número de inspección '" + payload.id + "' ya existe.");
    } else {
      for (let i = 0; i < rows.length; i++) {
        if (String(rows[i][0]).trim().toUpperCase() === String(payload.id).trim().toUpperCase()) {
          rowIndex = i + 2;
          break;
        }
      }
      if (rowIndex === -1) throw new Error("No se encontró la inspección ID '" + payload.id + "'.");
    }

    let urlFoto = payload.urlFoto || "";
    if (payload.fotoBase64 && payload.fotoName) {
      urlFoto = uploadToDrive(payload.fotoBase64, payload.fotoName, CONFIG.FOLDER_FOTOS_ID);
    }

    let urlPdf = payload.urlPdf || "";
    if (payload.pdfBase64 && payload.pdfName) {
      urlPdf = uploadToDrive(payload.pdfBase64, payload.pdfName, CONFIG.FOLDER_PDFS_ID);
    }

    const rowValues = [
      payload.id,
      payload.fechaDeteccion,
      payload.zonaEquipo,
      payload.descripcion,
      payload.requisitoLegal ? "S" : "N",
      payload.urgencia,
      urlFoto,
      urlPdf,
      payload.asignadoA,
      payload.estado || "pendiente",
      payload.corregidoPor,
      payload.fechaCorreccion,
      payload.materialEmpleado,
      payload.observaciones
    ];

    if (payload.isNew) {
      sheet.appendRow(rowValues);
    } else {
      sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function uploadToDrive(base64Data, fileName, folderId) {
  const folder = DriveApp.getFolderById(folderId);
  const contentType = base64Data.substring(base64Data.indexOf(":") + 1, base64Data.indexOf(";"));
  const bytes = Utilities.base64Decode(base64Data.split(",")[1]);
  const blob = Utilities.newBlob(bytes, contentType, fileName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(gasCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans" id="ponienteplast-inspections-app">
      
      {/* 1. TOP HEADER NAVIGATION */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-100 shadow-xs backdrop-blur-md bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo and Brand Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/10">
                <Activity className="w-5.5 h-5.5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs tracking-wider uppercase font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    PRL & Medio Ambiente
                  </span>
                </div>
                <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none mt-1">
                  Ponienteplast S.A.
                </h1>
              </div>
            </div>

            {/* Profile and Refresh */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={loadData}
                disabled={isLoading}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition disabled:opacity-50 shrink-0"
                title="Sincronizar Datos"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>

              {/* Google Workspace connector */}
              {!accessToken ? (
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-bold rounded-lg transition shadow-xs uppercase tracking-wider shrink-0"
                  title="Conectar con Google Drive & Gmail"
                >
                  <Cloud className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  <span>Conectar Workspace</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleBackupToDrive}
                    disabled={isGoogleBackupLoading}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-150 text-indigo-800 text-[10px] font-bold rounded-lg transition border border-indigo-200 uppercase tracking-wider shrink-0"
                    title="Copia de Seguridad de la DB en Google Drive"
                  >
                    {isGoogleBackupLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FolderUp className="w-3.5 h-3.5 text-indigo-600" />
                    )}
                    <span className="hidden sm:inline">Respaldar BD</span>
                  </button>

                  <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="Profile"
                        referrerPolicy="no-referrer"
                        className="w-7 h-7 rounded-full border border-slate-200 shadow-xs object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-850 flex items-center justify-center font-bold text-xs shrink-0">
                        {user?.displayName ? user.displayName[0] : "G"}
                      </div>
                    )}
                    <div className="hidden md:flex flex-col text-left shrink-0 max-w-[120px]">
                      <span className="text-[10px] text-slate-900 font-bold leading-none truncate">{user?.displayName || "Google User"}</span>
                      <span className="text-[8px] text-slate-400 font-mono mt-0.5 leading-none truncate">{user?.email}</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleLogout}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-md transition shrink-0"
                      title="Cerrar sesión de Google"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Current active user default label fallback */}
              {!accessToken && (
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200 shrink-0">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[11px] font-mono text-slate-600 font-semibold">{userEmail}</span>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* 2. RECTANGLE TOAST NOTIFICATION CONTAINER */}
      <div className="fixed bottom-5 right-5 z-55 max-w-sm pointer-events-none">
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={`p-4 rounded-xl shadow-lg border text-xs font-medium flex items-start gap-2.5 pointer-events-auto ${
                notification.type === "success"
                  ? "bg-emerald-900 border-emerald-800 text-emerald-100"
                  : "bg-red-950 border-red-900 text-red-100"
              }`}
            >
              {notification.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-semibold">{notification.type === "success" ? "Operación exitosa" : "Atención - Error"}</p>
                <p className="mt-0.5 opacity-90">{notification.message}</p>
              </div>
              <button onClick={() => setNotification(null)} className="shrink-0 p-0.5 text-white/50 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. MAIN DASHBOARD WRAPPER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Subheader and Navigation Tab bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
              {activeTab === "dashboard" ? "Panel Estadístico de Seguridad" : 
               activeTab === "list" ? "Lista de Inspecciones Técnicas" : 
               activeTab === "materiales" ? "Gestión de Materiales y Repuestos" :
               "Instalar en Google Drive / Sheets"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {activeTab === "dashboard" ? "Resumen de riesgos industriales por zona, área, nivel de urgencia y estado." : 
               activeTab === "list" ? "Buscador y gestor de correcciones de seguridad de la planta industrial." : 
               activeTab === "materiales" ? "Historial y control de materiales asignados a incidencias activas de la fábrica." :
               "Sigue las instrucciones para sincronizar la aplicación con tu cuenta corporativa de Google Sheets."}
            </p>
          </div>

          {/* Navigation controls */}
          <div className="flex bg-slate-100 border border-slate-200 p-0.5 rounded-xl shrink-0 flex-wrap">
            <button
              onClick={() => { setActiveTab("dashboard"); handleClearFilter(); }}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition ${
                activeTab === "dashboard" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Estadísticas
            </button>
            <button
              onClick={() => setActiveTab("list")}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition flex items-center gap-1.5 ${
                activeTab === "list" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Inspecciones
              {inspections.length > 0 && (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
                  {inspections.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("materiales")}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition flex items-center gap-1.5 ${
                activeTab === "materiales" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Materiales
            </button>
            {userEmail.toLowerCase() === "personal@ponienteplast.es" && (
              <button
                onClick={() => setActiveTab("script")}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition flex items-center gap-1 ${
                  activeTab === "script" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-800"
                }`}
              >
                <Lock className="w-2.5 h-2.5" />
                Apps Script
              </button>
            )}
          </div>
        </div>

        {/* 4. EXECUTIVE STATS STRIP BANNER */}
        <StatsGrid 
          inspections={inspections} 
          onSelectCard={handleSelectStatCard}
          activeFilter={activeFilter}
        />

        {/* 5. TAB LOADING & MAIN VIEWS */}
        {isLoading ? (
          <div className="bg-white border border-slate-100 p-24 rounded-2xl flex flex-col items-center justify-center shadow-xs">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
            <p className="text-xs text-slate-500 font-medium">Estableciendo comunicación bidireccional...</p>
          </div>
        ) : (
          <div>
            {/* Tab: Dashboard Panel */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                <DashboardCharts 
                  inspections={inspections} 
                  onSelectFilter={handleSelectChartFilter}
                />
                
                {/* Embedded quick guide banner */}
                <div className="bg-emerald-950 border border-emerald-900 rounded-2xl p-6 text-emerald-150 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="z-10 relative">
                    <span className="bg-emerald-850 text-emerald-300 font-bold px-2 py-0.5 rounded text-[10px] tracking-wide font-mono">INTEGRACIÓN CORPORATIVA</span>
                    <h3 className="text-sm font-bold text-white tracking-tight mt-2 flex items-center gap-1.5">
                      Sincronización total con Google Sheets en Ponienteplast
                    </h3>
                    <p className="text-xs text-emerald-100/90 mt-1 max-w-2xl leading-relaxed">
                      Esta app está preconfigurada estructuralmente para conectarse mediante Apps Script al drive corporativo bajo las carpetas compartidas del departamento de PRL de <span className="text-emerald-300 underline font-semibold">personal@ponienteplast.es</span>.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("script")}
                    className="z-10 focus:ring-2 focus:ring-emerald-400 shrink-0 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition tracking-wide flex items-center gap-1"
                  >
                    Instrucciones completas
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Absolute decor backdrop grid */}
                  <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-emerald-800/10 to-transparent pointer-events-none" />
                </div>
              </div>
            )}

            {/* Tab: Inspections list and Actions */}
            {activeTab === "list" && (
              <InspectionList 
                inspections={inspections}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                onAddNew={handleAddNewClick}
                onClearFilter={handleClearFilter}
                activeFilter={activeFilter}
                accessToken={accessToken}
              />
            )}

            {/* Tab: Material List */}
            {activeTab === "materiales" && (
              <MaterialList 
                inspections={inspections}
                onEdit={handleEditClick}
              />
            )}

            {/* Tab: Google Apps Script config information (PIN Locked with "7896") */}
            {activeTab === "script" && (
              <div>
                {!isScriptUnlocked ? (
                  /* --- PREMIUM SECURITY PIN KEYPAD LOCKSCREEN --- */
                  <div className="max-w-md mx-auto bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden p-6 sm:p-8 text-center space-y-6 animate-fade-in" id="pin-lockscreen-box">
                    <div className="flex justify-center">
                      <div className="p-4 bg-amber-50 rounded-full border border-amber-100 text-amber-600 animate-pulse">
                        <Lock className="w-8 h-8" />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold text-slate-800 tracking-tight">Sección Restringida (PRL)</h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                        Introduce el PIN de 4 dígitos para habilitar las directivas binarias de Google Apps Script.
                      </p>
                      <span className="inline-block mt-2 text-[10px] bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded font-bold">
                        User: personal@ponienteplast.es
                      </span>
                    </div>

                    {/* Numeric PIN Circles Indicators */}
                    <div className="flex justify-center items-center gap-3.5 mt-2">
                      {[0, 1, 2, 3].map((index) => (
                        <span
                          key={index}
                          className={`w-3.5 h-3.5 rounded-full transition-all duration-150 border ${
                            pinInput.length > index
                              ? "bg-emerald-600 border-emerald-600 scale-110 shadow-xs"
                              : "bg-slate-50 border-slate-300"
                          }`}
                        />
                      ))}
                    </div>

                    {/* Error display */}
                    {pinError && (
                      <p className="text-xs text-red-650 font-bold font-mono animate-bounce" id="passcode-error-msg">
                        ⚠️ IP Bloqueada: PIN Incorrecto
                      </p>
                    )}

                    {/* Industrial Keypad matrix */}
                    <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto pt-2" id="keypad-matrix">
                      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handlePinKey(num)}
                          className="py-3 px-4 text-sm font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 hover:border-slate-300 rounded-xl transition duration-150 active:scale-95 focus:outline-none"
                        >
                          {num}
                        </button>
                      ))}
                      
                      {/* Clear Button */}
                      <button
                        type="button"
                        onClick={() => { setPinInput(""); setPinError(""); }}
                        className="py-3 px-2 text-[10px] font-bold text-slate-400 bg-white hover:bg-slate-50 border border-slate-200/40 rounded-xl transition"
                      >
                        Limpiar
                      </button>

                      {/* Zero Button */}
                      <button
                        type="button"
                        onClick={() => handlePinKey("0")}
                        className="py-3 px-4 text-sm font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl transition active:scale-95"
                      >
                        0
                      </button>

                      {/* Locked visual help feedback */}
                      <div className="flex items-center justify-center text-slate-400 p-2 text-xs font-mono">
                        PRL
                      </div>
                    </div>

                    <p className="text-[10px] font-mono text-slate-400">
                      Ponienteplast S.L. — Sistema de Seguridad Protegido
                    </p>
                  </div>
                ) : (
                  /* --- APPS SCRIPT DOCUMENTATION SCREEN (UNLOCKED) --- */
                  <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in" id="apps-script-unlocked-panel">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                      <div>
                        <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600 animate-pulse" />
                          Instalación paso a paso de Google Apps Script
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">Sincroniza directamente esta app con la hoja de cálculo corporativa de Google Sheet de Ponienteplast.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 text-[10px] bg-emerald-100 border border-emerald-300 text-emerald-800 font-mono font-bold rounded-full flex items-center gap-1">
                          <Unlock className="w-3 h-3" /> Desbloqueado (PIN)
                        </span>
                        <button
                          onClick={copyToClipboard}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition"
                        >
                          {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedScript ? "¡Código Copiado!" : "Copiar código Apps Script"}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Step 1 */}
                      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-mono font-bold text-xs flex items-center justify-center shrink-0">1</span>
                        <div>
                          <h4 className="text-xs font-semibold text-slate-800">Preparar Spreadsheet</h4>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Crea un Google Spreadsheet con el nombre de hoja <strong>Base de Datos Inspecciones</strong> o permite que el script la configure automáticamente en su primer inicio. El ID de tu hoja es:
                          </p>
                          <code className="block mt-2 font-mono text-[10px] text-slate-705 bg-white p-2 rounded border border-slate-200 select-all overflow-x-auto truncate font-bold">
                            14tVSdRw5G8pshoztxJ2q4N7pm0S-BhwrFK4I5fT10KA
                          </code>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-mono font-bold text-xs flex items-center justify-center shrink-0">2</span>
                        <div>
                          <h4 className="text-xs font-semibold text-slate-800">Agregar Carpetas Drive</h4>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Crea dos carpetas compartidas en Google Drive para guardar los adjuntos y define sus IDs en la sección <code className="font-mono bg-white px-1 py-0.5 border border-slate-200 rounded text-[9px]">CONFIG</code> del script:
                          </p>
                          <ul className="text-[10px] text-slate-600 mt-2 list-disc list-inside space-y-1 font-mono">
                            <li><strong>Fotos ID:</strong> 1CaJnfKYc7_91oGO_pZak3Y6mJjfqOd7t</li>
                            <li><strong>PDFs ID:</strong> 1sPvFQz2VqwdSAfjiGojLx9wvidr4q83W</li>
                          </ul>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-mono font-bold text-xs flex items-center justify-center shrink-0">3</span>
                        <div>
                          <h4 className="text-xs font-semibold text-slate-800">Crear Web App</h4>
                          <p className="text-[11px] text-slate-500 mt-1">
                            En tu Spreadsheet ve a <strong>Extensiones &gt; Apps Script</strong>. Pega este código, haz clic en <strong>Implementar &gt; Nueva implementación</strong>, selecciona "Aplicación web", y permite el acceso.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Technical block text for script viewer */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 mb-2">Editor rápido de script (Lectura rápida)</h4>
                      <pre className="p-4 bg-slate-900 text-slate-200 font-mono rounded-xl text-[10px] overflow-auto max-h-72 border border-slate-800">
                        {gasCode}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 6. CREATE & EDIT SYSTEM DIALOG / SLIDE-OUT MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-end" id="form-modal-container">
            {/* Backdrop visual lock */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isSubmitLoading) setIsModalOpen(false);
              }}
              className="absolute inset-0 bg-slate-900"
            />

            {/* Content drawer pane */}
            <motion.div
              initial={{ x: "100%", opacity: 0.95 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col z-10 border-l border-slate-200"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                      ID: {formState.id}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      {isNewRecord ? "• Creando nueva ficha" : "• Editando ficha existente"}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight mt-1">
                    {isNewRecord ? "Registrar Nueva Inspección" : "Modificar Datos de Inspección"}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitLoading}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
                  aria-label="Cerrar modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Form Body */}
              <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                
                {/* ID & Date Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Nº Inspección <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="INS-XXX"
                      disabled={!isNewRecord}
                      value={formState.id}
                      onChange={(e) => setFormState({ ...formState, id: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 disabled:bg-slate-100 disabled:text-slate-500 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:outline-hidden rounded-lg text-xs font-mono font-bold transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Fecha Detección <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formState.fechaDeteccion}
                      onChange={(e) => setFormState({ ...formState, fechaDeteccion: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:outline-hidden rounded-lg text-xs font-mono font-semibold transition"
                    />
                  </div>
                </div>

                {/* Area & Urgencia Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Zona / Equipo de la Planta <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="Ej: Silo 1 - Inyección / Embalaje"
                        value={formState.zonaEquipo}
                        onChange={(e) => setFormState({ ...formState, zonaEquipo: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:outline-hidden rounded-lg text-xs font-semibold text-slate-800 placeholder:text-slate-400 transition"
                      />
                      {/* Interactive area fast preset helper */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {["Línea de Inyección 3", "Silo de Materia Prima", "Almacén Logístico", "Muelle de Carga", "Servicios de Extrusión"].map((suggestZone) => (
                          <button
                            key={suggestZone}
                            type="button"
                            onClick={() => setFormState({ ...formState, zonaEquipo: suggestZone })}
                            className="px-2 py-0.5 bg-slate-100 text-[10px] text-slate-600 font-semibold rounded hover:bg-slate-200 transition"
                          >
                            + {suggestZone}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Urgencia de Corrección
                    </label>
                    <select
                      value={formState.urgencia}
                      onChange={(e) => setFormState({ ...formState, urgencia: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:outline-hidden rounded-lg text-xs font-semibold text-slate-800 transition"
                    >
                      <option value="Baja">Baja (Preventiva)</option>
                      <option value="Media">Media (Programar)</option>
                      <option value="Alta">Alta (Inmediata)</option>
                    </select>
                  </div>
                </div>

                {/* Requirement Legal Checkbox & Assignee */}
                <div className="grid grid-cols-1 sm:grid-cols-10 gap-4 items-center p-3.5 bg-slate-50 rounded-xl border border-slate-150-50">
                  <div className="sm:col-span-4 flex items-center gap-2">
                    <input
                      id="legal-req-checkbox"
                      type="checkbox"
                      checked={formState.requisitoLegal}
                      onChange={(e) => setFormState({ ...formState, requisitoLegal: e.target.checked })}
                      className="w-4.5 h-4.5 border-slate-300 rounded-sm text-emerald-600 focus:ring-emerald-500 accent-emerald-600 shrink-0"
                    />
                    <label htmlFor="legal-req-checkbox" className="text-xs font-bold text-slate-700 select-none cursor-pointer">
                      Afecta Requisito Legal / Normativa S/N
                    </label>
                  </div>

                  <div className="sm:col-span-6 w-full">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Asignar a (Responsable o Email)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: mantenimiento@ponienteplast.es"
                      value={formState.asignadoA}
                      onChange={(e) => setFormState({ ...formState, asignadoA: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 focus:border-emerald-500 focus:outline-hidden rounded-lg text-xs font-mono transition"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Descripción Detallada de Incidencia / Riesgo <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Escriba el peligro observado con su debido contexto técnico..."
                    value={formState.descripcion}
                    onChange={(e) => setFormState({ ...formState, descripcion: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:outline-hidden rounded-lg text-xs text-slate-800 placeholder:text-slate-400 transition"
                  />
                </div>

                {/* Status Switcher selector */}
                <div className="p-4 bg-slate-50/70 border border-slate-200/60 rounded-xl">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Estado Actual del Expediente
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["pendiente", "en proceso", "corregido"] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setFormState({ ...formState, estado: st })}
                        className={`py-2 px-3 border rounded-lg text-xs font-semibold capitalize transition flex items-center justify-center gap-1 focus:outline-none ${
                          formState.estado === st
                            ? st === "pendiente"
                              ? "bg-red-50 border-red-500 text-red-700 ring-2 ring-red-200"
                              : st === "en proceso"
                              ? "bg-amber-50 border-amber-500 text-amber-700 ring-2 ring-amber-200"
                              : "bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-200"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          st === "pendiente" ? "bg-red-500" : st === "en proceso" ? "bg-amber-500" : "bg-emerald-500"
                        }`} />
                        {st}
                      </button>
                    ))}
                  </div>

                  {/* Conditional form fields inside the corrigido state */}
                  <AnimatePresence>
                    {formState.estado === "corregido" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 pt-4 mt-4 border-t border-slate-200 overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              Técnico que Corrigió <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              required={formState.estado === "corregido"}
                              placeholder="Nombre del técnico"
                              value={formState.corregidoPor}
                              onChange={(e) => setFormState({ ...formState, corregidoPor: e.target.value })}
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 focus:border-emerald-505 rounded-lg text-xs font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              Fecha Corrección <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              required={formState.estado === "corregido"}
                              value={formState.fechaCorreccion}
                              onChange={(e) => setFormState({ ...formState, fechaCorreccion: e.target.value })}
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 focus:border-emerald-505 rounded-lg text-xs font-mono font-semibold"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ALWAYS AVAILABLE: Materiales Empleados */}
                <div className="bg-emerald-50/20 p-4 border border-emerald-100/50 rounded-xl space-y-1.5">
                  <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    Materiales Empleados / Repuestos
                  </label>
                  <p className="text-[10px] text-slate-400">Puedes documentar los materiales requeridos o colocados para esta resolución en cualquier momento:</p>
                  <textarea
                    rows={2}
                    placeholder="Ej: 2 tubos fluorescentes LED, cinta de balizamiento, 1 pulsador de emergencia..."
                    value={formState.materialEmpleado}
                    onChange={(e) => setFormState({ ...formState, materialEmpleado: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 focus:border-emerald-500 focus:outline-hidden rounded-lg text-xs font-semibold"
                  />
                </div>

                {/* File Uploads Section (Photo & Budget PDF) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Image Photo Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Adjuntar Fotografía de Evidencia
                    </label>
                    <div
                      onDragOver={(e) => handleDragOver(e, "foto")}
                      onDragLeave={(e) => handleDragLeave(e, "foto")}
                      onDrop={(e) => handleDrop(e, "foto")}
                      className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                        isDraggingFile["foto"]
                          ? "border-emerald-500 bg-emerald-50/40"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <input
                        id="foto-file-input"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, "foto")}
                        className="hidden"
                      />
                      <label htmlFor="foto-file-input" className="cursor-pointer block">
                        <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
                        <span className="text-[11px] text-slate-600 block font-semibold">
                          {formState.fotoName ? formState.fotoName : "Subir o Arrastrar Imagen"}
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">JPG, PNG, GIF hasta 10MB</span>
                      </label>
                    </div>

                    {/* Image Preview with delete handle */}
                    {(formState.fotoBase64 || formState.urlFoto) && (
                      <div>
                        <div className="mt-2 flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="flex items-center gap-2">
                            <FileImage className="w-4 h-4 text-emerald-600" />
                            <span className="text-[10px] font-mono text-slate-600 max-w-[150px] truncate">
                              {formState.fotoName || "Fotografía Guardada"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormState({ ...formState, fotoBase64: "", fotoName: "", urlFoto: "" })}
                            className="text-red-500 hover:text-red-700 font-bold text-xs"
                          >
                            Quitar
                          </button>
                        </div>
                        
                        {accessToken && formState.fotoBase64 && !formState.urlFoto.startsWith("https://drive.google.com") && (
                          <button
                            type="button"
                            onClick={() => handleUploadFileDirectlyToDrive("foto")}
                            disabled={isUploadingDrive["foto"]}
                            className="mt-1 w-full flex items-center justify-center gap-1 py-1 px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-150 text-emerald-800 text-[10px] font-bold rounded-lg transition"
                          >
                            <FolderUp className="w-3 h-3 text-emerald-600" />
                            {isUploadingDrive["foto"] ? "Subiendo a tu Drive..." : "Guardar foto en Google Drive"}
                          </button>
                        )}
                        
                        {formState.urlFoto.startsWith("https://drive.google.com") && (
                          <div className="mt-1 text-center font-semibold text-[9px] text-emerald-700 flex items-center justify-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" /> Guardado directamente en Google Drive
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Budget PDF Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Adjuntar Presupuesto (PDF)
                    </label>
                    <div
                      onDragOver={(e) => handleDragOver(e, "pdf")}
                      onDragLeave={(e) => handleDragLeave(e, "pdf")}
                      onDrop={(e) => handleDrop(e, "pdf")}
                      className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                        isDraggingFile["pdf"]
                          ? "border-emerald-500 bg-emerald-50/40"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <input
                        id="pdf-file-input"
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => handleFileUpload(e, "pdf")}
                        className="hidden"
                      />
                      <label htmlFor="pdf-file-input" className="cursor-pointer block">
                        <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
                        <span className="text-[11px] text-slate-600 block font-semibold">
                          {formState.pdfName ? formState.pdfName : "Subir o Arrastrar PDF"}
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Archivo PDF hasta 10MB</span>
                      </label>
                    </div>

                    {/* PDF item loader with delete handle */}
                    {(formState.pdfBase64 || formState.urlPdf) && (
                      <div>
                        <div className="mt-2 flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-600" />
                            <span className="text-[10px] font-mono text-slate-600 max-w-[150px] truncate">
                              {formState.pdfName || "Presupuesto Guardado"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormState({ ...formState, pdfBase64: "", pdfName: "", urlPdf: "" })}
                            className="text-red-500 hover:text-red-700 font-bold text-xs"
                          >
                            Quitar
                          </button>
                        </div>

                        {accessToken && formState.pdfBase64 && !formState.urlPdf.startsWith("https://drive.google.com") && (
                          <button
                            type="button"
                            onClick={() => handleUploadFileDirectlyToDrive("pdf")}
                            disabled={isUploadingDrive["pdf"]}
                            className="mt-1 w-full flex items-center justify-center gap-1 py-1 px-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 text-indigo-800 text-[10px] font-bold rounded-lg transition"
                          >
                            <FolderUp className="w-3 h-3 text-indigo-600" />
                            {isUploadingDrive["pdf"] ? "Subiendo a tu Drive..." : "Guardar PDF en Google Drive"}
                          </button>
                        )}
                        
                        {formState.urlPdf.startsWith("https://drive.google.com") && (
                          <div className="mt-1 text-center font-semibold text-[9px] text-indigo-700 flex items-center justify-center gap-1">
                            <Check className="w-3 h-3 text-indigo-650" /> Guardado directamente en Google Drive
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes/Observaciones */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Observaciones Generales / Comentarios Extras
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Instrucciones especiales para el departamento de compras, notas internas, etc."
                    value={formState.observaciones}
                    onChange={(e) => setFormState({ ...formState, observaciones: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:outline-hidden rounded-lg text-xs"
                  />
                </div>

              </form>

              {/* Drawer Sticky Footer Actions */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
                {!isNewRecord && (
                  <button
                    type="button"
                    onClick={handleSoftDelete}
                    disabled={isSubmitLoading}
                    className="mr-auto px-4 py-2 text-xs font-extrabold text-red-700 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-lg transition duration-150 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar (Registro Histórico)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitLoading}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  onClick={handleFormSubmit}
                  disabled={isSubmitLoading}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm focus:ring-2 focus:ring-emerald-500/20"
                >
                  {isSubmitLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {isSubmitLoading ? "Guardando..." : "Guardar Registro"}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
