// Simulación de base de datos local en localStorage
// En producción, esto se conectaría a un backend real (Node.js/Express, Django, etc.)

interface User {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  fechaRegistro: string;
  terminos_aceptados: boolean;
  fecha_aceptacion_terminos: string;
  version_terminos: string;
}

const DB_KEY = 'sepei_unido_users';

// Obtener todos los usuarios
export const getAllUsers = (): User[] => {
  const data = localStorage.getItem(DB_KEY);
  return data ? JSON.parse(data) : [];
};

// Agregar nuevo usuario
export const addUser = (userData: Omit<User, 'id' | 'fechaRegistro' | 'fecha_aceptacion_terminos' | 'version_terminos'> & { terminos_aceptados: boolean }): User => {
  const users = getAllUsers();
  const newUser: User = {
    ...userData,
    id: Date.now().toString(),
    fechaRegistro: new Date().toISOString(),
    fecha_aceptacion_terminos: new Date().toISOString(),
    version_terminos: '1.0',
  };
  
  users.push(newUser);
  localStorage.setItem(DB_KEY, JSON.stringify(users));
  
  return newUser;
};

// Obtener usuario por ID
export const getUserById = (id: string): User | undefined => {
  const users = getAllUsers();
  return users.find(user => user.id === id);
};

// Obtener usuarios por email
export const getUserByEmail = (email: string): User | undefined => {
  const users = getAllUsers();
  return users.find(user => user.email === email);
};

// Actualizar usuario
export const updateUser = (id: string, updates: Partial<Omit<User, 'id' | 'fechaRegistro'>>): User | null => {
  const users = getAllUsers();
  const index = users.findIndex(user => user.id === id);
  
  if (index === -1) return null;
  
  users[index] = { ...users[index], ...updates };
  localStorage.setItem(DB_KEY, JSON.stringify(users));
  
  return users[index];
};

// Eliminar usuario
export const deleteUser = (id: string): boolean => {
  const users = getAllUsers();
  const filtered = users.filter(user => user.id !== id);
  
  if (filtered.length === users.length) return false;
  
  localStorage.setItem(DB_KEY, JSON.stringify(filtered));
  return true;
};

// Exportar usuarios a CSV
export const exportUsersToCSV = (): void => {
  const users = getAllUsers();
  
  if (users.length === 0) {
    alert('No hay usuarios para exportar');
    return;
  }
  
  const headers = ['ID', 'Nombre', 'Email', 'Teléfono', 'Instagram', 'Facebook', 'Twitter', 'LinkedIn', 'Fecha Registro'];
  const rows = users.map(user => [
    user.id,
    user.nombre,
    user.email,
    user.telefono || '',
    user.instagram || '',
    user.facebook || '',
    user.twitter || '',
    user.linkedin || '',
    new Date(user.fechaRegistro).toLocaleDateString('es-ES'),
  ]);
  
  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sepei-usuarios-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};

// Limpiar toda la base de datos (solo para desarrollo)
export const clearDatabase = (): void => {
  if (confirm('¿Estás seguro de que deseas eliminar todos los usuarios?')) {
    localStorage.removeItem(DB_KEY);
  }
};
