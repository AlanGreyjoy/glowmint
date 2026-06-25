import { Input } from './input';
import { Label } from './label';

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  id?: string;
}

export function ColorInput({ label, value, onChange, id }: ColorInputProps) {
  const inputId = id ?? 'color-input';

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          id={inputId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="size-10 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-1"
        />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="font-mono uppercase"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
