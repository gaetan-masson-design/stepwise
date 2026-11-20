import { mod } from "./theory";

/** One hue per scale degree; lightness and chroma come from theme tokens in styles.css. */
const HUES = [160, 211, 262, 313, 4, 55, 106];

export const degreeColor = (degree: number) =>
  `oklch(var(--deg-l) var(--deg-c) ${HUES[mod(degree - 1, 7)]})`;
