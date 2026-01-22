import { useRef, useEffect, useState } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { cn } from '@/lib/utils';

// hCaptcha site key - this is the public key, safe to expose
const HCAPTCHA_SITE_KEY = '10000000-ffff-ffff-ffff-000000000001'; // Test key - replace with real key in production

interface CaptchaProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export function Captcha({ onVerify, onExpire, onError, className }: CaptchaProps) {
  const captchaRef = useRef<HCaptcha>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleVerify = (token: string) => {
    onVerify(token);
  };

  const handleExpire = () => {
    onExpire?.();
  };

  const handleError = (err: string) => {
    console.error('hCaptcha error:', err);
    onError?.(err);
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  // Reset captcha when needed
  const reset = () => {
    captchaRef.current?.resetCaptcha();
  };

  return (
    <div className={cn('flex justify-center', className)}>
      <HCaptcha
        ref={captchaRef}
        sitekey={HCAPTCHA_SITE_KEY}
        onVerify={handleVerify}
        onExpire={handleExpire}
        onError={handleError}
        onLoad={handleLoad}
        theme="light"
        size="normal"
      />
    </div>
  );
}

// Export for external reset access
export type CaptchaHandle = {
  reset: () => void;
};