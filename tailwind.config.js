/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        'gray-25': '#fafafa',
        'red-25': '#fefafa',
        'blue-25': '#f8fafc',
        'green-25': '#f0fdf4',
      },
      backgroundColor: {
        'red-50': '#fef2f2',
        'blue-25': '#f8fafc',
        'red-25': '#fefafa',
        'green-50': '#f0fdf4',
        'green-25': '#f0fdf4',
      },
      textColor: {
        'red-600': '#dc2626',
        'blue-600': '#2563eb',
        'green-600': '#16a34a',
        'green-700': '#15803d',
      },
      // モバイル最適化用のサイズ設定
      spacing: {
        '44': '11rem', // 44px タッチターゲット用
        '88': '22rem', // 大きなタッチエリア用
      },
      minWidth: {
        '32': '8rem',
        '40': '10rem',
        '44': '11rem', // 最小タッチターゲット
      },
      minHeight: {
        '44': '11rem', // 最小タッチターゲット
        'touch': '44px', // タッチターゲット
        'touch-lg': '48px', // 大きなタッチターゲット
      },
      maxWidth: {
        'mobile': '390px', // モバイル最大幅
        'tablet': '768px', // タブレット最大幅
      },
      gridTemplateColumns: {
        '7': 'repeat(7, minmax(0, 1fr))',
        'calendar': '60px repeat(7, 1fr)',
        'mobile-calendar': '50px 1fr', // モバイル用カレンダー
      },
      gridTemplateRows: {
        'calendar': 'repeat(36, 40px)',
        'mobile-calendar': 'repeat(24, 44px)', // モバイル用（44px最小）
      },
      // モバイル専用アニメーション
      animation: {
        'touch-feedback': 'touchFeedback 0.1s ease-out',
        'swipe-left': 'swipeLeft 0.3s ease-out',
        'swipe-right': 'swipeRight 0.3s ease-out',
      },
      keyframes: {
        touchFeedback: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        },
        swipeLeft: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(-100%)', opacity: '0' },
        },
        swipeRight: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
      },
      // モバイル専用ブレークポイント
      screens: {
        'xs': '375px',
        'mobile': '390px',
        'touch': '768px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    // モバイル専用ユーティリティプラグイン
    function({ addUtilities }) {
      const newUtilities = {
        '.touch-manipulation': {
          'touch-action': 'manipulation',
        },
        '.touch-none': {
          'touch-action': 'none',
        },
        '.touch-pan-x': {
          'touch-action': 'pan-x',
        },
        '.touch-pan-y': {
          'touch-action': 'pan-y',
        },
        '.touch-pinch-zoom': {
          'touch-action': 'pinch-zoom',
        },
        '.scroll-smooth-ios': {
          '-webkit-overflow-scrolling': 'touch',
          'scroll-behavior': 'smooth',
        },
        '.no-scrollbar': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
        '.tap-highlight-transparent': {
          '-webkit-tap-highlight-color': 'transparent',
        },
      }
      addUtilities(newUtilities)
    },
  ],
}