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
        'common.cancel': 'Cancelar',
        'common.save': 'Salvar',
        'common.edit': 'Editar',
        'common.delete': 'Excluir',
        'common.confirm': 'Confirmar',
        'common.success': 'Sucesso!',
        'common.error': 'Erro',
        'common.warning': 'Atenção',
        'common.tryAgain': 'Tentar Novamente',
        'common.addMore': 'Adicionar mais',
        'common.filters': 'Filtros',
        'common.active': 'Ativos',
        'common.all': 'Todas',
        'common.origin': 'Origem',
        'common.update': 'Atualizar',
        'common.back': 'Voltar',

        // Upload Pages
        'upload.title': 'Upload de Imagens',
        'upload.subtitle': 'Adicione imagens para análise e processamento',
        'upload.pdfTitle': 'Upload de PDF',
        'upload.pdfSubtitle': 'Adicione documentos PDF para extração e análise',
        'upload.dragDropImages': 'Arraste e solte suas imagens aqui',
        'upload.dragDropPdfs': 'Arraste e solte seus PDFs aqui',
        'upload.orClick': 'ou clique para selecionar do computador',
        'upload.supportsImages': 'Suporta: JPG, PNG, GIF, WEBP',
        'upload.supportsPdf': 'Suporta: PDF',
        'upload.selectedFiles': 'Arquivos Selecionados',
        'upload.completeUpload': 'Concluir Upload',
        'upload.selectAtLeastOneImage': 'Por favor, selecione pelo menos uma imagem.',
        'upload.selectAtLeastOnePdf': 'Por favor, selecione pelo menos um PDF.',
        'upload.uploadSuccess': 'Upload concluído com sucesso!',
        'upload.uploadPartial': 'Upload concluído parcialmente.',
        'upload.uploadFailed': 'Falha no Upload. Tente novamente.',
        'upload.imagesUploaded': 'imagem(ns) enviada(s) com sucesso!',
        'upload.pdfsUploaded': 'PDF(s) enviado(s) com sucesso!',
        'upload.successCount': 'sucesso(s)',
        'upload.failureCount': 'falha(s)',

        // Gallery
        'gallery.title': 'Galeria',
        'gallery.subtitle': 'Gerencie, organize e analise suas imagens extraídas e enviadas.',
        'gallery.empty': 'Galeria vazia',
        'gallery.noResults': 'Nenhum resultado encontrado',
        'gallery.emptyDescription': 'Comece enviando algumas imagens para análise ou extraindo de PDFs.',
        'gallery.noResultsDescription': 'Tente ajustar seus filtros ou buscar por outros termos.',
        'gallery.upload': 'Fazer Upload',
        'gallery.noTags': 'Sem tags',
        'gallery.uploaded': 'Upload',
        'gallery.extracted': 'Extraída',
        'gallery.searchPlaceholder': 'Buscar imagens...',
        'gallery.sortNewest': 'Mais recentes',
        'gallery.sortOldest': 'Mais antigas',
        'gallery.sortNameAsc': 'Nome (A-Z)',
        'gallery.sortNameDesc': 'Nome (Z-A)',
        'gallery.sortSize': 'Tamanho',
        'gallery.errorLoading': 'Erro ao carregar imagens',
        'gallery.imagesTotal': 'imagens no total',
        'gallery.images': 'imagens',
        'gallery.first': 'Primeira',
        'gallery.last': 'Última',
        'gallery.previousPage': 'Página anterior',
        'gallery.nextPage': 'Próxima página',

        // Lightbox Modal
        'lightbox.tagsClassification': 'Tags & Classificação',
        'lightbox.metadata': 'Metadados',
        'lightbox.origin': 'Origem',
        'lightbox.format': 'Formato',

        // Similarity Search
        'similarity.title': 'Busca por Similaridade',
        'similarity.searching': 'Buscando...',
        'similarity.resultsFound': 'resultados encontrados',
        'similarity.topK': 'Top-K',
        'similarity.threshold': 'Limiar',
        'similarity.category': 'Categoria',
        'similarity.noResults': 'Nenhuma imagem similar encontrada.',
        'similarity.foundResults': 'imagens similares encontradas!',

        // Profile Page
        'profile.title': 'Meu Perfil',
        'profile.subtitle': 'Gerencie suas informações pessoais e configurações',
        'profile.fullName': 'Nome Completo',
        'profile.fullNamePlaceholder': 'Seu nome completo',
        'profile.email': 'Email',
        'profile.editProfile': 'Editar Perfil',
        'profile.saveChanges': 'Salvar Alterações',
        'profile.saving': 'Salvando...',
        'profile.storage': 'Armazenamento',
        'profile.used': 'usado',
        'profile.total': 'total',
        'profile.spaceUsed': 'do espaço utilizado',
        'profile.accountInfo': 'Informações da Conta',
        'profile.createdAt': 'Criada em',
        'profile.lastUpdate': 'Última atualização',
        'profile.dangerZone': 'Zona de Perigo',
        'profile.dangerDescription': 'A exclusão da conta é permanente e não pode ser desfeita. Todos os seus documentos serão deletados.',
        'profile.deleteAccount': 'Deletar Conta Permanentemente',
        'profile.errorLoading': 'Erro ao carregar perfil',
        'profile.deleteConfirmTitle': 'ATENÇÃO: Esta ação é IRREVERSÍVEL!',
        'profile.deleteConfirmMessage': 'Todos os seus documentos e dados serão PERMANENTEMENTE deletados.',
        'profile.deleteConfirmPrompt': 'Digite seu nome de usuário para confirmar:',
        'profile.deleteCancelled': 'Nome de usuário incorreto. Ação cancelada.',

        // View PDFs Page
        'pdfs.title': 'Documentos PDF',
        'pdfs.subtitle': 'Visualize e gerencie seus documentos PDF',
        'pdfs.empty': 'Nenhum PDF encontrado',
        'pdfs.emptyDescription': 'Comece enviando seus documentos PDF para análise.',
        'pdfs.uploadPdf': 'Enviar PDF',
        'pdfs.pages': 'páginas',
        'pdfs.extractedImages': 'imagens extraídas',
        'pdfs.viewDocument': 'Ver Documento',
        'pdfs.extractImages': 'Extrair Imagens',
        'pdfs.processing': 'Processando...',

        // Annotation Page
        'annotation.title': 'Anotar Imagens',
        'annotation.subtitle': 'Adicione anotações e marcações às suas imagens',
        'annotation.selectImage': 'Selecione uma imagem para anotar',
        'annotation.tools': 'Ferramentas',
        'annotation.rectangle': 'Retângulo',
        'annotation.circle': 'Círculo',
        'annotation.arrow': 'Seta',
        'annotation.text': 'Texto',
        'annotation.saveAnnotation': 'Salvar Anotação',
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
        'common.cancel': 'Cancel',
        'common.save': 'Save',
        'common.edit': 'Edit',
        'common.delete': 'Delete',
        'common.confirm': 'Confirm',
        'common.success': 'Success!',
        'common.error': 'Error',
        'common.warning': 'Warning',
        'common.tryAgain': 'Try Again',
        'common.addMore': 'Add more',
        'common.filters': 'Filters',
        'common.active': 'Active',
        'common.all': 'All',
        'common.origin': 'Source',
        'common.update': 'Update',
        'common.back': 'Back',

        // Upload Pages
        'upload.title': 'Upload Images',
        'upload.subtitle': 'Add images for analysis and processing',
        'upload.pdfTitle': 'Upload PDF',
        'upload.pdfSubtitle': 'Add PDF documents for extraction and analysis',
        'upload.dragDropImages': 'Drag and drop your images here',
        'upload.dragDropPdfs': 'Drag and drop your PDFs here',
        'upload.orClick': 'or click to select from computer',
        'upload.supportsImages': 'Supports: JPG, PNG, GIF, WEBP',
        'upload.supportsPdf': 'Supports: PDF',
        'upload.selectedFiles': 'Selected Files',
        'upload.completeUpload': 'Complete Upload',
        'upload.selectAtLeastOneImage': 'Please select at least one image.',
        'upload.selectAtLeastOnePdf': 'Please select at least one PDF.',
        'upload.uploadSuccess': 'Upload completed successfully!',
        'upload.uploadPartial': 'Upload partially completed.',
        'upload.uploadFailed': 'Upload failed. Please try again.',
        'upload.imagesUploaded': 'image(s) uploaded successfully!',
        'upload.pdfsUploaded': 'PDF(s) uploaded successfully!',
        'upload.successCount': 'success(es)',
        'upload.failureCount': 'failure(s)',

        // Gallery
        'gallery.title': 'Gallery',
        'gallery.subtitle': 'Manage, organize, and analyze your extracted and uploaded images.',
        'gallery.empty': 'Empty gallery',
        'gallery.noResults': 'No results found',
        'gallery.emptyDescription': 'Start by uploading some images for analysis or extracting from PDFs.',
        'gallery.noResultsDescription': 'Try adjusting your filters or search for other terms.',
        'gallery.upload': 'Upload',
        'gallery.noTags': 'No tags',
        'gallery.uploaded': 'Uploaded',
        'gallery.extracted': 'Extracted',
        'gallery.searchPlaceholder': 'Search images...',
        'gallery.sortNewest': 'Newest first',
        'gallery.sortOldest': 'Oldest first',
        'gallery.sortNameAsc': 'Name (A-Z)',
        'gallery.sortNameDesc': 'Name (Z-A)',
        'gallery.sortSize': 'Size',
        'gallery.errorLoading': 'Error loading images',
        'gallery.imagesTotal': 'images total',
        'gallery.images': 'images',
        'gallery.first': 'First',
        'gallery.last': 'Last',
        'gallery.previousPage': 'Previous page',
        'gallery.nextPage': 'Next page',

        // Lightbox Modal
        'lightbox.tagsClassification': 'Tags & Classification',
        'lightbox.metadata': 'Metadata',
        'lightbox.origin': 'Source',
        'lightbox.format': 'Format',

        // Similarity Search
        'similarity.title': 'Similarity Search',
        'similarity.searching': 'Searching...',
        'similarity.resultsFound': 'results found',
        'similarity.topK': 'Top-K',
        'similarity.threshold': 'Threshold',
        'similarity.category': 'Category',
        'similarity.noResults': 'No similar images found.',
        'similarity.foundResults': 'similar images found!',

        // Profile Page
        'profile.title': 'My Profile',
        'profile.subtitle': 'Manage your personal information and settings',
        'profile.fullName': 'Full Name',
        'profile.fullNamePlaceholder': 'Your full name',
        'profile.email': 'Email',
        'profile.editProfile': 'Edit Profile',
        'profile.saveChanges': 'Save Changes',
        'profile.saving': 'Saving...',
        'profile.storage': 'Storage',
        'profile.used': 'used',
        'profile.total': 'total',
        'profile.spaceUsed': 'of space used',
        'profile.accountInfo': 'Account Information',
        'profile.createdAt': 'Created at',
        'profile.lastUpdate': 'Last update',
        'profile.dangerZone': 'Danger Zone',
        'profile.dangerDescription': 'Account deletion is permanent and cannot be undone. All your documents will be deleted.',
        'profile.deleteAccount': 'Delete Account Permanently',
        'profile.errorLoading': 'Error loading profile',
        'profile.deleteConfirmTitle': 'WARNING: This action is IRREVERSIBLE!',
        'profile.deleteConfirmMessage': 'All your documents and data will be PERMANENTLY deleted.',
        'profile.deleteConfirmPrompt': 'Type your username to confirm:',
        'profile.deleteCancelled': 'Incorrect username. Action cancelled.',

        // View PDFs Page
        'pdfs.title': 'PDF Documents',
        'pdfs.subtitle': 'View and manage your PDF documents',
        'pdfs.empty': 'No PDFs found',
        'pdfs.emptyDescription': 'Start by uploading your PDF documents for analysis.',
        'pdfs.uploadPdf': 'Upload PDF',
        'pdfs.pages': 'pages',
        'pdfs.extractedImages': 'extracted images',
        'pdfs.viewDocument': 'View Document',
        'pdfs.extractImages': 'Extract Images',
        'pdfs.processing': 'Processing...',

        // Annotation Page
        'annotation.title': 'Annotate Images',
        'annotation.subtitle': 'Add annotations and markings to your images',
        'annotation.selectImage': 'Select an image to annotate',
        'annotation.tools': 'Tools',
        'annotation.rectangle': 'Rectangle',
        'annotation.circle': 'Circle',
        'annotation.arrow': 'Arrow',
        'annotation.text': 'Text',
        'annotation.saveAnnotation': 'Save Annotation',
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

    // Get locale for date formatting
    const locale = language === 'pt' ? 'pt-BR' : 'en-US';

    const value = {
        language,
        toggleLanguage,
        setLanguage: setLang,
        t,
        locale,
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
