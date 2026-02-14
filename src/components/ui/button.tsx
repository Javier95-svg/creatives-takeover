import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[12px] text-button font-semibold ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation min-h-[44px]",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-b from-primary to-primary/90 text-primary-foreground shadow-[0_1px_2px_hsl(var(--foreground)/0.08),0_8px_20px_hsl(var(--primary)/0.24)] hover:-translate-y-0.5 hover:from-primary/95 hover:to-primary/85 hover:shadow-[0_1px_2px_hsl(var(--foreground)/0.1),0_12px_26px_hsl(var(--primary)/0.28)] active:translate-y-0",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_1px_2px_hsl(var(--foreground)/0.08),0_8px_20px_hsl(var(--destructive)/0.25)] hover:-translate-y-0.5 hover:bg-destructive/90 active:translate-y-0",
        outline:
          "border border-border/75 bg-background/95 text-foreground shadow-[0_1px_2px_hsl(var(--foreground)/0.04)] hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/5 hover:shadow-[0_10px_22px_hsl(var(--foreground)/0.09)] active:translate-y-0",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[0_1px_2px_hsl(var(--foreground)/0.05)] hover:-translate-y-0.5 hover:bg-secondary/90 active:translate-y-0",
        ghost: "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        "rgb-gradient": "bg-gradient-rgb text-primary-foreground hover:opacity-90 shadow-lg hover:shadow-xl rgb-glow-subtle hover:rgb-glow transition-all duration-300",
        "rgb-planning": "bg-gradient-planning text-primary-foreground hover:opacity-90 shadow-lg hover:shadow-xl hover:shadow-blue/30 transition-all duration-300",
        "rgb-action": "bg-gradient-action text-primary-foreground hover:opacity-90 shadow-lg hover:shadow-xl hover:shadow-red/30 transition-all duration-300",
        "rgb-growth": "bg-gradient-growth text-primary-foreground hover:opacity-90 shadow-lg hover:shadow-xl hover:shadow-green/30 transition-all duration-300",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 px-3 text-button-sm",
        lg: "h-12 px-7 text-base",
        icon: "h-11 w-11 min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
