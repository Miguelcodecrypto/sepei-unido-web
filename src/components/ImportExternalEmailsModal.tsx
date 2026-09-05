import { useRef, useState } from 'react';
import { X, Upload, AlertCircle, CheckCircle2, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import { parseContactsFile, type ColumnMapping } from '../utils/parseContactsFile';
import { bulkCreateExternalEmails, type BulkImportContact, type BulkImportResult } from '../services/externalEmailsDatabase';

interface ImportExternalEmailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

type Step = 'upload' | 'mapping' | 'preview' | 'result';

export function ImportExternalEmailsModal({ isOpen, onClose, onImported }: ImportExternalEmailsModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [records, setRecords] = useState<Array<Record<string, string>>>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  if (!isOpen) return null;

  const reset = () => {
    setStep('upload');
    setFileName(null);
    setHeaders([]);
    setRecords([]);
    setMapping({});
    setParseErrors([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResult(null);
    setFileName(file.name);
    const parsed = await parseContactsFile(file);
    setHeaders(parsed.headers);
    setRecords(parsed.records);
    setMapping(parsed.suggestedMapping);
    setParseErrors(parsed.parseErrors);

    if (parsed.headers.length > 0 && parsed.records.length > 0) {
      setStep('mapping');
    }
  };

  const rows: BulkImportContact[] = mapping.email
    ? records.map((record) => ({
        email: record[mapping.email!] || '',
        nombre: mapping.nombre ? record[mapping.nombre] || '' : '',
        descripcion: mapping.descripcion ? record[mapping.descripcion] : undefined,
      }))
    : [];

  const handleConfirmMapping = () => setStep('preview');

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    const importResult = await bulkCreateExternalEmails(rows);
    setImporting(false);

    if (!importResult) {
      setParseErrors(['Error al importar los contactos. Inténtalo de nuevo.']);
      return;
    }

    setResult(importResult);
    setStep('result');
    if (importResult.created > 0) onImported();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Importar contactos desde archivo</h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-white transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        {step === 'upload' && (
          <>
            <p className="text-sm text-gray-400 mb-4">
              Admite archivos <strong>.csv</strong>, <strong>.xlsx</strong>, <strong>.xls</strong> o{' '}
              <strong>.json</strong>. En el siguiente paso podrás indicar qué columna de tu archivo
              es el email y cuál el nombre, sea cual sea su cabecera.
            </p>

            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-600 rounded-lg p-8 cursor-pointer hover:border-blue-500 transition mb-4">
              <Upload className="w-8 h-8 text-gray-500" />
              <span className="text-gray-300 text-sm">
                {fileName ? fileName : 'Haz clic para seleccionar un archivo'}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.json"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {parseErrors.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-red-900/50 border border-red-600 rounded-lg mb-4">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-300 space-y-1">
                  {parseErrors.slice(0, 10).map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                  {parseErrors.length > 10 && <p>... y {parseErrors.length - 10} más</p>}
                </div>
              </div>
            )}

            {fileName && headers.length === 0 && parseErrors.length === 0 && (
              <p className="text-sm text-yellow-400">El archivo no contiene ninguna columna reconocible.</p>
            )}

            <button
              onClick={handleClose}
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
            >
              Cancelar
            </button>
          </>
        )}

        {step === 'mapping' && (
          <>
            <p className="text-sm text-gray-400 mb-4">
              {fileName} — {records.length} filas encontradas. Indica qué columna corresponde a cada
              campo (marcadas automáticamente cuando la cabecera lo dejaba claro).
            </p>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Columna del email *</label>
                <select
                  value={mapping.email || ''}
                  onChange={(e) => setMapping({ ...mapping, email: e.target.value || undefined })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">-- Selecciona una columna --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Columna del nombre *</label>
                <select
                  value={mapping.nombre || ''}
                  onChange={(e) => setMapping({ ...mapping, nombre: e.target.value || undefined })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">-- Selecciona una columna --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Columna de descripción (opcional)</label>
                <select
                  value={mapping.descripcion || ''}
                  onChange={(e) => setMapping({ ...mapping, descripcion: e.target.value || undefined })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">-- Ninguna --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Atrás
              </button>
              <button
                onClick={handleConfirmMapping}
                disabled={!mapping.email || !mapping.nombre}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar
              </button>
            </div>
          </>
        )}

        {step === 'preview' && (
          <>
            <div className="flex-1 overflow-y-auto mb-4">
              <div className="flex items-center gap-2 mb-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-300 font-semibold">{rows.length} contactos a importar</span>
              </div>
              <div className="bg-gray-900 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-300">Email</th>
                      <th className="px-3 py-2 text-left text-gray-300">Nombre</th>
                      <th className="px-3 py-2 text-left text-gray-300">Descripción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {rows.slice(0, 50).map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-white">{row.email || <span className="text-red-400">(vacío)</span>}</td>
                        <td className="px-3 py-2 text-white">{row.nombre || <span className="text-red-400">(vacío)</span>}</td>
                        <td className="px-3 py-2 text-gray-400">{row.descripcion || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 50 && (
                  <p className="text-center text-gray-500 text-xs py-2">... y {rows.length - 50} más</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setStep('mapping')}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Atrás
              </button>
              <button
                onClick={handleImport}
                disabled={rows.length === 0 || importing}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? 'Importando...' : `Importar ${rows.length} contacto${rows.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        )}

        {step === 'result' && result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-4 bg-green-900/30 border border-green-600 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
              <span className="text-green-300 font-semibold">{result.created} contactos importados correctamente</span>
            </div>

            {result.alreadyExists > 0 && (
              <p className="text-sm text-gray-400">
                {result.alreadyExists} email{result.alreadyExists !== 1 ? 's' : ''} ya existían en la base de datos y se omitieron.
              </p>
            )}

            {result.invalid.length > 0 && (
              <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-3 max-h-48 overflow-y-auto">
                <p className="text-sm text-yellow-300 font-semibold mb-2">
                  {result.invalid.length} fila{result.invalid.length !== 1 ? 's' : ''} omitida{result.invalid.length !== 1 ? 's' : ''} por error:
                </p>
                {result.invalid.map((inv, i) => (
                  <p key={i} className="text-xs text-yellow-400">
                    Fila {inv.row}: {inv.reason}
                  </p>
                ))}
              </div>
            )}

            <button
              onClick={handleClose}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
