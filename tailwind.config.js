/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class', // Enable class-based dark mode
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            colors: {
                // Modern primary palette (Indigo/Purple gradient)
                primary: {
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    200: '#c7d2fe',
                    300: '#a5b4fc',
                    400: '#818cf8',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#312e81',
                    950: '#1e1b4b',
                },
                // Accent color (Violet/Purple)
                accent: {
                    50: '#faf5ff',
                    100: '#f3e8ff',
                    200: '#e9d5ff',
                    300: '#d8b4fe',
                    400: '#c084fc',
                    500: '#a855f7',
                    600: '#9333ea',
                    700: '#7c3aed',
                    800: '#6b21a8',
                    900: '#581c87',
                },
                // Light mode colors
                'deep-dark': '#f8fafc',
                'bg-dark': '#ffffff',
                'bg-card': '#ffffff',
                'primary-accent': '#e2e8f0',
                'toggle-accent': '#6366f1',
                'text-primary': '#0f172a',
                'text-secondary': '#64748b',

                // Dark mode colors (will be used with dark: prefix)
                'dark-deep': '#0f0f1a',
                'dark-bg': '#1a1a2e',
                'dark-card': '#252540',
                'dark-accent': '#3d3d6b',

                // Sidebar specific colors
                sidebar: {
                    'bg-light': '#ffffff',
                    'bg-dark': '#0f0f1a',
                    'accent': '#6366f1',
                    'text-primary': '#ffffff',
                    'text-secondary': '#94a3b8',
                    'search-bg-light': '#f1f5f9',
                    'search-bg-dark': '#1a1a2e',
                },

                // Semantic colors
                'icon-dark': 'rgba(255, 255, 255, 0.05)',
                'dropzone-light': 'rgba(99, 102, 241, 0.02)',
                'dropzone-dark': 'rgba(99, 102, 241, 0.05)',
                'sidebar-accent': 'rgba(99, 102, 241, 0.12)',
                'sidebar-hover-light': '#f1f5f9',
                'sidebar-hover-dark': 'rgba(255, 255, 255, 0.05)',

                // Surface colors for cards and containers
                surface: {
                    light: '#ffffff',
                    dark: '#1a1a2e',
                    'light-hover': '#f8fafc',
                    'dark-hover': '#252540',
                },
            },
            borderColor: {
                'modal-light': 'rgba(0, 0, 0, 0.05)',
                'modal-dark': 'rgba(255, 255, 255, 0.08)',
                'surface-light': 'rgba(0, 0, 0, 0.06)',
                'surface-dark': 'rgba(255, 255, 255, 0.06)',
                'dropzone-light': 'rgba(99, 102, 241, 0.2)',
                'dropzone-dark': 'rgba(99, 102, 241, 0.3)',
                'sidebar-light': 'rgba(0, 0, 0, 0.05)',
                'sidebar-dark': 'rgba(255, 255, 255, 0.05)',
            },
            boxShadow: {
                'glow-sm': '0 0 15px -3px rgba(99, 102, 241, 0.3)',
                'glow': '0 0 25px -5px rgba(99, 102, 241, 0.4)',
                'glow-lg': '0 0 40px -10px rgba(99, 102, 241, 0.5)',
                'card': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
                'card-hover': '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
                'elevated': '0 20px 40px -10px rgba(0, 0, 0, 0.15)',
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out forwards',
                'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
                'fade-in-down': 'fadeInDown 0.3s ease-out forwards',
                'slide-in-right': 'slideInRight 0.3s ease-out forwards',
                'slide-in-left': 'slideInLeft 0.3s ease-out forwards',
                'scale-in': 'scaleIn 0.2s ease-out forwards',
                'float': 'float 6s ease-in-out infinite',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'shimmer': 'shimmer 2s linear infinite',
                'glow-pulse': 'glowPulse 2s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeInDown: {
                    '0%': { opacity: '0', transform: 'translateY(-10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideInRight: {
                    '0%': { opacity: '0', transform: 'translateX(20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                slideInLeft: {
                    '0%': { opacity: '0', transform: 'translateX(-20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                glowPulse: {
                    '0%, 100%': { opacity: '0.4' },
                    '50%': { opacity: '0.8' },
                },
            },
            backdropBlur: {
                xs: '2px',
            },
            transitionDuration: {
                '400': '400ms',
            },
        },
    },
    plugins: [],
}
