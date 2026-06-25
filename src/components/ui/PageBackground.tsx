interface PageBackgroundProps {
  seed?: string;
}

export function PageBackground({ seed: _seed }: PageBackgroundProps) {
  return (
    <>
      <div
        aria-hidden
        className="fixed inset-0 z-0 bg-[linear-gradient(135deg,#8fd9eb_0%,#4d9fd0_36%,#2b5b93_68%,#17294d_100%)]"
      />
      <div
        aria-hidden
        className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.32),transparent_28%),radial-gradient(circle_at_82%_16%,rgba(186,230,253,0.34),transparent_26%),radial-gradient(circle_at_68%_82%,rgba(124,58,237,0.2),transparent_34%)]"
      />
      <div aria-hidden className="fixed inset-0 z-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.04)_42%,rgba(4,16,31,0.22)_100%)]" />
    </>
  );
}
