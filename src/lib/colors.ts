import { mod } from "./theory";

/** The colour token for a scale degree (1..7), defined in styles.css as --deg-1…--deg-7. */
export const degreeColor = (degree: number) => `var(--deg-${mod(degree - 1, 7) + 1})`;
