import { useCountdown } from '@/hooks/useCountdown';

interface CountdownTimerProps {
  targetDate: Date;
}

export default function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const { days, hours, minutes, seconds } = useCountdown(targetDate);

  const timeUnits = [
    { label: 'Days', value: days },
    { label: 'Hours', value: hours },
    { label: 'Minutes', value: minutes },
    { label: 'Seconds', value: seconds },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-4 md:gap-8">
      {timeUnits.map(({ label, value }) => (
        <div key={label} className="text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/20 shadow-xl">
            <div className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-2 font-mono tabular-nums">
              {value.toString().padStart(2, '0')}
            </div>
            <div className="text-sm md:text-base text-blue-200 uppercase tracking-wider font-medium">
              {label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}