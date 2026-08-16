/**
 * Natural ("human") ordering for row and column members.
 *
 * Plain string sorting puts "Item 10" before "Item 2". Natural sorting splits
 * a label into digit and non-digit chunks and compares the digit chunks as
 * numbers, so members read the way a person expects:
 *
 *   Item 2, Item 10, Item 11   (not Item 10, Item 11, Item 2)
 */

const DIGITS = /(\d+)/;

/** Empty-ish values always sort last so real members stay at the top. */
function isBlank(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

/** Splits "Q10 2024" into ["Q", "10", " ", "2024"]. */
function chunks(value: string): string[] {
  return value.split(DIGITS).filter((part) => part !== "");
}

/**
 * Compares two members. Returns a negative number when `a` comes first,
 * a positive number when `b` comes first, and 0 when they tie.
 */
export function naturalSort(a: unknown, b: unknown): number {
  if (isBlank(a) && isBlank(b)) return 0;
  if (isBlank(a)) return 1;
  if (isBlank(b)) return -1;

  const numA = Number(a);
  const numB = Number(b);
  const bothNumeric = Number.isFinite(numA) && Number.isFinite(numB);
  if (bothNumeric) return numA - numB;

  const textA = String(a);
  const textB = String(b);
  const partsA = chunks(textA);
  const partsB = chunks(textB);

  for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
    const partA = partsA[i] as string;
    const partB = partsB[i] as string;
    const aIsNumber = DIGITS.test(partA) && !Number.isNaN(Number(partA));
    const bIsNumber = DIGITS.test(partB) && !Number.isNaN(Number(partB));

    if (aIsNumber && bIsNumber) {
      const diff = Number(partA) - Number(partB);
      if (diff !== 0) return diff;
      continue;
    }
    // Numbers sort before words: "1st floor" before "Ground floor".
    if (aIsNumber !== bIsNumber) return aIsNumber ? -1 : 1;

    const diff = partA.localeCompare(partB, undefined, { sensitivity: "base" });
    if (diff !== 0) return diff;
  }

  return partsA.length - partsB.length;
}
