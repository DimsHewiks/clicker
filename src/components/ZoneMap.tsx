import React, { useMemo, useState, useRef } from 'react';
import { useGame } from '@/context/GameContext';
import { motion } from 'framer-motion';
import { Building2, Waves, Sparkles, Info } from 'lucide-react';
import { GRID_SIZE, GENERATORS_CONFIG, SYNERGY_CONFIG, CHAPEL_WORK_DURATION, CHAPEL_LUNCH_DURATION, CHAPEL_RADIUS } from '@/constants';
import type { Building } from '@/types';
import { cn } from '@/lib/utils';

const isWaterCell = (gx: number, gy: number) => {
    const val = (Math.sin(gx * 0.4) * Math.cos(gy * 0.4));
    return val > 0.7;
};

const BuildingNode = React.memo(({ building, onMove, onUpgrade, onToggle }: {
    building: Building,
    onMove: (gx: number, gy: number) => void,
    onUpgrade: () => void,
    onToggle: () => void
}) => {
    const config = GENERATORS_CONFIG.find(g => g.id === building.typeId);
    const Icon = config?.icon || Building2;
    const isMarket = config?.category === 'market';

    const synergies = building.synergyStats;
    const totalBonus = building.synergyBonus;
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
                (building.isMissingWorkers || building.isStriking) && building.isActive && "border-red-500 bg-red-950/20",
                building.isStriking && "border-red-600 bg-red-900/40 shadow-[0_0_15px_rgba(220,38,38,0.5)]",
                hasSynergy && building.isActive && !building.isStriking && "shadow-[0_0_15px_-3px_rgba(59,130,246,0.6)] border-blue-400/50"
            )}
            style={{ left: '50%', top: '50%', marginLeft: -20, marginTop: -20 }}
        >
            <div className="relative flex flex-col items-center">
                <Icon className={cn("w-6 h-6 transition-colors",
                    !building.isActive ? "text-red-900" :
                        building.status === 'lunch' ? "text-orange-400" :
                            (building.isMissingWorkers || building.isStriking) ? "text-red-400" : "text-slate-300"
                )} />
                {!building.isActive && <div className="text-[7px] font-black text-red-500/80 mt-0.5 animate-pulse tracking-widest uppercase">Off</div>}
                {building.isStriking && <div className="text-[7px] font-black text-red-400 mt-0.5 animate-pulse tracking-widest uppercase">Strike</div>}

                {hasSynergy && building.isActive && !building.isStriking && (
                    <div className="absolute -top-3 -right-3">
                        <Sparkles className="w-3 h-3 text-blue-400 animate-pulse" />
                    </div>
                )}

                {building.level > 1 && (
                    <div className="absolute -bottom-3 -right-3 bg-blue-600 border border-blue-400 text-[8px] font-black px-1.5 py-0.5 rounded-md text-white shadow-lg">
                        L{building.level}
                    </div>
                )}
            </div>

            {/* Hint Tooltip */}
            <div className="absolute -top-20 px-3 py-2 bg-[#0d0f14]/95 backdrop-blur-xl rounded-xl border border-white/10 text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0 pointer-events-none whitespace-nowrap z-50 shadow-2xl min-w-[120px]">
                <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-2 w-full justify-between">
                        <span className={cn(
                            "uppercase tracking-widest text-[8px] font-black px-1.5 py-0.5 rounded",
                            building.isStriking ? "bg-red-500/20 text-red-400" : (building.isActive ? "bg-green-500/20 text-green-400" : "bg-white/5 text-white/40")
                        )}>
                            {building.isStriking ? "Забастовка" : (building.isActive ? "Активен" : "Выключен")}
                        </span>
                        {config?.description && <Info className="w-3 h-3 text-white/50" />}
                    </div>
                    <div className="text-white/60 font-black self-start mt-1">{config?.name || "Здание"}</div>
                    {config?.description && (
                        <div className="mt-1 text-[8px] text-white/40 font-medium leading-relaxed max-w-[180px] whitespace-normal">
                            {config.description}
                        </div>
                    )}
                </div>
                {hasSynergy && building.isActive && !building.isStriking && (
                    <div className="mt-2 pt-2 border-t border-white/5 text-blue-400 uppercase text-[8px] flex flex-col items-center gap-1">
                        <span className="font-black tracking-tighter">Синергия: +{Math.round(totalBonus * 100)}%</span>
                        <div className="flex gap-1.5 opacity-60 font-bold">
                            {synergies.cluster > 0 && <span>x{synergies.cluster} Кл</span>}
                            {synergies.chain > 0 && <span>x{synergies.chain} Ц</span>}
                        </div>
                    </div>
                )}
            </div>

            {building.isActive && building.status === 'lunch' && !building.isStriking && building.typeId !== 'chapel' && (
                <div className="absolute -bottom-7 bg-orange-500/90 border border-orange-400 text-[8px] font-black px-2 py-0.5 rounded-full text-white shadow-lg animate-bounce">ОБЕД</div>
            )}
            {building.isActive && building.isStriking && (
                <div className="absolute -bottom-7 bg-[#dc2626] border border-red-400 text-[8px] font-black px-2 py-0.5 rounded-full text-white shadow-[0_0_15px_rgba(220,38,38,0.6)] animate-bounce uppercase tracking-tighter">Забастовка</div>
            )}
            {building.isActive && building.isMissingWorkers && building.status !== 'lunch' && !building.isStriking && (
                <div className="absolute -bottom-7 bg-[#450a0a]/90 border border-red-500/50 text-[8px] font-black px-2 py-0.5 rounded-full text-white/80 animate-pulse whitespace-nowrap tracking-tighter">НЕТ ПЕРСОНАЛА</div>
            )}

            {/* Chapel Progress Bar */}
            {building.typeId === 'chapel' && building.isActive && building.chapelTimer !== undefined && (
                <div className="absolute -bottom-6 w-12 flex flex-col items-center gap-0.5">
                    <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden border border-white/10">
                        <motion.div
                            className={cn(
                                "h-full",
                                building.chapelTimer > 0 ? "bg-gradient-to-r from-purple-600 to-purple-400" : "bg-gradient-to-r from-orange-600 to-orange-400"
                            )}
                            initial={false}
                            animate={{
                                width: building.chapelTimer > 0
                                    ? `${((CHAPEL_WORK_DURATION - building.chapelTimer) / CHAPEL_WORK_DURATION) * 100}%`
                                    : `${((building.chapelTimer + CHAPEL_LUNCH_DURATION) / CHAPEL_LUNCH_DURATION) * 100}%`
                            }}
                            transition={{ duration: 1, ease: "linear" }}
                        />
                    </div>
                </div>
            )}
        </motion.div>
    );
});


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

    const synergyLines = useMemo(() => {
        const lines: any[] = [];
        state.buildings.forEach((b, idx) => {
            if (!b.isActive || !b.isPlaced) return;
            state.buildings.slice(idx + 1).forEach(other => {
                if (!other.isActive || !other.isPlaced) return;
                const dist = Math.sqrt(Math.pow(other.x - b.x, 2) + Math.pow(other.y - b.y, 2));

                const isCluster = other.typeId === b.typeId && dist < SYNERGY_CONFIG.CLUSTER_RADIUS;
                const chain = SYNERGY_CONFIG.CHAINS.find(c => (c.target === b.typeId && c.source === other.typeId) || (c.target === other.typeId && c.source === b.typeId));
                const isChain = chain && dist < SYNERGY_CONFIG.CHAIN_RADIUS;
                const isRes = (other.typeId === 'house' && b.typeId !== 'house' && dist < SYNERGY_CONFIG.RESIDENTIAL_RADIUS) ||
                    (b.typeId === 'house' && other.typeId !== 'house' && dist < SYNERGY_CONFIG.RESIDENTIAL_RADIUS);

                if (isCluster || isChain || isRes) {
                    lines.push({
                        id: `syn-${b.id}-${other.id}`,
                        x1: b.x, y1: b.y, x2: other.x, y2: other.y,
                        color: isChain ? "#3b82f6" : isRes ? "#10b981" : "#60a5fa"
                    });
                }
            });
        });
        return lines;
    }, [state.buildings]);

    const optimizationLines = useMemo(() => {
        const lines: any[] = [];
        const chapels = state.buildings.filter(b => b.typeId === 'chapel' && b.isActive && b.isPlaced);

        state.buildings.forEach(b => {
            if (b.typeId === 'house' || b.typeId === 'chapel' || !b.isPlaced) return;

            // Find nearest chapel for this building
            const nearbyChapels = chapels
                .map(c => ({
                    chapel: c,
                    dist: Math.sqrt(Math.pow(c.x - b.x, 2) + Math.pow(c.y - b.y, 2))
                }))
                .filter(c => c.dist <= CHAPEL_RADIUS)
                .sort((a, b_chap) => a.dist - b_chap.dist);

            if (nearbyChapels.length > 0) {
                const nearest = nearbyChapels[0].chapel;
                // Path from Chapel (source) to Building (target)
                const path = `M ${nearest.x} ${nearest.y} L ${b.x} ${nearest.y} L ${b.x} ${b.y}`;
                lines.push({ id: `opt-${nearest.id}-${b.id}`, path });
            }
        });
        return lines;
    }, [state.buildings]);

    const placingConfig = useMemo(() =>
        state.placingBuildingTypeId ? GENERATORS_CONFIG.find(g => g.id === state.placingBuildingTypeId) : null
        , [state.placingBuildingTypeId]);

    return (
        <div ref={containerRef} className="relative w-full h-full bg-[#0d0f14] overflow-hidden select-none" onMouseMove={handleMouseMove} onClick={() => {
            if (state.placingBuildingTypeId) {
                const isWaterBuilding = placingConfig?.terrain === 'water';
                const isWater = isWaterCell(mouseGrid.gx / GRID_SIZE, mouseGrid.gy / GRID_SIZE);

                if (isWaterBuilding && !isWater) return;
                if (!isWaterBuilding && isWater) return;

                placeBuilding(mouseGrid.gx, mouseGrid.gy);
            }
            else click();
        }}>
            <div className="absolute inset-0 opacity-[0.05]" style={{
                backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`, backgroundPosition: 'center center'
            }} />

            {/* Visual Layers */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-0 h-0 overflow-visible">
                    {/* Lakes */}
                    {gridCells.map((c, i) => (
                        <div key={i} className="absolute bg-blue-600/20 border border-blue-400/10 flex items-center justify-center"
                            style={{ width: GRID_SIZE, height: GRID_SIZE, left: c.x - GRID_SIZE / 2, top: c.y - GRID_SIZE / 2 }}>
                            <Waves className="w-4 h-4 text-blue-400/20" />
                        </div>
                    ))}

                    <svg className="absolute overflow-visible pointer-events-none" style={{ left: 0, top: 0, width: 1, height: 1 }}>
                        <g>
                            {/* Optimization Synergy Lines (Orthogonal) */}
                            {optimizationLines.map(line => (
                                <motion.path
                                    key={line.id}
                                    d={line.path}
                                    stroke="#c084fc"
                                    strokeWidth="2"
                                    fill="none"
                                    strokeDasharray="4 4"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 0.6 }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                />
                            ))}

                            {/* Synergy Lines */}
                            {synergyLines.map(line => (
                                <motion.line key={line.id}
                                    x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
                                    stroke={line.color}
                                    strokeWidth="1" strokeDasharray="2 4"
                                    initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} />
                            ))}

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
                            onMove={(gx, gy) => moveBuilding(b.id, gx, gy)}
                            onUpgrade={() => upgradeBuilding(b.id)}
                            onToggle={() => toggleBuilding(b.id)}
                        />
                    ))}

                    {/* Preview */}
                    {state.placingBuildingTypeId && (
                        <>
                            {placingConfig?.category === 'optimization' && (
                                <div className="absolute border-2 border-purple-500/30 bg-purple-500/5 rounded-full animate-pulse flex items-center justify-center"
                                    style={{
                                        width: CHAPEL_RADIUS * 2,
                                        height: CHAPEL_RADIUS * 2,
                                        left: mouseGrid.gx,
                                        top: mouseGrid.gy,
                                        marginLeft: -CHAPEL_RADIUS,
                                        marginTop: -CHAPEL_RADIUS
                                    }}>
                                    <div className="text-[10px] font-black text-purple-400/40 uppercase tracking-widest">Зона Оптимизации</div>
                                </div>
                            )}
                            <div className="absolute flex items-center justify-center w-10 h-10 border-2 border-blue-500 border-dashed rounded bg-blue-500/10 animate-pulse pointer-events-none"
                                style={{ left: mouseGrid.gx, top: mouseGrid.gy, marginLeft: -20, marginTop: -20 }} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
