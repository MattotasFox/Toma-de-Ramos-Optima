// Schedule optimization engine.
// All times are stored as minutes-since-midnight for arithmetic simplicity.

export type Day = 1 | 2 | 3 | 4 | 5; // Mon..Fri
export const DAY_NAMES: Record<Day, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
};
export const DAYS: Day[] = [1, 2, 3, 4, 5];

export type Block = { day: Day; start: number; end: number };

export type Section = {
  id: string;
  label: string;
  professor?: string;
  blocks: Block[];
};

export type Subject = {
  id: string;
  name: string;
  code?: string;
  sections: Section[];
};

export type Rules = {
  minStart: number; // minutes
  maxEnd: number;
  lunchWindowStart: number;
  lunchWindowEnd: number;
  lunchDuration: number; // min free minutes
  minimizeDays: boolean;
};

export const DEFAULT_RULES: Rules = {
  minStart: 9 * 60 + 30,
  maxEnd: 16 * 60 + 20,
  lunchWindowStart: 12 * 60,
  lunchWindowEnd: 14 * 60 + 40,
  lunchDuration: 90,
  minimizeDays: false,
};

// ----- Time helpers -----
export function toMinutes(hhmm: string): number {
  const m = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) throw new Error(`Hora inválida: "${hhmm}" (use HH:MM)`);
  const h = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) throw new Error(`Hora fuera de rango: ${hhmm}`);
  return h * 60 + mm;
}

export function fromMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Render-safe variant: ignores invalid blocks instead of throwing.
export function safeNormalizeBlocks(blocks: Block[]): Block[] {
  try {
    return normalizeBlocks(blocks.filter((b) => b.end > b.start));
  } catch {
    return [];
  }
}

export function invalidBlockIndexes(blocks: Block[]): number[] {
  return blocks.map((b, i) => (b.end > b.start ? -1 : i)).filter((i) => i >= 0);
}

// Merge contiguous sub-blocks (same day, with gap <= 10 min).
export function normalizeBlocks(blocks: Block[]): Block[] {
  const byDay = new Map<Day, Block[]>();
  for (const b of blocks) {
    if (b.end <= b.start) throw new Error("Un bloque termina antes de empezar");
    const arr = byDay.get(b.day) ?? [];
    arr.push({ ...b });
    byDay.set(b.day, arr);
  }
  const merged: Block[] = [];
  for (const [day, arr] of byDay) {
    arr.sort((a, b) => a.start - b.start);
    let cur = arr[0];
    for (let i = 1; i < arr.length; i++) {
      const next = arr[i];
      // Contiguous or with break <= 10 min => same session
      if (next.start - cur.end <= 10) {
        cur.end = Math.max(cur.end, next.end);
      } else {
        merged.push(cur);
        cur = next;
      }
    }
    merged.push({ ...cur, day });
  }
  return merged;
}

export function blocksOverlap(a: Block, b: Block): boolean {
  return a.day === b.day && a.start < b.end && b.start < a.end;
}

export function sectionsOverlap(a: Section, b: Section): boolean {
  for (const ba of a.blocks) for (const bb of b.blocks) if (blocksOverlap(ba, bb)) return true;
  return false;
}

// ----- Scoring -----

export type RuleReport = {
  rule: string;
  ok: boolean;
  detail?: string;
};

export type Combination = {
  choices: { subjectId: string; sectionId: string }[];
  score: number; // higher is better
  gapMinutes: number;
  daysUsed: number;
  violations: RuleReport[];
  passes: RuleReport[];
};

function dayBlocks(choices: Section[], day: Day): Block[] {
  const bs: Block[] = [];
  for (const s of choices) for (const b of s.blocks) if (b.day === day) bs.push(b);
  bs.sort((a, b) => a.start - b.start);
  return bs;
}

