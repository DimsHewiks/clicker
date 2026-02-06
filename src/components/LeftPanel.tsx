import React, { useMemo } from 'react';
import { useGame } from '@/context/GameContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Download, Upload, Trash2,
    Users, Hammer, Flame, Anchor, ChefHat, Zap, Shield,
    ClipboardList, Pickaxe, Mountain, Bird
} from 'lucide-react';
import { ACHIEVEMENTS_CONFIG, WORKER_COSTS, GENERATORS_CONFIG } from '@/config';
import type { WorkerType, ResourceType, Generator } from '@/types';
import { cn } from '@/lib/utils';

const formatNumber = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return Math.floor(num).toString();
};

const workerNames: Record<WorkerType, string> = {
    lumberjack: "Лесоруб",
    stonecutter: "Каменотес",
    hunter: "Охотник",
    fisherman: "Рыбак",
    cook: "Повар",
    miner: "Минер/Шахтер",
    driver: "Водитель",
    welder: "Сварщик",
    engineer: "Инженер",
    guard: "Охранник",
    foreman: "Прораб",
    head_chef: "Шеф-повар"
};

const workerIcons: Record<WorkerType, React.ElementType> = {
    lumberjack: Hammer,
    stonecutter: Pickaxe,
    hunter: Bird,
    fisherman: Anchor,
    cook: ChefHat,
    miner: Mountain,
    driver: Zap,
    welder: Flame,
    engineer: Users,
    guard: Shield,
    foreman: ClipboardList,
    head_chef: ChefHat
};

const encodeSave = (value: unknown) => {
    const json = JSON.stringify(value);
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    bytes.forEach(b => { binary += String.fromCharCode(b); });
    return btoa(binary);
};

const decodeSave = (data: string) => {
    const binary = atob(data);
    const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
};



type BuildingStats = {
    gen: Generator;
    count: number;
    activeCount: number;
    income: number;
    resRates: Record<ResourceType | string, number>;
};

