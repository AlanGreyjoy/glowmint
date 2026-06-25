interface PageBackgroundProps {
  seed?: string;
}

export function PageBackground({ seed }: PageBackgroundProps) {
  void seed;

  return (
    <>
      <div
        aria-hidden
        className="fixed inset-0 z-0 bg-[linear-gradient(135deg,#0b1512_0%,#0a0f14_40%,#06090d_70%,#04070a_100%)]"
      />
      <div
        aria-hidden
        className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_18%_18%,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_82%_16%,rgba(45,212,191,0.16),transparent_26%),radial-gradient(circle_at_68%_82%,rgba(16,185,129,0.12),transparent_34%)]"
      />
      <div
        aria-hidden
        className="fixed inset-0 z-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.02)_42%,rgba(2,6,10,0.4)_100%)]"
      />
    </>
  );
}
