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
				'2xl': '1400px'
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
				'poppins': ['Poppins', 'sans-serif'],
				'space-grotesk': ['Space Grotesk', 'Poppins', 'sans-serif'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in': {
					'0%': {
						opacity: '0',
						transform: 'translateY(20px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'fade-in-up': {
					'0%': {
						opacity: '0',
						transform: 'translateY(30px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'slide-up': {
					'0%': {
						opacity: '0',
						transform: 'translateY(40px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'slide-in-left': {
					'0%': {
						opacity: '0',
						transform: 'translateX(-30px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateX(0)'
					}
				},
				'slide-in-right': {
					'0%': {
						opacity: '0',
						transform: 'translateX(30px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateX(0)'
					}
				},
				'zoom-in': {
					'0%': {
						opacity: '0',
						transform: 'scale(0.9)'
					},
					'100%': {
						opacity: '1',
						transform: 'scale(1)'
					}
				},
				'bounce-subtle': {
					'0%, 100%': {
						transform: 'translateY(0)'
					},
					'50%': {
						transform: 'translateY(-5px)'
					}
				},
				'glow': {
					'0%, 100%': {
						opacity: '1'
					},
					'50%': {
						opacity: '0.5'
					}
				},
				'float': {
					'0%, 100%': {
						transform: 'translate3d(0, 0px, 0) rotate(0deg)',
						opacity: '0.7'
					},
					'25%': {
						transform: 'translate3d(20px, -15px, 0) rotate(90deg)',
						opacity: '1'
					},
					'50%': {
						transform: 'translate3d(-10px, -25px, 0) rotate(180deg)',
						opacity: '0.8'
					},
					'75%': {
						transform: 'translate3d(-20px, -10px, 0) rotate(270deg)',
						opacity: '0.9'
					}
				},
				'float-reverse': {
					'0%, 100%': {
						transform: 'translate3d(0, 0px, 0) rotate(360deg)',
						opacity: '0.6'
					},
					'25%': {
						transform: 'translate3d(-25px, 20px, 0) rotate(270deg)',
						opacity: '1'
					},
					'50%': {
						transform: 'translate3d(15px, 30px, 0) rotate(180deg)',
						opacity: '0.7'
					},
					'75%': {
						transform: 'translate3d(25px, 10px, 0) rotate(90deg)',
						opacity: '0.8'
					}
				},
				'drift': {
					'0%': {
						transform: 'translateX(-100px) translateY(0) rotate(0deg)',
						opacity: '0'
					},
					'10%': {
						opacity: '1'
					},
					'90%': {
						opacity: '1'
					},
					'100%': {
						transform: 'translateX(calc(100vw + 100px)) translateY(-50px) rotate(360deg)',
						opacity: '0'
					}
				},
				'spiral': {
					'0%': {
						transform: 'rotate(0deg) translateX(30px) rotate(0deg)',
						opacity: '0.5'
					},
					'50%': {
						transform: 'rotate(180deg) translateX(50px) rotate(-180deg)',
						opacity: '1'
					},
					'100%': {
						transform: 'rotate(360deg) translateX(30px) rotate(-360deg)',
						opacity: '0.5'
					}
				},
				'diagonal-float': {
					'0%, 100%': {
						transform: 'translate3d(0, 0, 0) scale(1)',
						opacity: '0.6'
					},
					'33%': {
						transform: 'translate3d(30px, -30px, 0) scale(1.2)',
						opacity: '1'
					},
					'66%': {
						transform: 'translate3d(-20px, 20px, 0) scale(0.8)',
						opacity: '0.8'
					}
				},
				'figure-eight': {
					'0%': {
						transform: 'translate(0, 0) rotate(0deg)'
					},
					'12.5%': {
						transform: 'translate(20px, -15px) rotate(45deg)'
					},
					'25%': {
						transform: 'translate(0, -30px) rotate(90deg)'
					},
					'37.5%': {
						transform: 'translate(-20px, -15px) rotate(135deg)'
					},
					'50%': {
						transform: 'translate(0, 0) rotate(180deg)'
					},
					'62.5%': {
						transform: 'translate(20px, 15px) rotate(225deg)'
					},
					'75%': {
						transform: 'translate(0, 30px) rotate(270deg)'
					},
					'87.5%': {
						transform: 'translate(-20px, 15px) rotate(315deg)'
					},
					'100%': {
						transform: 'translate(0, 0) rotate(360deg)'
					}
				},
				'orbit': {
					'0%': {
						transform: 'rotate(0deg) translateX(40px) rotate(0deg)'
					},
					'100%': {
						transform: 'rotate(360deg) translateX(40px) rotate(-360deg)'
					}
				},
				'zigzag': {
					'0%, 100%': {
						transform: 'translateX(0) translateY(0)'
					},
					'25%': {
						transform: 'translateX(20px) translateY(-20px)'
					},
					'50%': {
						transform: 'translateX(-15px) translateY(-10px)'
					},
					'75%': {
						transform: 'translateX(25px) translateY(-30px)'
					}
				},
				'pulse-glow': {
					'0%, 100%': {
						opacity: '0.4',
						transform: 'scale(1)',
						boxShadow: '0 0 0 0 rgba(0, 212, 255, 0.3)'
					},
					'50%': {
						opacity: '1',
						transform: 'scale(1.1)',
						boxShadow: '0 0 30px 10px rgba(0, 212, 255, 0.6)'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.6s ease-out',
				'fade-in-up': 'fade-in-up 0.6s ease-out',
				'slide-up': 'slide-up 0.8s ease-out',
				'slide-in-left': 'slide-in-left 0.6s ease-out',
				'slide-in-right': 'slide-in-right 0.6s ease-out',
				'zoom-in': 'zoom-in 0.5s ease-out',
				'scale-in': 'zoom-in 0.3s ease-out',
				'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
				'glow': 'glow 2s ease-in-out infinite',
				'float': 'float 6s ease-in-out infinite',
				'float-reverse': 'float-reverse 8s ease-in-out infinite',
				'drift': 'drift 10s linear infinite',
				'spiral': 'spiral 12s linear infinite',
				'diagonal-float': 'diagonal-float 7s ease-in-out infinite',
				'figure-eight': 'figure-eight 15s ease-in-out infinite',
				'orbit': 'orbit 20s linear infinite',
				'zigzag': 'zigzag 8s ease-in-out infinite',
				'pulse-glow': 'pulse-glow 3s ease-in-out infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