function evaluate(
  subjects: Subject[],
  picked: Section[],
  rules: Rules,
): Combination {
  const violations: RuleReport[] = [];
  const passes: RuleReport[] = [];
  let score = 0;
  let gapMinutes = 0;
  const usedDays = new Set<Day>();

  for (const day of DAYS) {
    const bs = dayBlocks(picked, day);
    if (bs.length === 0) continue;
    usedDays.add(day);
    const first = bs[0];
    const last = bs[bs.length - 1];

    // Min start
    if (first.start >= rules.minStart) {
      score += 2;
      passes.push({ rule: `Inicio ≥ ${fromMinutes(rules.minStart)} (${DAY_NAMES[day]})`, ok: true });
    } else {
      // Which subject/section forces it?
      const culprit = findCulprit(subjects, picked, day, first.start);
      violations.push({
        rule: `Inicio ≥ ${fromMinutes(rules.minStart)} (${DAY_NAMES[day]})`,
        ok: false,
        detail: `${DAY_NAMES[day]} inicia a las ${fromMinutes(first.start)}${culprit ? ` por ${culprit}` : ""}.`,
      });
    }

    // Max end
    if (last.end <= rules.maxEnd) {
      score += 2;
      passes.push({ rule: `Término ≤ ${fromMinutes(rules.maxEnd)} (${DAY_NAMES[day]})`, ok: true });
    } else {
      const culprit = findCulpritEnd(subjects, picked, day, last.end);
      violations.push({
        rule: `Término ≤ ${fromMinutes(rules.maxEnd)} (${DAY_NAMES[day]})`,
        ok: false,
        detail: `${DAY_NAMES[day]} termina a las ${fromMinutes(last.end)}${culprit ? ` por ${culprit}` : ""}.`,
      });
    }

    // Lunch window
    const lunchOk = hasLunchGap(bs, rules);
    if (lunchOk) {
      score += 3;
      passes.push({ rule: `Almuerzo ${rules.lunchDuration}min en ${fromMinutes(rules.lunchWindowStart)}–${fromMinutes(rules.lunchWindowEnd)} (${DAY_NAMES[day]})`, ok: true });
    } else {
      violations.push({
        rule: `Almuerzo ${rules.lunchDuration}min en ${fromMinutes(rules.lunchWindowStart)}–${fromMinutes(rules.lunchWindowEnd)} (${DAY_NAMES[day]})`,
        ok: false,
        detail: `No hay un bloque libre de ${rules.lunchDuration}min completamente dentro de la ventana de almuerzo el ${DAY_NAMES[day]}.`,
      });
    }

    // Gap minutes (dead time between classes)
    for (let i = 1; i < bs.length; i++) {
      const gap = bs[i].start - bs[i - 1].end;
      if (gap > 10) gapMinutes += gap;
    }
  }

  if (rules.minimizeDays) {
    // Reward fewer days used (0..5)
    score += (5 - usedDays.size) * 2;
    if (usedDays.size <= 3) {
      passes.push({ rule: `Minimizar días (${usedDays.size} día(s))`, ok: true });
    } else {
      violations.push({
        rule: `Minimizar días`,
        ok: false,
        detail: `Se usan ${usedDays.size} días.`,
      });
    }
  }

  return {
    choices: picked.map((s, i) => ({ subjectId: subjects[i].id, sectionId: s.id })),
    score,
    gapMinutes,
    daysUsed: usedDays.size,
    violations,
    passes,
  };
}

function hasLunchGap(bs: Block[], rules: Rules): boolean {
  // Free intervals inside the lunch window
  const wStart = rules.lunchWindowStart;
  const wEnd = rules.lunchWindowEnd;
  // Build occupied within window
  const occ: [number, number][] = [];
  for (const b of bs) {
    const s = Math.max(b.start, wStart);
    const e = Math.min(b.end, wEnd);
    if (s < e) occ.push([s, e]);
  }
  occ.sort((a, b) => a[0] - b[0]);
  let cursor = wStart;
  for (const [s, e] of occ) {
    if (s - cursor >= rules.lunchDuration) return true;
    cursor = Math.max(cursor, e);
  }
  if (wEnd - cursor >= rules.lunchDuration) return true;
  return false;
}

function findCulprit(subjects: Subject[], picked: Section[], day: Day, start: number): string | null {
  for (let i = 0; i < picked.length; i++) {
    for (const b of picked[i].blocks) {
      if (b.day === day && b.start === start) return `${subjects[i].name} (${picked[i].label})`;
    }
  }
  return null;
}
function findCulpritEnd(subjects: Subject[], picked: Section[], day: Day, end: number): string | null {
  for (let i = 0; i < picked.length; i++) {
    for (const b of picked[i].blocks) {
      if (b.day === day && b.end === end) return `${subjects[i].name} (${picked[i].label})`;
    }
  }
  return null;
}

// ----- Enumeration with pruning -----

export type SolverResult = {
  combinations: Combination[];
  totalExplored: number;
  infeasibleSubjects: string[]; // subjects with no sections at all
};

