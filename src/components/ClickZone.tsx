import React, { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Trees, BrickWall } from 'lucide-react';
import { CONSTRUCTION_STAGES } from '@/types';

// Visual representation for each stage
const StageVisual = ({ stage }: { stage: number }) => {
    switch (stage) {
        case 0: // Swamp
            return (
                <div className="relative w-48 h-48 bg-emerald-900/50 rounded-full flex items-center justify-center border-4 border-emerald-800 border-dashed animate-pulse-slow">
                    <Trees className="w-24 h-24 text-emerald-700" />
                    <div className="absolute bottom-2 text-xs font-bold text-emerald-200 uppercase tracking-widest">Болото</div>
                </div>
            );
        case 1: // Foundation
            return (
                <div className="relative w-48 h-48 bg-neutral-800 rounded-lg flex items-center justify-center border-4 border-neutral-600">
                    <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 gap-1 p-2">
                        {Array.from({ length: 16 }).map((_, i) => (
                            <div key={i} className="bg-neutral-700 rounded-sm" />
                        ))}
                    </div>
                    <div className="absolute bottom-[-20px] text-xs font-bold text-neutral-400 uppercase tracking-widest">Фундамент</div>
                </div>
            );
        case 2: // Skeleton
            return (
                <div className="relative w-48 h-64 flex flex-col items-center justify-end">
                    <div className="w-32 h-full border-x-4 border-orange-600 bg-transparent flex flex-col justify-between py-2">
                        <div className="h-2 bg-orange-600 w-full" />
                        <div className="h-2 bg-orange-600 w-full" />
                        <div className="h-2 bg-orange-600 w-full" />
                    </div>
                    <div className="absolute bottom-[-20px] text-xs font-bold text-orange-500 uppercase tracking-widest">Каркас</div>
                </div>
            );
        case 3: // Walls
            return (
                <div className="relative w-48 h-64 bg-orange-100 flex items-center justify-center border-4 border-orange-200">
                    <BrickWall className="w-full h-full text-orange-300 opacity-50 p-4" />
                    <div className="absolute bottom-[-20px] text-xs font-bold text-orange-400 uppercase tracking-widest">Стены</div>
                </div>
            );
        case 4: // Finishing
            return (
                <div className="relative w-48 h-64 bg-slate-200 flex flex-col items-center justify-center border-4 border-slate-300 overflow-hidden">
                    <div className="grid grid-cols-2 gap-4 w-full h-full p-4">
                        <div className="bg-blue-300/50 border border-blue-400" />
                        <div className="bg-blue-300/50 border border-blue-400" />
                        <div className="bg-blue-300/50 border border-blue-400" />
                        <div className="bg-blue-300/50 border border-blue-400" />
                    </div>
                    <div className="absolute bottom-[-20px] text-xs font-bold text-slate-500 uppercase tracking-widest">Отделка</div>
                </div>
            );
        case 5: // Skyscraper
            return (
                <div className="relative w-48 h-80 bg-gradient-to-t from-blue-900 via-blue-600 to-sky-400 flex flex-col items-center border-4 border-blue-900 shadow-[0_0_50px_rgba(59,130,246,0.5)]">
                    <div className="w-full h-full grid grid-cols-3 gap-1 p-2">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="bg-yellow-100/80 animate-pulse-random" style={{ animationDelay: `${Math.random()}s` }} />
                        ))}
                    </div>
                    <div className="absolute -top-12">
                        <Building2 className="w-10 h-10 text-sky-200" />
                    </div>
                    <div className="absolute bottom-[-25px] text-xs font-bold text-blue-400 uppercase tracking-widest">Небоскреб</div>
                </div>
            );
        default: return null;
    }
}

export const ClickZone: React.FC = () => {
    const { state, click } = useGame();
    const [clicks, setClicks] = useState<{ id: number, x: number, y: number, val: number }[]>([]);
    const [particles, setParticles] = useState<{ id: number, x: number, y: number, color: string }[]>([]);

    const handleZoneClick = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const val = (state.constructionStage + 1); // Click value

        const newClick = { id: Date.now(), x, y, val };
        setClicks(prev => [...prev.slice(-10), newClick]);

        // Generate Particles
        const colors = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981'];
        const newParticles = Array.from({ length: 8 }).map((_, i) => ({
            id: Date.now() + i + Math.random(),
            x,
            y,
            color: colors[Math.floor(Math.random() * colors.length)]
        }));
        setParticles(prev => [...prev.slice(-20), ...newParticles]);

        click();
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden bg-gradient-to-b from-transparent to-background/50 h-[60vh] md:h-auto w-full select-none cursor-pointer group active:scale-[0.99] transition-transform duration-75" onClick={handleZoneClick}>

            {/* Central Building Visual */}
            <motion.div
                className="z-10"
                whileTap={{ scale: 0.95, rotate: -1 }}
            >
                <StageVisual stage={state.constructionStage} />
            </motion.div>

            {/* Particles */}
            <AnimatePresence>
                {particles.map(p => (
                    <motion.div
                        key={p.id}
                        initial={{ opacity: 1, x: p.x, y: p.y, scale: 0.5 }}
                        animate={{
                            opacity: 0,
                            x: p.x + (Math.random() - 0.5) * 200,
                            y: p.y + (Math.random() - 0.5) * 200,
                            scale: 0
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="absolute w-2 h-2 rounded-full pointer-events-none z-10"
                        style={{ backgroundColor: p.color, left: 0, top: 0 }}
                    />
                ))}
            </AnimatePresence>

            {/* Floating Numbers */}
            <AnimatePresence>
                {clicks.map(c => (
                    <motion.div
                        key={c.id}
                        initial={{ opacity: 1, y: c.y, x: c.x }}
                        animate={{ opacity: 0, y: c.y - 120 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        className="absolute text-4xl font-black text-green-400 pointer-events-none drop-shadow-lg z-20 stroke-black"
                        style={{ left: 0, top: 0, textShadow: '2px 2px 0 #000' }}
                    >
                        +{c.val}
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Stage Progress Bar (bottom of click zone) */}
            <div className="absolute bottom-4 w-64 text-center z-30">
                <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-bold bg-background/50 px-2 rounded">
                    Текущий этап: {CONSTRUCTION_STAGES[state.constructionStage].name}
                </div>
                {state.constructionStage < CONSTRUCTION_STAGES.length - 1 && (
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden border border-border">
                        <div
                            className="h-full bg-primary transition-all duration-500 rounded-full"
                            style={{ width: `${Math.min(100, (state.balance / CONSTRUCTION_STAGES[state.constructionStage + 1].threshold) * 100)}%` }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
