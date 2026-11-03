/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    // كل الملفات اللي فيها Tailwind classes (بما فيها اللي جوه JavaScript)
    content: ['./index.html', './js/**/*.js'],
    // classes بتتبني ديناميكياً في app.js (showToast) فمش بيلقطها الفحص الثابت
    safelist: [
        'text-emerald-500', 'text-red-500', 'text-amber-500', 'text-blue-500',
        'border-s-emerald-500', 'border-s-red-500', 'border-s-amber-500', 'border-s-blue-500'
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#f0fdf4',
                    100: '#dcfce7',
                    200: '#bbf7d0',
                    500: '#22c55e',
                    600: '#16a34a',
                    700: '#15803d',
                    800: '#166534',
                    900: '#1b4332',
                    950: '#081c15'
                }
            },
            fontFamily: {
                sans: ['Cairo', 'sans-serif']
            }
        }
    },
    plugins: []
};
