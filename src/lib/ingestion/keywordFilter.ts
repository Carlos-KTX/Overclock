/**
 * Builds a case-insensitive, Unicode-aware "whole word" pattern.
 *
 * Plain `\b` is ASCII-only in JS regex ('\w' = [A-Za-z0-9_]), so it silently
 * fails to find a boundary right after an accented letter (e.g. "inhibió "
 * has no \b between "ó" and the space, since neither side is \w). Every
 * pattern below matches Spanish/Portuguese text, so we use a Unicode
 * lookaround instead of \b to avoid that trap.
 */
function word(pattern: string): RegExp {
  return new RegExp(`(?<!\\p{L})(?:${pattern})(?!\\p{L})`, "iu");
}

const SIGNAL_PATTERNS: RegExp[] = [
  // English
  word("approv(e|es|ed|al)"),
  word("clears?"),
  word("clearance"),
  word("authoriz(e|es|ed|ation)"),
  word("grants? (marketing )?authorization"),
  word("CE marks?(ing)?"),
  word("launch(es|ed)?"),
  word("now available"),
  word("commercial(ly)? availab(le|ility)"),
  word("NDA"),
  word("BLA"),
  word("submission"),
  word("files? (for|an)"),
  word("phase (1|2|3|i|ii|iii)"),
  word("topline (results|data)"),
  word("pivotal trial"),
  word("positive (results|data)"),
  word("priority review"),
  word("breakthrough (therapy )?designation"),
  word("orphan drug"),
  word("fast track"),
  word("recall"),

  // Spanish (Mexico, Argentina, Chile, Colombia, Peru, ...) - verified
  // against real ISP Chile / ANMAT / COFEPRIS / DIGEMID article titles.
  word("aprueba(n)?"),
  word("aprobaci[oó]n"),
  word("aprobad[oa]"),
  word("autoriza(ci[oó]n)?"),
  word("nuevo(a)? (medicamento|f[aá]rmaco|vacuna|tratamiento|dispositivo)"),
  word("lanza(miento)?"),
  word("comercializa(ci[oó]n)?"),
  word("disponible"),
  word("ensayo(s)? cl[ií]nico(s)?"),
  word("fase (1|2|3|i|ii|iii)"),
  word("alerta sanitaria"),
  word("retirad[oa]s?"),
  word("retiro"),
  // Enforcement actions (suspensions/bans/raids) - the closest LatAm
  // regulator equivalent to an English "recall".
  word("proh[ií]b(e|i[oó]|ici[oó]n)"),
  word("inhib(e|i[oó]|ici[oó]n)"),
  word("suspend(e|i[oó])"),
  word("suspensi[oó]n"),
  word("intervenid[oa]s?"),
  word("clausura"),
  word("disposiciones"),

  // Portuguese (Brazil) - verified against real ANVISA article titles.
  word("aprova(m|[çc][aã]o|do|da)?"),
  word("autoriza([çc][aã]o)?"),
  word("nov[oa] (medicamento|vacina|tratamento|dispositivo)"),
  word("lan[çc]a(mento)?"),
  word("comercializa([çc][aã]o)?"),
  word("dispon[ií]vel"),
  word("ensaio(s)? cl[ií]nico(s)?"),
  word("alerta sanit[aá]rio"),
  word("retirad[oa]s?"),
  word("pro[ií]b(e|iu|i[çc][aã]o)"),
  word("interdit(a|ada|ou|[aã]o)"),
];

// Registration phrases need a wider window than a single word, so they're
// built directly rather than through the `word()` helper above.
const REGISTRATION_PATTERNS: RegExp[] = [
  /(?<!\p{L})registr(a|o|ó|an|ada|ado|ados|adas)(?!\p{L}).{0,40}(?<!\p{L})(sanitario|medicamento|vacuna|producto|dispositivo)(?!\p{L})/iu,
  /(?<!\p{L})registr(a|o|ou|ada|ado|adas|ados)(?!\p{L}).{0,40}(?<!\p{L})(sanit[aá]rio|medicamento|vacina|produto|dispositivo)(?!\p{L})/iu,
];

export function looksLikeProductRelease(title: string, excerpt: string): boolean {
  const text = `${title} ${excerpt}`;
  return (
    SIGNAL_PATTERNS.some((pattern) => pattern.test(text)) ||
    REGISTRATION_PATTERNS.some((pattern) => pattern.test(text))
  );
}
