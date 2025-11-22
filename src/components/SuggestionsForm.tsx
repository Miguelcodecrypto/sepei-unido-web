import React, { useState } from 'react';
import { Send, AlertCircle, CheckCircle, Lightbulb, X } from 'lucide-react';
import { addSuggestion } from '../services/suggestionDatabase';

interface SuggestionsFormProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function SuggestionsForm({ onClose, onSuccess }: SuggestionsFormProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    email: '',
    telefono: '',
    categoria: 'bombero' as const,
    lugarTrabajo: 'Villarrobledo' as const,
    asunto: '',
    descripcion: '',
  });

  const [formStatus, setFormStatus] = useState(null as any);

  const categorias = ['bombero', 'cabo', 'sargento', 'suboficial', 'oficial'] as const;
  const lugares = ['Villarrobledo', 'Hellín', 'Almansa', 'La Roda', 'Alcaraz', 'Molinicos', 'Casas Ibáñez'] as const;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validar campos requeridos
    if (!formData.nombre || !formData.apellidos || !formData.email || !formData.telefono || !formData.asunto || !formData.descripcion) {
      setFormStatus({ type: 'error', message: 'Por favor, completa todos los campos obligatorios' });
      setTimeout(() => setFormStatus(null), 4000);
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setFormStatus({ type: 'error', message: 'Por favor, ingresa un email válido' });
      setTimeout(() => setFormStatus(null), 4000);
      return;
    }

    // Validar teléfono
    const phoneRegex = /^\d{9,}$/;
    if (!phoneRegex.test(formData.telefono.replace(/[\s\-()]/g, ''))) {
      setFormStatus({ type: 'error', message: 'Por favor, ingresa un teléfono válido' });
      setTimeout(() => setFormStatus(null), 4000);
      return;
    }

    try {
      addSuggestion({
        nombre: formData.nombre,
        apellidos: formData.apellidos,
        email: formData.email,
        telefono: formData.telefono,
        categoria: formData.categoria,
        lugarTrabajo: formData.lugarTrabajo,
        asunto: formData.asunto,
        descripcion: formData.descripcion,
      });

      setFormStatus({
        type: 'success',
        message: '¡Gracias! Tu propuesta ha sido registrada. Nos pondremos en contacto contigo pronto.',
      });

      setFormData({
        nombre: '',
        apellidos: '',
        email: '',
        telefono: '',
        categoria: 'bombero',
        lugarTrabajo: 'Villarrobledo',
        asunto: '',
        descripcion: '',
      });

      if (onSuccess) onSuccess();
      setTimeout(() => setFormStatus(null), 5000);
    } catch (error) {
      console.error('Error al guardar sugerencia:', error);
      setFormStatus({ type: 'error', message: 'Hubo un error al registrar tu propuesta. Intenta nuevamente.' });
      setTimeout(() => setFormStatus(null), 4000);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl border-2 border-orange-500/30 p-8 shadow-2xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500/20 p-3 rounded-xl">
              <Lightbulb className="w-8 h-8 text-orange-500" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white">Expresa tu Idea o Propuesta</h2>
              <p className="text-gray-400 text-sm mt-1">Tu voz importa. Comparte tus inquietudes y propuestas con nosotros</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-red-400 transition"
              title="Cerrar"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Row 1: Nombre y Apellidos */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white font-semibold text-sm mb-2">Nombre *</label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Tu nombre"
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
              />
            </div>
            <div>
              <label className="block text-white font-semibold text-sm mb-2">Apellidos *</label>
              <input
                type="text"
                name="apellidos"
                value={formData.apellidos}
                onChange={handleChange}
                placeholder="Tus apellidos"
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
              />
            </div>
          </div>

          {/* Row 2: Email y Teléfono */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white font-semibold text-sm mb-2">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="tu@email.com"
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
              />
            </div>
            <div>
              <label className="block text-white font-semibold text-sm mb-2">Teléfono *</label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                placeholder="600 123 456"
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
              />
            </div>
          </div>

          {/* Row 3: Categoría y Lugar de Trabajo */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white font-semibold text-sm mb-2">Categoría *</label>
              <select
                name="categoria"
                value={formData.categoria}
                onChange={handleChange}
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition"
              >
                {categorias.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-white font-semibold text-sm mb-2">Lugar de Trabajo *</label>
              <select
                name="lugarTrabajo"
                value={formData.lugarTrabajo}
                onChange={handleChange}
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition"
              >
                {lugares.map(lugar => (
                  <option key={lugar} value={lugar}>
                    {lugar}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Asunto */}
          <div>
            <label className="block text-white font-semibold text-sm mb-2">Asunto *</label>
            <input
              type="text"
              name="asunto"
              value={formData.asunto}
              onChange={handleChange}
              placeholder="Título de tu propuesta"
              maxLength={100}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
            />
            <p className="text-xs text-gray-500 mt-1">{formData.asunto.length}/100 caracteres</p>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-white font-semibold text-sm mb-2">Descripción *</label>
            <textarea
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              placeholder="Cuéntanos tu idea, inquietud o propuesta con todos los detalles que consideres necesarios..."
              maxLength={1000}
              rows={6}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">{formData.descripcion.length}/1000 caracteres</p>
          </div>

          {/* Status Messages */}
          {formStatus && (
            <div
              className={`p-4 rounded-lg flex items-center gap-3 ${
                formStatus.type === 'success'
                  ? 'bg-green-500/10 border border-green-500/30'
                  : 'bg-red-500/10 border border-red-500/30'
              }`}
            >
              {formStatus.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              )}
              <p className={formStatus.type === 'success' ? 'text-green-300' : 'text-red-300'}>
                {formStatus.message}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:shadow-lg text-white font-bold py-4 rounded-lg transition flex items-center justify-center gap-2 group"
          >
            <Send className="w-5 h-5 group-hover:translate-x-1 transition" />
            Enviar Propuesta
          </button>

          <p className="text-xs text-gray-400 text-center">
            * Campos obligatorios. Tu información será tratada conforme a la legislación de protección de datos.
          </p>
        </form>
      </div>
    </div>
  );
}
