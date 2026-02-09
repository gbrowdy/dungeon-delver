/**
 * Decorative background elements for ClassSelect screen.
 * Includes atmospheric glow, pixel art torches, and pixel stars.
 */
export function BackgroundDecor() {
  return (
    <>
      {/* Dark atmospheric background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-orange-900/5 rounded-full blur-[120px]" />
      </div>

      {/* Pixel art torches - matching MainMenu positioning (Issue #5) */}
      <div className="absolute left-8 sm:left-16 top-1/4 pixel-torch" aria-hidden="true">
        <div className="torch-flame" />
        <div className="torch-stick" />
      </div>

      <div className="absolute right-8 sm:right-16 top-1/4 pixel-torch" aria-hidden="true">
        <div className="torch-flame" />
        <div className="torch-stick" />
      </div>

      {/* Pixel stars scattered in background */}
      <div className="pixel-stars" aria-hidden="true">
        <div className="pixel-star" style={{ top: '10%', left: '15%', animationDelay: '0s' }} />
        <div className="pixel-star" style={{ top: '20%', right: '10%', animationDelay: '0.5s' }} />
        <div className="pixel-star" style={{ top: '70%', left: '8%', animationDelay: '1s' }} />
        <div className="pixel-star" style={{ top: '75%', right: '20%', animationDelay: '1.5s' }} />
        <div className="pixel-star" style={{ top: '5%', left: '45%', animationDelay: '0.7s' }} />
        <div className="pixel-star" style={{ top: '85%', left: '55%', animationDelay: '1.2s' }} />
      </div>

      {/* Bottom decorative accent */}
      <div className="absolute bottom-0 left-0 right-0">
        <div className="h-1 bg-gradient-to-r from-transparent via-orange-700/40 to-transparent" />
        <div className="h-px bg-gradient-to-r from-transparent via-orange-500/60 to-transparent" />
      </div>
    </>
  );
}
