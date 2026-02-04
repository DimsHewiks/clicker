import React, { useMemo } from 'react';
import { useGame } from '@/context/GameContext';
import { formatNumber } from '@/lib/utils';
import { GENERATORS_CONFIG, ERAS } from '@/constants';
import type { ResourceType } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, FlaskConical, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const GeneratorsPanel: React.FC = () => {
    const { state, buyGenerator, researchTech } = useGame();

    // Calculate era mastery
    const eraStatus = useMemo(() => {
        return ERAS.map(era => {
            const eraItems = GENERATORS_CONFIG.filter(g => g.era === era.id);
            const allResearched = eraItems.every(g => state.unlockedTechs.includes(g.id));
            // "all built" means at least one of each generator in the era is built
            const allBuilt = eraItems.every(g => (state.generators[g.id] || 0) > 0);
            return {
                id: era.id,
                isMastered: allResearched && allBuilt,
                allResearched
            };
        });
    }, [state.unlockedTechs, state.generators]);

    const renderResearchItem = (gen: any, isEraLocked: boolean) => {
        const costs = gen.researchCost || {};
        const canAfford = Object.entries(costs).every(([res, amount]) => {
            if (res === 'balance') return state.balance >= (amount as number);
            return (state.resources[res as ResourceType] || 0) >= (amount as number);
        });

        const preReqBuilt = gen.requiredTech?.every((techId: string) => (state.generators[techId] || 0) > 0) ?? true;

        if (isEraLocked) {
            return (
                <div key={gen.id} className="p-3 border rounded-lg bg-card/30 opacity-40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-md"><gen.icon className="h-4 w-4" /></div>
                        <div className="text-[9px] font-black text-muted-foreground uppercase">Предыдущая эпоха не завершена</div>
                    </div>
                    <Lock className="w-3 h-3 text-muted-foreground" />
                </div>
            );
        }

        if (!preReqBuilt) {
            return (
                <div key={gen.id} className="p-3 border rounded-lg bg-card/50 opacity-60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-md"><gen.icon className="h-4 w-4" /></div>
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
            <div key={gen.id} className="p-3 border rounded-lg bg-blue-950/10 border-blue-500/20 space-y-2">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-md text-blue-400">
                            <gen.icon className="h-5 w-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-xs">{gen.name}</h4>
                            <div className="text-[8px] text-blue-400 font-bold uppercase">Чертеж доступен</div>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-1">
                    {Object.entries(costs).map(([res, amount]) => (
                        <Badge key={res} variant="outline" className="text-[8px] px-1 h-4 border-blue-500/30 text-blue-300">
                            {amount} {res.toUpperCase()}
                        </Badge>
                    ))}
                </div>
                <Button
                    size="sm"
                    className="w-full h-7 text-[9px] font-black uppercase bg-blue-600 hover:bg-blue-500 text-white"
                    disabled={!canAfford}
                    onClick={() => researchTech(gen.id)}
                >
                    <FlaskConical className="w-3 h-3 mr-1" /> Исследовать
                </Button>
            </div>
        );
    };

    return (
        <Card className="h-full border-l rounded-none md:rounded-lg flex flex-col overflow-hidden">
            <CardHeader className="py-3 px-4 border-b bg-card/50">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Дерево Технологий</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-8">
                {ERAS.map((era, index) => {
                    const status = eraStatus[index];
                    const isEraLocked = index > 0 && !eraStatus[index - 1].isMastered;

                    return (
                        <div key={era.id} className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-border" />
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "text-[10px] font-black uppercase tracking-wider",
                                        status.isMastered ? "text-green-500" : isEraLocked ? "text-muted-foreground/50" : "text-primary/70"
                                    )}>
                                        {era.name}
                                    </span>
                                    {status.isMastered && <CheckCircle2 className="w-4 h-4 text-green-500 fill-green-500/10" />}
                                </div>
                                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-border" />
                            </div>

                            <div className="space-y-2">
                                {GENERATORS_CONFIG.filter(g => g.era === era.id).map((gen) => {
                                    const isUnlocked = state.unlockedTechs.includes(gen.id);
                                    if (!isUnlocked) return renderResearchItem(gen, isEraLocked);

                                    const count = state.generators[gen.id] || 0;
                                    const currentCost = Math.floor(gen.baseCost * Math.pow(1.15, count));
                                    const canAfford = state.balance >= currentCost;

                                    return (
                                        <div key={gen.id} className={cn(
                                            "p-3 border rounded-lg transition-all",
                                            isEraLocked ? "bg-card/20 opacity-40 grayscale" : "bg-card hover:bg-accent/5"
                                        )}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "p-2 rounded-md",
                                                        count > 0 ? "bg-green-500/10 text-green-500" : "bg-primary/10 text-primary"
                                                    )}>
                                                        <gen.icon className="h-6 w-6" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-sm tracking-tight">{gen.name}</h4>
                                                        <div className="text-[10px] text-muted-foreground flex flex-col gap-0.5 mt-1">
                                                            {gen.baseIncome > 0 && <span>Доход: +{formatNumber(gen.baseIncome)}/с</span>}
                                                            {gen.produces?.wood && <span>Дерево: +{formatNumber(gen.produces.wood)}/с</span>}
                                                            {gen.produces?.metal && <span>Металл: +{formatNumber(gen.produces.metal)}/с</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    disabled={status.isMastered || isEraLocked || !canAfford || (state.placingBuildingTypeId !== null && state.placingBuildingTypeId !== gen.id)}
                                                    onClick={() => buyGenerator(gen.id)}
                                                    className={cn(
                                                        "h-8 text-[10px] font-bold min-w-[70px]",
                                                        state.placingBuildingTypeId === gen.id ? "bg-blue-600 animate-pulse" : (canAfford ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground grayscale")
                                                    )}
                                                >
                                                    {state.placingBuildingTypeId === gen.id ? "PLACING..." : `${formatNumber(currentCost)} СК`}
                                                </Button>
                                            </div>
                                            <div className="flex items-center justify-between mt-1">
                                                <div className="text-[10px] text-primary font-bold uppercase tracking-tighter">На объекте: {count}</div>
                                                {count > 0 && <Badge variant="secondary" className="text-[8px] bg-green-500/10 text-green-500 border-none">РАБОТАЕТ</Badge>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
};
