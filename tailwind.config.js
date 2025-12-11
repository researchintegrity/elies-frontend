/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class', // Enable class-based dark mode
    theme: {
        extend: {
            colors: {
                // Light mode colors
                'deep-dark': '#f3f4f6',
                'bg-dark': '#ffffff',
                'bg-card': '#ffffff',
                'primary-accent': '#e5e7eb',
                'toggle-accent': '#8A63D2',
                'text-primary': '#111827',
                'text-secondary': '#6b7280',

                // Dark mode colors (will be used with dark: prefix)
                'dark-deep': '#1E1E2F',
                'dark-bg': '#2C2F36',
                'dark-card': '#383B42',
                'dark-accent': '#4A4A6A',

                // Sidebar specific colors
                sidebar: {
                    'bg-light': '#ffffff',
                    'bg-dark': '#1e1e2e',
                    'accent': '#6e56cf',
                    'text-primary': '#ffffff',
                    'text-secondary': '#a6accd',
                    'search-bg-light': '#f3f4f6',
                    'search-bg-dark': '#181825',
                },

                // Semantic colors
                'icon-dark': 'rgba(255, 255, 255, 0.05)',
                'dropzone-light': 'rgba(0, 0, 0, 0.02)',
                'dropzone-dark': 'rgba(255, 255, 255, 0.02)',
                'sidebar-accent': 'rgba(110, 86, 207, 0.15)',
                'sidebar-hover-light': '#f3f4f6',
                'sidebar-hover-dark': 'rgba(255, 255, 255, 0.05)',
            },
            borderColor: {
                'modal-light': 'rgba(0, 0, 0, 0.05)',
                'modal-dark': 'rgba(255, 255, 255, 0.08)',
                'surface-light': 'rgba(0, 0, 0, 0.08)',
                'surface-dark': 'rgba(255, 255, 255, 0.05)',
                'dropzone-light': 'rgba(0, 0, 0, 0.1)',
                'dropzone-dark': 'rgba(255, 255, 255, 0.15)',
                'sidebar-light': 'rgba(0, 0, 0, 0.05)',
                'sidebar-dark': 'rgba(255, 255, 255, 0.05)',
            },
        },
    },
    plugins: [],
}
