import React from 'react';
import { InputState } from '../types/game';
import { ArrowLeft, ArrowRight, Zap, Wind } from 'lucide-react';

interface TouchControlsProps {
  inputState: React.MutableRefObject<InputState>;
}

export const TouchControls: React.FC<TouchControlsProps> = ({ inputState }) => {
  const [isTouchDevice, setIsTouchDevice] = React.useState(false);

  React.useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  if (!isTouchDevice) return null;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-30 font-['Chakra_Petch',sans-serif]">
      {/* Left Steering Pad */}
      <div className="absolute bottom-28 left-6 flex items-center gap-3 pointer-events-auto">
        <button
          onTouchStart={() => (inputState.current.steerLeft = true)}
          onTouchEnd={() => (inputState.current.steerLeft = false)}
          onMouseDown={() => (inputState.current.steerLeft = true)}
          onMouseUp={() => (inputState.current.steerLeft = false)}
          className="w-16 h-16 rounded-2xl bg-[#0c1017]/80 border-2 border-[#1f293b] active:bg-[#00D2BE]/30 active:border-[#00D2BE] flex items-center justify-center text-white shadow-xl touch-none"
        >
          <ArrowLeft className="w-8 h-8" />
        </button>

        <button
          onTouchStart={() => (inputState.current.steerRight = true)}
          onTouchEnd={() => (inputState.current.steerRight = false)}
          onMouseDown={() => (inputState.current.steerRight = true)}
          onMouseUp={() => (inputState.current.steerRight = false)}
          className="w-16 h-16 rounded-2xl bg-[#0c1017]/80 border-2 border-[#1f293b] active:bg-[#00D2BE]/30 active:border-[#00D2BE] flex items-center justify-center text-white shadow-xl touch-none"
        >
          <ArrowRight className="w-8 h-8" />
        </button>
      </div>

      {/* Right Pedals & Boost */}
      <div className="absolute bottom-28 right-6 flex items-end gap-3 pointer-events-auto">
        {/* DRS & ERS Boost buttons */}
        <div className="flex flex-col gap-2">
          <button
            onTouchStart={() => (inputState.current.drs = true)}
            onTouchEnd={() => (inputState.current.drs = false)}
            onMouseDown={() => (inputState.current.drs = true)}
            onMouseUp={() => (inputState.current.drs = false)}
            className="w-14 h-12 rounded-xl bg-[#0c1017]/80 border border-[#1f293b] active:bg-[#10B981]/30 active:border-[#10B981] flex items-center justify-center text-[#10B981] text-xs font-bold shadow-lg touch-none"
          >
            <Wind className="w-4 h-4 mr-1" /> DRS
          </button>

          <button
            onTouchStart={() => (inputState.current.ers = true)}
            onTouchEnd={() => (inputState.current.ers = false)}
            onMouseDown={() => (inputState.current.ers = true)}
            onMouseUp={() => (inputState.current.ers = false)}
            className="w-14 h-12 rounded-xl bg-[#0c1017]/80 border border-[#1f293b] active:bg-[#38BDF8]/30 active:border-[#38BDF8] flex items-center justify-center text-[#38BDF8] text-xs font-bold shadow-lg touch-none"
          >
            <Zap className="w-4 h-4 mr-1" /> ERS
          </button>
        </div>

        {/* Brake Pedal */}
        <button
          onTouchStart={() => (inputState.current.brake = true)}
          onTouchEnd={() => (inputState.current.brake = false)}
          onMouseDown={() => (inputState.current.brake = true)}
          onMouseUp={() => (inputState.current.brake = false)}
          className="w-16 h-20 rounded-2xl bg-[#EF4444]/20 border-2 border-[#EF4444] active:bg-[#EF4444]/60 flex flex-col items-center justify-center text-white font-bold text-xs shadow-xl touch-none"
        >
          <span>BRAKE</span>
        </button>

        {/* Throttle Pedal */}
        <button
          onTouchStart={() => (inputState.current.throttle = true)}
          onTouchEnd={() => (inputState.current.throttle = false)}
          onMouseDown={() => (inputState.current.throttle = true)}
          onMouseUp={() => (inputState.current.throttle = false)}
          className="w-18 h-24 rounded-2xl bg-[#10B981]/25 border-2 border-[#10B981] active:bg-[#10B981]/70 flex flex-col items-center justify-center text-white font-bold text-sm shadow-xl touch-none"
        >
          <span>GAS</span>
        </button>
      </div>
    </div>
  );
};
