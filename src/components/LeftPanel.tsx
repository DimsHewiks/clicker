import React from 'react';
import { useGame } from '@/context/GameContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Download, Upload, Trash2, Coins, Apple,
    Users, Hammer, Flame, Anchor, ChefHat, Zap, Shield,
    ClipboardList, Pickaxe, Mountain, Bird
} from 'lucide-react';
import { ACHIEVEMENTS_CONFIG, WORKER_COSTS, GENERATORS_CONFIG, SYNERGY_CONFIG } from '@/constants';
import type { WorkerType, ResourceType } from '@/types';
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

const resourcesList: { id: ResourceType; name: string; emoji: string; color: string }[] = [
    { id: 'food', name: 'Еда', emoji: '🍱', color: 'orange-500' },
    { id: 'wood', name: 'Дерево', emoji: '🪵', color: 'amber-700' },
    { id: 'stone', name: 'Камень', emoji: '🪨', color: 'slate-500' },
    { id: 'metal', name: 'Металл', emoji: '⛓️', color: 'blue-500' },
    { id: 'sand', name: 'Песок', emoji: '⏳', color: 'yellow-600' },
    { id: 'concrete', name: 'Бетон', emoji: '🧱', color: 'gray-400' },
];

export const LeftPanel: React.FC = () => {
    const { state, incomePerSecond, resourceRates, workerCaps, resetGame, loadGame, hireWorker, fireWorker } = useGame();

    const isWorkerUnlocked = (type: WorkerType) => {
        return GENERATORS_CONFIG.some(g =>
            state.unlockedTechs.includes(g.id) &&
            g.workerReq &&
            Object.keys(g.workerReq).includes(type)
        );
    };

    const handleExport = () => {
        const data = btoa(JSON.stringify(state));
        navigator.clipboard.writeText(data);
        alert("Код сохранения скопирован в буфер обмена!");
    };

    const handleImport = () => {
        const data = prompt("Вставьте код сохранения:");
        if (data) {
            try {
                const parsed = JSON.parse(atob(data));
                loadGame(parsed);
            } catch (e) {
                alert("Ошибка чтения сохранения");
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
            <div key={type} className="flex items-center justify-between p-1.5 bg-secondary/20 rounded-md border border-transparent hover:border-primary/10 transition-all group">
                <div className="flex items-center gap-2">
                    <div className="p-1 bg-background rounded text-primary">
                        <Icon className="w-3 h-3" />
                    </div>
                    <div>
                        <div className="text-[11px] font-medium leading-none">{workerNames[type]}</div>
                        <div className="text-[9px] mt-0.5 font-bold text-muted-foreground">
                            Кол-во: {count}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {count > 0 && (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={() => fireWorker(type)}
                            title={`Продать за ${refund} СК`}
                        >
                            <Trash2 className="w-3 h-3" />
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="ghost"
                        className={cn("h-6 text-[10px] px-1.5", canAfford ? "text-primary" : "text-muted-foreground opacity-50")}
                        onClick={() => hireWorker(type)}
                        disabled={!canAfford}
                    >
                        {formatNumber(cost)}
                    </Button>
                </div>
            </div>
        );
    };

    const renderResourceDelta = (rate: number) => {
        if (Math.abs(rate) < 0.001) return null;
        const isPos = rate > 0;
        return (
            <span className={cn(
                "text-[9px] font-mono font-bold ml-auto",
                isPos ? "text-green-500" : "text-red-500"
            )}>
                {isPos ? "+" : ""}{rate.toFixed(1)}/с
            </span>
        );
    };

    return (
        <Card className="h-full border-r rounded-none md:rounded-lg flex flex-col overflow-hidden">
            <CardContent className="p-4 space-y-5 overflow-y-auto flex-1">
                {/* Balance & Income */}
                <div className="bg-primary/5 p-3 rounded-xl border border-primary/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Coins className="w-5 h-5 text-yellow-500" />
                            <span className="text-xl font-black tracking-tight">{formatNumber(state.balance)} СК</span>
                        </div>
                        <div className="text-[10px] text-green-500 font-mono font-bold">
                            +{formatNumber(incomePerSecond)}/с
                        </div>
                    </div>
                </div>

                {/* Resources Grid */}
                <div className="space-y-2">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                        <Apple className="w-3 h-3" /> Ресурсы
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                        {resourcesList.filter(r => state.discoveredResources.includes(r.id)).map(res => (
                            <div key={res.id} className={cn(`bg-${res.color}/10 p-2 rounded border border-${res.color}/20 relative overflow-hidden`)}>
                                <div className="flex justify-between items-start">
                                    <div className={cn(`text-[10px] text-${res.color} uppercase font-bold`)}>{res.emoji} {res.name}</div>
                                    {renderResourceDelta(resourceRates[res.id])}
                                </div>
                                <div className="text-sm font-mono font-bold leading-none mt-1">{Math.floor(state.resources[res.id] || 0)}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Workers / Staff Grouped */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                            <Users className="w-3 h-3" /> Персонал
                        </h3>
                        <div className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                            workerCaps.current >= workerCaps.max ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-primary/10 border-primary/20 text-primary"
                        )}>
                            Слоты: {workerCaps.current} / {workerCaps.max}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <div className="text-[9px] text-muted-foreground uppercase font-bold px-1 mb-1 opacity-50">Надзор и Охрана</div>
                            {['guard', 'foreman', 'head_chef'].map(type => renderWorkerItem(type as WorkerType))}
                        </div>

                        <div className="space-y-1">
                            <div className="text-[9px] text-muted-foreground uppercase font-bold px-1 mb-1 opacity-50">Производство</div>
                            {['lumberjack', 'stonecutter', 'miner', 'welder', 'engineer'].map(type => renderWorkerItem(type as WorkerType))}
                        </div>

                        <div className="space-y-1">
                            <div className="text-[9px] text-muted-foreground uppercase font-bold px-1 mb-1 opacity-50">Сервис</div>
                            {['hunter', 'cook', 'fisherman', 'driver'].map(type => renderWorkerItem(type as WorkerType))}
                        </div>
                    </div>
                </div>

                {/* Achievements */}
                <div className="pt-4 border-t border-white/5 space-y-2">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Достижения</h3>
                    <div className="flex flex-wrap gap-1.5">
                        {ACHIEVEMENTS_CONFIG.map(ach => {
                            const isUnlocked = state.achievements.includes(ach.id);
                            const Icon = ach.icon;
                            return (
                                <div key={ach.id} className={cn(
                                    "w-7 h-7 rounded flex items-center justify-center border transition-all",
                                    isUnlocked
                                        ? "bg-primary/20 border-primary text-primary"
                                        : "bg-muted border-muted-foreground/20 text-muted-foreground/50 grayscale"
                                )}>
                                    <Icon className="w-4 h-4" />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Building Statistics */}
                <div className="pt-4 border-t border-white/5 space-y-2">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Hammer className="w-3 h-3" /> Статистика Объектов
                    </h3>
                    <div className="space-y-1">
                        {GENERATORS_CONFIG.filter(g => (state.generators[g.id] || 0) > 0).map(gen => {
                            const count = state.generators[gen.id] || 0;
                            const buildingInstances = state.buildings.filter(b => b.typeId === gen.id && b.isActive && b.status !== 'lunch');

                            // Rough calculation of total performance for this group
                            let groupIncome = 0;
                            const groupResRates: Record<string, number> = {};

                            buildingInstances.forEach(b => {
                                // Re-calculate synergy/eff for this specific building (simplified)
                                let clusterBonus = 0;
                                let chainBonus = 0;
                                let resBonus = 0;

                                state.buildings.forEach(other => {
                                    if (other.id === b.id || !other.isActive) return;
                                    const dist = Math.sqrt(Math.pow(other.x - b.x, 2) + Math.pow(other.y - b.y, 2));
                                    if (other.typeId === b.typeId && dist < SYNERGY_CONFIG.CLUSTER_RADIUS) clusterBonus += SYNERGY_CONFIG.BONUSES.CLUSTER_PER_BUILDING;
                                    const chain = SYNERGY_CONFIG.CHAINS.find((c: any) => c.target === b.typeId && c.source === other.typeId);
                                    if (chain && dist < SYNERGY_CONFIG.CHAIN_RADIUS) chainBonus += SYNERGY_CONFIG.BONUSES.CHAIN_PROCESSOR;
                                    if (other.typeId === 'house' && dist < SYNERGY_CONFIG.RESIDENTIAL_RADIUS) {
                                        if (gen.category === 'market') resBonus += SYNERGY_CONFIG.BONUSES.MARKET_PER_HOUSE;
                                        if (gen.id === 'canteen') resBonus += SYNERGY_CONFIG.BONUSES.CANTEEN_PER_HOUSE;
                                    }
                                });

                                const foremanMul = 1 + (state.workers.foreman || 0) * 0.2;
                                const weatherMul = 1.0; // Simplify display
                                const shiftMul = state.shiftActive ? 2.5 : 1.0;
                                const upgradeBonus = 1 + (b.level - 1) * 0.5;

                                // We don't have a perfect eff here without complex demand logic, but we can show "Potential"
                                const boost = (1 + clusterBonus + chainBonus + resBonus) * upgradeBonus * foremanMul * weatherMul * shiftMul;

                                groupIncome += gen.baseIncome * boost;
                                if (gen.produces) {
                                    Object.entries(gen.produces).forEach(([res, val]) => {
                                        groupResRates[res] = (groupResRates[res] || 0) + (val * boost);
                                    });
                                }
                                if (gen.consumes) {
                                    Object.entries(gen.consumes).forEach(([res, val]) => {
                                        groupResRates[res] = (groupResRates[res] || 0) - (val * boost);
                                    });
                                }
                            });

                            return (
                                <div key={gen.id} className="flex flex-col p-2 bg-secondary/10 rounded border border-white/5">
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="text-[10px] font-bold flex items-center gap-1.5">
                                            <gen.icon className="w-3 h-3 text-primary" />
                                            {gen.name}
                                        </div>
                                        <div className="text-[10px] font-mono font-bold bg-primary/20 px-1.5 rounded">x{count}</div>
                                    </div>
                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 opacity-80">
                                        {groupIncome > 0 && (
                                            <div className="text-[9px] text-green-500 font-bold">+{groupIncome.toFixed(1)} СК/с</div>
                                        )}
                                        {Object.entries(groupResRates).map(([res, val]) => (
                                            <div key={res} className={cn("text-[9px] font-bold", val > 0 ? "text-blue-400" : "text-red-500")}>
                                                {val > 0 ? "+" : ""}{val.toFixed(1)} {res}/с
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-1 flex justify-between items-center">
                                        <div className="text-[8px] text-muted-foreground italic">
                                            Активно: {buildingInstances.length} / {count}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Actions */}
                <div className="pt-4 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-[9px] uppercase font-bold" onClick={handleExport}>
                            <Download className="w-3 h-3" /> Export
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-[9px] uppercase font-bold" onClick={handleImport}>
                            <Upload className="w-3 h-3" /> Import
                        </Button>
                    </div>
                    <Button variant="ghost" size="sm" className="w-full h-7 gap-1.5 text-[9px] uppercase font-bold text-destructive hover:text-white hover:bg-destructive transition-all" onClick={() => {
                        resetGame();
                    }}>
                        <Trash2 className="w-3 h-3" /> Reset Data
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
