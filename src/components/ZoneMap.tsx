import React, { useMemo, useState, useRef } from 'react';
import { useGame } from '@/context/GameContext';
import { motion } from 'framer-motion';
import { Building2, Truck, Pickaxe, Factory, TowerControl, Tent, Plane, Utensils, Fish, Waves, Hammer, Banknote } from 'lucide-react';
import { GRID_SIZE, GENERATORS_CONFIG } from '@/constants';
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
    wood_market: Banknote,
    fish_market: Fish,
};

const isWaterCell = (gx: number, gy: number) => {
    const val = (Math.sin(gx * 0.4) * Math.cos(gy * 0.4));
    return val > 0.7;
};

import { SYNERGY_CONFIG } from '@/constants';
import { Sparkles } from 'lucide-react';

const BuildingNode = ({ building, buildings, onMove, onUpgrade, onToggle }: { building: Building, buildings: Building[], onMove: (gx: number, gy: number) => void, onUpgrade: () => void, onToggle: () => void }) => {
    const Icon = ICONS[building.typeId] || Building2;
    const config = GENERATORS_CONFIG.find(g => g.id === building.typeId);
    const isMarket = config?.category === 'market';

    // Synergy stats for UI
    const synergies = useMemo(() => {
        let cluster = 0;
        let chain = 0;
        let res = 0;
        buildings.forEach(other => {
            if (other.id === building.id || !other.isActive) return;
            const dist = Math.sqrt(Math.pow(other.x - building.x, 2) + Math.pow(other.y - building.y, 2));

            if (other.typeId === building.typeId && dist < SYNERGY_CONFIG.CLUSTER_RADIUS) cluster++;

            const cRule = SYNERGY_CONFIG.CHAINS.find(c => c.target === building.typeId && c.source === other.typeId);
            if (cRule && dist < SYNERGY_CONFIG.CHAIN_RADIUS) chain++;

            if (other.typeId === 'house' && dist < SYNERGY_CONFIG.RESIDENTIAL_RADIUS) {
                if (config?.category === 'market' || building.typeId === 'canteen') res++;
            }
        });
        return { cluster, chain, res };
    }, [building, buildings, config]);

    const totalBonus = (synergies.cluster * SYNERGY_CONFIG.BONUSES.CLUSTER_PER_BUILDING) +
        (synergies.chain * SYNERGY_CONFIG.BONUSES.CHAIN_PROCESSOR) +
        (synergies.res * (config?.category === 'market' ? SYNERGY_CONFIG.BONUSES.MARKET_PER_HOUSE : (building.typeId === 'canteen' ? SYNERGY_CONFIG.BONUSES.CANTEEN_PER_HOUSE : 0)));

    const hasSynergy = totalBonus > 0;

    return (
        <motion.div
            drag
            dragMomentum={false}
            initial={false}
            onDragEnd={(_, info) => {
                const gx = Math.round((building.x + info.offset.x) / GRID_SIZE) * GRID_SIZE;
                const gy = Math.round((building.y + info.offset.y) / GRID_SIZE) * GRID_SIZE;
                onMove(gx, gy);
            }}
            animate={{
                x: building.x, y: building.y,
                scale: (!building.isActive || building.status === 'lunch' || building.isMissingWorkers) ? 0.85 : 1,
                opacity: (!building.isActive || building.status === 'lunch' || building.isMissingWorkers) ? 0.7 : 1
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            onClick={(e) => {
                e.stopPropagation();
                if (e.shiftKey) onUpgrade();
                else onToggle();
            }}
            className={cn(
                "absolute flex items-center justify-center w-10 h-10 bg-slate-900 border-2 rounded shadow-2xl z-20 cursor-pointer group select-none",
                building.isActive ? "border-slate-700 hover:border-primary shadow-primary/20" : "bg-red-950/20 border-red-900/50 grayscale hover:border-red-500 shadow-none",
                isMarket && building.isActive && "border-green-500 shadow-green-500/40",
                isMarket && !building.isActive && "border-red-600 shadow-none",
                building.status === 'lunch' && "border-orange-500 bg-orange-950/20",
                building.isMissingWorkers && building.isActive && "border-red-500 bg-red-950/20",
                hasSynergy && building.isActive && "shadow-[0_0_15px_-3px_rgba(59,130,246,0.6)] border-blue-400/50"
            )}
            style={{ left: '50%', top: '50%', marginLeft: -20, marginTop: -20 }}
        >
            <div className="relative flex flex-col items-center">
                <Icon className={cn("w-6 h-6 transition-colors",
                    !building.isActive ? "text-red-900" :
                        building.status === 'lunch' ? "text-orange-400" :
                            building.isMissingWorkers ? "text-red-400" : "text-slate-300"
                )} />
                {!building.isActive && <div className="text-[7px] font-black text-red-500 mt-0.5 animate-pulse">OFF</div>}

                {hasSynergy && building.isActive && (
                    <div className="absolute -top-3 -right-3">
                        <Sparkles className="w-3 h-3 text-blue-400 animate-pulse" />
                    </div>
                )}

                {building.level > 1 && (
                    <div className="absolute -bottom-3 -right-3 bg-blue-600 text-[8px] font-black px-1 rounded text-white border border-blue-400">
                        L{building.level}
                    </div>
                )}
            </div>

            {/* Hint Tooltip */}
            <div className="absolute -top-12 px-2 py-1.5 bg-black/95 backdrop-blur-md rounded border border-white/10 text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                <div className="text-center">{building.isActive ? "Клик: Выключить" : "Клик: Включить"}</div>
                {hasSynergy && building.isActive && (
                    <div className="mt-1 pt-1 border-t border-white/10 text-blue-400 uppercase text-[8px] flex flex-col items-center gap-0.5">
                        <span className="font-black">Бонус: +{Math.round(totalBonus * 100)}%</span>
                        <div className="flex gap-1 opacity-80">
                            {synergies.cluster > 0 && <span>x{synergies.cluster} Кл</span>}
                            {synergies.chain > 0 && <span>x{synergies.chain} Ц</span>}
                            {synergies.res > 0 && <span>x{synergies.res} Жилье</span>}
                        </div>
                    </div>
                )}
            </div>

            {building.isActive && building.status === 'lunch' && (
                <div className="absolute -bottom-6 bg-orange-500 text-[8px] font-black px-1.5 py-0.5 rounded text-white animate-bounce">ОБЕД</div>
            )}
            {building.isActive && building.isMissingWorkers && building.status !== 'lunch' && (
                <div className="absolute -bottom-6 bg-red-600 text-[8px] font-black px-1.5 py-0.5 rounded text-white animate-pulse whitespace-nowrap">НЕТ ПЕРСОНАЛА</div>
            )}
        </motion.div>
    );
};

export const ZoneMap: React.FC = () => {
    const { state, click, placeBuilding, moveBuilding, upgradeBuilding, toggleBuilding } = useGame();
    const [mouseGrid, setMouseGrid] = useState({ gx: 0, gy: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

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
                            {/* Synergy Lines */}
                            {state.buildings.map(b => {
                                if (!b.isActive) return null;
                                return state.buildings.map(other => {
                                    if (other.id === b.id || !other.isActive) return null;
                                    const dist = Math.sqrt(Math.pow(other.x - b.x, 2) + Math.pow(other.y - b.y, 2));

                                    const isCluster = other.typeId === b.typeId && dist < SYNERGY_CONFIG.CLUSTER_RADIUS;
                                    const chain = SYNERGY_CONFIG.CHAINS.find(c => (c.target === b.typeId && c.source === other.typeId) || (c.target === other.typeId && c.source === b.typeId));
                                    const isChain = chain && dist < SYNERGY_CONFIG.CHAIN_RADIUS;
                                    const isRes = (other.typeId === 'house' && b.typeId !== 'house' && dist < SYNERGY_CONFIG.RESIDENTIAL_RADIUS);

                                    if (isCluster || isChain || isRes) {
                                        return (
                                            <motion.line key={`syn-${b.id}-${other.id}`}
                                                x1={b.x} y1={b.y} x2={other.x} y2={other.y}
                                                stroke={isChain ? "#3b82f6" : isRes ? "#10b981" : "#60a5fa"}
                                                strokeWidth="1" strokeDasharray="2 4"
                                                initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} />
                                        );
                                    }
                                    return null;
                                });
                            })}

                            {/* Lunch Lines */}
                            {state.buildings.map(b => {
                                if (b.status !== 'lunch' || !b.targetCanteenId || !b.isActive) return null;
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
                        <BuildingNode
                            key={b.id}
                            building={b}
                            buildings={state.buildings}
                            onMove={(gx, gy) => moveBuilding(b.id, gx, gy)}
                            onUpgrade={() => upgradeBuilding(b.id)}
                            onToggle={() => toggleBuilding(b.id)}
                        />
                    ))}

                    {/* Preview */}
                    {state.placingBuildingTypeId && (
                        <div className="absolute flex items-center justify-center w-10 h-10 border-2 border-blue-500 border-dashed rounded bg-blue-500/10 animate-pulse pointer-events-none"
                            style={{ left: mouseGrid.gx, top: mouseGrid.gy, marginLeft: -20, marginTop: -20 }} />
                    )}

                    {/* Juice - Removed AnimatePresence and juice rendering */}
                    {/* <AnimatePresence>
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
                    </AnimatePresence> */}
                </div>
            </div>
        </div>
    );
};
