/**
 * Line classifier for the /texter detail view.
 *
 * The `songs.lyrics` column stores plain text with the chords pasted inline
 * above the lines they belong to, so this is a heuristic line classifier
 * rather than a real parser. It is deliberately conservative: anything that is
 * not clearly a chord or a known playing instruction is treated as a lyric and
 * always rendered.
 *
 * Tuned against the real pasted lyrics (Beata, Cohen och Kent, Ljung och
 * kaprifol, Sommarn på Boganeberget, That's all right…, Ute på Fryken), which
 * include tab/space-indented chord lines, slash chords (G/B), extensions
 * (D7, E7, Em7), a parenthesized chord (D7), a capo instruction "(capo I)",
 * "(osv)" and "(mellanspel: Am G)".
 */

/**
 * One chord token: root note A-G with an optional #/b, an explicitly
 * enumerated quality/extension suffix, and an optional slash bass.
 *
 * The suffix vocabulary is spelled out rather than "any letters" so ordinary
 * words that merely start with A-G ("Du", "En", "Det", "Då", "Emellan",
 * "Allt", "Ger", "Musik") can never be mistaken for chords. Covers Am, F, E7,
 * D7, Em7, Cadd9, Asus4, Cmaj7, Bm7b5, G/B and D/F#.
 */
const CHORD_TOKEN =
  "[A-G][#b]?(?:(?:maj|min|dim|aug|sus|add|m|M)\\d*|[#b]\\d+|\\d+)*(?:\\/[A-G][#b]?)?";

/** True when `text` is nothing but chord tokens separated by whitespace. */
const CHORD_SEQUENCE = new RegExp(
  `^[ \\t]*${CHORD_TOKEN}(?:[ \\t]+${CHORD_TOKEN})*[ \\t]*$`
);

/**
 * A standalone capo instruction, e.g. "(capo I)", "capo: 3" or "(Capo V)".
 * Roman numerals and digits are both accepted.
 */
const CAPO_LINE = /^\s*\(?\s*capo\s*:?\s*[IVXLC0-9]+\s*\)?\s*$/i;

/**
 * Annotation keywords that are playing instructions rather than lyrics, so
 * they hide together with the chords. Kept deliberately small: add new styles
 * here when they show up in pasted lyrics.
 */
const ANNOTATION_HEAD =
  /^(capo|mellanspel|intro|outro|solo|stick|brygga|refräng|omkörning|vers|verso|repris|upprepa|repeat|osv|etc)$/i;

/** Repeat markers such as "(x2)", "(2x)" or "(2 ggr)". */
const REPEAT_MARKER = /^(?:\d+\s*[x×]|[x×]\s*\d+|\d+\s*ggr)$/i;

type GroupKind = "chord" | "annotation" | "lyric";
type LineKind = "chord" | "annotation" | "lyric";

/** Classify the content of a parenthesized group. */
function classifyGroup(inner: string): GroupKind {
  const content = inner.trim();
  if (content === "") return "lyric";

  // "(D7)", "(Am G)" – a chord (or chords) in parentheses.
  if (CHORD_SEQUENCE.test(content)) return "chord";

  // "(x2)", "(2x)", "(2 ggr)".
  if (REPEAT_MARKER.test(content)) return "annotation";

  // "mellanspel: Am G" / "intro: D" – a keyword with an optional chord tail.
  const separator = content.indexOf(":");
  const head = (
    separator === -1 ? content : content.slice(0, separator)
  ).trim();
  if (!ANNOTATION_HEAD.test(head)) return "lyric";
  const tail = separator === -1 ? "" : content.slice(separator + 1).trim();
  return tail === "" || CHORD_SEQUENCE.test(tail) ? "annotation" : "lyric";
}

/**
 * Classify a single line. Parenthesized groups are stripped first: a group
 * that is neither a chord nor a known annotation marks the whole line as a
 * lyric (so future parenthesized lyrics always render), and the remaining
 * text must be chords-and-whitespace only for the line to hide with them.
 */
function classifyLine(line: string): LineKind {
  if (CAPO_LINE.test(line)) return "annotation";

  let sawChordGroup = false;
  let sawAnnotationGroup = false;
  let sawLyricGroup = false;

  const stripped = line.replace(/\(([^)]*)\)/g, (_match, inner: string) => {
    const kind = classifyGroup(inner);
    if (kind === "chord") sawChordGroup = true;
    else if (kind === "annotation") sawAnnotationGroup = true;
    else sawLyricGroup = true;
    return " ";
  });

  if (sawLyricGroup) return "lyric";

  const remainder = stripped.trim();
  if (remainder !== "") {
    return CHORD_SEQUENCE.test(remainder) ? "chord" : "lyric";
  }

  // Nothing left but whitespace and parenthesized groups.
  if (sawChordGroup) return "chord";
  if (sawAnnotationGroup) return "annotation";
  return "lyric";
}

/** True when the line consists of chord tokens (and whitespace) only. */
export function isChordLine(line: string): boolean {
  return classifyLine(line) === "chord";
}

/** True when the line is a known chord-related instruction, e.g. "(osv)". */
export function isAnnotationLine(line: string): boolean {
  return classifyLine(line) === "annotation";
}

/** True when the line is a standalone capo instruction, e.g. "(capo I)". */
export function isCapoLine(line: string): boolean {
  return CAPO_LINE.test(line);
}

/**
 * True when the line should be hidden together with the chords: chord lines,
 * capo instructions and other recognized playing annotations.
 */
export function isHiddenWithChords(line: string): boolean {
  return classifyLine(line) !== "lyric";
}

/** True when the song has at least one line the toggle would hide. */
export function hasChordLines(lyrics: string): boolean {
  return lyrics.split("\n").some(isHiddenWithChords);
}

/**
 * The text to render in the detail view. With `includeChords` the stored text
 * is returned untouched; otherwise the chord/instruction lines are dropped and
 * everything else (including blank lines) is joined back together verbatim.
 */
export function filterLyricLines(
  lyrics: string,
  includeChords: boolean
): string {
  if (includeChords) return lyrics;
  return lyrics
    .split("\n")
    .filter((line) => !isHiddenWithChords(line))
    .join("\n");
}
