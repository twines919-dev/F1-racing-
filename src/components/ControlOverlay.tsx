import React from 'react';
import { CameraViewMode } from '../types/game';
import { Camera, Volume2, VolumeX, Pause, Play, RotateCcw, ChevronDown, ChevronUp, Sliders, Radio, Sparkles } from 'lucide-react';

interface ControlOverlayProps {
  cameraMode: CameraViewMode;
  onSetCameraMode: (mode: CameraViewMode) => void;
  isPaused: boolean;
  onTogglePause: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isManualShift: boolean;
  onToggleManualShift: () => void;
  isRadioVoiceEnabled?: boolean;
  onToggleRadioVoice?: () => void;
  onRestart: () => void;
}

export const ControlOverlay: React.FC<ControlOverlayProps> = ({
  cameraMode,
  onSetCameraMode,
  isPaused,
  onTogglePause,
  isMuted,
  onToggleMute,
  isManualShift,
  onToggleManualShift,
  isRadioVoiceEnabled = true,
  onToggleRadioVoice,
  onRestart,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(false);
  const [isUltraFx, setIsUltraFx] = React.useState<boolean>(true);

  // Keyboard shortcut 'H' to toggle HUD / Zen mode
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        setIsCollapsed(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto z-40 transition-transform duration-300 select-none font-['Chakra_Petch',sans-serif]">
      {/* Collapse / Expand Toggle Button on top edge of dock */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="bg-[#0b0e14] border border-[#1f2838] border-b-0 text-[#94a3b8] hover:text-white px-3 py-1 rounded-t-lg text-[10px] uppercase font-bold flex items-center gap-1 shadow-md transition-colors cursor-pointer"
        title="Toggle Dock (H)"
      >
        {isCollapsed ? <ChevronUp className="w-3.5 h-3.5 text-[#00D2BE]" /> : <ChevronDown className="w-3.5 h-3.5" />}
        <span>{isCollapsed ? 'SHOW DOCK (H)' : 'HIDE DOCK (H)'}</span>
      </button>

      {/* Dock Container */}
      <div
        className={`bg-[#0b0e14]/95 border border-[#1f2838] px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-4 transition-all duration-300 max-w-[94vw] ${
          isCollapsed ? 'translate-y-24 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
        }`}
      >
        {/* Camera Selector Pills */}
        <div className="flex items-center gap-1 border-r border-[#1f2838] pr-3">
          <Camera className="w-3.5 h-3.5 text-[#7d8b9e] mr-1" />
          {(['CHASE', 'COCKPIT', 'NOSE', 'BROADCAST'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onSetCameraMode(mode)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                cameraMode === mode
                  ? 'bg-[#00D2BE] text-black shadow-[0_0_8px_rgba(0,210,190,0.4)]'
                  : 'text-[#94a3b8] hover:text-white hover:bg-[#161e2c]'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Transmission Switcher: Auto vs Manual */}
        <button
          onClick={onToggleManualShift}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#141b27] border border-[#222e42] hover:border-[#334664] text-xs font-bold text-white transition-colors cursor-pointer"
          title="Toggle Transmission Mode"
        >
          <Sliders className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span>{isManualShift ? 'MANUAL PADDLE' : 'AUTO GEARS'}</span>
        </button>

        {/* Graphic & Sound Quality Indicator */}
        <button
          onClick={() => setIsUltraFx(prev => !prev)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141b27] border border-[#222e42] hover:border-[#00D2BE] text-xs font-bold text-white transition-colors cursor-pointer"
          title="Titanium Sparks, Warp Streaks, 3D Ingress Portal, & V6 Hybrid Audio"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isUltraFx ? 'text-[#00D2BE]' : 'text-[#94a3b8]'}`} />
          <span className="text-[11px]">{isUltraFx ? 'FX: ULTRA' : 'FX: HIGH'}</span>
        </button>

        {/* Radio Engineer Voice Toggle */}
        {onToggleRadioVoice && (
          <button
            onClick={onToggleRadioVoice}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isRadioVoiceEnabled
                ? 'bg-[#141b27] border-[#00D2BE] text-[#00D2BE]'
                : 'bg-[#141b27] border-[#222e42] text-[#64748b]'
            }`}
            title="Toggle Race Engineer Voice Comms"
          >
            <Radio className="w-4 h-4" />
          </button>
        )}

        {/* Mute Toggle */}
        <button
          onClick={onToggleMute}
          className="p-1.5 rounded-lg bg-[#141b27] border border-[#222e42] hover:bg-[#1e2838] text-white transition-colors cursor-pointer"
          title="Toggle Audio"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-[#00D2BE]" />}
        </button>

        {/* Pause / Resume */}
        <button
          onClick={onTogglePause}
          className="p-1.5 rounded-lg bg-[#141b27] border border-[#222e42] hover:bg-[#1e2838] text-white transition-colors cursor-pointer"
          title="Pause / Resume (Esc)"
        >
          {isPaused ? <Play className="w-4 h-4 text-[#10B981]" /> : <Pause className="w-4 h-4 text-[#94a3b8]" />}
        </button>

        {/* Quick Restart */}
        <button
          onClick={onRestart}
          className="p-1.5 rounded-lg bg-[#141b27] border border-[#222e42] hover:bg-[#1e2838] text-white transition-colors cursor-pointer"
          title="Restart Race"
        >
          <RotateCcw className="w-4 h-4 text-[#94a3b8]" />
        </button>
      </div>
    </div>
  );
};
