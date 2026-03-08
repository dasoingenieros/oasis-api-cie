/**
 * CIE Identifier Generator
 *
 * Replicates the logic from the "K" sheet of CERTIFICADO_BASICO.xls:
 * - Format: {random_16digits}{control_2letters}
 * - Components: random(13) + date-based(6) + random(7) → 16 digits + 2 control letters
 * - Control letters: mod 23 lookup table (same as Spanish NIF/NIE)
 *
 * Example output: "2546376214869080RW"
 */

// Control letter table from K sheet (E6:F29) — mod 23 → letter
const CONTROL_LETTERS = [
  'T', // 0
  'R', // 1
  'W', // 2
  'A', // 3
  'G', // 4
  'M', // 5
  'Y', // 6
  'F', // 7
  'P', // 8
  'D', // 9
  'X', // 10
  'B', // 11
  'N', // 12
  'J', // 13
  'Z', // 14
  'S', // 15
  'Q', // 16
  'V', // 17
  'H', // 18
  'L', // 19
  'C', // 20
  'K', // 21
  'E', // 22
] as const;

/**
 * Generate a unique CIE identifier following the official format.
 *
 * The identifier consists of 16-18 digits followed by 2 control letters.
 * Structure (from K sheet analysis):
 * - K13: random number (13 digits range: 2000000000000000)
 * - K14: date-based component (546376210000000 → encoded timestamp)
 * - K15: random tail (4869084)
 * - Combined → 16-digit number
 * - Control: first letter from (number / 25) mod 23, second from number mod 23
 *
 * @returns CIE identifier string, e.g. "2546376214869080RW"
 */
export function generateCieIdentificador(): string {
  // Generate a large random number (16+ digits)
  const now = Date.now();
  const randomPart1 = Math.floor(Math.random() * 9000000000000) + 1000000000000; // 13 digits
  const datePart = now % 10000000000; // last 10 digits of timestamp
  const randomPart2 = Math.floor(Math.random() * 9000000) + 1000000; // 7 digits

  // Combine into a single large number string (take first 16 digits)
  const combined = `${randomPart1}${datePart}${randomPart2}`;
  const numericId = combined.substring(0, 16);

  // Calculate control letters
  const numValue = BigInt(numericId);
  const letter1 = CONTROL_LETTERS[Number((numValue / 25n) % 23n)];
  const letter2 = CONTROL_LETTERS[Number(numValue % 23n)];

  return `${numericId}${letter1}${letter2}`;
}

/**
 * Validate a CIE identifier format.
 * @param id The CIE identifier to validate
 * @returns true if format is valid (16 digits + 2 uppercase letters)
 */
export function validateCieIdentificador(id: string): boolean {
  if (!id || id.length < 10) return false;

  const numericPart = id.slice(0, -2);
  const letterPart = id.slice(-2);

  // Check numeric part is all digits
  if (!/^\d+$/.test(numericPart)) return false;

  // Check letters are valid control characters
  if (!/^[A-Z]{2}$/.test(letterPart)) return false;

  // Verify control letters
  const numValue = BigInt(numericPart);
  const expectedLetter1 = CONTROL_LETTERS[Number((numValue / 25n) % 23n)];
  const expectedLetter2 = CONTROL_LETTERS[Number(numValue % 23n)];

  return letter1(letterPart) === expectedLetter1 && letter2(letterPart) === expectedLetter2;
}

function letter1(letters: string): string {
  return letters.charAt(0);
}

function letter2(letters: string): string {
  return letters.charAt(1);
}
