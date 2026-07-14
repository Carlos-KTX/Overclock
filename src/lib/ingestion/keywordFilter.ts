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

  // Spanish (Mexico, Argentina, Chile, Colombia, Peru, ...) - verified against
  // real ISP Chile / ConsultorSalud article titles, not guessed in isolation.
  /\baprueba(n)?\b/i,
  /\baprobaci[oó]n\b/i,
  /\baprobad[oa]\b/i,
  /\bautoriza(ci[oó]n)?\b/i,
  /\bregistr(a|o|ó|an|ada|ado|ados|adas)\b.{0,40}\b(sanitario|medicamento|vacuna|producto|dispositivo)\b/i,
  /\bnuevo(a)? (medicamento|f[aá]rmaco|vacuna|tratamiento|dispositivo)\b/i,
  /\blanza(miento)?\b/i,
  /\bcomercializa(ci[oó]n)?\b/i,
  /\bdisponible\b/i,
  /\bensayo(s)? cl[ií]nico(s)?\b/i,
  /\bfase (1|2|3|i|ii|iii)\b/i,
  /\balerta sanitaria\b/i,
  /\bretirad[oa]s?\b/i,
  /\bretiro\b/i,

  // Portuguese (Brazil) - verified against real ANVISA article titles.
  /\baprova(m|ção|do|da)?\b/i,
  /\bautoriza(ção)?\b/i,
  /\bregistr(a|o|ou|ada|ado|adas|ados)\b.{0,40}\b(sanit[aá]rio|medicamento|vacina|produto|dispositivo)\b/i,
  /\bnov[oa] (medicamento|vacina|tratamento|dispositivo)\b/i,
  /\blan[çc]a(mento)?\b/i,
  /\bcomercializa(ção)?\b/i,
  /\bdispon[ií]vel\b/i,
  /\bensaio(s)? cl[ií]nico(s)?\b/i,
  /\balerta sanit[aá]rio\b/i,
  /\bretirad[oa]s?\b/i,
];

export function looksLikeProductRelease(title: string, excerpt: string): boolean {
  const text = `${title} ${excerpt}`;
  return SIGNAL_PATTERNS.some((pattern) => pattern.test(text));
}
