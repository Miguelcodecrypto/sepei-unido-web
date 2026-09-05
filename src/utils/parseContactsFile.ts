/**
 * Parseo de listas de contactos (email externos) desde CSV, Excel (.xlsx/.xls) o
 * JSON, para la importación masiva del panel admin. Todo ocurre en el navegador —
 * el archivo nunca se sube a ningún servidor, solo los datos ya parseados.
 *
 * Usa `exceljs` en vez de `xlsx`/SheetJS para leer Excel: SheetJS tiene una
 * vulnerabilidad de prototype pollution/ReDoS conocida y sin parche en el registro
 * de npm (mismo motivo por el que CERES migró de xlsx a exceljs).
 *
 * No asumimos nombres de columna fijos: cada archivo real trae sus propias
 * cabeceras ("Ayuntamiento", "Contacto", "Titular"...), así que aquí solo se
 * detectan las columnas y se sugiere un mapeo por alias — quien importa confirma
 * o corrige manualmente qué columna es email/nombre/descripción antes de import.
 */
import type ExcelJS from 'exceljs';

export interface ParsedFileResult {
  headers: string[];
  records: Array<Record<string, string>>;
  parseErrors: string[];
  suggestedMapping: ColumnMapping;
}

export interface ColumnMapping {
  email?: string;
  nombre?: string;
  descripcion?: string;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const EMAIL_ALIASES = ['email', 'correo', 'correo electronico', 'correo electrónico', 'mail', 'e-mail'];
const NOMBRE_ALIASES = ['nombre', 'name', 'nombre completo', 'ayuntamiento', 'contacto', 'titular', 'entidad', 'organizacion', 'organización'];
const DESCRIPCION_ALIASES = ['descripcion', 'descripción', 'description', 'cargo', 'notas'];

function normalizeKey(key: string): string {
  // Excel añade un BOM (U+FEFF) al exportar CSV en UTF-8; trim() no lo elimina.
  return key.replace(/^﻿/, '').trim().toLowerCase();
}

function suggestMapping(headers: string[]): ColumnMapping {
  const findByAliases = (aliases: string[]): string | undefined =>
    headers.find((h) => aliases.includes(normalizeKey(h)));

  return {
    email: findByAliases(EMAIL_ALIASES),
    nombre: findByAliases(NOMBRE_ALIASES),
    descripcion: findByAliases(DESCRIPCION_ALIASES),
  };
}

async function parseCsv(file: File): Promise<ParsedFileResult> {
  const { default: Papa } = await import('papaparse');
  const text = await file.text();
  const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });

  const parseErrors = (result.errors || []).map((e) => `Fila ${e.row ?? '?'}: ${e.message}`);
  const headers = (result.meta.fields || []).map((h) => h.trim());
  const records = (result.data || []).map((row) => {
    const cleaned: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      cleaned[key.trim()] = value == null ? '' : String(value);
    }
    return cleaned;
  });

  return { headers, records, parseErrors, suggestedMapping: suggestMapping(headers) };
}

/**
 * exceljs no siempre da un string plano en `cell.value`: una celda con formato
 * (negrita, rich text) devuelve `{ richText: [...] }`, un email autoconvertido en
 * hipervínculo devuelve `{ text, hyperlink }`, y una fórmula devuelve
 * `{ formula, result }`. Sin esto, `String(cell.value)` da "[object Object]".
 */
function excelCellToString(value: ExcelJS.CellValue): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((rt) => rt.text).join('');
    }
    if ('text' in value && typeof value.text === 'string') return value.text;
    if ('result' in value && value.result != null) return excelCellToString(value.result as ExcelJS.CellValue);
    return '';
  }
  return String(value);
}

async function parseExcel(file: File): Promise<ParsedFileResult> {
  const { default: ExcelJS } = await import('exceljs');
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return { headers: [], records: [], parseErrors: ['El archivo no contiene ninguna hoja'], suggestedMapping: {} };

  const headerRow = worksheet.getRow(1);
  const headersByCol: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headersByCol[colNumber] = excelCellToString(cell.value).trim();
  });
  const headers = headersByCol.filter(Boolean);

  const records: Array<Record<string, string>> = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // cabecera
    const record: Record<string, string> = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headersByCol[colNumber];
      if (header) record[header] = excelCellToString(cell.value);
    });
    if (Object.values(record).some((v) => v.trim())) records.push(record);
  });

  return { headers, records, parseErrors: [], suggestedMapping: suggestMapping(headers) };
}

async function parseJson(file: File): Promise<ParsedFileResult> {
  const text = await file.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { headers: [], records: [], parseErrors: ['El archivo no es JSON válido'], suggestedMapping: {} };
  }

  const items: any[] = (Array.isArray(parsed) ? parsed : [parsed]).filter(
    (item) => item && typeof item === 'object'
  );

  const headerSet = new Set<string>();
  const records = items.map((item) => {
    const record: Record<string, string> = {};
    for (const [key, value] of Object.entries(item)) {
      record[key] = value == null ? '' : String(value);
      headerSet.add(key);
    }
    return record;
  });
  const headers = Array.from(headerSet);

  return { headers, records, parseErrors: [], suggestedMapping: suggestMapping(headers) };
}

export async function parseContactsFile(file: File): Promise<ParsedFileResult> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { headers: [], records: [], parseErrors: ['El archivo supera el tamaño máximo permitido (5MB)'], suggestedMapping: {} };
  }

  const extension = file.name.split('.').pop()?.toLowerCase();

  try {
    if (extension === 'csv') return await parseCsv(file);
    if (extension === 'xlsx' || extension === 'xls') return await parseExcel(file);
    if (extension === 'json') return await parseJson(file);
    return { headers: [], records: [], parseErrors: [`Formato de archivo no soportado: .${extension || '?'}`], suggestedMapping: {} };
  } catch (error) {
    console.error('Error al parsear archivo de contactos:', error);
    return { headers: [], records: [], parseErrors: ['No se pudo leer el archivo. Comprueba que no esté dañado.'], suggestedMapping: {} };
  }
}
