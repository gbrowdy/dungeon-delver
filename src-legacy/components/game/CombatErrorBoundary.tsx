import React, { Component, ErrorInfo, ReactNode } from 'react';
import { CombatErrorFallback } from './CombatErrorFallback';

/**
 * Props for the CombatErrorBoundary component.
 *
 * @property children - Child components to wrap with error boundary
 * @property onRetryFloor - Handler to retry the current floor (resets to floor start)
 * @property onReturnToMenu - Handler to return to the main menu (full game reset)
 */
interface CombatErrorBoundaryProps {
  children: ReactNode;
  onRetryFloor: () => void;
  onReturnToMenu: () => void;
}

/**
 * State for the CombatErrorBoundary component.
 *
 * @property hasError - Whether an error has been caught
 * @property error - The caught error object
 * @property errorInfo - React error info with component stack
 */
interface CombatErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * CombatErrorBoundary - Error boundary specifically for the combat screen.
 *
 * This error boundary provides combat-specific recovery options:
 * - Retry the current floor (preserves character progress)
 * - Return to main menu (safe exit)
 *
 * It catches errors in:
 * - CombatScreen and all child components
 * - CombatProvider context
 * - Battle animations and effects
 * - Combat loop timing
 *
 * The boundary logs errors to the console for debugging and displays
 * a user-friendly fallback UI with recovery options.
 *
 * Usage:
 * ```tsx
 * <CombatErrorBoundary
 *   onRetryFloor={actions.retryFloor}
 *   onReturnToMenu={actions.restartGame}
 * >
 *   <CombatScreen {...props} />
 * </CombatErrorBoundary>
 * ```
 */
export class CombatErrorBoundary extends Component<CombatErrorBoundaryProps, CombatErrorBoundaryState> {
  constructor(props: CombatErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Static lifecycle method called when an error is thrown.
   * Updates state to trigger fallback UI rendering.
   */
  static getDerivedStateFromError(error: Error): Partial<CombatErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Lifecycle method called after an error is caught.
   * Logs error details to console for debugging.
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error details for debugging
    console.error('Combat Error Boundary caught an error:', {
      error,
      errorInfo,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    // In production, you could send this to an error tracking service
    // Example: Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
  }

  /**
   * Handler for the "Try Again" button.
   * Resets error state and calls the retry floor action.
   */
  handleRetryFloor = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    this.props.onRetryFloor();
  };

  /**
   * Handler for the "Return to Menu" button.
   * Resets error state and calls the return to menu action.
   */
  handleReturnToMenu = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    this.props.onReturnToMenu();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <CombatErrorFallback
          error={this.state.error}
          onRetryFloor={this.handleRetryFloor}
          onReturnToMenu={this.handleReturnToMenu}
        />
      );
    }

    return this.props.children;
  }
}
