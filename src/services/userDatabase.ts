import { supabase } from '../lib/supabase';

interface User {
  id: string;
  nombre: string;
  apellidos?: string;
  dni?: string;
  email: string;
  telefono?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  fecha_registro: string;
  terminos_aceptados: boolean;
  fecha_aceptacion_terminos: string;
  version_terminos: string;
  certificado_nif?: string;
  certificado_thumbprint?: string;
  certificado_fecha_validacion?: string;
  certificado_valido?: boolean;
  verified?: boolean;
}

// Obtener todos los usuarios
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('fecha_registro', { ascending: false });

    if (error) {
      console.error('Error al obtener usuarios:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error en getAllUsers:', error);
    return [];
  }
};

// Agregar nuevo usuario
export const addUser = async (userData: Omit<User, 'id' | 'fecha_registro' | 'fecha_aceptacion_terminos' | 'version_terminos'> & { terminos_aceptados: boolean }): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([{
        nombre: userData.nombre,
        apellidos: userData.apellidos,
        dni: userData.dni,
        email: userData.email,
        telefono: userData.telefono,
        instagram: userData.instagram,
        facebook: userData.facebook,
        twitter: userData.twitter,
        linkedin: userData.linkedin,
        terminos_aceptados: userData.terminos_aceptados,
        certificado_nif: userData.certificado_nif,
        certificado_thumbprint: userData.certificado_thumbprint,
        certificado_fecha_validacion: userData.certificado_fecha_validacion,
        certificado_valido: userData.certificado_valido,
        verified: userData.verified,
        version_terminos: '1.0',
      }])
      .select()
      .single();

    if (error) {
      console.error('Error al agregar usuario:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error en addUser:', error);
    return null;
  }
};

// Obtener usuario por ID
export const getUserById = async (id: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error al obtener usuario:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error en getUserById:', error);
    return null;
  }
};

// Obtener usuario por email
export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error al obtener usuario por email:', error);
    }

    return data || null;
  } catch (error) {
    console.error('Error en getUserByEmail:', error);
    return null;
  }
};

// Eliminar usuario
export const deleteUser = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar usuario:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error en deleteUser:', error);
    return false;
  }
};

// Limpiar base de datos
export const clearDatabase = async (): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todos

    if (error) {
      console.error('Error al limpiar base de datos:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error en clearDatabase:', error);
    return false;
  }
};

// Exportar usuarios a CSV
export const exportUsersToCSV = async (): Promise<void> => {
  const users = await getAllUsers();
  
  if (users.length === 0) {
    alert('No hay usuarios para exportar');
    return;
  }

  const headers = ['ID', 'Nombre', 'Apellidos', 'DNI', 'Email', 'Teléfono', 'Instagram', 'Facebook', 'Twitter', 'LinkedIn', 'Fecha Registro', 'Términos Aceptados', 'Certificado NIF', 'Certificado Válido'];
  const rows = users.map(u => [
    u.id,
    u.nombre,
    u.apellidos || '',
    u.dni || '',
    u.email,
    u.telefono || '',
    u.instagram || '',
    u.facebook || '',
    u.twitter || '',
    u.linkedin || '',
    new Date(u.fecha_registro).toLocaleString('es-ES'),
    u.terminos_aceptados ? 'Sí' : 'No',
    u.certificado_nif || '',
    u.certificado_valido ? 'Sí' : 'No',
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `usuarios_sepei_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};
