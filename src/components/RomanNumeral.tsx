import type { ChordAnalysis } from "../lib/theory";

export const RomanNumeral = ({ a }: { a: ChordAnalysis }) => (
  <span className="rn">
    {a.numeral}
    <sup>{a.sup}</sup>
  </span>
);
