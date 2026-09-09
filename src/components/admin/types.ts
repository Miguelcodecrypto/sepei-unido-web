// Tipos compartidos por el panel de administración.
import { EstadoPlantilla, TrabajadorOficial } from '../../data/plantillaOficialSEPEI';

export interface User {
  id: string;
  nombre: string;
  apellidos?: string;
  dni?: string;
  email: string;
  telefono?: string;
  parque_sepei?: string;
  fecha_registro: string;
  terminos_aceptados: boolean;
  fecha_aceptacion_terminos: string;
  version_terminos: string;
  certificado_nif?: string;
  certificado_thumbprint?: string;
  certificado_fecha_validacion?: string;
  certificado_valido?: boolean;
  autorizado_votar?: boolean;
  telegram_chat_id?: string;
  telegram_username?: string;
  telegram_linked_at?: string;
}

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
