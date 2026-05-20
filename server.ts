import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

// Configuration
const PORT = 3000;
const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "inspections.json");
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// Ensure directories exist
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Default/mock initial data
const DEFAULT_INSPECTIONS = [
  {
    "Nº Inspección": "INS-001",
    "Fecha Detección": "2026-05-10",
    "Zona / Equipo": "Línea de Inyección 3 - Moldeadora",
    "Descripción": "Falta de resguardo de protección móvil en la zona de cierre del molde. Riesgo de atrapamiento grave.",
    "Requisito Legal S/N": "S",
    "Urgencia": "Alta",
    "URL Foto": "/uploads/mock_inj_mold_protection.jpg",
    "URL PDF Presupuesto": "",
    "Asignado a": "mantenimiento@ponienteplast.es",
    "Estado": "en proceso",
    "Corregido por": "",
    "Fecha Corrección": "",
    "Material Empleado": "",
    "Observaciones": "Se ha solicitado presupuesto para mampara de policarbonato con microinterruptor de seguridad.",
    "rowIndex": 2
  },
  {
    "Nº Inspección": "INS-002",
    "Fecha Detección": "2026-05-12",
    "Zona / Equipo": "Silo de Almacenamiento - Materia Prima",
    "Descripción": "Acumulación excesiva de polvo de granza plástica en pasarelas superiores. Peligro de resbalada y atmósfera explosiva (ATEX).",
    "Requisito Legal S/N": "S",
    "Urgencia": "Alta",
    "URL Foto": "/uploads/mock_granza_dust.jpg",
    "URL PDF Presupuesto": "",
    "Asignado a": "limpieza@ponienteplast.es",
    "Estado": "corregido",
    "Corregido por": "Juan Pérez",
    "Fecha Corrección": "2026-05-14",
    "Material Empleado": "Manguera de aspiración ATEX y detergente desengrasante clase II",
    "Observaciones": "Limpieza profunda realizada con éxito. Se establece un calendario quincenal de aspiración preventiva.",
    "rowIndex": 3
  },
  {
    "Nº Inspección": "INS-003",
    "Fecha Detección": "2026-05-15",
    "Zona / Equipo": "Almacén de Expediciones - Muelles 1 y 2",
    "Descripción": "Líneas de delimitación peatonal de seguridad desgastadas y apenas visibles por el paso de carretillas.",
    "Requisito Legal S/N": "S",
    "Urgencia": "Media",
    "URL Foto": "",
    "URL PDF Presupuesto": "/uploads/mock_presupuest_pintura.pdf",
    "Asignado a": "prl@ponienteplast.es",
    "Estado": "pendiente",
    "Corregido por": "",
    "Fecha Corrección": "",
    "Material Empleado": "",
    "Observaciones": "Presupuesto recibido de Pinturas Poniente S.L. para repintado fotoluminiscente resistente al tránsito pesado.",
    "rowIndex": 4
  },
  {
    "Nº Inspección": "INS-004",
    "Fecha Detección": "2026-05-18",
    "Zona / Equipo": "Zona de Extrusión - Enfriadores de Agua",
    "Descripción": "Fuga leve de agua tratada con refrigerante en racor de retorno de la enfriadora 2. Riesgo de caída al mismo nivel y vertido medioambiental.",
    "Requisito Legal S/N": "N",
    "Urgencia": "Media",
    "URL Foto": "",
    "URL PDF Presupuesto": "",
    "Asignado a": "mantenimiento@ponienteplast.es",
    "Estado": "pendiente",
    "Corregido por": "",
    "Fecha Corrección": "",
    "Material Empleado": "",
    "Observaciones": "Requiere cambio de junta tórica. Planificado para el próximo mantenimiento preventivo del fin de semana.",
    "rowIndex": 5
  }
];

// Initialize DB with defaults if missing
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_INSPECTIONS, null, 2), "utf-8");
}

// Generate some blank mock dynamic visual files to prevent broken images/PDF lines
const createMockFileIfMissing = (name: string, contentStr: string, isPdf = false) => {
  const filePath = path.join(UPLOADS_DIR, name);
  if (!fs.existsSync(filePath)) {
    if (isPdf) {
      // Small mock PDF content
      fs.writeFileSync(filePath, "%PDF-1.4\n1 0 obj\n<<\n/Title (Presupuesto Pintado)\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF");
    } else {
      // Create simple 1x1 pixel base64 image or a simple svg as fallback
      const base64Pixel = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      fs.writeFileSync(filePath, Buffer.from(base64Pixel, "base64"));
    }
  }
};
createMockFileIfMissing("mock_inj_mold_protection.jpg", "");
createMockFileIfMissing("mock_granza_dust.jpg", "");
createMockFileIfMissing("mock_presupuest_pintura.pdf", "", true);

