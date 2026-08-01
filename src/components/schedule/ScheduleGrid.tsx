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


  // Violation days: build set from violation detail hints
  const violationDetails = new Map<string, string>();
  for (const v of combination.violations) {
    for (const day of DAYS) {
      if (v.rule.includes(DAY_NAMES[day])) {
        const existing = violationDetails.get(`${day}`) ?? "";
        violationDetails.set(`${day}`, existing + (existing ? "\n" : "") + (v.detail ?? v.rule));
      }
    }
  }

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <div
          className="grid gap-1 min-w-[720px]"
          style={{ gridTemplateColumns: "80px repeat(5, 1fr)" }}
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
              violationDetails={violationDetails}
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
  violationDetails,
}: {
  slot: { index: number; start: number; end: number };
  blocks: Array<{ day: number; start: number; end: number; subj: Subject; sec: any }>;
  violationDetails: Map<string, string>;
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
        const violated = violationDetails.has(`${d}`);

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
                      {violationDetails.get(`${d}`)}
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
