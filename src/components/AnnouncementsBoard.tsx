import React, { useState, useEffect } from 'react';
import { Calendar, Eye, FileText, Download, X, Star, ChevronRight } from 'lucide-react';
import { getPublishedAnnouncements, incrementViews, type Announcement } from '../services/announcementDatabase';

export default function AnnouncementsBoard() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    setIsLoading(true);
    const data = await getPublishedAnnouncements();
    setAnnouncements(data);
    setIsLoading(false);
  };

  const handleOpenAnnouncement = async (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    await incrementViews(announcement.id);
    // Actualizar localmente las vistas
    setAnnouncements(prev =>
      prev.map(a => a.id === announcement.id ? { ...a, vistas: a.vistas + 1 } : a)
    );
  };

  const getCategoryColor = (categoria: string) => {
    const colors = {
      noticia: 'bg-blue-500',
      comunicado: 'bg-green-500',
      evento: 'bg-purple-500',
      urgente: 'bg-red-500',
    };
    return colors[categoria as keyof typeof colors] || 'bg-gray-500';
  };

  const getCategoryIcon = (categoria: string) => {
    const icons = {
      noticia: '📰',
      comunicado: '📢',
      evento: '📅',
      urgente: '🚨',
    };
    return icons[categoria as keyof typeof icons] || '📌';
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 border-2 border-slate-700/50">
        <p className="text-white text-center">Cargando anuncios...</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 border-2 border-slate-700/50">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            📋 Tablón de Anuncios
          </h2>
        </div>

        {announcements.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No hay anuncios publicados en este momento</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                onClick={() => handleOpenAnnouncement(announcement)}
                className="bg-slate-800/60 rounded-xl border-2 border-slate-700/50 overflow-hidden hover:border-blue-500/50 transition-all cursor-pointer group"
              >
                {/* Imagen */}
                {announcement.imagen_url && (
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={announcement.imagen_url}
                      alt={announcement.titulo}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    {announcement.destacado && (
                      <div className="absolute top-3 right-3 bg-yellow-500 p-2 rounded-full">
                        <Star className="w-5 h-5 text-white fill-white" />
                      </div>
                    )}
                  </div>
                )}

                <div className="p-6">
                  {/* Categoría y badge destacado */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`${getCategoryColor(announcement.categoria)} px-3 py-1 rounded-full text-white text-xs font-semibold flex items-center gap-1`}>
                      {getCategoryIcon(announcement.categoria)} {announcement.categoria.toUpperCase()}
                    </span>
                  </div>

                  {/* Título */}
                  <h3 className="text-xl font-bold text-white mb-3 line-clamp-2 group-hover:text-blue-400 transition-colors">
                    {announcement.titulo}
                  </h3>

                  {/* Contenido preview */}
                  <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                    {announcement.contenido}
                  </p>

                  {/* Archivo adjunto */}
                  {announcement.archivo_url && (
                    <div className="flex items-center gap-2 text-blue-400 text-sm mb-4">
                      <FileText className="w-4 h-4" />
                      <span className="truncate">{announcement.archivo_nombre}</span>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-slate-700">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(announcement.fecha_publicacion).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {announcement.vistas}
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de detalle */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-900 rounded-2xl border-2 border-slate-700/50 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-slate-900 border-b border-slate-700/50 p-6 flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`${getCategoryColor(selectedAnnouncement.categoria)} px-3 py-1 rounded-full text-white text-xs font-semibold flex items-center gap-1`}>
                    {getCategoryIcon(selectedAnnouncement.categoria)} {selectedAnnouncement.categoria.toUpperCase()}
                  </span>
                  {selectedAnnouncement.destacado && (
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  )}
                </div>
                <h2 className="text-3xl font-bold text-white">{selectedAnnouncement.titulo}</h2>
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(selectedAnnouncement.fecha_publicacion).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {selectedAnnouncement.vistas} vistas
                  </span>
                  <span>Por: {selectedAnnouncement.autor}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="p-2 hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6">
              {/* Imagen */}
              {selectedAnnouncement.imagen_url && (
                <img
                  src={selectedAnnouncement.imagen_url}
                  alt={selectedAnnouncement.titulo}
                  className="w-full h-96 object-cover rounded-xl mb-6"
                />
              )}

              {/* Texto */}
              <div className="prose prose-invert max-w-none mb-6">
                <p className="text-gray-300 text-lg whitespace-pre-wrap leading-relaxed">
                  {selectedAnnouncement.contenido}
                </p>
              </div>

              {/* Archivo adjunto */}
              {selectedAnnouncement.archivo_url && (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-600 rounded-lg">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-semibold">{selectedAnnouncement.archivo_nombre}</p>
                        <p className="text-gray-400 text-sm">{selectedAnnouncement.archivo_tipo}</p>
                      </div>
                    </div>
                    <a
                      href={selectedAnnouncement.archivo_url}
                      download={selectedAnnouncement.archivo_nombre}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
                    >
                      <Download className="w-5 h-5" />
                      Descargar
                    </a>
                  </div>

                  {/* Vista previa de PDF */}
                  {selectedAnnouncement.archivo_tipo === 'application/pdf' && (
                    <div className="mt-4">
                      <iframe
                        src={selectedAnnouncement.archivo_url}
                        className="w-full h-[600px] rounded-lg border border-slate-700"
                        title="Vista previa del documento"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-slate-900 border-t border-slate-700/50 p-6 flex justify-end">
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
