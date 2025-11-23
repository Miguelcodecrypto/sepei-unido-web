import { supabase } from '../lib/supabase';

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

// Obtener todas las sugerencias
export const getAllSuggestions = async (): Promise<Suggestion[]> => {
  try {
    const { data, error } = await supabase
      .from('suggestions')
      .select('*')
      .order('fecha_registro', { ascending: false });

    if (error) {
      console.error('Error al obtener sugerencias:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error en getAllSuggestions:', error);
    return [];
  }
};

// Agregar nueva sugerencia
export const addSuggestion = async (suggestionData: Omit<Suggestion, 'id' | 'fecha_registro'>): Promise<Suggestion | null> => {
  try {
    const { data, error } = await supabase
      .from('suggestions')
      .insert([{
        nombre: suggestionData.nombre,
        apellidos: suggestionData.apellidos,
        email: suggestionData.email,
        telefono: suggestionData.telefono,
        categoria: suggestionData.categoria,
        lugar_trabajo: suggestionData.lugar_trabajo,
        asunto: suggestionData.asunto,
        descripcion: suggestionData.descripcion,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error al agregar sugerencia:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error en addSuggestion:', error);
    return null;
  }
};

// Obtener sugerencia por ID
export const getSuggestionById = async (id: string): Promise<Suggestion | null> => {
  try {
    const { data, error } = await supabase
      .from('suggestions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error al obtener sugerencia:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error en getSuggestionById:', error);
    return null;
  }
};

// Obtener sugerencias por email
export const getSuggestionsByEmail = async (email: string): Promise<Suggestion[]> => {
  try {
    const { data, error } = await supabase
      .from('suggestions')
      .select('*')
      .eq('email', email)
      .order('fecha_registro', { ascending: false });

    if (error) {
      console.error('Error al obtener sugerencias por email:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error en getSuggestionsByEmail:', error);
    return [];
  }
};

// Eliminar sugerencia
export const deleteSuggestion = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('suggestions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar sugerencia:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error en deleteSuggestion:', error);
    return false;
  }
};

// Limpiar todas las sugerencias
export const clearAllSuggestions = async (): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('suggestions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todas

    if (error) {
      console.error('Error al limpiar sugerencias:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error en clearAllSuggestions:', error);
    return false;
  }
};

// Exportar sugerencias a CSV
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
