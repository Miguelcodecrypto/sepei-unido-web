import React, { useState, useEffect } from 'react';
import { MessageCircle, Check, X, RefreshCw, Copy, ExternalLink } from 'lucide-react';
import { 
  generateLinkCode, 
  saveLinkCode, 
  checkTelegramLink, 
  unlinkTelegram 
} from '../services/telegramNotificationService';

interface TelegramLinkProps {
  userId: string;
  onStatusChange?: (linked: boolean) => void;
}

const TELEGRAM_BOT_USERNAME = 'SepeiUnidoBot'; // Cambiar por el nombre real del bot

export default function TelegramLink({ userId, onStatusChange }: TelegramLinkProps) {
  const [isLinked, setIsLinked] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificar estado de vinculación al cargar
  useEffect(() => {
    checkStatus();
  }, [userId]);

  const checkStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await checkTelegramLink(userId);
      setIsLinked(status.linked);
      setTelegramUsername(status.telegram_username || null);
      onStatusChange?.(status.linked);
    } catch (err) {
      console.error('Error verificando estado de Telegram:', err);
      setError('Error al verificar estado');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCode = async () => {
    setGenerating(true);
    setError(null);
    try {
      const code = generateLinkCode();
      const success = await saveLinkCode(userId, code);
      
      if (success) {
        setLinkCode(code);
      } else {
        setError('Error al generar el código. Inténtalo de nuevo.');
      }
    } catch (err) {
      console.error('Error generando código:', err);
      setError('Error al generar el código');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyCode = async () => {
    if (linkCode) {
      try {
        await navigator.clipboard.writeText(linkCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        // Fallback para navegadores sin soporte de clipboard
        const textArea = document.createElement('textarea');
        textArea.value = linkCode;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleUnlink = async () => {
    if (!confirm('¿Estás seguro de que quieres desvincular tu cuenta de Telegram?')) {
      return;
    }
    
    setUnlinking(true);
    setError(null);
    try {
      const success = await unlinkTelegram(userId);
      if (success) {
        setIsLinked(false);
        setTelegramUsername(null);
        setLinkCode(null);
        onStatusChange?.(false);
      } else {
        setError('Error al desvincular. Inténtalo de nuevo.');
      }
    } catch (err) {
      console.error('Error desvinculando Telegram:', err);
      setError('Error al desvincular');
    } finally {
      setUnlinking(false);
    }
  };

  const openTelegram = () => {
    window.open(`https://t.me/${TELEGRAM_BOT_USERNAME}`, '_blank');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          <span className="text-gray-600">Verificando estado de Telegram...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <MessageCircle className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Notificaciones por Telegram</h3>
          <p className="text-sm text-gray-500">
            Recibe avisos instantáneos en tu móvil
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {isLinked ? (
        // Estado: Vinculado
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <Check className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-green-800 font-medium">Cuenta vinculada</p>
              {telegramUsername && (
                <p className="text-green-600 text-sm">@{telegramUsername}</p>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-600">
            Recibirás notificaciones de nuevos anuncios, votaciones y resultados directamente en Telegram.
          </p>

          <div className="flex gap-2">
            <button
              onClick={checkStatus}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
            <button
              onClick={handleUnlink}
              disabled={unlinking}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              {unlinking ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
              ) : (
                <X className="w-4 h-4" />
              )}
              Desvincular
            </button>
          </div>
        </div>
      ) : linkCode ? (
        // Estado: Código generado, esperando vinculación
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 mb-3">
              <strong>Paso 1:</strong> Abre nuestro bot de Telegram
            </p>
            <button
              onClick={openTelegram}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <MessageCircle className="w-4 h-4" />
              Abrir @{TELEGRAM_BOT_USERNAME}
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-800 mb-3">
              <strong>Paso 2:</strong> Envía este código al bot
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-3 bg-white border-2 border-dashed border-gray-300 rounded-lg text-center">
                <span className="font-mono text-2xl font-bold tracking-widest text-gray-900">
                  {linkCode}
                </span>
              </div>
              <button
                onClick={handleCopyCode}
                className={`p-3 rounded-lg transition-colors ${
                  copied 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Copiar código"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              El código expira en 15 minutos
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={checkStatus}
              className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Ya envié el código
            </button>
            <button
              onClick={handleGenerateCode}
              disabled={generating}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Generar nuevo código
            </button>
          </div>
        </div>
      ) : (
        // Estado: Sin vincular
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Vincula tu cuenta de Telegram para recibir notificaciones instantáneas de:
          </p>
          
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <span className="text-lg">📢</span>
              Nuevos anuncios importantes
            </li>
            <li className="flex items-center gap-2">
              <span className="text-lg">🗳️</span>
              Votaciones activas
            </li>
            <li className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              Resultados de votaciones
            </li>
          </ul>

          <button
            onClick={handleGenerateCode}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 font-medium"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Generando código...
              </>
            ) : (
              <>
                <MessageCircle className="w-5 h-5" />
                Vincular Telegram
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
