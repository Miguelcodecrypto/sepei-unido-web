import { hashPassword } from '../services/passwordService';

/**
 * Script de migración para convertir contraseñas en texto plano a bcrypt hash
 * Este script debe ejecutarse UNA VEZ cuando se implementa el cifrado de contraseñas
 */
export const migrateExistingPasswords = async (): Promise<{
  migrated: number;
  errors: number;
  details: string[];
}> => {
  const results = {
    migrated: 0,
    errors: 0,
    details: [] as string[],
  };

  try {
    // Obtener índice de usuarios
    const usersIndex = JSON.parse(localStorage.getItem('users_index') || '[]');
    
    if (usersIndex.length === 0) {
      results.details.push('No hay usuarios registrados para migrar');
      return results;
    }

    results.details.push(`Encontrados ${usersIndex.length} usuarios para revisar`);

    // Procesar cada usuario
    for (const dni of usersIndex) {
      const userKey = `user_${dni}`;
      const userDataStr = localStorage.getItem(userKey);

      if (!userDataStr) {
        results.details.push(`⚠️ Usuario ${dni} no encontrado en localStorage`);
        results.errors++;
        continue;
      }

      try {
        const userData = JSON.parse(userDataStr);

        // Verificar si la contraseña ya está cifrada
        // Las contraseñas bcrypt siempre empiezan con "$2a$" o "$2b$"
        if (userData.password && userData.password.startsWith('$2')) {
          results.details.push(`✓ Usuario ${dni} ya tiene contraseña cifrada`);
          continue;
        }

        // Si no tiene contraseña, saltar
        if (!userData.password) {
          results.details.push(`⚠️ Usuario ${dni} no tiene contraseña`);
          results.errors++;
          continue;
        }

        // Cifrar la contraseña existente
        const hashedPassword = await hashPassword(userData.password);
        
        // Guardar usuario actualizado
        userData.password = hashedPassword;
        localStorage.setItem(userKey, JSON.stringify(userData));

        results.migrated++;
        results.details.push(`✓ Usuario ${dni} migrado correctamente`);

      } catch (error) {
        results.details.push(`❌ Error al migrar usuario ${dni}: ${error}`);
        results.errors++;
      }
    }

    results.details.push(`\n📊 Resumen:`);
    results.details.push(`✓ Migrados: ${results.migrated}`);
    results.details.push(`❌ Errores: ${results.errors}`);

  } catch (error) {
    results.details.push(`❌ Error crítico: ${error}`);
    results.errors++;
  }

  return results;
};

/**
 * Verificar si un usuario específico necesita migración
 */
export const checkUserPasswordStatus = (dni: string): {
  exists: boolean;
  hasPassword: boolean;
  isHashed: boolean;
} => {
  const userKey = `user_${dni.toUpperCase()}`;
  const userDataStr = localStorage.getItem(userKey);

  if (!userDataStr) {
    return { exists: false, hasPassword: false, isHashed: false };
  }

  try {
    const userData = JSON.parse(userDataStr);
    
    if (!userData.password) {
      return { exists: true, hasPassword: false, isHashed: false };
    }

    const isHashed = userData.password.startsWith('$2');
    
    return { exists: true, hasPassword: true, isHashed };
  } catch (error) {
    return { exists: false, hasPassword: false, isHashed: false };
  }
};
