import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onReset?: () => void;
}

export default function ErrorPage({ onReset }: Props) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-[28rem] flex flex-col items-center gap-6 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-error-container">
          <AlertTriangle className="w-8 h-8 text-on-error-container" />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-h2 text-on-surface">Something went wrong</h1>
          <p className="text-body-md text-on-surface-variant">
            An unexpected error occurred. You can try reloading the page or
            contact support if the problem persists.
          </p>
        </div>

        <div className="flex w-full">
          <Button
            className="flex-1 gap-2"
            onClick={onReset ?? (() => window.location.reload())}
          >
            <RefreshCw className="w-4 h-4" />
            Reload
          </Button>
        </div>
      </div>
    </div>
  );
}
