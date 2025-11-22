// Servicio de almacenamiento de sugerencias y propuestas en localStorage

interface Suggestion {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  categoria: 'bombero' | 'cabo' | 'sargento' | 'suboficial' | 'oficial';
  lugarTrabajo: 'Villarrobledo' | 'Hellín' | 'Almansa' | 'La Roda' | 'Alcaraz' | 'Molinicos' | 'Casas Ibáñez';
  asunto: string;
  descripcion: string;
  fechaRegistro: string;
}

const SUGGESTIONS_KEY = 'sepei_unido_suggestions';

// Obtener todas las sugerencias
export const getAllSuggestions = (): Suggestion[] => {
  const data = localStorage.getItem(SUGGESTIONS_KEY);
  return data ? JSON.parse(data) : [];
};

// Agregar nueva sugerencia
export const addSuggestion = (suggestionData: Omit<Suggestion, 'id' | 'fechaRegistro'>): Suggestion => {
  const suggestions = getAllSuggestions();
  const newSuggestion: Suggestion = {
    ...suggestionData,
    id: Date.now().toString(),
    fechaRegistro: new Date().toISOString(),
  };
  
  suggestions.push(newSuggestion);
  localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(suggestions));
  
  return newSuggestion;
};

// Obtener sugerencia por ID
export const getSuggestionById = (id: string): Suggestion | undefined => {
  const suggestions = getAllSuggestions();
  return suggestions.find(suggestion => suggestion.id === id);
};

// Obtener sugerencias por email
export const getSuggestionsByEmail = (email: string): Suggestion[] => {
  const suggestions = getAllSuggestions();
  return suggestions.filter(suggestion => suggestion.email === email);
};

// Eliminar sugerencia
export const deleteSuggestion = (id: string): boolean => {
  const suggestions = getAllSuggestions();
  const filtered = suggestions.filter(suggestion => suggestion.id !== id);
  localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(filtered));
  return filtered.length < suggestions.length;
};

// Exportar sugerencias a CSV
export const exportSuggestionsToCSV = (): void => {
  const suggestions = getAllSuggestions();
  
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
    s.lugarTrabajo,
    s.asunto,
    `"${s.descripcion.replace(/"/g, '""')}"`, // Escapar comillas en descripción
    new Date(s.fechaRegistro).toLocaleString('es-ES'),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `sugerencias_propuestas_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Limpiar todas las sugerencias
export const clearAllSuggestions = (): void => {
  if (confirm('¿Estás seguro de que quieres eliminar TODAS las sugerencias? Esta acción no se puede deshacer.')) {
    localStorage.removeItem(SUGGESTIONS_KEY);
  }
};
