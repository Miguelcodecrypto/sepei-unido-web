import { supabase } from '../lib/supabase';

interface User {
  id: string;
  nombre: string;
  apellidos?: string;
  dni?: string;
  email: string;
  telefono?: string;
  parque_sepei?: string;
  password?: string;
  registration_ip?: string;
  fecha_registro: string;
  terminos_aceptados: boolean;
  fecha_aceptacion_terminos: string;
  version_terminos: string;
  certificado_nif?: string;
  certificado_thumbprint?: string;
  certificado_fecha_validacion?: string;
  certificado_valido?: boolean;
  verified?: boolean;
  requires_password_change?: boolean;
  lastLogin?: string;
  last_login?: string;
  autorizado_votar?: boolean;
  verification_token?: string;
  verification_token_expires_at?: string;
}

// Obtener usuario por token de verificación
export const getUserByVerificationToken = async (token: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('verification_token', token)
      .maybeSingle();

    if (error) {
      console.error('Error al obtener usuario por token:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error en getUserByVerificationToken:', error);
    return null;
  }
};

// Verificar usuario y limpiar token
export const verifyUserEmail = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        verified: true,
        verification_token: null,
        verification_token_expires_at: null,
      })
      .eq('id', userId);

    if (error) {
      console.error('Error al verificar usuario:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error en verifyUserEmail:', error);
    return false;
  }
};

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
export const addUser = async (userData: Omit<User, 'id' | 'fecha_registro' | 'fecha_aceptacion_terminos' | 'version_terminos'> & { 
  terminos_aceptados: boolean;
  verification_token?: string;
  verification_token_expires_at?: string;
}): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([{
        nombre: userData.nombre,
        apellidos: userData.apellidos,
        dni: userData.dni,
        email: userData.email,
        telefono: userData.telefono,
        parque_sepei: userData.parque_sepei,
        password: userData.password,
        registration_ip: userData.registration_ip,
        terminos_aceptados: userData.terminos_aceptados,
        certificado_nif: userData.certificado_nif,
        certificado_thumbprint: userData.certificado_thumbprint,
        certificado_fecha_validacion: userData.certificado_fecha_validacion,
        certificado_valido: userData.certificado_valido,
        verified: userData.verified,
        requires_password_change: userData.requires_password_change,
        verification_token: userData.verification_token,
        verification_token_expires_at: userData.verification_token_expires_at,
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
      .maybeSingle();

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

// Obtener usuario por DNI
export const getUserByDni = async (dni: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('dni', dni.toUpperCase())
      .maybeSingle();

    if (error) {
      console.error('Error al obtener usuario por DNI:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error en getUserByDni:', error);
    return null;
  }
};

// Obtener usuario por Email
export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .limit(1)
      .maybeSingle();

    if (error) {
      // Si el error es que no existe el usuario, retornar null sin error
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error al obtener usuario por email:', error);
      return null;
    }

    return data;
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

// Actualizar contraseña de usuario
export const updateUserPassword = async (dni: string, hashedPassword: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('users')
      .update({ 
        password: hashedPassword,
        requires_password_change: false,
        password_changed_at: new Date().toISOString()
      })
      .eq('dni', dni.toUpperCase());

    if (error) {
      console.error('Error al actualizar contraseña en Supabase:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error en updateUserPassword:', error);
    return false;
  }
};

// Actualizar datos de usuario
export const updateUser = async (id: string, updates: Partial<User>): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error al actualizar usuario en Supabase:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error en updateUser:', error);
    return false;
  }
};

// Autorizar/desautorizar usuario para votar
export const toggleVotingAuthorization = async (userId: string, autorizado: boolean): Promise<boolean> => {
  try {
    console.log(`🔐 ${autorizado ? 'Autorizando' : 'Desautorizando'} usuario ${userId} para votar`);
    console.log('Datos a actualizar:', { autorizado_votar: autorizado });
    
    const { data, error } = await supabase
      .from('users')
      .update({ autorizado_votar: autorizado })
      .eq('id', userId)
      .select();

    if (error) {
      console.error('❌ Error al actualizar autorización de voto:', error);
      console.error('Código de error:', error.code);
      console.error('Mensaje:', error.message);
      console.error('Detalles:', error.details);
      return false;
    }

    console.log('✅ Usuario actualizado en Supabase:', data);
    console.log(`✅ Usuario ${autorizado ? 'autorizado' : 'desautorizado'} correctamente`);
    return true;
  } catch (error) {
    console.error('❌ Error en toggleVotingAuthorization:', error);
    return false;
  }
};

// Resetear contraseña temporal de un usuario
export const resetTempPassword = async (userId: string, tempPassword: string, hashedPassword: string): Promise<boolean> => {
  try {
    console.log(`🔑 Reseteando contraseña temporal para usuario ${userId}`);
    
    const { data, error } = await supabase
      .from('users')
      .update({ 
        password: hashedPassword,
        requires_password_change: true,
        password_changed_at: null
      })
      .eq('id', userId)
      .select('nombre, apellidos, email, dni');

    if (error) {
      console.error('❌ Error al resetear contraseña:', error);
      return false;
    }

    console.log('✅ Contraseña temporal reseteada correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error en resetTempPassword:', error);
    return false;
  }
};
