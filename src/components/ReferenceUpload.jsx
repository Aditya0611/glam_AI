import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Sparkles, X, Camera } from 'lucide-react';

export default function ReferenceUpload({ onFileSelect, referenceImage }) {
    const fileInputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [preview, setPreview] = useState(null);

    const handleFile = (file) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
            };
            reader.readAsDataURL(file);
            onFileSelect(file);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleClick = () => {
        fileInputRef.current.click();
    };

    const clearReference = (e) => {
        e.stopPropagation();
        setPreview(null);
        onFileSelect(null);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full"
        >
            <div
                className={`relative group cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 min-h-[200px] flex items-center justify-center ${isDragging
                    ? 'border-purple-400 bg-purple-900/10 scale-[1.01]'
                    : preview
                        ? 'border-gold-500/50 bg-black/40'
                        : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
            >
                <AnimatePresence mode="wait">
                    {preview ? (
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="relative w-full h-full flex flex-col items-center p-4"
                        >
                            <img
                                src={preview}
                                alt="Style Reference"
                                className="w-full h-48 object-cover rounded-xl shadow-2xl brightness-90 group-hover:brightness-100 transition-all"
                            />
                            <div className="absolute top-6 right-6">
                                <button
                                    onClick={clearReference}
                                    className="p-1.5 bg-black/60 hover:bg-red-500 text-white rounded-full backdrop-blur-md transition-colors border border-white/20"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-gold-400 uppercase tracking-widest bg-gold-950/30 px-3 py-1.5 rounded-full border border-gold-500/20">
                                <Sparkles size={12} className="text-gold-300" />
                                <span>Style Reference Active</span>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="placeholder"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center py-8 px-6 text-center"
                        >
                            <div className="mb-4 rounded-2xl bg-white/5 p-4 group-hover:bg-purple-600/20 transition-colors">
                                <Camera className="h-8 w-8 text-gray-400 group-hover:text-purple-400" />
                            </div>
                            <h4 className="text-lg font-semibold text-white mb-2">
                                Copy a Look
                            </h4>
                            <p className="text-sm text-gray-400 max-w-[200px]">
                                Upload a photo with makeup you love
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                />
            </div>
        </motion.div>
    );
}
