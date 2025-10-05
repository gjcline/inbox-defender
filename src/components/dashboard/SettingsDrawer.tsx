import { X } from 'lucide-react';
import { Strictness, DigestFrequency } from '../../hooks/useStrictness';
import { StrictnessSelector } from './StrictnessSelector';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  strictness: Strictness;
  onStrictnessChange: (value: Strictness) => void;
  digestFrequency: DigestFrequency;
  onDigestFrequencyChange: (value: DigestFrequency) => void;
  helperText: string;
  onSave: () => void;
}

export const SettingsDrawer = ({
  isOpen,
  onClose,
  strictness,
  onStrictnessChange,
  digestFrequency,
  onDigestFrequencyChange,
  helperText,
  onSave,
}: SettingsDrawerProps) => {
  if (!isOpen) return null;

  const handleSave = () => {
    onSave();
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-zinc-950 border-l border-zinc-800 z-50 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Settings</h2>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-3">
                Filter Strictness
              </label>
              <StrictnessSelector
                value={strictness}
                onChange={onStrictnessChange}
                helperText={helperText}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-3">
                Digest Frequency
              </label>
              <div className="inline-flex rounded-xl bg-zinc-900 p-1 border border-zinc-800">
                <button
                  onClick={() => onDigestFrequencyChange('weekly')}
                  className={`
                    px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${
                      digestFrequency === 'weekly'
                        ? 'bg-zinc-800 text-white shadow-lg'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }
                  `}
                >
                  Weekly
                </button>
                <button
                  onClick={() => onDigestFrequencyChange('monthly')}
                  className={`
                    px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${
                      digestFrequency === 'monthly'
                        ? 'bg-zinc-800 text-white shadow-lg'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }
                  `}
                >
                  Monthly
                </button>
              </div>
              <p className="text-sm text-zinc-400 mt-2">
                How often you'll receive summaries of blocked emails
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-3">
                Retention Period
              </label>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">14 days</span>
                  <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                    Fixed
                  </span>
                </div>
                <p className="text-sm text-zinc-400 mt-2">
                  Blocked emails are kept for 14 days before permanent deletion
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <button
                onClick={handleSave}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-xl transition-colors"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
