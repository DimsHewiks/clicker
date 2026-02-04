import React from 'react';
import { useGame } from '@/context/GameContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Download, Upload, Trash2, Coins, TrendingUp, Apple,
    Users, Hammer, Flame, Anchor, ChefHat, Zap, Shield,
    ClipboardList, Pickaxe
} from 'lucide-react';
import { ACHIEVEMENTS_CONFIG, WORKER_COSTS } from '@/constants';
import type { WorkerType } from '@/types';
import { cn } from '@/lib/utils';

const formatNumber = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return Math.floor(num).toString();
};

const workerNames: Record<WorkerType, string> = {
    lumberjack: "Лесоруб",
    welder: "Сварщик",
    fisherman: "Рыбак",
    cook: "Повар",
    driver: "Водитель",
    engineer: "Инженер",
    guard: "Охранник",
    foreman: "Прораб",
    head_chef: "Шеф-повар",
    miner: "Шахтер"
};

const workerIcons: Record<WorkerType, React.ElementType> = {
    lumberjack: Hammer,
    welder: Flame,
    fisherman: Anchor,
    cook: ChefHat,
    driver: Zap,
    engineer: Users,
    guard: Shield,
    foreman: ClipboardList,
    head_chef: ChefHat,
    miner: Pickaxe
};

export const LeftPanel: React.FC = () => {
    const { state, incomePerSecond, workerCaps, resetGame, loadGame, hireWorker } = useGame();

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
        const Icon = workerIcons[type];
        const cost = WORKER_COSTS[type];
        const count = state.workers[type] || 0;
        const cap = (workerCaps as any)[type] || (workerCaps as any).default || Infinity;
        const isCapped = count >= cap;
        const canAfford = state.balance >= cost && !isCapped;

        return (
            <div key={type} className="flex items-center justify-between p-1.5 bg-secondary/20 rounded-md border border-transparent hover:border-primary/10 transition-all">
                <div className="flex items-center gap-2">
                    <div className="p-1 bg-background rounded text-primary">
                        <Icon className="w-3 h-3" />
                    </div>
                    <div>
                        <div className="text-[11px] font-medium leading-none">{workerNames[type]}</div>
                        <div className={cn("text-[9px] mt-0.5 font-bold", isCapped ? "text-orange-500" : "text-muted-foreground")}>
                            {count}{cap !== Infinity ? ` / ${cap}` : ''}
                        </div>
                    </div>
                </div>
                <Button
                    size="sm"
                    variant="ghost"
                    className={cn("h-6 text-[10px] px-1.5", canAfford ? "text-primary" : "text-muted-foreground opacity-50")}
                    onClick={() => hireWorker(type)}
                    disabled={!canAfford}
                >
                    {isCapped ? "MAX" : formatNumber(cost)}
                </Button>
            </div>
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
                        <div className="bg-orange-500/10 p-2 rounded border border-orange-500/20">
                            <div className="text-[10px] text-orange-400 uppercase font-bold">Еда</div>
                            <div className="text-sm font-mono font-bold leading-none mt-1">{Math.floor(state.resources.food)}</div>
                        </div>
                        <div className="bg-amber-700/10 p-2 rounded border border-amber-700/20">
                            <div className="text-[10px] text-amber-600 uppercase font-bold">Дерево</div>
                            <div className="text-sm font-mono font-bold leading-none mt-1">{Math.floor(state.resources.wood)}</div>
                        </div>
                        <div className="bg-blue-500/10 p-2 rounded border border-blue-500/20">
                            <div className="text-[10px] text-blue-400 uppercase font-bold">Металл</div>
                            <div className="text-sm font-mono font-bold leading-none mt-1">{Math.floor(state.resources.metal)}</div>
                        </div>
                        <div className="bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
                            <div className="text-[10px] text-emerald-500 uppercase font-bold">Бетон</div>
                            <div className="text-sm font-mono font-bold leading-none mt-1">{Math.floor(state.resources.concrete || 0)}</div>
                        </div>
                    </div>
                </div>

                {/* Workers / Staff Grouped */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                        <Users className="w-3 h-3" /> Персонал
                    </h3>

                    <div className="space-y-1">
                        <div className="text-[9px] text-muted-foreground uppercase font-bold px-1 mb-1 opacity-50">Надзор и Охрана</div>
                        {['guard', 'foreman', 'head_chef'].map(type => renderWorkerItem(type as WorkerType))}
                    </div>

                    <div className="space-y-1">
                        <div className="text-[9px] text-muted-foreground uppercase font-bold px-1 mb-1 opacity-50">Производство</div>
                        {['miner', 'lumberjack', 'welder', 'engineer'].map(type => renderWorkerItem(type as WorkerType))}
                    </div>

                    <div className="space-y-1">
                        <div className="text-[9px] text-muted-foreground uppercase font-bold px-1 mb-1 opacity-50">Сервис</div>
                        {['cook', 'driver', 'fisherman'].map(type => renderWorkerItem(type as WorkerType))}
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
                        if (confirm("Reset ALL progress?")) resetGame();
                    }}>
                        <Trash2 className="w-3 h-3" /> Reset Data
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
