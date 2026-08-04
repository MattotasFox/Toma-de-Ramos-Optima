import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, GraduationCap, Clock, Upload, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  type Subject,
  type Section,
  type Block,
  type Day,
  DAY_NAMES,
  DAYS,
  cryptoId,
  toMinutes,
  fromMinutes,
  normalizeBlocks,
  safeNormalizeBlocks,
  invalidBlockIndexes,
  parseImport,
  parseSectionImport,
} from "@/lib/scheduler";

type Props = {
  subjects: Subject[];
  onChange: (s: Subject[]) => void;
};

export function SubjectsInput({ subjects, onChange }: Props) {
  const [importText, setImportText] = useState("");
  // Persisted across tab switches (the Tabs component unmounts inactive content,
  // so collapse state must live here, above the tabs, keyed by subject id).
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});
  const toggleCollapse = (id: string) =>
    setCollapsedMap((m) => ({ ...m, [id]: !m[id] }));

  const addSubject = () => {
    onChange([...subjects, { id: cryptoId(), name: "Nueva asignatura", code: "", sections: [] }]);
  };
  const removeSubject = (id: string) => {
    onChange(subjects.filter((s) => s.id !== id));
    setCollapsedMap((m) => {
      if (!(id in m)) return m;
      const next = { ...m };
      delete next[id];
      return next;
    });
  };
  const updateSubject = (id: string, patch: Partial<Subject>) =>
    onChange(subjects.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const handleImport = () => {
    try {
      const parsed = parseImport(importText);
      onChange([...subjects, ...parsed]);
      setImportText("");
      toast.success(`Importadas ${parsed.length} asignatura(s).`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Tabs defaultValue="form" className="w-full">
      <TabsList>
        <TabsTrigger value="form">Formulario</TabsTrigger>
        <TabsTrigger value="import">Importar texto</TabsTrigger>
      </TabsList>
      <TabsContent value="form" className="space-y-4 mt-4">
        {subjects.length === 0 && (
          <Card className="p-8 text-center border-dashed">
            <GraduationCap className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Aún no has agregado asignaturas.</p>
          </Card>
        )}
        {subjects.map((subject) => (
          <SubjectCard
            key={subject.id}
            subject={subject}
            collapsed={!!collapsedMap[subject.id]}
            onToggleCollapse={() => toggleCollapse(subject.id)}
            onRemove={() => removeSubject(subject.id)}
            onUpdate={(patch) => updateSubject(subject.id, patch)}
          />
        ))}
        <Button onClick={addSubject} variant="secondary" className="w-full">
          <Plus className="mr-2 size-4" /> Agregar asignatura
        </Button>
      </TabsContent>
      <TabsContent value="import" className="space-y-3 mt-4">
        <p className="text-sm text-muted-foreground">
          Pega el texto tal cual desde el sistema de tu universidad (se detecta automáticamente y
          se elimina "TEORIA"), o usa el formato con barras:{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">
            Nombre | Código | Sección | Profesor | Día HH:MM-HH:MM; Día HH:MM-HH:MM
          </code>
        </p>
        <Textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={8}
          placeholder={`INFB8080 - REDES Y COMUNICACION DE DATOS302TEORIACRISTIAN ANDRES RODRIGUEZ CORNEJOmartes 9:40 - 10:25 / 10:25 - 11:10 /\njueves 9:40 - 10:25 / 10:25 - 11:10 /\nviernes 9:40 - 10:25 / 10:25 - 11:10 /`}
          className="font-mono text-sm"
        />

        <Button onClick={handleImport} disabled={!importText.trim()}>
          Importar
        </Button>
      </TabsContent>
    </Tabs>
  );
}

function SubjectCard({
  subject,
  collapsed,
  onToggleCollapse,
  onRemove,
  onUpdate,
}: {
  subject: Subject;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onRemove: () => void;
  onUpdate: (patch: Partial<Subject>) => void;
}) {
  const [showImport, setShowImport] = useState(false);
  const [sectionText, setSectionText] = useState("");

  const importSection = () => {
    try {
      const sec = parseSectionImport(sectionText);
      onUpdate({ sections: [...subject.sections, sec] });
      setSectionText("");
      setShowImport(false);
      toast.success(`Sección ${sec.label} agregada.`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const addSection = () => {
    onUpdate({
      sections: [
        ...subject.sections,
        { id: cryptoId(), label: `S${subject.sections.length + 1}`, professor: "", blocks: [] },
      ],
    });
  };
  const removeSection = (id: string) =>
    onUpdate({ sections: subject.sections.filter((s) => s.id !== id) });
  const updateSection = (id: string, patch: Partial<Section>) =>
    onUpdate({
      sections: subject.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });

  return (
    <Card className="p-4 space-y-3 border-l-4 border-l-primary">
      <div className="flex gap-2 items-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Maximizar asignatura" : "Minimizar asignatura"}
          title={collapsed ? "Maximizar" : "Minimizar"}
          className="shrink-0"
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
        {collapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="flex-1 min-w-0 text-left pb-2"
          >
            <div className="truncate font-medium text-sm">
              {subject.name || "Sin nombre"}
              {subject.code ? (
                <span className="text-muted-foreground font-normal"> · {subject.code}</span>
              ) : null}
            </div>
            <div className="text-xs text-muted-foreground">
              {subject.sections.length} sección(es)
            </div>
          </button>
        ) : (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Asignatura</Label>
              <Input
                value={subject.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="Ej: Cálculo"
              />
            </div>
            <div>
              <Label className="text-xs">Código (opcional)</Label>
              <Input
                value={subject.code ?? ""}
                onChange={(e) => onUpdate({ code: e.target.value })}
                placeholder="MAT101"
              />
            </div>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={onRemove} className="text-destructive">
          <Trash2 className="size-4" />
        </Button>
      </div>

      {!collapsed && (
      <div className="space-y-2 pl-2 border-l-2 border-muted">

        {subject.sections.map((sec) => (
          <SectionEditor
            key={sec.id}
            section={sec}
            onRemove={() => removeSection(sec.id)}
            onUpdate={(patch) => updateSection(sec.id, patch)}
          />
        ))}
        <div className="flex flex-wrap gap-2 items-center">
          <Button variant="ghost" size="sm" onClick={addSection}>
            <Plus className="mr-1 size-3" /> Agregar sección
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowImport((v) => !v)}>
            <Upload className="mr-1 size-3" /> Importar sección
          </Button>
        </div>
        {showImport && (
          <div className="space-y-2 rounded-md bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">
              Pega el texto de la sección tal cual (se elimina "TEORIA"):{" "}
              <code className="text-xs">301TEORIANOMBRE PROFESORmartes 8:00 - 8:45 / ...</code>
            </p>
            <Textarea
              value={sectionText}
              onChange={(e) => setSectionText(e.target.value)}
              rows={4}
              className="font-mono text-sm"
              placeholder={`301TEORIACRISTIAN ANDRES RODRIGUEZ CORNEJOmartes 8:00 - 8:45 / 8:45 - 9:30 /\njueves 8:00 - 8:45 / 8:45 - 9:30 /`}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={importSection} disabled={!sectionText.trim()}>
                Importar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowImport(false);
                  setSectionText("");
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
      )}
    </Card>
  );
}

function SectionEditor({
  section,
  onRemove,
  onUpdate,
}: {
  section: Section;
  onRemove: () => void;
  onUpdate: (patch: Partial<Section>) => void;
}) {
  const addBlock = () => {
    onUpdate({
      blocks: [...section.blocks, { day: 1, start: 9 * 60 + 40, end: 11 * 60 + 10 }],
    });
  };
  const removeBlock = (idx: number) =>
    onUpdate({ blocks: section.blocks.filter((_, i) => i !== idx) });
  const updateBlock = (idx: number, patch: Partial<Block>) => {
    onUpdate({
      blocks: section.blocks.map((b, i) => (i === idx ? { ...b, ...patch } : b)),
    });
  };
  const invalidBlocks = invalidBlockIndexes(section.blocks);
  const fuseBlocks = () => {
    try {
      onUpdate({ blocks: normalizeBlocks(section.blocks) });
      toast.success("Bloques contiguos fusionados.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="rounded-md bg-muted/40 p-3 space-y-2">
      <div className="flex gap-2 items-end">
        <div className="flex-1 grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Sección</Label>
            <Input
              value={section.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              placeholder="S1"
            />
          </div>
          <div>
            <Label className="text-xs">Profesor</Label>
            <Input
              value={section.professor ?? ""}
              onChange={(e) => onUpdate({ professor: e.target.value })}
              placeholder="Opcional"
            />
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onRemove} className="text-destructive">
          <Trash2 className="size-4" />
        </Button>
      </div>
      <div className="space-y-1">
        {section.blocks.map((b, i) => (
          <BlockRow
            key={i}
            block={b}
            invalid={invalidBlocks.includes(i)}
            onUpdate={(patch) => updateBlock(i, patch)}
            onRemove={() => removeBlock(i)}
          />
        ))}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addBlock}>
            <Plus className="mr-1 size-3" /> Bloque
          </Button>
          {section.blocks.length > 1 && (
            <Button variant="outline" size="sm" onClick={fuseBlocks}>
              <Clock className="mr-1 size-3" /> Fusionar contiguos
            </Button>
          )}
        </div>
        {invalidBlocks.length > 0 && (
          <p className="text-xs text-destructive pt-1">
            Revisa los bloques marcados: la hora de término debe ser posterior a la de inicio.
          </p>
        )}
        {section.blocks.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {safeNormalizeBlocks(section.blocks).map((b, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {DAY_NAMES[b.day]} {fromMinutes(b.start)}–{fromMinutes(b.end)}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BlockRow({
  block,
  invalid,
  onUpdate,
  onRemove,
}: {
  block: Block;
  invalid?: boolean;
  onUpdate: (patch: Partial<Block>) => void;
  onRemove: () => void;
}) {
  const [startStr, setStartStr] = useState(fromMinutes(block.start));
  const [endStr, setEndStr] = useState(fromMinutes(block.end));

  const commit = (kind: "start" | "end", value: string) => {
    try {
      const m = toMinutes(value);
      onUpdate(kind === "start" ? { start: m } : { end: m });
    } catch {
      // ignore; keeps last valid
    }
  };

  return (
    <div
      className={
        invalid
          ? "flex gap-1 items-center rounded-md ring-1 ring-destructive/60 px-1"
          : "flex gap-1 items-center"
      }
    >
      <Select value={String(block.day)} onValueChange={(v) => onUpdate({ day: Number(v) as Day })}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DAYS.map((d) => (
            <SelectItem key={d} value={String(d)}>
              {DAY_NAMES[d]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="time"
        value={startStr}
        onChange={(e) => setStartStr(e.target.value)}
        onBlur={(e) => commit("start", e.target.value)}
        className="w-28"
      />
      <span className="text-muted-foreground">–</span>
      <Input
        type="time"
        value={endStr}
        onChange={(e) => setEndStr(e.target.value)}
        onBlur={(e) => commit("end", e.target.value)}
        className="w-28"
      />
      <Button variant="ghost" size="icon" onClick={onRemove} className="text-destructive">
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