export function solve(subjects: Subject[], rules: Rules, topN = 3): SolverResult {
  const infeasible = subjects.filter((s) => s.sections.length === 0).map((s) => s.name);
  if (infeasible.length > 0) {
    return { combinations: [], totalExplored: 0, infeasibleSubjects: infeasible };
  }
  if (subjects.length === 0) return { combinations: [], totalExplored: 0, infeasibleSubjects: [] };

  const results: Combination[] = [];
  let explored = 0;
  const picked: Section[] = [];

  const backtrack = (idx: number) => {
    if (idx === subjects.length) {
      explored++;
      const combo = evaluate(subjects, picked, rules);
      results.push(combo);
      return;
    }
    for (const sec of subjects[idx].sections) {
      // overlap check vs already picked
      let clash = false;
      for (const p of picked) {
        if (sectionsOverlap(p, sec)) {
          clash = true;
          break;
        }
      }
      if (clash) continue;
      picked.push(sec);
      backtrack(idx + 1);
      picked.pop();
    }
  };
  backtrack(0);

  results.sort((a, b) => b.score - a.score || a.gapMinutes - b.gapMinutes || a.daysUsed - b.daysUsed);
  return { combinations: results.slice(0, topN), totalExplored: explored, infeasibleSubjects: [] };
}

// ----- Text import -----
// Format per line: SubjectName | code | SectionLabel | professor | Day HH:MM-HH:MM; Day HH:MM-HH:MM
// e.g. "Cálculo | MAT101 | S1 | Prof. Pérez | Lunes 08:00-11:10; Miércoles 09:40-11:10"
const DAY_ALIASES: Record<string, Day> = {
  lun: 1, lunes: 1, mon: 1, monday: 1,
  mar: 2, martes: 2, tue: 2, tuesday: 2,
  mie: 3, mié: 3, miercoles: 3, miércoles: 3, wed: 3, wednesday: 3,
  jue: 4, jueves: 4, thu: 4, thursday: 4,
  vie: 5, viernes: 5, fri: 5, friday: 5,
};

export function parseDay(s: string): Day {
  const key = s.toLowerCase().trim();
  const d = DAY_ALIASES[key];
  if (!d) throw new Error(`Día inválido: "${s}"`);
  return d;
}

const DAY_WORDS = "lunes|martes|mi[eé]rcoles|jueves|viernes";
const TYPE_WORDS = /(TEOR[ÍI]A|LABORATORIO|LABORATORIOS|LAB|AYUDANT[ÍI]A|PR[ÁA]CTICA|TALLER|C[ÁA]TEDRA)/gi;

// Detects the university copy/paste format:
// "INFB8080 - REDES Y COMUNICACION DE DATOS302TEORIANOMBRE PROFESOR" + líneas de horario
function isUniversityFormat(text: string): boolean {
  return !text.includes("|") && new RegExp(`(${DAY_WORDS})\\s*\\d{1,2}:\\d{2}`, "i").test(text);
}

export function parseUniversityImport(text: string): Subject[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const headerRe = /^([A-Za-zÁÉÍÓÚÑ]{2,}\d[\w-]*)\s*-\s*(.+)$/;

  // Group lines into entries; a new entry starts at a header line.
  const entries: string[][] = [];
  for (const line of lines) {
    if (!line) continue;
    if (headerRe.test(line)) entries.push([line]);
    else if (entries.length > 0) entries[entries.length - 1].push(line);
  }
  if (entries.length === 0) throw new Error("No se detectó ninguna asignatura en el texto pegado.");

  const subjectsMap = new Map<string, Subject>();

  for (const entry of entries) {
    const whole = entry.join("\n");
    const dayRe = new RegExp(`(${DAY_WORDS})`, "i");
    const idx = whole.search(dayRe);
    const headPart = (idx >= 0 ? whole.slice(0, idx) : whole).replace(/\n/g, " ").trim();
    const schedulePart = idx >= 0 ? whole.slice(idx) : "";

    const hm = headPart.match(headerRe);
    if (!hm) continue;
    const code = hm[1].toUpperCase();
    let rest = hm[2];

    // name + section number + type + professor
    const nm = rest.match(/^(.*?)(\d{2,5})(.*)$/);
    let name = rest.trim();
    let sectionLabel = "1";
    let professor = "";
    if (nm) {
      name = nm[1].trim();
      sectionLabel = nm[2];
      professor = nm[3];
    }
    // strip "TEORIA" and similar type words
    name = name.replace(TYPE_WORDS, "").replace(/\s{2,}/g, " ").trim();
    professor = professor.replace(TYPE_WORDS, "").replace(/\s{2,}/g, " ").trim();

    // schedule: day followed by one or more HH:MM - HH:MM separated by "/"
    const rawBlocks: Block[] = [];
    const chunkRe = new RegExp(`(${DAY_WORDS})([^a-zA-ZÁÉÍÓÚÑáéíóú]*)`, "gi");
    let m: RegExpExecArray | null;
    while ((m = chunkRe.exec(schedulePart))) {
      const day = parseDay(m[1]);
      const times = m[2].matchAll(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/g);
      for (const t of times) {
        rawBlocks.push({ day, start: toMinutes(t[1]), end: toMinutes(t[2]) });
      }
    }
    if (rawBlocks.length === 0) continue;

    const key = `${name}::${code}`;
    let subj = subjectsMap.get(key);
    if (!subj) {
      subj = { id: cryptoId(), name: name || code, code, sections: [] };
      subjectsMap.set(key, subj);
    }
    subj.sections.push({
      id: cryptoId(),
      label: sectionLabel,
      professor: professor || undefined,
      blocks: normalizeBlocks(rawBlocks),
    });
  }

  if (subjectsMap.size === 0) throw new Error("No se pudieron leer secciones válidas del texto.");
  return Array.from(subjectsMap.values());
}

