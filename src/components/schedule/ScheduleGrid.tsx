import { DAYS, DAY_NAMES, fromMinutes, type Combination, type Subject } from "@/lib/scheduler";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  subjects: Subject[];
  combination: Combination;
};

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
  const rowStart = Math.floor(minStart / 45) * 45;
  const rowEnd = Math.ceil(maxEnd / 45) * 45;
  const slots: number[] = [];
  for (let t = rowStart; t < rowEnd; t += 45) slots.push(t);

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
              key={slot}
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
  slot: number;
  blocks: Array<{ day: number; start: number; end: number; subj: Subject; sec: any }>;
  violationDetails: Map<string, string>;
}) {
  const slotEnd = slot + 45;
  return (
    <>
      <div className="text-xs text-muted-foreground text-right pr-2 pt-1">{fromMinutes(slot)}</div>
      {DAYS.map((d) => {
        const inBlock = blocks.find(
          (b) => b.day === d && b.start < slotEnd && b.end > slot,
        );
        if (!inBlock) {
          return <div key={d} className="min-h-12 border-t border-border/40" />;
        }
        // Only render label at the first slot of the block to avoid duplication
        const isFirst = inBlock.start >= slot && inBlock.start < slotEnd;
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
