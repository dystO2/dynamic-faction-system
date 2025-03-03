import { Slider as SliderComponent } from "~/components/ui/slider";

interface SliderProps {
  label: string;
  value: number;
  setValue: (value: number) => void;
}

const Slider = ({ label, value, setValue }: SliderProps) => {
  return (
    <div className="grid w-full grid-cols-3 gap-2">
      <p className="text-sm font-medium">{label}</p>
      <SliderComponent
        value={[value]}
        onValueChange={(value) => setValue(value[0]!)}
        className="w-20"
        min={1}
        max={3}
        step={1}
      />
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
};

export default Slider;