// Parses a single section pasted like:
// "301TEORIACRISTIAN ANDRES RODRIGUEZ CORNEJOmartes 8:00 - 8:45 / 8:45 - 9:30 /"
export function parseSectionImport(text: string): Section {
  const whole = text.trim();
  if (!whole) throw new Error("Pega el texto de la sección.");
  const dayRe = new RegExp(`(${DAY_WORDS})`, "i");
  const idx = whole.search(dayRe);
  if (idx < 0) throw new Error("No se detectaron días/horarios en el texto.");
  const headPart = whole.slice(0, idx).replace(/\n/g, " ").trim();
  const schedulePart = whole.slice(idx);

  const hm = headPart.match(/^\D*?(\d{2,5})(.*)$/s);
  const label = hm ? hm[1] : "1";
  let professor = (hm ? hm[2] : headPart) ?? "";
  professor = professor.replace(TYPE_WORDS, "").replace(/\s{2,}/g, " ").trim();

  const rawBlocks: Block[] = [];
  const chunkRe = new RegExp(`(${DAY_WORDS})([^a-zA-ZÁÉÍÓÚÑáéíóú]*)`, "gi");
  let m: RegExpExecArray | null;
  while ((m = chunkRe.exec(schedulePart))) {
    const day = parseDay(m[1]);
    const times = m[2].matchAll(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/g);
    for (const t of times) {
      rawBlocks.push({ day, start: toMinutes(t[1]), end: toMinutes(t[2]) });
    }
  }
  if (rawBlocks.length === 0) throw new Error("No se pudieron leer horarios válidos.");

  return {
    id: cryptoId(),
    label,
    professor: professor || undefined,
    blocks: normalizeBlocks(rawBlocks),
  };
}

export function parseImport(text: string): Subject[] {
  if (isUniversityFormat(text)) return parseUniversityImport(text);

  const subjectsMap = new Map<string, Subject>();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (line.startsWith("#")) continue;
    const parts = line.split("|").map((p) => p.trim());
    if (parts.length < 5) throw new Error(`Línea inválida (necesita 5 campos separados por "|"): ${line}`);
    const [name, code, sectionLabel, professor, schedule] = parts;
    const key = `${name}::${code}`;
    let subj = subjectsMap.get(key);
    if (!subj) {
      subj = { id: cryptoId(), name, code: code || undefined, sections: [] };
      subjectsMap.set(key, subj);
    }
    const rawBlocks: Block[] = [];
    for (const chunk of schedule.split(";").map((c) => c.trim()).filter(Boolean)) {
      const m = chunk.match(/^(\S+)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
      if (!m) throw new Error(`Bloque inválido: "${chunk}" (use "Día HH:MM-HH:MM")`);
      rawBlocks.push({ day: parseDay(m[1]), start: toMinutes(m[2]), end: toMinutes(m[3]) });
    }
    subj.sections.push({
      id: cryptoId(),
      label: sectionLabel,
      professor: professor || undefined,
      blocks: normalizeBlocks(rawBlocks),
    });
  }
  return Array.from(subjectsMap.values());
}

export function cryptoId(): string {
  // biome-ignore lint: fine
  return Math.random().toString(36).slice(2, 10);
}
