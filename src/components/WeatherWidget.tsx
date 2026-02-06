import React from 'react';
import { useGame } from '@/context/GameContext';
import { Sun, CloudRain, Cloud, Bus, Timer, Coins, Apple, Hammer, Pickaxe, Flame, Shield, Mountain } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { HappinessWidget } from './HappinessWidget';
import { cn, formatNumber } from '@/lib/utils';
import { Zap } from 'lucide-react';
import type { ResourceType } from '@/types';


export const WeatherWidget: React.FC = () => {
    const { state, incomePerSecond, resourceRates, toggleGodMode } = useGame();
    const { weather, shiftActive, shiftTimer, godMode } = state;

    const getWeatherIcon = () => {
        switch (weather) {
            case 'sun': return <Sun className="h-6 w-6 text-yellow-500 animate-spin-slow" />;
            case 'rain': return <CloudRain className="h-6 w-6 text-blue-500" />;
            default: return <Cloud className="h-6 w-6 text-gray-500" />;
        }
    };

    const getWeatherLabel = () => {
        switch (weather) {
            case 'sun': return 'Солнечно (+20%)';
            case 'rain': return 'Дождь (-30%)';
            default: return 'Облачно (Норма)';
        }
    }

    const renderRate = (rate: number) => {
        if (Math.abs(rate) < 0.01) return null;
        return (
            <span className={cn(
                "text-[8px] font-black tabular-nums transition-colors",
                rate > 0 ? "text-green-500" : "text-red-500"
            )}>
                {rate > 0 ? '+' : ''}{rate.toFixed(1)}/с
            </span>
        );
    };

    const resourceLabels: Record<ResourceType, string> = {
        food: 'Еда',
        wood: 'Дерево',
        stone: 'Камень',
        metal: 'Металл',
        sand: 'Песок',
        concrete: 'Бетон',
        fuel: 'Топливо',
        hides: 'Шкуры',
        clay: 'Глина'
    };

    return (
        <Card className="py-1 px-4 flex flex-col xl:flex-row justify-between items-center gap-2 xl:gap-4 bg-[#0d0f14]/90 backdrop-blur-3xl sticky top-0 z-50 border-b border-white/5 h-auto xl:h-[72px] shadow-[0_4px_30px_rgba(0,0,0,0.8)] rounded-none">
            {/* Left: Weather & Balance */}
            <div className="flex items-center gap-4 xl:gap-6">
                {/* Weather */}
                <div className="flex items-center gap-2 xl:gap-3">
                    <div className="p-1.5 xl:p-2 bg-white/5 rounded-xl border border-white/10">
                        {getWeatherIcon()}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-black text-[9px] tracking-widest uppercase text-white/30 truncate max-w-[80px]">Погода</span>
                        <span className="font-bold text-[10px] xl:text-xs text-white/90 whitespace-nowrap">{getWeatherLabel()}</span>
                    </div>
                </div>

                <div className="w-[1px] h-8 bg-white/5" />

                {/* Balance */}
                <div className="flex items-center gap-2 xl:gap-3 px-2 xl:px-3 py-1 bg-yellow-500/5 rounded-xl border border-yellow-500/20 group hover:bg-yellow-500/10 transition-colors cursor-default">
                    <div className="relative">
                        <Coins className="h-3.5 w-3.5 xl:h-4 xl:w-4 text-yellow-500 group-hover:scale-110 transition-transform" />
                        <div className="absolute inset-0 blur-md bg-yellow-500/20 -z-10" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[12px] xl:text-[14px] font-black text-white leading-none tabular-nums">{formatNumber(state.balance)} <span className="text-[9px] xl:text-[10px] text-yellow-500/80 uppercase">СК</span></span>
                        <span className="text-[8px] xl:text-[9px] font-bold text-green-500 tracking-tighter">+{formatNumber(incomePerSecond || 0)}/с</span>
                    </div>
                </div>
            </div>

            {/* Middle: Resources & Happiness */}
            <div className="flex items-center gap-4 xl:gap-6 flex-1 justify-center">
                {/* Core Resources */}
                <div className="hidden lg:flex items-center gap-2 xl:gap-4 px-3 xl:px-4 py-1 bg-white/5 rounded-2xl border border-white/5 h-[44px] xl:h-[48px]">
                    {[
                        { id: 'food', icon: Apple, color: 'text-orange-400' },
                        { id: 'wood', icon: Hammer, color: 'text-amber-600' },
                        { id: 'stone', icon: Pickaxe, color: 'text-slate-400' },
                        { id: 'fuel', icon: Flame, color: 'text-amber-400' },
                        { id: 'hides', icon: Shield, color: 'text-yellow-200' },
                        { id: 'clay', icon: Mountain, color: 'text-orange-300' }
                    ].filter(res => state.discoveredResources.includes(res.id as ResourceType)).map(res => (
                        <div key={res.id} className="flex items-center gap-2 px-1 xl:px-2 hover:bg-white/5 rounded-lg transition-colors cursor-default min-w-[60px] xl:min-w-[70px]" title={resourceLabels[res.id as ResourceType]}>
                            <res.icon className={cn("h-3.5 w-3.5 xl:h-4 xl:w-4", res.color)} />
                            <div className="flex flex-col -space-y-1">
                                <span className="text-[11px] xl:text-[12px] font-black text-white leading-none tabular-nums">{formatNumber(state.resources[res.id as keyof typeof state.resources] || 0)}</span>
                                {renderRate(resourceRates[res.id as keyof typeof resourceRates] || 0)}
                            </div>
                        </div>
                    ))}
                </div>

                {state.heatEnabled && (
                    <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-orange-500/10 rounded-2xl border border-orange-500/20 h-[44px] xl:h-[48px]">
                        <Flame className="h-3.5 w-3.5 xl:h-4 xl:w-4 text-orange-400" />
                        <div className="flex flex-col -space-y-1">
                            <span className="text-[10px] xl:text-[11px] font-black text-orange-100 uppercase tracking-wider">Тепло</span>
                            <span className="text-[11px] xl:text-[12px] font-black text-white tabular-nums">{Math.round(state.heat)}%</span>
                        </div>
                    </div>
                )}

                {Object.values(state.workers).some(v => v > 0) && <HappinessWidget />}
            </div>

            {/* Right: Shift Info */}
            <div className="flex items-center gap-4 xl:gap-6 justify-end">
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 mb-1 group">
                        <span className={cn(
                            "text-[8px] xl:text-[9px] font-black tracking-[0.2em] uppercase",
                            shiftActive ? 'text-green-400' : 'text-white/20'
                        )}>
                            {shiftActive ? 'АКТИВНАЯ ВАХТА' : 'ОЖИДАНИЕ'}
                        </span>
                        <div className={cn(
                            "p-1 xl:p-1.5 rounded-lg border transition-all",
                            shiftActive ? "bg-green-500/20 border-green-500/30" : "bg-white/5 border-white/10 text-white/20"
                        )}>
                            <Bus className="h-2.5 w-2.5 xl:h-3 xl:w-3" />
                        </div>
                    </div>
                    <div className="w-16 xl:w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className={cn("h-full transition-all duration-1000", shiftActive ? "bg-green-500" : "bg-white/20")}
                            style={{ width: `${(shiftTimer / (shiftActive ? 30 : 300)) * 100}%` }}
                        />
                    </div>
                </div>

                <div className="hidden sm:flex items-center gap-2 text-white/30 group cursor-help">
                    <div className="p-1.5 xl:p-2 bg-white/5 rounded-full group-hover:bg-white/10 transition-colors">
                        <Timer className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
                    </div>
                </div>

                <div className="w-[1px] h-8 bg-white/5" />

                <button
                    onClick={toggleGodMode}
                    className={cn(
                        "flex items-center gap-2 px-2 xl:px-3 py-1 xl:py-1.5 rounded-xl border transition-all duration-300",
                        godMode ? "bg-purple-500/20 border-purple-500/50 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]" : "bg-white/5 border-white/10 text-white/20 hover:bg-white/10"
                    )}
                >
                    <Zap className={cn("h-3.5 w-3.5 xl:h-4 xl:w-4", godMode && "animate-pulse")} />
                    <span className="text-[9px] xl:text-[10px] font-black tracking-widest uppercase whitespace-nowrap">
                        {godMode ? 'GOD ON' : 'GOD'}
                    </span>
                </button>
            </div>
        </Card>
    );
};
