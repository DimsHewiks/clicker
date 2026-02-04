import React, { useMemo, useState, useRef } from 'react';
import { useGame, useJuice } from '@/context/GameContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Trees, Truck, Pickaxe, Factory, TowerControl, Tent, Plane, Utensils, Fish, Waves, Hammer } from 'lucide-react';
import { GRID_SIZE } from '@/constants';
import type { Building } from '@/types';
import { cn } from '@/lib/utils';

const ICONS: Record<string, React.ElementType> = {
    truck: Truck,
    excavator: Pickaxe,
    concrete_plant: Factory,
    crane: TowerControl,
    camp: Tent,
    drone: Plane,
    canteen: Utensils,
    fishing_dock: Fish,
    iron_mine: Factory,
    sand_quarry: Pickaxe,
    workshop: Factory,
    sawmill: Hammer,
};

const isWaterCell = (gx: number, gy: number) => {
    const val = (Math.sin(gx * 0.4) * Math.cos(gy * 0.4));
    return val > 0.7;
};

const BuildingNode = ({ building, onMove, onUpgrade }: { building: Building, onMove: (gx: number, gy: number) => void, onUpgrade: () => void }) => {
    const Icon = ICONS[building.typeId] || Building2;

    return (
        <motion.div
            drag
            dragMomentum={false}
            onDragEnd={(_, info) => {
                const gx = Math.round((building.x + info.offset.x) / GRID_SIZE) * GRID_SIZE;
                const gy = Math.round((building.y + info.offset.y) / GRID_SIZE) * GRID_SIZE;
                onMove(gx, gy);
            }}
            animate={{
                x: building.x, y: building.y,
                scale: (building.status === 'lunch' || building.isMissingWorkers) ? 0.9 : 1,
                opacity: (building.status === 'lunch' || building.isMissingWorkers) ? 0.7 : 1
            }}
            onClick={onUpgrade}
            className={cn(
                "absolute flex items-center justify-center w-12 h-12 bg-slate-900 border border-slate-700 rounded shadow-xl z-20 cursor-pointer hover:border-blue-500",
                building.status === 'lunch' && "border-orange-500 bg-orange-950/20",
                building.isMissingWorkers && "border-red-500 bg-red-950/20"
            )}
            style={{ left: '50%', top: '50%', marginLeft: -24, marginTop: -24 }}
        >
            <div className="relative">
                <Icon className={cn("w-6 h-6",
                    building.status === 'lunch' ? "text-orange-400" :
                        building.isMissingWorkers ? "text-red-400" : "text-slate-300"
                )} />
                {building.level > 1 && (
                    <div className="absolute -bottom-2 -right-2 bg-blue-600 text-[8px] font-black px-1 rounded text-white border border-blue-400">
                        L{building.level}
                    </div>
                )}
            </div>

            {building.status === 'lunch' && (
                <div className="absolute -top-6 bg-orange-500 text-[8px] font-black px-1.5 py-0.5 rounded text-white animate-bounce">ОБЕД</div>
            )}
            {building.isMissingWorkers && building.status !== 'lunch' && (
                <div className="absolute -top-6 bg-red-600 text-[8px] font-black px-1.5 py-0.5 rounded text-white animate-pulse whitespace-nowrap">НЕТ ПЕРСОНАЛА</div>
            )}
        </motion.div>
    );
};

export const ZoneMap: React.FC = () => {
    const { state, click, placeBuilding, moveBuilding, upgradeBuilding, cancelPlacement } = useGame();
    const [juices, setJuices] = useState<{ id: string, x: number, y: number, text: string }[]>([]);
    const [mouseGrid, setMouseGrid] = useState({ gx: 0, gy: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    useJuice((x, y, text) => {
        const id = Math.random().toString(36);
        setJuices(prev => [...prev, { id, x, y, text }]);
        setTimeout(() => setJuices(prev => prev.filter(j => j.id !== id)), 1500);
    });

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const gx = Math.round((e.clientX - rect.left - rect.width / 2) / GRID_SIZE) * GRID_SIZE;
        const gy = Math.round((e.clientY - rect.top - rect.height / 2) / GRID_SIZE) * GRID_SIZE;
        setMouseGrid({ gx, gy });
    };

    const gridCells = useMemo(() => {
        const cells = [];
        for (let x = -8; x <= 8; x++) {
            for (let y = -8; y <= 8; y++) {
                if (isWaterCell(x, y)) cells.push({ x: x * GRID_SIZE, y: y * GRID_SIZE });
            }
        }
        return cells;
    }, []);

    return (
        <div ref={containerRef} className="relative w-full h-full bg-[#0d0f14] overflow-hidden select-none" onMouseMove={handleMouseMove} onClick={() => {
            if (state.placingBuildingTypeId) placeBuilding(mouseGrid.gx, mouseGrid.gy);
            else click();
        }}>
            <div className="absolute inset-0 opacity-[0.05]" style={{
                backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`, backgroundPosition: 'center center'
            }} />

            {/* Visual Layers */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-0 h-0">
                    {/* Lakes */}
                    {gridCells.map((c, i) => (
                        <div key={i} className="absolute bg-blue-600/20 border border-blue-400/10 flex items-center justify-center"
                            style={{ width: GRID_SIZE, height: GRID_SIZE, left: c.x - GRID_SIZE / 2, top: c.y - GRID_SIZE / 2 }}>
                            <Waves className="w-4 h-4 text-blue-400/20" />
                        </div>
                    ))}

                    <svg className="absolute inset-0 w-full h-full overflow-visible" style={{ left: 0, top: 0 }}>
                        <g>
                            {/* Lunch Lines */}
                            {state.buildings.map(b => {
                                if (b.status !== 'lunch' || !b.targetCanteenId) return null;
                                const target = state.buildings.find(c => c.id === b.targetCanteenId);
                                if (!target) return null;
                                return (
                                    <motion.line key={`lunch-${b.id}`} x1={b.x} y1={b.y} x2={target.x} y2={target.y}
                                        stroke="#f97316" strokeWidth="2" strokeDasharray="4 4" initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} />
                                );
                            })}
                        </g>
                    </svg>

                    {/* Buildings */}
                    {state.buildings.map(b => (
                        <BuildingNode key={b.id} building={b} onMove={(gx, gy) => moveBuilding(b.id, gx, gy)} onUpgrade={() => upgradeBuilding(b.id)} />
                    ))}

                    {/* Preview */}
                    {state.placingBuildingTypeId && (
                        <div className="absolute flex items-center justify-center w-12 h-12 border-2 border-blue-500 border-dashed rounded bg-blue-500/10 animate-pulse pointer-events-none"
                            style={{ left: mouseGrid.gx, top: mouseGrid.gy, marginLeft: -24, marginTop: -24 }} />
                    )}

                    {/* Juice */}
                    <AnimatePresence>
                        {juices.map(j => (
                            <motion.div
                                key={j.id}
                                initial={{ y: j.y - 40, x: j.x, opacity: 1, scale: 0.5 }}
                                animate={{ y: j.y - 100, opacity: 0, scale: 1.2 }}
                                className="absolute text-[12px] font-black text-white pointer-events-none whitespace-nowrap bg-blue-600/80 backdrop-blur-sm px-2 py-0.5 rounded-full border border-blue-400/50 shadow-lg -translate-x-1/2"
                                style={{ left: 0, top: 0 }}
                            >
                                {j.text}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};
