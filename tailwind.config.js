/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class', // Enable dark mode via class
    content: [
        './src/**/*.{js,ts,jsx,tsx,mdx}',
        './node_modules/@tremor/**/*.{js,ts,jsx,tsx}',
    ],
    safelist: [
        {
            pattern: /fill-(red|amber|yellow|green|blue|emerald|indigo|purple|pink|gray|rose|cyan|violet|fuchsia|lime|orange|teal)-(100|200|300|400|500|600|700|800|900)/,
            variants: ['dark'],
        },
        {
            pattern: /bg-(red|amber|yellow|green|blue|emerald|indigo|purple|pink|gray|rose|cyan|violet|fuchsia|lime|orange|teal)-(50|100|200|300|400|500|600|700|800|900)/,
            variants: ['dark', 'hover'],
        },
        {
            pattern: /text-(red|amber|yellow|green|blue|emerald|indigo|purple|pink|gray|rose|cyan|violet|fuchsia|lime|orange|teal)-(50|100|200|300|400|500|600|700|800|900)/,
            variants: ['dark'],
        },
        {
            pattern: /stroke-(red|amber|yellow|green|blue|emerald|indigo|purple|pink|gray|rose|cyan|violet|fuchsia|lime|orange|teal)-(100|200|300|400|500|600|700|800|900)/,
            variants: ['dark'],
        },
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#2563eb', // Blue for primary actions
                    hover: '#1d4ed8',
                    light: '#e0e7ff',
                    dark: '#1e40af',
                },
                secondary: {
                    DEFAULT: '#64748b', // Slate for secondary
                    hover: '#475569',
                    light: '#f1f5f9',
                    dark: '#334155',
                },
                accent: {
                    DEFAULT: '#0d9488', // Teal for highlights
                    hover: '#0f766e',
                    light: '#99f6e4',
                    dark: '#134e4a',
                },
                background: {
                    DEFAULT: '#f8fafc', // Light background
                    light: '#ffffff',
                    dark: '#f1f5f9',
                    card: '#ffffff',
                },
                border: {
                    DEFAULT: '#e2e8f0',
                    light: '#f1f5f9',
                    dark: '#cbd5e1',
                },
                success: {
                    DEFAULT: '#059669',
                    light: '#34d399',
                    dark: '#047857',
                },
                warning: {
                    DEFAULT: '#d97706',
                    light: '#fbbf24',
                    dark: '#b45309',
                },
                danger: {
                    DEFAULT: '#dc2626',
                    light: '#f87171',
                    dark: '#b91c1c',
                },
                info: {
                    DEFAULT: '#2563eb',
                    light: '#60a5fa',
                    dark: '#1d4ed8',
                },
                text: {
                    DEFAULT: '#1e293b', // Dark text
                    light: '#475569',
                    muted: '#64748b',
                }
            },
            boxShadow: {
                'glow': '0 0 20px rgba(37, 99, 235, 0.15)',
                'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
        },
    },
    plugins: [],
}