import type { SVGProps } from "react";

/** Three stacked blocks, like chord tiles. Sized and coloured like the icon set. */
export const ChordsIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
    <rect x="3" y="4" width="8" height="5" rx="1.5" />
    <rect x="13" y="4" width="8" height="5" rx="1.5" />
    <rect x="3" y="15" width="18" height="5" rx="1.5" />
  </svg>
);
