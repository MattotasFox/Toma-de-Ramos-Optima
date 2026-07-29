import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Save } from "lucide-react";
import { ScheduleGrid } from "./ScheduleGrid";
import { type Combination, type Subject, fromMinutes } from "@/lib/scheduler";

type Props = {
  subjects: Subject[];
  combinations: Combination[];
  onSave: (name: string, combination: Combination, index: number) => void;
};

export function ResultsView({ subjects, combinations, onSave }: Props) {
  return (
    <div className="space-y-6">
      {combinations.map((c, i) => (
        <CombinationCard
          key={i}
          index={i}
          combination={c}
          subjects={subjects}
          onSave={(name) => onSave(name, c, i)}
        />
      ))}
    </div>
  );
}

function CombinationCard({
  index,
  combination,
  subjects,
  onSave,
}: {
  index: number;
  combination: Combination;
  subjects: Subject[];
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(`Opción ${index + 1}`);
  const gapHours = (combination.gapMinutes / 60).toFixed(1);

  return (
    <Card className="p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-xl">
            Opción {index + 1}
            {index === 0 && (
              <Badge className="ml-2" variant="default">
                Mejor
              </Badge>
            )}
          </h3>
          <p className="text-sm text-muted-foreground">
            Puntaje: <strong>{combination.score}</strong> · Días: {combination.daysUsed} · Huecos:{" "}
            {gapHours}h
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-40"
            placeholder="Nombre"
          />
          <Button onClick={() => onSave(name)} size="sm">
            <Save className="mr-1 size-4" /> Guardar
          </Button>
        </div>
      </div>

      <ScheduleGrid subjects={subjects} combination={combination} />

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-semibold mb-2">Secciones elegidas</h4>
          <ul className="space-y-1 text-sm">
            {combination.choices.map((c, i) => {
              const subj = subjects.find((s) => s.id === c.subjectId)!;
              const sec = subj.sections.find((se) => se.id === c.sectionId)!;
              return (
                <li key={i} className="flex justify-between border-b border-border/50 py-1">
                  <span>
                    <strong>{subj.name}</strong>
                    {subj.code && <span className="text-muted-foreground"> ({subj.code})</span>}
                  </span>
                  <span className="text-muted-foreground">
                    {sec.label}
                    {sec.professor && ` · ${sec.professor}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">Reglas</h4>
          {combination.violations.length === 0 && (
            <p className="text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="size-4" /> Todas las reglas se cumplen.
            </p>
          )}
          {combination.violations.length > 0 && (
            <div className="space-y-1">
              {combination.violations.map((v, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-xs bg-destructive/10 rounded px-2 py-1"
                >
                  <AlertTriangle className="size-3.5 mt-0.5 text-destructive shrink-0" />
                  <div>
                    <div className="font-medium">{v.rule}</div>
                    {v.detail && <div className="text-muted-foreground">{v.detail}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
