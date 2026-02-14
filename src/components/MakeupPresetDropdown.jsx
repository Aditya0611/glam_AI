import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Sparkles } from 'lucide-react';
import { getPresetOptions } from '../data/makeupPresets';

const MakeupPresetDropdown = ({ selectedPreset, onPresetSelect, disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const presetOptions = getPresetOptions();

    const selectedOption = presetOptions.find(opt => opt.value === selectedPreset);

    return (
        <div className="relative">
            <label className="text-sm font-medium text-gray-300 ml-1 mb-2 block">
                Choose Makeup Style
            </label>

            {/* Dropdown Button */}
            <button
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-left flex items-center justify-between hover:border-glam-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <div className="flex items-center gap-3">
                    {selectedOption ? (
                        <>
                            <span className="text-2xl">{selectedOption.icon}</span>
                            <div>
                                <div className="text-white font-medium">{selectedOption.label}</div>
                                <div className="text-xs text-gray-400">{selectedOption.description}</div>
                            </div>
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-5 h-5 text-glam-500" />
                            <div>
                                <div className="text-gray-400">Select a makeup preset...</div>
                            </div>
                        </>
                    )}
                </div>
                <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 w-full mt-2 bg-black/95 border border-white/10 rounded-xl shadow-2xl shadow-black/50 backdrop-blur-xl overflow-hidden"
                    >
                        <div className="max-h-96 overflow-y-auto custom-scrollbar">
                            {presetOptions.map((option, index) => (
                                <motion.button
                                    key={option.value}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    onClick={() => {
                                        onPresetSelect(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full p-4 text-left flex items-center gap-3 hover:bg-glam-500/20 transition-all border-b border-white/5 last:border-b-0 ${selectedPreset === option.value ? 'bg-glam-500/10' : ''
                                        }`}
                                >
                                    <span className="text-2xl">{option.icon}</span>
                                    <div className="flex-1">
                                        <div className="text-white font-medium flex items-center gap-2">
                                            {option.label}
                                            {selectedPreset === option.value && (
                                                <span className="text-xs bg-glam-500/30 text-glam-200 px-2 py-0.5 rounded-full">
                                                    Selected
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-0.5">{option.description}</div>
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Click outside to close */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
};

export default MakeupPresetDropdown;
