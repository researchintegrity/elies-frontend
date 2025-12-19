 // src/context/LanguageContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';

// Translations object
const translations = {
    pt: {
        // Auth Page
        'auth.welcome': 'Bem-vindo de volta!',
        'auth.createAccount': 'Crie sua conta',
        'auth.platformAccess': 'Plataforma ELIS de Integridade Científica',
        'auth.username': 'Username',
        'auth.usernamePlaceholder': 'seu_username',
        'auth.fullName': 'Nome Completo',
        'auth.fullNamePlaceholder': 'João da Silva',
        'auth.usernameOrEmail': 'Username ou Email',
        'auth.email': 'Email',
        'auth.emailPlaceholder': 'seu@email.com',
        'auth.password': 'Senha',
        'auth.passwordPlaceholder': '••••••••',
        'auth.login': 'Entrar na Plataforma',
        'auth.register': 'Criar Conta',
        'auth.loading': 'Carregando...',
        'auth.noAccount': 'Não tem uma conta?',
        'auth.hasAccount': 'Já tem uma conta?',
        'auth.signupHere': 'Cadastre-se aqui',
        'auth.loginHere': 'Faça login',
        'auth.copyright': '© 2024 ELIS Platform. Todos os direitos reservados.',

        // Sidebar
        'sidebar.platform': 'Scientific Integrity',
        'sidebar.researcher': 'Pesquisador',
        'sidebar.search': 'Buscar...',
        'sidebar.images': 'Imagens',
        'sidebar.uploadImages': 'Upload Imagens',
        'sidebar.gallery': 'Galeria',
        'sidebar.annotate': 'Anotar Imagens',
        'sidebar.documents': 'Documentos',
        'sidebar.viewPdfs': 'Visualizar PDFs',
        'sidebar.uploadPdf': 'Enviar PDF',
        'sidebar.tools': 'Ferramentas',
        'sidebar.findSimilar': 'Buscar Similares',
        'sidebar.tags': 'Etiquetas',
        'sidebar.categories': 'Categorias',
        'sidebar.settings': 'Configurações',
        'sidebar.general': 'Geral',
        'sidebar.profile': 'Perfil',
        'sidebar.comingSoon': 'Em breve',
        'sidebar.online': 'Online',

        // Topbar
        'topbar.title': 'ELIS Scientific Integrity',
        'topbar.subtitle': 'Ferramentas avançadas para análise de imagens científicas',

        // Common
        'common.loading': 'Carregando...',
        'common.pleaseWait': 'Aguarde um momento...',
        'common.user': 'Usuário',
        'common.logout': 'Sair',
        'common.searchPage': 'Página "Search" (Em breve)',

        // Gallery
        'gallery.empty': 'Galeria vazia',
        'gallery.noResults': 'Nenhum resultado encontrado',
        'gallery.emptyDescription': 'Comece enviando algumas imagens para análise ou extraindo de PDFs.',
        'gallery.noResultsDescription': 'Tente ajustar seus filtros ou buscar por outros termos.',
        'gallery.upload': 'Fazer Upload',
        'gallery.noTags': 'Sem tags',
        'gallery.uploaded': 'Upload',
        'gallery.extracted': 'Extraída',
    },
    en: {
        // Auth Page
        'auth.welcome': 'Welcome back!',
        'auth.createAccount': 'Create your account',
        'auth.platformAccess': 'ELIS Scientific Integrity Platform',
        'auth.username': 'Username',
        'auth.usernamePlaceholder': 'your_username',
        'auth.fullName': 'Full Name',
        'auth.fullNamePlaceholder': 'John Doe',
        'auth.usernameOrEmail': 'Username or Email',
        'auth.email': 'Email',
        'auth.emailPlaceholder': 'your@email.com',
        'auth.password': 'Password',
        'auth.passwordPlaceholder': '••••••••',
        'auth.login': 'Sign In',
        'auth.register': 'Create Account',
        'auth.loading': 'Loading...',
        'auth.noAccount': "Don't have an account?",
        'auth.hasAccount': 'Already have an account?',
        'auth.signupHere': 'Sign up here',
        'auth.loginHere': 'Log in',
        'auth.copyright': '© 2024 ELIS Platform. All rights reserved.',

        // Sidebar
        'sidebar.platform': 'Scientific Integrity',
        'sidebar.researcher': 'Researcher',
        'sidebar.search': 'Search...',
        'sidebar.images': 'Images',
        'sidebar.uploadImages': 'Upload Images',
        'sidebar.gallery': 'Gallery',
        'sidebar.annotate': 'Annotate Images',
        'sidebar.documents': 'Documents',
        'sidebar.viewPdfs': 'View PDFs',
        'sidebar.uploadPdf': 'Upload PDF',
        'sidebar.tools': 'Tools',
        'sidebar.findSimilar': 'Find Similar',
        'sidebar.tags': 'Tags',
        'sidebar.categories': 'Categories',
        'sidebar.settings': 'Settings',
        'sidebar.general': 'General',
        'sidebar.profile': 'Profile',
        'sidebar.comingSoon': 'Coming soon',
        'sidebar.online': 'Online',

        // Topbar
        'topbar.title': 'ELIS Scientific Integrity',
        'topbar.subtitle': 'Advanced tools for scientific image analysis',

        // Common
        'common.loading': 'Loading...',
        'common.pleaseWait': 'Please wait...',
        'common.user': 'User',
        'common.logout': 'Logout',
        'common.searchPage': 'Search Page (Coming Soon)',

        // Gallery
        'gallery.empty': 'Empty gallery',
        'gallery.noResults': 'No results found',
        'gallery.emptyDescription': 'Start by uploading some images for analysis or extracting from PDFs.',
        'gallery.noResultsDescription': 'Try adjusting your filters or search for other terms.',
        'gallery.upload': 'Upload',
        'gallery.noTags': 'No tags',
        'gallery.uploaded': 'Uploaded',
        'gallery.extracted': 'Extracted',
    }
};

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
    // Get initial language from localStorage or default to Portuguese
    const [language, setLanguage] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('elis-language') || 'pt';
        }
        return 'pt';
    });

    // Toggle between English and Portuguese
    const toggleLanguage = useCallback(() => {
        setLanguage(prev => {
            const newLang = prev === 'pt' ? 'en' : 'pt';
            localStorage.setItem('elis-language', newLang);
            return newLang;
        });
    }, []);

    // Set specific language
    const setLang = useCallback((lang) => {
        if (lang === 'pt' || lang === 'en') {
            setLanguage(lang);
            localStorage.setItem('elis-language', lang);
        }
    }, []);

    // Translation function
    const t = useCallback((key) => {
        return translations[language]?.[key] || translations['pt']?.[key] || key;
    }, [language]);

    const value = {
        language,
        toggleLanguage,
        setLanguage: setLang,
        t,
        isPortuguese: language === 'pt',
        isEnglish: language === 'en',
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

export default LanguageContext;
