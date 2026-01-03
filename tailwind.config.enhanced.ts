import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1200px'
			}
		},
    extend: {
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1400px',
        '3xl': '1600px',
        // Mobile-first breakpoints
        'mobile': {'max': '767px'},
        'tablet': {'min': '768px', 'max': '1023px'},
        'desktop': {'min': '1024px'},
        // Touch device support
        'touch': {'raw': '(hover: none) and (pointer: coarse)'},
        'no-touch': {'raw': '(hover: hover) and (pointer: fine)'},
      },
			fontFamily: {
				'sans': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
				'poppins': ['Poppins', 'sans-serif'],
				'space-grotesk': ['Space Grotesk', 'Poppins', 'sans-serif'],
			},
			fontSize: {
				// Modern SaaS Typography Scale - Professional & Refined
				'display': ['72px', { lineHeight: '1.05', fontWeight: '700', letterSpacing: '-0.03em' }],
				'headline-xl': ['56px', { lineHeight: '1.1', fontWeight: '700', letterSpacing: '-0.025em' }],
				'headline-lg': ['40px', { lineHeight: '1.15', fontWeight: '700', letterSpacing: '-0.02em' }],
				'headline-md': ['32px', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.015em' }],
				'subheading-xl': ['28px', { lineHeight: '1.3', fontWeight: '600', letterSpacing: '-0.01em' }],
				'subheading-lg': ['24px', { lineHeight: '1.3', fontWeight: '600', letterSpacing: '-0.01em' }],
				'subheading-md': ['20px', { lineHeight: '1.35', fontWeight: '600', letterSpacing: '-0.005em' }],
				'body-xl': ['20px', { lineHeight: '1.6', fontWeight: '400', letterSpacing: '0' }],
				'body-lg': ['18px', { lineHeight: '1.65', fontWeight: '400', letterSpacing: '0' }],
				'body': ['16px', { lineHeight: '1.7', fontWeight: '400', letterSpacing: '0' }],
				'body-sm': ['14px', { lineHeight: '1.5', fontWeight: '400', letterSpacing: '0' }],
				'button-lg': ['18px', { lineHeight: '1.5', fontWeight: '600', letterSpacing: '-0.005em' }],
				'button': ['16px', { lineHeight: '1.5', fontWeight: '600', letterSpacing: '0' }],
				'button-sm': ['14px', { lineHeight: '1.5', fontWeight: '600', letterSpacing: '0' }],
				'caption': ['13px', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0' }],
				'overline': ['12px', { lineHeight: '1.5', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase' }],
			},
