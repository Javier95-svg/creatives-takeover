import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AuthSocialButtonsProps {
  disabled?: boolean;
  onGoogleContinue: () => void | Promise<void>;
  onLinkedInContinue: () => void | Promise<void>;
  className?: string;
}

const baseButtonClassName =
  'h-12 w-full font-medium relative bg-background hover:bg-muted/50 transition-all duration-200 border-0';

const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="hsl(var(--blue-primary))"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="hsl(var(--red-primary))"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#EAB308"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="hsl(var(--green-primary))"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const LinkedInIcon = () => (
  <svg className="w-5 h-5 mr-2 text-[#0A66C2]" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="currentColor"
      d="M4.98 3.5C4.98 4.88071 3.86 6 2.48 6C1.1 6 0 4.88071 0 3.5C0 2.11929 1.1 1 2.48 1C3.86 1 4.98 2.11929 4.98 3.5ZM5 8H0V24H5V8ZM12.98 8H8.01V24H12.98V15.6C12.98 10.98 19 10.64 19 15.6V24H24V13.76C24 5.8 14.9 6.1 12.98 10V8Z"
    />
  </svg>
);

export function AuthSocialButtons({
  disabled = false,
  onGoogleContinue,
  onLinkedInContinue,
  className,
}: AuthSocialButtonsProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-3', className)}>
      <div
        className="relative p-[2px] rounded-button"
        style={{
          background:
            'linear-gradient(90deg, hsl(var(--blue-primary)), hsl(var(--red-primary)), #EAB308, hsl(var(--green-primary)))',
        }}
      >
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => void onGoogleContinue()}
          className={baseButtonClassName}
        >
          <GoogleIcon />
          <span
            className="bg-clip-text text-transparent font-medium"
            style={{
              backgroundImage:
                'linear-gradient(90deg, hsl(var(--blue-primary)), hsl(var(--red-primary)), #EAB308, hsl(var(--green-primary)))',
            }}
          >
            Continue with Google
          </span>
        </Button>
      </div>

      <div
        className="relative p-[2px] rounded-button"
        style={{ background: '#0A66C2' }}
      >
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => void onLinkedInContinue()}
          className={baseButtonClassName}
        >
          <LinkedInIcon />
          <span className="font-medium text-[#0A66C2]">Continue with LinkedIn</span>
        </Button>
      </div>
    </div>
  );
}
