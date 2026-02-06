import React, { useMemo, useState, useEffect } from 'react';
import { useGame } from '@/context/GameContext';
import { formatNumber } from '@/lib/utils';
import { GENERATORS_CONFIG } from '@/config';
import type { ResourceType, Generator } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, FlaskConical, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type TabType = 'production' | 'market' | 'residential' | 'optimization';
const TABS: TabType[] = ['production', 'market', 'residential', 'optimization'];

const ResearchCard = React.memo(({ gen, isEraLocked, canAfford, preReqBuilt, onResearch, godMode }: {
    gen: Generator,
    isEraLocked: boolean,
    canAfford: boolean,
    preReqBuilt: boolean,
    onResearch: (id: string) => void,
    godMode: boolean
}) => {
    const Icon = gen.icon;
    const costs = gen.researchCost || {};

    if (isEraLocked) {
        return (
            <div className="p-3 border rounded-lg bg-card/30 opacity-40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-md"><Icon className="h-4 w-4" /></div>
                    <div className="text-[9px] font-black text-muted-foreground uppercase">Предыдущая эпоха не завершена</div>
                </div>
                <Lock className="w-3 h-3 text-muted-foreground" />
            </div>
        );
    }

    if (!preReqBuilt) {
        return (
            <div className="p-3 border rounded-lg bg-card/50 opacity-60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-md"><Icon className="h-4 w-4" /></div>
                    <div>
                        <div className="text-[10px] font-bold uppercase">{gen.name}</div>
                        <div className="text-[8px] text-destructive font-black">НУЖНО: {gen.requiredTech?.[0]}</div>
                    </div>
                </div>
                <Lock className="w-4 h-4 text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-3 border rounded-lg bg-blue-950/10 border-blue-500/20 space-y-2 relative group/research">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-md text-blue-400">
                        <Icon className="h-5 w-5" />
                    </div>
                    <div>
                        <h4 className="font-bold text-xs">{gen.name}</h4>
                        <div className="text-[8px] text-blue-400 font-bold uppercase">Чертеж доступен</div>
                    </div>
                </div>
                {gen.description && (
                    <div className="group relative">
                        <Info className="w-3.5 h-3.5 text-blue-400/80 hover:text-blue-400 cursor-help" />
                        <div className="absolute right-0 top-6 w-48 p-2 bg-[#0d0f14] border border-blue-500/30 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none text-[9px] font-medium leading-relaxed text-blue-100/80">
                            {gen.description}
                        </div>
                    </div>
                )}
            </div>
            <div className="flex flex-wrap gap-1">
                {Object.entries(costs).map(([res, amount]) => (
                    <Badge key={res} variant="outline" className="text-[8px] px-1 h-4 border-blue-500/30 text-blue-300">
                        {amount as number} {res.toUpperCase()}
                    </Badge>
                ))}
            </div>
            <Button
                size="sm"
                className="w-full h-7 text-[9px] font-black uppercase bg-blue-600 hover:bg-blue-500 text-white"
                disabled={!godMode && !canAfford}
                onClick={() => onResearch(gen.id)}
            >
                <FlaskConical className="w-3 h-3 mr-1" /> {godMode ? 'МГНОВЕННО' : 'Исследовать'}
            </Button>
        </div>
    );
});

const GeneratorCard = React.memo(({ gen, count, isEraLocked, canAfford, isPlacing, onBuy, resRequirementsMet, godMode }: {
    gen: Generator,
    count: number,
    isEraLocked: boolean,
    canAfford: boolean,
    isPlacing: boolean,
    onBuy: (id: string) => void,
    resRequirementsMet: Record<string, boolean>,
    godMode: boolean
}) => {
    const currentCost = Math.floor(gen.baseCost * Math.pow(1.15, count));

    return (
        <div
            onClick={() => {
                if (isEraLocked) return;
                if (!godMode && !canAfford) return;
                onBuy(gen.id);
            }}
            className={cn(
                "p-3 border rounded-lg transition-all select-none",
                isEraLocked ? "bg-card/20 opacity-40 grayscale" : "bg-card hover:bg-accent/5 cursor-pointer hover:border-primary/50 active:scale-[0.98]",
                isPlacing && "border-blue-500 bg-blue-500/5 shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)]"
            )}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-md border-2",
                        gen.terrain === 'water' ? "border-blue-500/50 bg-blue-500/10 text-blue-400" : "border-amber-700/50 bg-amber-700/10 text-amber-500",
                        count > 0 && "ring-2 ring-green-500/20"
                    )}>
                        <gen.icon className="h-6 w-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-sm tracking-tight flex items-center gap-2">
                            {gen.name}
                            <Badge variant="outline" className={cn(
                                "text-[7px] px-1 h-3 pointer-events-none border-none uppercase font-black",
                                gen.terrain === 'water' ? "bg-blue-500/20 text-blue-300" : "bg-amber-700/20 text-amber-300"
                            )}>
                                {gen.terrain === 'water' ? 'ВОДА' : 'СУША'}
                            </Badge>
                        </h4>
                        <div className="text-[10px] text-muted-foreground flex flex-col gap-0.5 mt-1">
                            {gen.category === 'market' && gen.consumes ? (
                                <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                                    <span>-{(Object.values(gen.consumes)[0] as number)} {Object.keys(gen.consumes)[0]}</span>
                                    <span>→</span>
                                    <span className="text-green-500">+{formatNumber(gen.baseIncome)} СК</span>
                                </div>
                            ) : (
                                <>
                                    {gen.baseIncome > 0 && <span>Доход: +{formatNumber(gen.baseIncome)}/с</span>}
                                    {gen.produces?.wood && <span>Дерево: +{formatNumber(gen.produces.wood as number)}/с</span>}
                                    {gen.produces?.metal && <span>Металл: +{formatNumber(gen.produces.metal as number)}/с</span>}
                                    {gen.produces?.food && <span>Еда: +{formatNumber(gen.produces.food as number)}/с</span>}
                                    {gen.produces?.stone && <span>Камень: +{formatNumber(gen.produces.stone as number)}/с</span>}
                                    {gen.produces?.fuel && <span>Топливо: +{formatNumber(gen.produces.fuel as number)}/с</span>}
                                    {gen.produces?.hides && <span>Шкуры: +{formatNumber(gen.produces.hides as number)}/с</span>}
                                    {gen.produces?.clay && <span>Глина: +{formatNumber(gen.produces.clay as number)}/с</span>}
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    {gen.description && (
                        <div className="group relative">
                            <Info className="w-4 h-4 text-primary/70 hover:text-primary transition-colors cursor-help" />
                            <div className="absolute right-0 top-6 w-56 p-2.5 bg-[#0d0f14] border border-white/10 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 pointer-events-none text-[10px] font-bold leading-relaxed text-white/70 backdrop-blur-xl translate-y-2 group-hover:translate-y-0">
                                <div className="text-[9px] text-primary uppercase tracking-widest mb-1">Информация</div>
                                {gen.description}
                            </div>
                        </div>
                    )}
                    <Button
                        size="sm"
                        disabled={!godMode && (isEraLocked || !canAfford || isPlacing)}
                        className={cn(
                            "h-8 text-[10px] font-bold min-w-[70px] pointer-events-none",
                            isPlacing ? "bg-blue-600 animate-pulse" : (godMode || canAfford ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground grayscale")
                        )}
                    >
                        {isPlacing ? "УСТАНОВКА..." : (godMode ? "БЕСПЛАТНО" : `${formatNumber(currentCost)} СК`)}
                    </Button>
                </div>
            </div>

            {gen.resRequirements && (
                <div className="flex flex-wrap gap-1 mb-2">
                    {Object.entries(gen.resRequirements).map(([res, amount]) => (
                        <Badge
                            key={res}
                            variant="outline"
                            className={cn(
                                "text-[8px] px-1 h-4 font-bold border-none",
                                resRequirementsMet[res] ? "text-green-500 bg-green-500/5" : "text-red-500 bg-red-500/5"
                            )}
                        >
                            {amount as number} {res.toUpperCase()}
                        </Badge>
                    ))}
                </div>
            )}

            <div className="flex items-center justify-between mt-1">
                <div className="text-[10px] text-primary font-bold uppercase tracking-tighter">На объекте: {count}</div>
                {count > 0 && <Badge variant="secondary" className="text-[8px] bg-green-500/10 text-green-500 border-none">РАБОТАЕТ</Badge>}
            </div>
        </div>
    );
});


export const GeneratorsPanel: React.FC = () => {
    const { state, buyGenerator, researchTech } = useGame();
    const { generators, unlockedTechs, constructionStage, godMode, unlockedCategories } = state;
    const [activeTab, setActiveTab] = useState<TabType>('production');
    const isTabUnlocked = (tab: TabType) => godMode || unlockedCategories.includes(tab);

    useEffect(() => {
        if (!isTabUnlocked(activeTab)) {
            const fallback = TABS.find(tab => isTabUnlocked(tab)) || 'production';
            setActiveTab(fallback);
        }
    }, [activeTab, unlockedCategories, godMode]);

    const availableGens = useMemo(() => {
        return GENERATORS_CONFIG.filter(g => g.category === activeTab);
    }, [activeTab]);

    return (
        <div className="flex flex-col h-full bg-[#050505]">
            {/* Tabs */}
            <div className="flex border-b border-white/5 bg-[#0a0a0a]">
                {TABS.filter(tab => isTabUnlocked(tab)).map(tab => {
                    return (
                    <button
                        key={tab}
                        onClick={() => {
                            setActiveTab(tab);
                        }}
                        className={cn(
                            "flex-1 px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-all relative overflow-hidden",
                            activeTab === tab ? "text-primary" : "text-white/40 hover:text-white/70"
                        )}
                    >
                        {tab === 'optimization' ? 'Оптимизация' : tab === 'production' ? 'ПРОИЗВОДСТВО' : tab === 'market' ? 'БИЗНЕС' : 'ЖИЛЬЕ'}
                        {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_-4px_10px_rgba(255,255,255,0.2)]" />}
                    </button>
                    );
                })}
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="space-y-6">
                    {/* Unlocked / To Build */}
                    <div className="space-y-2">
                        {availableGens.filter(g => unlockedTechs.includes(g.id)).map(gen => {
                            const count = generators[gen.id] || 0;
                            const cost = Math.floor(gen.baseCost * Math.pow(1.15, count));
                            const resReqsMet = Object.entries(gen.resRequirements || {}).reduce((acc, [res, amount]) => {
                                acc[res] = (state.resources[res as ResourceType] || 0) >= amount;
                                return acc;
                            }, {} as Record<string, boolean>);

                            const hasRes = Object.values(resReqsMet).every(v => v);

                            return (
                                <GeneratorCard
                                    key={gen.id}
                                    gen={gen}
                                    count={count}
                                    isEraLocked={false}
                                    canAfford={state.balance >= cost && hasRes}
                                    isPlacing={state.placingBuildingTypeId === gen.id}
                                    onBuy={buyGenerator}
                                    resRequirementsMet={resReqsMet}
                                    godMode={godMode}
                                />
                            );
                        })}
                    </div>

                    {/* Research Needed */}
                    {availableGens.filter(g => !unlockedTechs.includes(g.id)).length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 px-1">
                                <FlaskConical className="w-3 h-3 text-blue-400" />
                                <span className="text-[9px] font-black text-blue-400/60 uppercase tracking-widest">НИОКР ТРЕБУЕТСЯ</span>
                            </div>
                            <div className="space-y-2">
                                {availableGens.filter(g => !unlockedTechs.includes(g.id)).map(gen => {
                                    const costs = gen.researchCost || {};
                                    const hasRes = Object.entries(costs).every(([res, amount]) => {
                                        if (res === 'balance') return state.balance >= (amount as number);
                                        return (state.resources[res as ResourceType] || 0) >= (amount as number);
                                    });

                                    const preReqBuilt = !gen.requiredTech || gen.requiredTech.every(id => (generators[id] || 0) > 0);

                                    return (
                                        <ResearchCard
                                            key={gen.id}
                                            gen={gen}
                                            isEraLocked={constructionStage < gen.era}
                                            canAfford={hasRes}
                                            preReqBuilt={preReqBuilt}
                                            onResearch={researchTech}
                                            godMode={godMode}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