async function startServer() {
  const app = express();

  // Handle larger payloads for base64 file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Static files for uploads
  app.use("/uploads", express.static(UPLOADS_DIR));

  // --- API ROUTES ---

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Get Initial Data (Equivalent to getInitialData in the Apps Script)
  app.get("/api/initial-data", (req, res) => {
    try {
      let inspections = [];
      if (fs.existsSync(DB_FILE)) {
        inspections = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      } else {
        inspections = DEFAULT_INSPECTIONS;
      }

      // Generate next suggestion (e.g. INS-005)
      let nextId = "INS-001";
      if (inspections.length > 0) {
        let maxNum = 0;
        inspections.forEach((ins: any) => {
          const match = String(ins["Nº Inspección"] || "").match(/INS-(\d+)/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        });
        const nextNum = maxNum + 1;
        nextId = "INS-" + String(nextNum).padStart(3, "0");
      }

      // Default active user is the one running this app
      const userEmail = "personal@ponienteplast.es";

      res.json({
        success: true,
        inspections,
        nextId,
        userEmail
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.toString() });
    }
  });

  // Save Inspection (Equivalent to saveInspection and uploadToDrive in Apps Script)
  app.post("/api/save-inspection", (req, res) => {
    try {
      const payload = req.body;
      let inspections: any[] = [];
      if (fs.existsSync(DB_FILE)) {
        inspections = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      }

      const id = String(payload.id).trim();

      // Find if exists
      const existingIdx = inspections.findIndex(
        (ins) => String(ins["Nº Inspección"]).toLowerCase() === id.toLowerCase()
      );

      // Duplicate check for new records
      if (payload.isNew && existingIdx !== -1) {
        return res.status(400).json({
          success: false,
          error: `El número de inspección '${id}' ya existe en la base de datos.`
        });
      }

      if (!payload.isNew && existingIdx === -1) {
        return res.status(404).json({
          success: false,
          error: `No se encontró la inspección con el ID '${id}' para actualizar.`
        });
      }

      // Save uploaded photo base64
      let urlFoto = payload.urlFoto || "";
      if (payload.fotoBase64 && payload.fotoName) {
        const fileExt = path.extname(payload.fotoName) || ".jpg";
        const filename = `foto_${id}_${Date.now()}${fileExt}`;
        const filePath = path.join(UPLOADS_DIR, filename);

        // Strip data prefix if exists
        const base64Data = payload.fotoBase64.includes(",")
          ? payload.fotoBase64.split(",")[1]
          : payload.fotoBase64;

        fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
        urlFoto = `/uploads/${filename}`;
      }

      // Save uploaded PDF base64
      let urlPdf = payload.urlPdf || "";
      if (payload.pdfBase64 && payload.pdfName) {
        const fileExt = path.extname(payload.pdfName) || ".pdf";
        const filename = `pdf_${id}_${Date.now()}${fileExt}`;
        const filePath = path.join(UPLOADS_DIR, filename);

        const base64Data = payload.pdfBase64.includes(",")
          ? payload.pdfBase64.split(",")[1]
          : payload.pdfBase64;

        fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
        urlPdf = `/uploads/${filename}`;
      }

      // Construct properties to fit the exact row columns schema
      const inspectionRecord = {
        "Nº Inspección": id,
        "Fecha Detección": payload.fechaDeteccion,
        "Zona / Equipo": payload.zonaEquipo,
        "Descripción": payload.descripcion,
        "Requisito Legal S/N": payload.requisitoLegal === "S" || payload.requisitoLegal === true ? "S" : "N",
        "Urgencia": payload.urgencia,
        "URL Foto": urlFoto,
        "URL PDF Presupuesto": urlPdf,
        "Asignado a": payload.asignadoA,
        "Estado": payload.estado || "pendiente",
        "Corregido por": payload.corregidoPor || "",
        "Fecha Corrección": payload.fechaCorreccion || "",
        "Material Empleado": payload.materialEmpleado || "",
        "Observaciones": payload.observaciones || "",
        "rowIndex": existingIdx !== -1 ? inspections[existingIdx].rowIndex : inspections.length + 2
      };

      if (payload.isNew) {
        inspections.push(inspectionRecord);
      } else {
        inspections[existingIdx] = inspectionRecord;
      }

      // Record to file
      fs.writeFileSync(DB_FILE, JSON.stringify(inspections, null, 2), "utf-8");

      res.json({ success: true, record: inspectionRecord });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.toString() });
    }
  });

  // Delete inspection (additional feature for helper quality, fully client controllable)
  app.post("/api/delete-inspection", (req, res) => {
    try {
      const { id } = req.body;
      if (!fs.existsSync(DB_FILE)) {
        return res.status(404).json({ success: false, error: "Base de datos vacía." });
      }
      let inspections = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      const filtered = inspections.filter(
        (ins: any) => String(ins["Nº Inspección"]).toLowerCase() !== String(id).toLowerCase()
      );

      // Re-index rowIndex field just to maintain alignment
      const reindexed = filtered.map((ins: any, idx: number) => ({
        ...ins,
        rowIndex: idx + 2
      }));

      fs.writeFileSync(DB_FILE, JSON.stringify(reindexed, null, 2), "utf-8");
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.toString() });
    }
  });

  // Get Apps Script config for convenience of the client copy-paste
  app.get("/api/config-info", (req, res) => {
    res.json({
      googleAppsScriptCode: `/**
 * ====================================================================
 * CONFIGURACIÓN DE LA APP DE INSPECCIONES - PONIENTEPLAST
 * ====================================================================
 */
const CONFIG = {
  SPREADSHEET_ID: "14tVSdRw5G8pshoztxJ2q4N7pm0S-BhwrFK4I5fT10KA",
  SHEET_NAME: "Base de Datos Inspecciones",
  FOLDER_FOTOS_ID: "1CaJnfKYc7_91oGO_pZak3Y6mJjfqOd7t", 
  FOLDER_PDFS_ID: "1sPvFQz2VqwdSAfjiGojLx9wvidr4q83W"
};`,
    });
  });

  // Vite Integration in Development / Serve bundle in Production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