export const LeftPanel: React.FC = React.memo(() => {
    const { state, workerCaps, resetGame, loadGame, hireWorker, fireWorker } = useGame();

    const isWorkerUnlocked = (type: WorkerType) => {
        return GENERATORS_CONFIG.some(g =>
            state.unlockedTechs.includes(g.id) &&
            g.workerReq &&
            Object.keys(g.workerReq).includes(type)
        );
    };

    const handleExport = () => {
        try {
            const data = encodeSave(state);
            navigator.clipboard.writeText(data);
            alert("Код сохранения скопирован в буфер обмена!");
        } catch (e) {
            alert("Не удалось создать код сохранения");
            console.error(e);
        }
    };

    const handleImport = () => {
        const data = prompt("Вставьте код сохранения:");
        if (data) {
            try {
                const parsed = decodeSave(data);
                loadGame(parsed);
            } catch (e) {
                alert("Ошибка чтения сохранения");
                console.error(e);
            }
        }
    };

    const renderWorkerItem = (type: WorkerType) => {
        if (!isWorkerUnlocked(type)) return null;

        const Icon = workerIcons[type];
        const cost = WORKER_COSTS[type];
        const count = state.workers[type] || 0;
        const refund = Math.floor(cost * 0.7);
        const canAfford = state.balance >= cost && workerCaps.current < workerCaps.max;

        return (
            <div
                key={type}
                onClick={() => canAfford && hireWorker(type)}
                className={cn(
                    "flex items-center justify-between p-1.5 bg-secondary/20 rounded-md border border-transparent transition-all group select-none",
                    canAfford ? "hover:border-primary/30 hover:bg-secondary/40 cursor-pointer active:scale-[0.98]" : "opacity-80"
                )}
            >
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-background rounded text-primary">
                        <Icon className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-xs font-bold leading-none">{workerNames[type]}</div>
                        <div className="text-[10px] mt-1 font-black text-muted-foreground/80 uppercase tracking-tight">
                            Нанято: {count}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    {count > 0 && (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10 z-10"
                            onClick={(e) => {
                                e.stopPropagation();
                                fireWorker(type);
                            }}
                            title={`Продать за ${refund} СК`}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="ghost"
                        className={cn("h-8 text-[11px] px-2 font-black", canAfford ? "text-primary hover:bg-primary/10" : "text-muted-foreground opacity-50")}
                        onClick={(e) => {
                            e.stopPropagation();
                            hireWorker(type);
                        }}
                        disabled={!canAfford}
                    >
                        {formatNumber(cost)}
                    </Button>
                </div>
            </div>
        );
    };



    // Optimization: Group buildings and calculate stats efficiently
    const buildingStats = useMemo<BuildingStats[]>(() => {
        const statsMap = new Map<string, BuildingStats>();

        state.buildings.forEach(b => {
            if (!b.isPlaced) return;
            const gen = GENERATORS_CONFIG.find(g => g.id === b.typeId);
            if (!gen) return;

            if (!statsMap.has(b.typeId)) {
                statsMap.set(b.typeId, {
                    gen,
                    count: 0,
                    activeCount: 0,
                    income: 0,
                    resRates: {}
                });
            }

            const stats = statsMap.get(b.typeId);
            if (!stats) return;
            stats.count++;

            const isActive = b.isActive && b.status !== 'lunch';
            if (isActive) {
                stats.activeCount++;
                const foremanMul = 1 + (state.workers.foreman || 0) * 0.2;
                const shiftMul = state.shiftActive ? 2.5 : 1.0;
                const upgradeBonus = 1 + (b.level - 1) * 0.5;
                const boost = (1 + b.synergyBonus) * upgradeBonus * foremanMul * shiftMul;

                stats.income += gen.baseIncome * boost;
                if (gen.produces) {
                    Object.entries(gen.produces).forEach(([res, val]) => {
                        stats.resRates[res] = (stats.resRates[res] || 0) + ((val as number) * boost);
                    });
                }
                if (gen.consumes) {
                    Object.entries(gen.consumes).forEach(([res, val]) => {
                        stats.resRates[res] = (stats.resRates[res] || 0) - ((val as number) * boost);
                    });
                }
            }
        });

        return Array.from(statsMap.values());
    }, [state.buildings, state.workers.foreman, state.shiftActive]);

    return (
        <Card className="h-full border-r rounded-none md:rounded-lg flex flex-col overflow-hidden">
            <CardContent className="p-4 space-y-6 overflow-y-auto flex-1">
                {/* Workers / Staff Grouped */}
                <div className="space-y-5">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                            <Users className="w-3.5 h-3.5" /> Персонал
                        </h3>
                        <div className={cn(
                            "text-xs font-bold px-2.5 py-1 rounded-full border shadow-sm",
                            workerCaps.current >= workerCaps.max ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-primary/10 border-primary/20 text-primary"
                        )}>
                            Слоты: {workerCaps.current} / {workerCaps.max}
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div className="space-y-2">
                            <div className="text-[10px] text-muted-foreground uppercase font-black px-1 mb-1.5 opacity-60 tracking-wider">Надзор и Охрана</div>
                            {['guard', 'foreman', 'head_chef'].map(type => renderWorkerItem(type as WorkerType))}
                        </div>

                        <div className="space-y-2">
                            <div className="text-[10px] text-muted-foreground uppercase font-black px-1 mb-1.5 opacity-60 tracking-wider">Производство</div>
                            {['lumberjack', 'stonecutter', 'miner', 'welder', 'engineer'].map(type => renderWorkerItem(type as WorkerType))}
                        </div>

                        <div className="space-y-2">
                            <div className="text-[10px] text-muted-foreground uppercase font-black px-1 mb-1.5 opacity-60 tracking-wider">Сервис</div>
                            {['hunter', 'cook', 'fisherman', 'driver'].map(type => renderWorkerItem(type as WorkerType))}
                        </div>
                    </div>
                </div>

                {/* Achievements */}
                <div className="pt-5 border-t border-white/5 space-y-3">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Достижения</h3>
                    <div className="flex flex-wrap gap-2">
                        {ACHIEVEMENTS_CONFIG.map(ach => {
                            const isUnlocked = state.achievements.includes(ach.id);
                            const Icon = ach.icon;
                            return (
                                <div key={ach.id} className={cn(
                                    "w-8 h-8 rounded flex items-center justify-center border transition-all",
                                    isUnlocked
                                        ? "bg-primary/20 border-primary text-primary"
                                        : "bg-muted border-muted-foreground/20 text-muted-foreground/50 grayscale"
                                )}>
                                    <Icon className="w-5 h-5" />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Building Statistics */}
                <div className="pt-5 border-t border-white/5 space-y-3">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Hammer className="w-3.5 h-3.5" /> Статистика Объектов
                    </h3>
                    <div className="space-y-2">
                        {buildingStats.map((stats) => {
                            const { gen, count, activeCount, income, resRates } = stats;
                            return (
                                <div key={gen.id} className="flex flex-col p-2.5 bg-secondary/10 rounded border border-white/10 hover:border-white/20 transition-colors">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <div className="text-xs font-black flex items-center gap-2 uppercase tracking-tight">
                                            <gen.icon className="w-3.5 h-3.5 text-primary" />
                                            {gen.name}
                                        </div>
                                        <div className="text-xs font-mono font-bold bg-primary/20 text-primary px-2 py-0.5 rounded shadow-sm">x{count}</div>
                                    </div>
                                    <div className="flex flex-wrap gap-x-3.5 gap-y-1 opacity-90">
                                        {income > 0 && (
                                            <div className="text-[10px] text-green-500 font-bold">+{income.toFixed(1)} СК/с</div>
                                        )}
                                        {Object.entries(resRates).map(([res, val]) => (
                                            <div key={res} className={cn("text-[10px] font-bold", (val as number) > 0 ? "text-blue-400" : "text-red-500")}>
                                                {(val as number) > 0 ? "+" : ""}{(val as number).toFixed(1)} {res}/с
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-1.5 flex justify-between items-center border-t border-white/5 pt-1.5">
                                        <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
                                            Активно: {activeCount} / {count}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Actions */}
                <div className="pt-6 space-y-3 pb-4">
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" className="h-8 gap-2 text-[10px] uppercase font-black tracking-wide" onClick={handleExport}>
                            <Download className="w-3.5 h-3.5" /> Экспорт
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 gap-2 text-[10px] uppercase font-black tracking-wide" onClick={handleImport}>
                            <Upload className="w-3.5 h-3.5" /> Импорт
                        </Button>
                    </div>
                    <Button variant="ghost" size="sm" className="w-full h-8 gap-2 text-[10px] uppercase font-black tracking-wide text-destructive hover:text-white hover:bg-destructive transition-all" onClick={() => {
                        resetGame();
                    }}>
                        <Trash2 className="w-3.5 h-3.5" /> Сброс данных
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
});
