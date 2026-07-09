const SIGNAL_PATTERNS: RegExp[] = [
  /\bapprov(e|es|ed|al)\b/i,
  /\bclears?\b/i,
  /\bclearance\b/i,
  /\bauthoriz(e|es|ed|ation)\b/i,
  /\bgrants? (marketing )?authorization\b/i,
  /\bCE mark(ing)?\b/i,
  /\blaunch(es|ed)?\b/i,
  /\bnow available\b/i,
  /\bcommercial(ly)? availab(le|ility)\b/i,
  /\bNDA\b/,
  /\bBLA\b/,
  /\bsubmission\b/i,
  /\bfiles? (for|an)\b/i,
  /\bphase (1|2|3|i|ii|iii)\b/i,
  /\btopline (results|data)\b/i,
  /\bpivotal trial\b/i,
  /\bpositive (results|data)\b/i,
  /\bpriority review\b/i,
  /\bbreakthrough (therapy )?designation\b/i,
  /\borphan drug\b/i,
  /\bfast track\b/i,
  /\brecall\b/i,
];

export function looksLikeProductRelease(title: string, excerpt: string): boolean {
  const text = `${title} ${excerpt}`;
  return SIGNAL_PATTERNS.some((pattern) => pattern.test(text));
}
