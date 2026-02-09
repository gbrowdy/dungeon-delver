import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';

/**
 * Props for the CombatErrorFallback component.
 *
 * @property error - The error that was caught
 * @property onRetryFloor - Handler to retry the current floor
 * @property onReturnToMenu - Handler to return to the main menu
 */
interface CombatErrorFallbackProps {
  error: Error | null;
  onRetryFloor: () => void;
  onReturnToMenu: () => void;
}

/**
 * CombatErrorFallback - User-friendly error UI for combat screen errors.
 *
 * Displays when an error occurs during combat, providing:
 * - Clear error message
 * - Option to retry the current floor
 * - Option to return to the main menu
 *
 * Styled consistently with the game's dark fantasy theme.
 */
export function CombatErrorFallback({ error, onRetryFloor, onReturnToMenu }: CombatErrorFallbackProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 flex items-center justify-center relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-red-900/10 rounded-full blur-[120px]" />
      </div>

      {/* Pixel stars */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="pixel-star" style={{ top: '5%', left: '10%', animationDelay: '0s' }} />
        <div className="pixel-star" style={{ top: '15%', right: '8%', animationDelay: '0.7s' }} />
        <div className="pixel-star" style={{ top: '70%', left: '5%', animationDelay: '1.2s' }} />
        <div className="pixel-star" style={{ top: '80%', right: '12%', animationDelay: '1.8s' }} />
      </div>

      <Card className="max-w-md w-full relative z-10 border-red-900/50 bg-slate-900/95 backdrop-blur">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-red-900/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" aria-hidden="true" />
            </div>
          </div>
          <CardTitle className="text-red-500 text-2xl">Combat Error</CardTitle>
          <CardDescription className="text-slate-400">
            Something went wrong during combat. Don't worry, your progress is safe!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-slate-950/50 rounded-md border border-slate-800">
              <p className="text-xs font-mono text-slate-500 break-words">
                {error.message}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Button
              onClick={onRetryFloor}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              size="lg"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Try Again
            </Button>

            <Button
              onClick={onReturnToMenu}
              variant="outline"
              className="w-full border-slate-700 hover:bg-slate-800 text-slate-300"
              size="lg"
            >
              <Home className="w-4 h-4 mr-2" />
              Return to Menu
            </Button>
          </div>

          <p className="text-xs text-center text-slate-500 pt-2">
            Trying again will restart you at the beginning of this floor with your current equipment and upgrades.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
