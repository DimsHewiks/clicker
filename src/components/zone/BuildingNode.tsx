import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Sparkles, Info } from 'lucide-react';
import { CHAPEL_LUNCH_DURATION, CHAPEL_WORK_DURATION, GENERATORS_CONFIG, GRID_SIZE, HOUSE_NUISANCE_RADIUS } from '@/config';
import type { Building } from '@/types';
import { cn } from '@/lib/utils';

type Props = {
    building: Building;
    allBuildings: Building[];
    onMove: (gx: number, gy: number) => void;
    onUpgrade: () => void;
    onToggle: () => void;
};

export const BuildingNode: React.FC<Props> = React.memo(({ building, allBuildings, onMove, onUpgrade, onToggle }) => {
    const config = GENERATORS_CONFIG.find(g => g.id === building.typeId);
    const Icon = config?.icon || Building2;
    const isMarket = config?.category === 'market';
    const isHouse = building.typeId === 'house';
    const isHouseNearProduction = isHouse && allBuildings.some(b => {
        if (!b.isPlaced || b.id === building.id) return false;
        const bConfig = GENERATORS_CONFIG.find(g => g.id === b.typeId);
        if (bConfig?.category !== 'production') return false;
        const dist = Math.sqrt(Math.pow(b.x - building.x, 2) + Math.pow(b.y - building.y, 2));
        return dist <= HOUSE_NUISANCE_RADIUS;
    });

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
                hasSynergy && building.isActive && !building.isStriking && "shadow-[0_0_15px_-3px_rgba(59,130,246,0.6)] border-blue-400/50",
                isHouseNearProduction && "border-red-500/70 shadow-[0_0_18px_-3px_rgba(239,68,68,0.6)]"
            )}
            style={{ left: '50%', top: '50%', marginLeft: -20, marginTop: -20 }}
        >
            <div className="relative flex flex-col items-center">
                <Icon className={cn("w-6 h-6 transition-colors",
                    !building.isActive ? "text-red-900" :
                        building.status === 'lunch' ? "text-orange-400" :
                            (building.isMissingWorkers || building.isStriking) ? "text-red-400" : "text-slate-300"
                )} />
                {!building.isActive && <div className="text-[7px] font-black text-red-500/80 mt-0.5 animate-pulse tracking-widest uppercase">ВЫКЛ</div>}
                {building.isStriking && <div className="text-[7px] font-black text-red-400 mt-0.5 animate-pulse tracking-widest uppercase">ЗАБАСТ</div>}
                {isHouseNearProduction && <div className="text-[7px] font-black text-red-300 mt-0.5 tracking-widest uppercase">ШУМ</div>}

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
                    <div className="text-[8px] text-white/30 font-bold mt-1">Перетащите, чтобы переместить</div>
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
            {(() => {
                if (!building.isActive || !building.isMissingWorkers || building.status === 'lunch' || building.isStriking) return null;

                const buildingsOfSameType = allBuildings.filter(b => b.typeId === building.typeId && b.isMissingWorkers && b.isActive);
                if (buildingsOfSameType.length === 0) return null;

                const newestBuilding = buildingsOfSameType.reduce((newest, current) =>
                    current.createdAt > newest.createdAt ? current : newest
                    , buildingsOfSameType[0]);

                if (newestBuilding?.id !== building.id) return null;

                return (
                    <div className="absolute -bottom-7 bg-[#450a0a]/90 border border-red-500/50 text-[8px] font-black px-2 py-0.5 rounded-full text-white/80 animate-pulse whitespace-nowrap tracking-tighter">НЕТ ПЕРСОНАЛА</div>
                );
            })()}

            {building.typeId === 'chapel' && building.isActive && building.chapelTimer !== undefined && (
                <div className="absolute -bottom-6 w-12 flex flex-col items-center gap-0.5">
                    <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden border border-white/10">
                        <motion.div
                            className={cn(
                                "h-full",
                                building.chapelTimer > 0 ? "bg-linear-to-r from-purple-600 to-purple-400" : "bg-linear-to-r from-orange-600 to-orange-400"
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
