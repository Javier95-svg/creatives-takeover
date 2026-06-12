import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-button text-button font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation min-h-[44px]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm hover:shadow-md",
        outline:
          "border border-input bg-background hover:bg-muted hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        "rgb-gradient": "bg-gradient-rgb text-primary-foreground hover:opacity-90 shadow-lg hover:shadow-xl rgb-glow-subtle hover:rgb-glow transition-all duration-300",
        "rgb-planning": "bg-gradient-planning text-primary-foreground hover:opacity-90 shadow-lg hover:shadow-xl hover:shadow-blue/30 transition-all duration-300",
        "rgb-action": "bg-gradient-action text-primary-foreground hover:opacity-90 shadow-lg hover:shadow-xl hover:shadow-red/30 transition-all duration-300",
        "rgb-growth": "bg-gradient-growth text-primary-foreground hover:opacity-90 shadow-lg hover:shadow-xl hover:shadow-green/30 transition-all duration-300",
      },
      size: {
        default: "h-12 px-4 py-2",
        sm: "h-10 rounded-button px-3 text-button-sm",
        lg: "h-14 rounded-button px-8",
        icon: "h-12 w-12 min-h-[44px] min-w-[44px]",
        // Compact sizes for dense tool chrome (e.g. MVP Builder)
        "icon-sm": "h-9 w-9 min-h-0 min-w-0 rounded-2xl",
        "pill-sm": "h-7 min-h-0 rounded-full px-3 text-label",
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
