import React, { useMemo, useState, useRef } from 'react';
import { useGame } from '@/context/GameContext';
import { motion } from 'framer-motion';
import { Waves } from 'lucide-react';
import { GRID_SIZE, GENERATORS_CONFIG, SYNERGY_CONFIG, CHAPEL_RADIUS } from '@/config';
import { BuildingNode } from './zone/BuildingNode';

type SynergyLine = { id: string; x1: number; y1: number; x2: number; y2: number; color: string };
type OptimizationLine = { id: string; path: string };

const isWaterCell = (gx: number, gy: number) => {
    const val = (Math.sin(gx * 0.4) * Math.cos(gy * 0.4));
    return val > 0.7;
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
        const cells: { x: number; y: number }[] = [];
        for (let x = -8; x <= 8; x++) {
            for (let y = -8; y <= 8; y++) {
                if (isWaterCell(x, y)) cells.push({ x: x * GRID_SIZE, y: y * GRID_SIZE });
            }
        }
        return cells;
    }, []);

    const synergyLines = useMemo<SynergyLine[]>(() => {
        const lines: SynergyLine[] = [];
        if (state.buildings.length > 150) return lines; // Skip heavy draw when too many buildings
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

    const optimizationLines = useMemo<OptimizationLine[]>(() => {
        const lines: OptimizationLine[] = [];
        if (state.buildings.length > 200) return lines;
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
                            allBuildings={state.buildings}
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
