import { useEffect } from "react";

const BizMapAI = () => {
  // Redirect users to external BizMap AI tool
  useEffect(() => {
    window.location.href = "https://creatives-takeover.com/dream2plan";
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Redirecting to BizMap AI...</h1>
        <p className="text-muted-foreground">
          You're being redirected to our BizMap AI tool. If you're not redirected automatically, 
          <a 
            href="https://creatives-takeover.com/dream2plan" 
            className="text-primary hover:underline"
          >
            click here
          </a>.
        </p>
      </div>
    </div>
  );
};

export default BizMapAI;