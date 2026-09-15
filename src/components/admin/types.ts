import type { AdminUser } from '../../services/adminUsersService';
// Tipos compartidos por el panel de administración.
import { EstadoPlantilla, TrabajadorOficial } from '../../data/plantillaOficialSEPEI';

/**
 * El usuario tal y como lo devuelve `/api/admin?resource=users`.
 *
 * ⚠️ Antes esto era una copia literal de `AdminUser` y `AdminPanel.loadUsers()` traducía
 * de una a otra campo a campo. Esa lista blanca escrita a mano es la que se comió
 * `lastlogin` el 2026-09-15: la columna «Último acceso» salió vacía en los 63 usuarios
 * con el dato correcto en la base, y el compilador no podía verlo porque el mapeo era
 * `(user: any)`. Con un único tipo no hay nada que traducir y no hay campo que olvidar.
 */
export type User = AdminUser;

export interface Suggestion {
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

export type UserConEstado = User & {
  estadoPlantilla: EstadoPlantilla;
  detallesPlantilla?: TrabajadorOficial;
  diferenciasPlantilla?: { campo: string; valor: string; valorOficial: string }[];
};
