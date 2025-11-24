import React, { useState, useEffect } from 'react';
import { Flame, Users, Shield, Target, Mail, Phone, Instagram, Facebook, Twitter, Linkedin, ChevronDown, CheckCircle, AlertCircle, TrendingUp, Clock, BookOpen, Award, Settings, Menu, X, Lightbulb, LogIn } from 'lucide-react';
import { addUser } from './services/userDatabase';
import { getCertificateFromSession, clearCertificateSession, type BrowserCertificate } from './services/browserCertificateService';
import TermsModal from './components/TermsModal';
import SuggestionsForm from './components/SuggestionsForm';
import CertificateUpload from './components/CertificateUpload';
import { TraditionalRegistration, type UserData } from './components/TraditionalRegistration';
import { UserLogin, type LoggedUserData } from './components/UserLogin';
import { EmailVerification } from './components/EmailVerification';

export default function SepeiUnido() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showSuggestionsForm, setShowSuggestionsForm] = useState(false);
  const [showCertificateUpload, setShowCertificateUpload] = useState(false);
  const [showTraditionalRegistration, setShowTraditionalRegistration] = useState(false);
  const [showUserLogin, setShowUserLogin] = useState(false);
  const [showAuthMethodSelector, setShowAuthMethodSelector] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [loggedUser, setLoggedUser] = useState<LoggedUserData | null>(null);
  const [registrationMethod, setRegistrationMethod] = useState<'certificate' | 'traditional' | null>(null);
  const [pendingAction, setPendingAction] = useState<'suggestions' | 'register' | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [certificateData, setCertificateData] = useState<BrowserCertificate | null>(null);
  const [pendingUserData, setPendingUserData] = useState(null as any);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    instagram: '',
    facebook: '',
    twitter: '',
    linkedin: ''
  });
  const [formStatus, setFormStatus] = useState(null as any);
  const [hoveredRoadmap, setHoveredRoadmap] = useState<number | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    
    // Verificar si la URL contiene un token de verificación
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      setVerificationToken(token);
      setShowEmailVerification(true);
      console.log('🔍 Token de verificación detectado:', token);
    }
    
    // Verificar si hay certificado en sesión
    const cert = getCertificateFromSession();
    if (cert) {
      setCertificateData(cert);
    }

    // Verificar si hay usuario logueado
    const currentUserStr = localStorage.getItem('current_user');
    if (currentUserStr) {
      try {
        const user = JSON.parse(currentUserStr);
        setLoggedUser(user);
      } catch (error) {
        console.error('Error al recuperar sesión:', error);
      }
    }
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmit = () => {
    if (!formData.nombre || !formData.email) {
      setFormStatus({ type: 'error', message: 'Por favor, completa al menos tu nombre y email' });
      setTimeout(() => setFormStatus(null), 4000);
      return;
    }

    // Guardar datos del formulario y mostrar selector de método de autenticación
    setPendingUserData(formData);
    setPendingAction('register');
    setAuthMode('register');
    setShowAuthMethodSelector(true);
  };

  const handleSelectAuthMethod = (method: 'certificate' | 'traditional') => {
    setRegistrationMethod(method);
    setShowAuthMethodSelector(false);
    
    if (authMode === 'login') {
      // Si es login, solo permitir email/password
      if (method === 'traditional') {
        setShowUserLogin(true);
      } else {
        // Certificado digital solo para registro, no login
        alert('El certificado digital solo está disponible para registro. Para iniciar sesión con una cuenta existente, usa email y contraseña.');
        setShowAuthMethodSelector(true);
      }
    } else {
      // Modo registro
      if (method === 'certificate') {
        setShowCertificateUpload(true);
      } else {
        setShowTraditionalRegistration(true);
      }
    }
  };

  const handleAcceptTerms = () => {
    if (!pendingUserData || !certificateData) return;

    try {
      addUser({
        nombre: pendingUserData.nombre,
        email: pendingUserData.email,
        telefono: pendingUserData.telefono || undefined,
        instagram: pendingUserData.instagram || undefined,
        facebook: pendingUserData.facebook || undefined,
        twitter: pendingUserData.twitter || undefined,
        linkedin: pendingUserData.linkedin || undefined,
        terminos_aceptados: true,
        // Datos del certificado FNMT
        certificado_nif: certificateData.nif,
        certificado_thumbprint: certificateData.thumbprint,
        certificado_fecha_validacion: new Date(certificateData.notAfter).toISOString().split('T')[0],
        certificado_valido: true,
      });

      console.log('Usuario registrado con certificado FNMT validado:', certificateData.nif);
      
      setFormStatus({ type: 'success', message: '¡Bienvenido a SEPEI UNIDO! Tu identidad ha sido verificada y registrada correctamente.' });
      
      setFormData({
        nombre: '',
        email: '',
        telefono: '',
        instagram: '',
        facebook: '',
        twitter: '',
        linkedin: ''
      });
      
      setShowTermsModal(false);
      setPendingUserData(null);
      // Limpiar certificado después del registro exitoso
      clearCertificateSession();
      setCertificateData(null);
      setTimeout(() => setFormStatus(null), 5000);
    } catch (error) {
      console.error('Error al guardar:', error);
      setFormStatus({ type: 'error', message: 'Hubo un error al registrarte. Intenta nuevamente.' });
      setTimeout(() => setFormStatus(null), 4000);
    }
  };

  const handleRejectTerms = () => {
    setShowTermsModal(false);
    setPendingUserData(null);
  };

  const handleCertificateLoaded = (data: BrowserCertificate) => {
    setCertificateData(data);
    setShowCertificateUpload(false);
    // Mostrar modal de términos después de cargar certificado
    setShowTermsModal(true);
  };

  const handleTraditionalRegistrationSuccess = (userData: UserData) => {
    console.log('Usuario registrado con método tradicional:', userData);
    setShowTraditionalRegistration(false);
    setFormStatus({ 
      type: 'success', 
      message: '¡Registro exitoso! Revisa tu email para verificar tu cuenta.' 
    });
    
    // Limpiar formulario
    setFormData({
      nombre: '',
      email: '',
      telefono: '',
      instagram: '',
      facebook: '',
      twitter: '',
      linkedin: ''
    });
    
    setPendingUserData(null);
    setRegistrationMethod(null);
    setPendingAction(null);
    setTimeout(() => setFormStatus(null), 5000);
  };

  const handleLoginSuccess = (userData: LoggedUserData) => {
    setLoggedUser(userData);
    setShowUserLogin(false);
    setFormStatus({ 
      type: 'success', 
      message: `¡Bienvenido, ${userData.nombre}!` 
    });
    setTimeout(() => setFormStatus(null), 3000);
    
    // Ejecutar acción pendiente si existe
    if (pendingAction === 'suggestions') {
      setTimeout(() => {
        setShowSuggestionsForm(true);
        setPendingAction(null);
      }, 500);
    }
  };

  const handleEmailVerificationSuccess = (userData: UserData, tempPassword: string) => {
    // Crear sesión de usuario
    const loggedUserData: LoggedUserData = {
      nombre: userData.nombre,
      apellidos: userData.apellidos,
      dni: userData.dni,
      email: userData.email,
      verified: true,
      lastLogin: new Date().toISOString()
    };
    
    // Guardar sesión
    localStorage.setItem('current_user', JSON.stringify(loggedUserData));
    setLoggedUser(loggedUserData);
    
    // Cerrar modal de verificación
    setShowEmailVerification(false);
    setVerificationToken(null);
    
    // Mostrar mensaje de éxito y abrir formulario de sugerencias
    setFormStatus({ 
      type: 'success', 
      message: `¡Cuenta verificada! Bienvenido, ${userData.nombre}. Ya puedes compartir tus ideas.` 
    });
    
    // Abrir formulario de sugerencias después de un momento
    setTimeout(() => {
      setShowSuggestionsForm(true);
      setFormStatus(null);
    }, 2000);
  };

  const handleLogout = () => {
    localStorage.removeItem('current_user');
    setLoggedUser(null);
    setFormStatus({ 
      type: 'success', 
      message: 'Sesión cerrada correctamente' 
    });
    setTimeout(() => setFormStatus(null), 5000);
  };

  const handleOpenSuggestionsForm = () => {
    // Verificar si el usuario está logueado
    if (!loggedUser) {
      setPendingAction('suggestions');
      setAuthMode('login');
      setShowAuthMethodSelector(true);
      return;
    }
    // Si ya está logueado, abrir formulario de propuestas
    setShowSuggestionsForm(true);
  };

  const handleOpenRegistration = () => {
    setPendingAction('register');
    setAuthMode('register');
    setShowAuthMethodSelector(true);
  };

  const handleChange = (e: any) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setMobileMenuOpen(false);
  };

  const roadmapItems = [
    { 
      icon: TrendingUp, 
      title: "Reclasificación MCB C1", 
      desc: "Reclasificación profesional para MCB C1 y las correspondientes escalas",
      priority: "ALTA"
    },
    { 
      icon: Shield, 
      title: "Seguro de Accidentes", 
      desc: "Mejora urgente de las condiciones del seguro de accidentes",
      priority: "CRÍTICA"
    },
    { 
      icon: Clock, 
      title: "Oposiciones", 
      desc: "Ejecución de oposiciones en tiempo y forma",
      priority: "ALTA"
    },
    { 
      icon: Clock, 
      title: "Implantación Horario", 
      desc: "Establecimiento de horarios adaptados al servicio",
      priority: "MEDIA"
    },
    { 
      icon: BookOpen, 
      title: "Formación y Equipamiento", 
      desc: "Formación para nueva incorporación y renovación de EPIs",
      priority: "ALTA"
    },
    { 
      icon: Users, 
      title: "Mínimos y Máximos", 
      desc: "Plantillas mínimas y máximas para seguridad operativa",
      priority: "CRÍTICA"
    },
    { 
      icon: Award, 
      title: "Recurso Preventivo", 
      desc: "Remuneración del recurso preventivo",
      priority: "MEDIA"
    },
    { 
      icon: Settings, 
      title: "Grupos Especialistas", 
      desc: "Regulación de grupos de especialistas",
      priority: "MEDIA"
    }
  ];

  const stats = [
    { number: "8", label: "Objetivos Prioritarios" },
    { number: "100%", label: "Transparencia" },
    { number: "1", label: "Voz Unida" }
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'bg-slate-900/98 backdrop-blur-xl shadow-2xl' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="relative">
                <Flame className="w-11 h-11 text-orange-500" />
                <div className="absolute inset-0 bg-orange-500 blur-xl opacity-50"></div>
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">SEPEI UNIDO</h1>
                <p className="text-xs text-orange-400 font-semibold">Diputación de Albacete</p>
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              {[
                { name: 'Inicio', id: 'inicio' },
                { name: 'Manifiesto', id: 'manifiesto-section' },
                { name: 'Objetivos', id: 'hoja-ruta-section' },
                { name: 'Compartir Ideas', id: 'ideas-section' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="text-gray-300 hover:text-orange-400 font-semibold transition-all duration-300"
                >
                  {item.name}
                </button>
              ))}
              
              {/* Botón Únete - Abre modal de registro */}
              <button
                onClick={handleOpenRegistration}
                className="text-gray-300 hover:text-orange-400 font-semibold transition-all duration-300"
              >
                Únete
              </button>
              
              {/* Botón de Login/Usuario */}
              {loggedUser ? (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-white font-semibold text-sm">{loggedUser.nombre}</p>
                    <p className="text-gray-400 text-xs">{loggedUser.dni}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Salir
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowUserLogin(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  <LogIn className="w-5 h-5" />
                  Iniciar Sesión
                </button>
              )}
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white p-2 hover:bg-white/10 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900/98 backdrop-blur-xl border-t border-slate-800">
            <div className="px-4 py-6 space-y-4">
              {[
                { name: 'Inicio', id: 'inicio' },
                { name: 'Manifiesto', id: 'manifiesto-section' },
                { name: 'Objetivos', id: 'hoja-ruta-section' },
                { name: 'Compartir Ideas', id: 'ideas-section' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="block w-full text-left text-gray-300 hover:text-orange-400 font-semibold py-2"
                >
                  {item.name}
                </button>
              ))}
              
              {/* Botón Únete móvil - Abre modal de registro */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleOpenRegistration();
                }}
                className="block w-full text-left text-gray-300 hover:text-orange-400 font-semibold py-2"
              >
                Únete
              </button>
              
              {/* Botón Login/Usuario móvil */}
              {loggedUser ? (
                <div className="pt-4 border-t border-slate-800">
                  <div className="mb-3">
                    <p className="text-white font-semibold">{loggedUser.nombre}</p>
                    <p className="text-gray-400 text-sm">{loggedUser.dni}</p>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                  >
                    Salir
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowUserLogin(true);
                  }}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  <LogIn className="w-5 h-5" />
                  Iniciar Sesión
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      <section id="inicio" className="relative pt-32 pb-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 via-transparent to-red-600/20"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500/20 rounded-full border border-orange-500/50 mb-8">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span className="text-orange-400 font-bold text-sm">MOVIMIENTO ASINDICAL</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black text-white mb-6">
              SEPEI
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
                UNIDO
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto mb-12">
              La <span className="text-orange-400 font-bold">fuerza</span> de un colectivo que levanta su <span className="text-orange-400 font-bold">voz</span> unida para defender nuestros derechos
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <button
                onClick={() => scrollToSection('manifiesto-section')}
                className="px-10 py-5 bg-gradient-to-r from-orange-500 to-red-600 text-white text-lg font-bold rounded-xl shadow-2xl hover:shadow-orange-500/50 transform hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                Leer Manifiesto
                <ChevronDown className="w-5 h-5" />
              </button>
              <button
                onClick={handleOpenRegistration}
                className="px-10 py-5 bg-white/5 text-white text-lg font-bold rounded-xl border-2 border-white/20 hover:bg-white/10 transform hover:scale-105 transition-all"
              >
                Únete Ahora
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-20">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center p-8 bg-slate-800/50 rounded-2xl border border-orange-500/20 hover:border-orange-500/50 transition-all">
                <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-400 font-semibold">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4 bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Nuestros Pilares</h2>
            <div className="h-1.5 w-32 bg-gradient-to-r from-orange-400 to-red-500 mx-auto rounded-full"></div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Users, title: "Unidad", desc: "La fuerza está en la unión del colectivo" },
              { icon: Target, title: "Claridad", desc: "Objetivos claros definidos por mayoría" },
              { icon: Shield, title: "Defensa", desc: "Protección de los derechos de todos" }
            ].map((item, idx) => (
              <div key={idx} className="bg-slate-800/80 p-10 rounded-3xl border-2 border-slate-700/50 hover:border-orange-500 transition-all hover:scale-105">
                <div className="w-16 h-16 bg-orange-500/20 rounded-2xl mb-6 flex items-center justify-center">
                  <item.icon className="w-8 h-8 text-orange-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">{item.title}</h3>
                <p className="text-gray-300">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="manifiesto-section" className="py-24 px-4 bg-slate-950">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black text-white mb-6">Nuestro Manifiesto</h2>
            <div className="h-1.5 w-40 bg-gradient-to-r from-orange-400 to-red-500 mx-auto rounded-full"></div>
          </div>

          <div className="bg-slate-800/90 p-10 md:p-14 rounded-3xl border-2 border-orange-500/30">
            <div className="space-y-7 text-gray-200 text-lg text-justify">
              <p className="text-orange-400 font-bold text-2xl mb-8 text-center">
                Tras años de continuas guerras sindicales...
              </p>
              
              <p>
                Se ha perdido la perspectiva de la función de los mismos: <span className="text-orange-400 font-bold">¡la defensa de los derechos de los trabajadores!</span>
              </p>
              
              <p>
                Tanto tiempo empleado en disputas nos ha pasado factura, y el SEPEI que hace años fue un servicio de referencia, ahora rema a contracorriente.
              </p>
              
              <p>
                Años de no realizar una escucha activa han minado la confianza de los bomberos en los sindicatos.
              </p>
              
              <div className="my-10 p-8 bg-orange-500/20 border-l-4 border-orange-500 rounded-r-2xl">
                <p className="text-white font-bold text-xl text-justify">
                  De ahí que nace <span className="text-orange-400 text-2xl">SEPEI UNIDO</span>.
                </p>
              </div>
              
              <p>
                Un movimiento que no cuestiona a ningún sindicato. Recogemos las inquietudes de los bomberos del SEPEI para ponerlas en conocimiento de todos los sindicatos.
              </p>
              
              <div className="my-10 text-center py-8">
                <p className="text-3xl font-black text-white mb-4">
                  Ellos son nuestra <span className="text-orange-400">VOZ</span>
                </p>
                <p className="text-3xl font-black text-white">
                  Nosotros unidos tenemos la <span className="text-red-500">FUERZA</span>
                </p>
              </div>
              
              <p className="text-xl font-semibold text-white">
                UNIDOS nuestra voz suena más fuerte para reivindicar todos nuestros derechos en una hoja de ruta COMÚN.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="hoja-ruta-section" className="py-24 px-4 bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black text-white mb-6">Hoja de Ruta</h2>
            <div className="h-1.5 w-40 bg-gradient-to-r from-orange-400 to-red-500 mx-auto rounded-full"></div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {roadmapItems.map((item, idx) => (
              <div
                key={idx}
                onMouseEnter={() => setHoveredRoadmap(idx)}
                onMouseLeave={() => setHoveredRoadmap(null)}
                className={`bg-slate-800/80 p-8 rounded-2xl border-2 transition-all cursor-pointer ${
                  hoveredRoadmap === idx ? 'border-orange-500 shadow-2xl scale-105' : 'border-slate-700/50'
                }`}
              >
                <div className="flex items-start gap-6">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                    hoveredRoadmap === idx ? 'bg-gradient-to-br from-orange-500 to-red-600' : 'bg-orange-500/20'
                  }`}>
                    <item.icon className={`w-8 h-8 ${hoveredRoadmap === idx ? 'text-white' : 'text-orange-400'}`} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-orange-400 font-black">#{idx + 1}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        item.priority === 'CRÍTICA' ? 'bg-red-500/20 text-red-400' :
                        item.priority === 'ALTA' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {item.priority}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                    <p className="text-gray-400">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="ideas-section" className="py-24 px-4 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Lightbulb className="w-12 h-12 text-yellow-400" />
              <h2 className="text-5xl font-black text-white">Compartir Ideas</h2>
            </div>
            <p className="text-xl text-gray-400">Expresa tus propuestas y contribuye al futuro de SEPEI UNIDO</p>
            <div className="h-1.5 w-40 bg-gradient-to-r from-yellow-400 to-orange-500 mx-auto rounded-full mt-6"></div>
          </div>

          {loggedUser ? (
            // Usuario logueado: mostrar botón para acceder
            <div className="bg-slate-800/90 p-12 rounded-3xl border-2 border-green-500/30 text-center space-y-6">
              <div className="bg-green-500/10 border-2 border-green-500/30 rounded-xl p-4 inline-block">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto" />
              </div>
              <div>
                <p className="text-green-300 font-bold text-lg mb-2">✓ Sesión activa</p>
                <p className="text-gray-300 mb-4">Bienvenido {loggedUser.nombre}. Ya puedes compartir tus ideas y propuestas.</p>
              </div>
              <button
                onClick={handleOpenSuggestionsForm}
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-900 text-lg font-bold rounded-xl shadow-2xl hover:shadow-yellow-500/50 transform hover:scale-105 transition-all"
              >
                <Lightbulb className="w-6 h-6" />
                Compartir mi Idea
              </button>
            </div>
          ) : (
            // Usuario no logueado: mostrar instrucciones y botón de login
            <div className="bg-slate-800/90 p-12 rounded-3xl border-2 border-blue-500/30 space-y-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-8 h-8 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-blue-300 font-bold text-lg mb-2">Requiere Autenticación</p>
                  <p className="text-gray-300 mb-4">Para compartir ideas y propuestas, necesitas iniciar sesión o registrarte primero.</p>
                  <ul className="text-gray-300 space-y-2 mb-6">
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                      Protege la seguridad de nuestro movimiento
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                      Garantiza autenticidad de participantes
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                      Puedes usar certificado FNMT o email/contraseña
                    </li>
                  </ul>
                </div>
              </div>
              <button
                onClick={handleOpenSuggestionsForm}
                className="w-full py-5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-lg font-bold rounded-xl shadow-2xl hover:shadow-blue-500/50 transform hover:scale-105 transition-all flex items-center justify-center gap-3"
              >
                <LogIn className="w-6 h-6" />
                Iniciar Sesión para Compartir
              </button>
            </div>
          )}
        </div>
      </section>

      <section id="contacto-section" className="py-24 px-4 bg-slate-950">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <p className="text-xl text-gray-400">Tu voz cuenta, tu participación es fundamental</p>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-gradient-to-br from-orange-600 to-red-700">
        <div className="max-w-4xl mx-auto text-center">
          <Users className="w-20 h-20 text-white mx-auto mb-6" />
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
            La Fuerza Está en la Unión
          </h2>
          <p className="text-2xl text-orange-100 mb-8 font-semibold">
            Juntos definimos nuestro futuro. Unidos somos más fuertes.
          </p>
        </div>
      </section>

      {/* Botón flotante para sugerencias */}
      <button
        onClick={handleOpenSuggestionsForm}
        className="fixed bottom-24 right-8 z-40 p-4 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-full shadow-2xl hover:shadow-blue-500/50 transform hover:scale-110 transition-all flex items-center gap-2"
        title="Enviar sugerencia o propuesta"
      >
        <Lightbulb className="w-6 h-6" />
      </button>

      <footer className="bg-slate-900 py-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Flame className="w-8 h-8 text-orange-500" />
            <span className="text-xl font-bold text-white">SEPEI UNIDO</span>
          </div>
          <p className="text-gray-400">Movimiento Asindical - Bomberos Diputación de Albacete</p>
          <p className="text-gray-500 text-sm mt-2">Unidos por nuestros derechos</p>
        </div>
      </footer>

      {/* Certificate Upload Modal */}
      {showCertificateUpload && (
        <CertificateUpload
          onCertificateLoaded={handleCertificateLoaded}
          onClose={() => {
            setShowCertificateUpload(false);
            setRegistrationMethod(null);
          }}
        />
      )}

      {/* Traditional Registration Modal */}
      {showTraditionalRegistration && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <TraditionalRegistration
            initialData={pendingUserData ? {
              nombre: pendingUserData.nombre,
              email: pendingUserData.email
            } : undefined}
            onSuccess={handleTraditionalRegistrationSuccess}
            onCancel={() => {
              setShowTraditionalRegistration(false);
              setRegistrationMethod(null);
              setPendingUserData(null);
            }}
          />
        </div>
      )}

      {/* Email Verification Modal */}
      {showEmailVerification && verificationToken && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <EmailVerification 
              token={verificationToken}
              onSuccess={handleEmailVerificationSuccess}
            />
          </div>
        </div>
      )}

      {/* Auth Method Selector Modal (Login or Register) */}
      {showAuthMethodSelector && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-lg shadow-2xl max-w-2xl w-full">
            <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center">
              {authMode === 'login' ? 'Iniciar Sesión' : 'Registrarse'}
            </h2>
            <p className="text-gray-600 mb-6 text-center">
              {authMode === 'login' 
                ? 'Elige cómo quieres iniciar sesión' 
                : 'Elige tu método de registro'}
            </p>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {authMode === 'register' && (
                /* Certificado Digital - Solo para registro */
                <button
                  onClick={() => handleSelectAuthMethod('certificate')}
                  className="group relative p-8 bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-2 border-blue-200 hover:border-blue-400 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
                >
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                      <Shield className="w-10 h-10 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-2">
                        Certificado FNMT
                      </h3>
                      <p className="text-gray-600 text-sm mb-3">
                        Registro seguro con tu certificado digital de la FNMT
                      </p>
                      <div className="space-y-1">
                        <div className="flex items-center justify-center text-green-600 text-xs">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Verificación instantánea
                        </div>
                        <div className="flex items-center justify-center text-green-600 text-xs">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Máxima seguridad
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              )}

              {/* Email + Contraseña */}
              <button
                onClick={() => handleSelectAuthMethod('traditional')}
                className={`group relative p-8 bg-gradient-to-br from-orange-50 to-red-50 hover:from-orange-100 hover:to-red-100 border-2 border-orange-200 hover:border-orange-400 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl ${authMode === 'login' ? 'md:col-span-2' : ''}`}
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center group-hover:bg-orange-600 transition-colors">
                    {authMode === 'login' ? <LogIn className="w-10 h-10 text-white" /> : <Mail className="w-10 h-10 text-white" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {authMode === 'login' ? 'DNI + Contraseña' : 'Email + Contraseña'}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3">
                      {authMode === 'login' 
                        ? 'Inicia sesión con tu DNI y contraseña'
                        : 'Registro con DNI y verificación por correo electrónico'}
                    </p>
                    <div className="space-y-1">
                      <div className="flex items-center justify-center text-green-600 text-xs">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {authMode === 'login' ? 'Acceso rápido' : 'Proceso simple'}
                      </div>
                      <div className="flex items-center justify-center text-green-600 text-xs">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {authMode === 'login' ? 'Usa tu cuenta existente' : 'Sin certificado necesario'}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {authMode === 'login' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800 text-center">
                  <strong>¿No tienes cuenta?</strong>{' '}
                  <button
                    onClick={() => setAuthMode('register')}
                    className="text-blue-600 hover:text-blue-700 font-bold underline"
                  >
                    Regístrate aquí
                  </button>
                </p>
              </div>
            )}

            {authMode === 'register' && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600 text-center">
                  <strong>¿Ya tienes cuenta?</strong>{' '}
                  <button
                    onClick={() => setAuthMode('login')}
                    className="text-orange-600 hover:text-orange-700 font-bold underline"
                  >
                    Inicia sesión aquí
                  </button>
                </p>
              </div>
            )}

            <button
              onClick={() => {
                setShowAuthMethodSelector(false);
                setAuthMode('register');
                setPendingAction(null);
              }}
              className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Terms and Conditions Modal */}
      {showTermsModal && (
        <TermsModal
          onAccept={handleAcceptTerms}
          onReject={handleRejectTerms}
        />
      )}

      {/* Suggestions Form Modal */}
      {showSuggestionsForm && loggedUser && (
        <SuggestionsForm
          certificateData={certificateData || undefined}
          onClose={() => setShowSuggestionsForm(false)}
        />
      )}

      {/* User Login Modal */}
      {showUserLogin && (
        <UserLogin
          onLoginSuccess={handleLoginSuccess}
          onCancel={() => setShowUserLogin(false)}
        />
      )}
    </div>
  );
}
