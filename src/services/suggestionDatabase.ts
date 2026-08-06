/**
 * Cliente de sugerencias/propuestas. Todas las operaciones pasan por /api/suggestions
 * (service_role en el servidor) — antes se leía/escribía la tabla `suggestions`
 * directo con la anon key, lo que permitía a cualquiera leer nombre, email y
 * teléfono de todas las sugerencias enviadas (ver auditoría 2026-08-06).
 */
import { getAdminToken } from './authService';

interface Suggestion {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  categoria: 'bombero' | 'cabo' | 'sargento' | 'suboficial' | 'oficial';
  lugar_trabajo: 'Villarrobledo' | 'Hellín' | 'Almansa' | 'La Roda' | 'Alcaraz' | 'Molinicos' | 'Casas Ibáñez';
  asunto: string;
  descripcion: string;
  fecha_registro: string;
}

async function suggestionsFetch(action: string, options: RequestInit & { auth?: boolean } = {}): Promise<any> {
  const { auth, ...init } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as any) };

  if (auth) {
    const token = getAdminToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const resp = await fetch(`/api/suggestions?action=${action}`, { ...init, headers });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || `Error en ${action}`);
  return data;
}

// Obtener todas las sugerencias (admin)
export const getAllSuggestions = async (): Promise<Suggestion[]> => {
  try {
    const data = await suggestionsFetch('list', { auth: true });
    return data.suggestions || [];
  } catch (error) {
    console.error('Error al obtener sugerencias:', error);
    return [];
  }
};

// Agregar nueva sugerencia (público)
export const addSuggestion = async (suggestionData: Omit<Suggestion, 'id' | 'fecha_registro'>): Promise<Suggestion | null> => {
  try {
    const data = await suggestionsFetch('create', {
      method: 'POST',
      body: JSON.stringify(suggestionData),
    });
    return data.suggestion || null;
  } catch (error) {
    console.error('Error en addSuggestion:', error);
    return null;
  }
};

// Eliminar sugerencia (admin)
export const deleteSuggestion = async (id: string): Promise<boolean> => {
  try {
    await suggestionsFetch('delete', { method: 'POST', auth: true, body: JSON.stringify({ id }) });
    return true;
  } catch (error) {
    console.error('Error en deleteSuggestion:', error);
    return false;
  }
};

// Limpiar todas las sugerencias (admin)
export const clearAllSuggestions = async (): Promise<boolean> => {
  try {
    await suggestionsFetch('clear', { method: 'POST', auth: true });
    return true;
  } catch (error) {
    console.error('Error en clearAllSuggestions:', error);
    return false;
  }
};

// Exportar sugerencias a CSV (admin)
export const exportSuggestionsToCSV = async (): Promise<void> => {
  const suggestions = await getAllSuggestions();

  if (suggestions.length === 0) {
    alert('No hay sugerencias para exportar');
    return;
  }

  const headers = ['ID', 'Nombre', 'Apellidos', 'Email', 'Teléfono', 'Categoría', 'Lugar de Trabajo', 'Asunto', 'Descripción', 'Fecha Registro'];
  const rows = suggestions.map(s => [
    s.id,
    s.nombre,
    s.apellidos,
    s.email,
    s.telefono,
    s.categoria,
    s.lugar_trabajo,
    s.asunto,
    `"${s.descripcion.replace(/"/g, '""')}"`, // Escapar comillas en descripción
    new Date(s.fecha_registro).toLocaleString('es-ES'),
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `sugerencias_sepei_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};
