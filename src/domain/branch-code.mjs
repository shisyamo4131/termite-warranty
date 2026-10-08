// Codes are identifiers: preserve leading zeroes and reject controls before trimming.
// No business length limit; request/document capacity limits remain in force.
export function normalizeBranchCode(value) {
  const code = String(value ?? '')
  if (/[\u0000-\u001f\u007f]/.test(code)) throw new Error('本支店コードに制御文字は使用できません。')
  return code.trim()
}
