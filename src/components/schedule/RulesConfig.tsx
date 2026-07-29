import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { type Rules, fromMinutes, toMinutes } from "@/lib/scheduler";

type Props = {
  rules: Rules;
  onChange: (r: Rules) => void;
};

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type="time"
        value={fromMinutes(value)}
        onChange={(e) => {
          try {
            onChange(toMinutes(e.target.value));
          } catch {
            /* ignore */
          }
        }}
      />
    </div>
  );
}

export function RulesConfig({ rules, onChange }: Props) {
  return (
    <Card className="p-4 space-y-4">
      <h3 className="font-serif text-lg">Reglas y preferencias</h3>
      <div className="grid grid-cols-2 gap-3">
        <TimeField
          label="Hora mínima de inicio"
          value={rules.minStart}
          onChange={(v) => onChange({ ...rules, minStart: v })}
        />
        <TimeField
          label="Hora máxima de término"
          value={rules.maxEnd}
          onChange={(v) => onChange({ ...rules, maxEnd: v })}
        />
        <TimeField
          label="Almuerzo desde"
          value={rules.lunchWindowStart}
          onChange={(v) => onChange({ ...rules, lunchWindowStart: v })}
        />
        <TimeField
          label="Almuerzo hasta"
          value={rules.lunchWindowEnd}
          onChange={(v) => onChange({ ...rules, lunchWindowEnd: v })}
        />
        <div>
          <Label className="text-xs">Duración almuerzo (min)</Label>
          <Input
            type="number"
            min={30}
            max={180}
            value={rules.lunchDuration}
            onChange={(e) => onChange({ ...rules, lunchDuration: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="flex items-end gap-2">
          <Switch
            id="min-days"
            checked={rules.minimizeDays}
            onCheckedChange={(v) => onChange({ ...rules, minimizeDays: v })}
          />
          <Label htmlFor="min-days" className="text-sm">
            Minimizar días de asistencia
          </Label>
        </div>
      </div>
    </Card>
  );
}
