import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Calendar, Sparkles, Trash2 } from "lucide-react";
import { SubjectsInput } from "@/components/schedule/SubjectsInput";
import { RulesConfig } from "@/components/schedule/RulesConfig";
import { ResultsView } from "@/components/schedule/ResultsView";
import { ScheduleGrid } from "@/components/schedule/ScheduleGrid";
import {
  type Subject,
  type Combination,
  type Rules,
  DEFAULT_RULES,
  solve,
} from "@/lib/scheduler";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Horario Óptimo · Planificador Universitario" },
      {
        name: "description",
        content:
          "Arma tu horario universitario ideal: ingresa asignaturas y secciones, y obtén la mejor combinación sin cruces, con almuerzo y horarios preferidos.",
      },
      { property: "og:title", content: "Horario Óptimo · Planificador Universitario" },
      {
        property: "og:description",
        content:
          "Planificador visual de horarios académicos con motor de optimización y comparación de versiones.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type SavedSchedule = {
  id: string;
  name: string;
  subjects: Subject[];
  combination: Combination;
};

function Index() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rules, setRules] = useState<Rules>(DEFAULT_RULES);
  const [saved, setSaved] = useState<SavedSchedule[]>([]);
  const [compareMode, setCompareMode] = useState(false);

  const result = useMemo(() => {
    if (subjects.length === 0) return null;
    try {
      return solve(subjects, rules, 3);
    } catch (e) {
      toast.error((e as Error).message);
      return null;
    }
  }, [subjects, rules]);

  const canSolve = subjects.length > 0 && subjects.every((s) => s.sections.length > 0);

  const handleSave = (name: string, combination: Combination) => {
    setSaved((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        name: name || `Opción ${prev.length + 1}`,
        subjects: JSON.parse(JSON.stringify(subjects)),
        combination,
      },
    ]);
    toast.success(`Guardado como "${name}"`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-right" />

      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-lg bg-primary text-primary-foreground grid place-items-center shadow-sm">
              <Calendar className="size-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-semibold tracking-tight">
                Horario Óptimo
              </h1>
              <p className="text-xs text-muted-foreground">
                Planificador universitario con motor de optimización
              </p>
            </div>
          </div>
          <Badge variant="outline" className="hidden md:inline-flex">
            {subjects.length} asignatura{subjects.length === 1 ? "" : "s"}
          </Badge>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid lg:grid-cols-[1fr_360px] gap-6">
        <section className="space-y-6">
          <div>
            <h2 className="font-serif text-xl mb-3">1. Asignaturas y secciones</h2>
            <SubjectsInput subjects={subjects} onChange={setSubjects} />
          </div>

          {result && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-xl">2. Mejores combinaciones</h2>
                <Badge variant="secondary" className="text-xs">
                  {result.totalExplored} combinación(es) exploradas
                </Badge>
              </div>

              {result.infeasibleSubjects.length > 0 && (
                <Card className="p-4 mb-4 border-destructive/60 bg-destructive/10">
                  <p className="text-sm">
                    Estas asignaturas no tienen secciones definidas:{" "}
                    <strong>{result.infeasibleSubjects.join(", ")}</strong>. Agrega al menos una
                    sección con horario válido.
                  </p>
                </Card>
              )}

              {canSolve && result.combinations.length === 0 && (
                <Card className="p-4 border-destructive/60 bg-destructive/10">
                  <p className="text-sm">
                    No existe ninguna combinación sin cruces de horario. Revisa tus secciones.
                  </p>
                </Card>
              )}

              {result.combinations.length > 0 && (
                <ResultsView
                  subjects={subjects}
                  combinations={result.combinations}
                  onSave={(name, combo) => handleSave(name, combo)}
                />
              )}
            </div>
          )}

          {saved.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-xl">3. Versiones guardadas</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCompareMode((v) => !v)}
                >
                  {compareMode ? "Vista individual" : "Comparar lado a lado"}
                </Button>
              </div>
              <div
                className={
                  compareMode
                    ? "grid md:grid-cols-2 gap-4"
                    : "space-y-4"
                }
              >
                {saved.map((s) => (
                  <Card key={s.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-serif text-lg">{s.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          Puntaje {s.combination.score} · {s.combination.daysUsed} día(s) ·{" "}
                          {(s.combination.gapMinutes / 60).toFixed(1)}h huecos
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setSaved((prev) => prev.filter((x) => x.id !== s.id))
                        }
                        className="text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <ScheduleGrid subjects={s.subjects} combination={s.combination} />
                  </Card>
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-6 self-start">
          <RulesConfig rules={rules} onChange={setRules} />
          <Card className="p-4 bg-accent/30">
            <div className="flex items-start gap-2">
              <Sparkles className="size-4 mt-0.5 text-primary" />
              <div className="text-xs space-y-1 text-muted-foreground">
                <p className="font-medium text-foreground">Cómo funciona</p>
                <p>
                  El motor explora todas las combinaciones (una sección por asignatura) sin
                  cruces de horario y las puntúa según las reglas.
                </p>
                <p>
                  Si ninguna combinación cumple todas las reglas, verás la mejor posible con las
                  excepciones señaladas.
                </p>
              </div>
            </div>
          </Card>
        </aside>
      </main>

      <footer className="border-t border-border mt-12 py-6">
        <p className="text-center text-xs text-muted-foreground">
          Bloques universitarios de 45min · 10min de receso entre sesiones distintas
        </p>
      </footer>
    </div>
  );
}
