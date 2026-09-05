/**
 * Parseo de listas de contactos (email externos) desde CSV, Excel (.xlsx/.xls) o
 * JSON, para la importación masiva del panel admin. Todo ocurre en el navegador —
 * el archivo nunca se sube a ningún servidor, solo los datos ya parseados.
 *
 * Usa `exceljs` en vez de `xlsx`/SheetJS para leer Excel: SheetJS tiene una
 * vulnerabilidad de prototype pollution/ReDoS conocida y sin parche en el registro
 * de npm (mismo motivo por el que CERES migró de xlsx a exceljs).
 */
import type ExcelJS from 'exceljs';
import type { BulkImportContact } from '../services/externalEmailsDatabase';

export interface ParsedContactsResult {
  rows: BulkImportContact[];
  parseErrors: string[];
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const EMAIL_KEYS = ['email', 'correo', 'correo electronico', 'correo electrónico', 'mail', 'e-mail'];
const NOMBRE_KEYS = ['nombre', 'name', 'nombre completo'];
const DESCRIPCION_KEYS = ['descripcion', 'descripción', 'description', 'cargo', 'notas'];

function normalizeKey(key: string): string {
  // Excel añade un BOM (U+FEFF) al exportar CSV en UTF-8; trim() no lo elimina.
  return key.replace(/^﻿/, '').trim().toLowerCase();
}

function findValueByAliases(record: Record<string, any>, aliases: string[]): string | undefined {
  const normalizedEntries = Object.entries(record).map(([k, v]) => [normalizeKey(k), v] as const);
  for (const alias of aliases) {
    const match = normalizedEntries.find(([k]) => k === alias);
    if (match && match[1] != null) return String(match[1]);
  }
  return undefined;
}

function recordToContact(record: Record<string, any>): BulkImportContact | null {
  const email = findValueByAliases(record, EMAIL_KEYS);
  if (!email || !email.trim()) return null;

  const nombre = findValueByAliases(record, NOMBRE_KEYS) || '';
  const descripcion = findValueByAliases(record, DESCRIPCION_KEYS);

  return { email: email.trim(), nombre: nombre.trim(), descripcion: descripcion?.trim() };
}

async function parseCsv(file: File): Promise<ParsedContactsResult> {
  const { default: Papa } = await import('papaparse');
  const text = await file.text();
  const result = Papa.parse<Record<string, any>>(text, { header: true, skipEmptyLines: true });

  const parseErrors = (result.errors || []).map((e) => `Fila ${e.row ?? '?'}: ${e.message}`);
  const rows = (result.data || [])
    .map(recordToContact)
    .filter((c): c is BulkImportContact => c !== null);

  return { rows, parseErrors };
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

async function parseExcel(file: File): Promise<ParsedContactsResult> {
  const { default: ExcelJS } = await import('exceljs');
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return { rows: [], parseErrors: ['El archivo no contiene ninguna hoja'] };

  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = excelCellToString(cell.value).trim();
  });

  const rows: BulkImportContact[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // cabecera
    const record: Record<string, any> = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (header) record[header] = excelCellToString(cell.value);
    });
    const contact = recordToContact(record);
    if (contact) rows.push(contact);
  });

  return { rows, parseErrors: [] };
}

async function parseJson(file: File): Promise<ParsedContactsResult> {
  const text = await file.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { rows: [], parseErrors: ['El archivo no es JSON válido'] };
  }

  const items = Array.isArray(parsed) ? parsed : [parsed];
  const rows = items
    .filter((item) => item && typeof item === 'object')
    .map(recordToContact)
    .filter((c): c is BulkImportContact => c !== null);

  return { rows, parseErrors: [] };
}

export async function parseContactsFile(file: File): Promise<ParsedContactsResult> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { rows: [], parseErrors: [`El archivo supera el tamaño máximo permitido (5MB)`] };
  }

  const extension = file.name.split('.').pop()?.toLowerCase();

  try {
    if (extension === 'csv') return await parseCsv(file);
    if (extension === 'xlsx' || extension === 'xls') return await parseExcel(file);
    if (extension === 'json') return await parseJson(file);
    return { rows: [], parseErrors: [`Formato de archivo no soportado: .${extension || '?'}`] };
  } catch (error) {
    console.error('Error al parsear archivo de contactos:', error);
    return { rows: [], parseErrors: ['No se pudo leer el archivo. Comprueba que no esté dañado.'] };
  }
}
