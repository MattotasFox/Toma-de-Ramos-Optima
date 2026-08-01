import { DAYS, DAY_NAMES, fromMinutes, type Combination, type Subject } from "@/lib/scheduler";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  subjects: Subject[];
  combination: Combination;
};

// Bloques oficiales de la universidad: 90 min de clase + 10 min de receso.
const BLOCK_LENGTH = 90;
const BLOCK_BREAK = 10;
const FIRST_BLOCK_START = 8 * 60; // 08:00
const TOTAL_BLOCKS = 8; // 08:00 → 21:10

const UNIVERSITY_BLOCKS = Array.from({ length: TOTAL_BLOCKS }, (_, i) => {
  const start = FIRST_BLOCK_START + i * (BLOCK_LENGTH + BLOCK_BREAK);
  return { index: i + 1, start, end: start + BLOCK_LENGTH };
});

// Build the timeline range from all blocks in the combination.
export function ScheduleGrid({ subjects, combination }: Props) {
  const picked = combination.choices.map((c) => {
    const subj = subjects.find((s) => s.id === c.subjectId)!;
    const sec = subj.sections.find((se) => se.id === c.sectionId)!;
    return { subj, sec };
  });

  const allBlocks = picked.flatMap(({ subj, sec }) =>
    sec.blocks.map((b) => ({ ...b, subj, sec })),
  );
  if (allBlocks.length === 0) return null;

  const minStart = Math.min(...allBlocks.map((b) => b.start));
  const maxEnd = Math.max(...allBlocks.map((b) => b.end));
  const slots = UNIVERSITY_BLOCKS.filter((s) => s.end > minStart && s.start < maxEnd);

  // Map each violation to the specific block(s) that break the rule.
  const blockViolations = new Map<string, string[]>();
  const keyOf = (b: { day: number; start: number; end: number }) =>
    `${b.day}|${b.start}|${b.end}`;
  const addMsg = (b: { day: number; start: number; end: number }, msg: string) => {
    const k = keyOf(b);
    const list = blockViolations.get(k) ?? [];
    if (!list.includes(msg)) list.push(msg);
    blockViolations.set(k, list);
  };

  for (const v of combination.violations) {
    const day = DAYS.find((d) => v.rule.includes(DAY_NAMES[d]));
    if (!day) continue;
    const dayBlocks = allBlocks.filter((b) => b.day === day);
    if (dayBlocks.length === 0) continue;
    const times = [...v.rule.matchAll(/(\d{1,2}):(\d{2})/g)].map(
      (m) => parseInt(m[1], 10) * 60 + parseInt(m[2], 10),
    );
    const msg = v.detail ?? v.rule;

    if (/^Inicio/i.test(v.rule) && times.length >= 1) {
      for (const b of dayBlocks) if (b.start < times[0]) addMsg(b, msg);
    } else if (/^T[eé]rmino/i.test(v.rule) && times.length >= 1) {
      for (const b of dayBlocks) if (b.end > times[0]) addMsg(b, msg);
    } else if (/^Almuerzo/i.test(v.rule) && times.length >= 3) {
      // times[0] is the duration's minutes value pattern-free; window = last two times
      const wStart = times[times.length - 2];
      const wEnd = times[times.length - 1];
      for (const b of dayBlocks) if (b.start < wEnd && b.end > wStart) addMsg(b, msg);
    } else {
      for (const b of dayBlocks) addMsg(b, msg);
    }
  }

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <div
          className="grid gap-1 min-w-[720px]"
          style={{ gridTemplateColumns: "110px repeat(5, 1fr)" }}
        >
          <div />
          {DAYS.map((d) => (
            <div key={d} className="text-center font-serif text-sm font-semibold py-2">
              {DAY_NAMES[d]}
            </div>
          ))}
          {slots.map((slot) => (
            <SlotRow
              key={slot.index}
              slot={slot}
              blocks={allBlocks}
              blockViolations={blockViolations}
            />
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}

function SlotRow({
  slot,
  blocks,
  blockViolations,
}: {
  slot: { index: number; start: number; end: number };
  blocks: Array<{ day: number; start: number; end: number; subj: Subject; sec: any }>;
  blockViolations: Map<string, string[]>;
}) {
  return (
    <>
      <div className="text-xs text-muted-foreground text-right pr-2 pt-1 leading-tight">
        <div className="font-medium">{`${fromMinutes(slot.start)}–${fromMinutes(slot.end)}`}</div>
        <div className="text-[10px] opacity-70">{`Bloque ${slot.index}`}</div>
      </div>
      {DAYS.map((d) => {
        const inBlock = blocks.find(
          (b) => b.day === d && b.start < slot.end && b.end > slot.start,
        );
        if (!inBlock) {
          return <div key={d} className="min-h-12 border-t border-border/40" />;
        }
        // Only render label at the first slot of the block to avoid duplication
        const isFirst = inBlock.start < slot.end && inBlock.start >= slot.start;
        const messages = blockViolations.get(`${inBlock.day}|${inBlock.start}|${inBlock.end}`);
        const violated = !!messages?.length;

        const cls = violated
          ? "bg-destructive/15 border-destructive/60 text-destructive-foreground"
          : "bg-primary/10 border-primary/60";
        return (
          <div
            key={d}
            className={`min-h-12 border-t border-l-4 rounded-r-md px-2 py-1 text-xs ${cls}`}
          >
            {isFirst && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <div className="font-semibold leading-tight">{inBlock.subj.name}</div>
                    <div className="text-[10px] opacity-80">
                      {inBlock.sec.label} · {fromMinutes(inBlock.start)}–{fromMinutes(inBlock.end)}
                    </div>
                    {inBlock.sec.professor && (
                      <div className="text-[10px] opacity-70">{inBlock.sec.professor}</div>
                    )}
                  </div>
                </TooltipTrigger>
                {violated && (
                  <TooltipContent>
                    <div className="max-w-xs whitespace-pre-line text-xs">
                      {messages!.join("\n")}
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            )}
          </div>
        );
      })}
    </>
  );
}

