import React from 'react';
import { useGame } from '@/context/GameContext';
import { Smile, Meh, Frown, AlertTriangle, Star, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export const HappinessWidget: React.FC = () => {
    const { state } = useGame();
    const { happiness, reputation } = state;

    const getMoodIcon = () => {
        if (happiness >= 90) return <Smile className="h-5 w-5 text-green-500 animate-pulse" />;
        if (happiness >= 50) return <Smile className="h-5 w-5 text-green-400" />;
        if (happiness >= 25) return <Meh className="h-5 w-5 text-yellow-500" />;
        if (happiness >= 10) return <Frown className="h-5 w-5 text-orange-500" />;
        return <AlertTriangle className="h-5 w-5 text-red-600 animate-bounce" />;
    };

    const getMoodLabel = () => {
        if (happiness >= 90) return 'Эйфория';
        if (happiness >= 50) return 'Довольны';
        if (happiness >= 25) return 'Недовольство';
        if (happiness >= 10) return 'Кризис';
        return 'Забастовка';
    };

    const totalWorkers = Object.values(state.workers).reduce((a, b) => a + (b || 0), 0);
    const housingCapacity = 5 + (state.generators.house || 0) * 5;
    const isHousingOk = totalWorkers <= housingCapacity;
    const isFoodOk = state.resources.food > 100;
    const happinessTrend = isFoodOk && isHousingOk;

    return (
        <div className="flex items-center gap-6 px-5 py-2 bg-[#1a1c23]/60 backdrop-blur-xl rounded-2xl border border-white/5 relative group hover:border-primary/30 transition-all duration-300 shadow-2xl">
            {/* Reputation Section */}
            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-xl border border-white/5 group-hover:bg-blue-500/10 transition-colors" title="Репутация поселения">
                <div className="relative">
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 group-hover:animate-spin-slow transition-transform" />
                    <div className="absolute inset-0 blur-sm bg-yellow-400/30 -z-10 animate-pulse" />
                </div>
                <div className="flex flex-col -gap-1">
                    <span className="text-[10px] font-black leading-none tabular-nums text-yellow-50">{Math.floor(reputation)}</span>
                    <span className="text-[7px] font-black uppercase tracking-widest text-yellow-500/70">REP</span>
                </div>
            </div>

            {/* Divider */}
            <div className="w-[1px] h-8 bg-gradient-to-b from-transparent via-white/10 to-transparent" />

            {/* Happiness Display */}
            <div className="flex items-center gap-3 cursor-default group/h">
                <div className="relative">
                    <div className="p-2 bg-background/80 rounded-xl border border-white/10 transition-transform group-hover/h:scale-110">
                        {getMoodIcon()}
                    </div>
                    <div className={cn(
                        "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#1a1c23] animate-pulse",
                        happiness >= 50 ? "bg-green-500" : "bg-red-500"
                    )} />
                </div>

                <div className="flex flex-col min-w-[100px]">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={cn(
                            "text-[10px] font-black tracking-tight uppercase leading-none",
                            happiness >= 90 ? "text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" :
                                happiness >= 50 ? "text-green-400/80" :
                                    happiness >= 25 ? "text-yellow-400/80" :
                                        "text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]"
                        )}>
                            {getMoodLabel()}
                        </span>
                        <div className="flex items-center gap-0.5">
                            <span className="text-[11px] font-black tabular-nums text-white/90">{Math.round(happiness)}</span>
                            <span className="text-[8px] font-bold text-white/40">%</span>
                        </div>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                        <div
                            className={cn(
                                "h-full transition-all duration-700 ease-out relative",
                                happiness >= 90 ? "bg-gradient-to-r from-green-600 to-green-400" :
                                    happiness >= 50 ? "bg-gradient-to-r from-green-700 to-green-500" :
                                        happiness >= 25 ? "bg-gradient-to-r from-yellow-600 to-yellow-400" :
                                            "bg-gradient-to-r from-red-700 to-red-500"
                            )}
                            style={{ width: `${happiness}%` }}
                        >
                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-center p-1.5 bg-white/5 rounded-lg opacity-40 group-hover/h:opacity-100 group-hover/h:bg-white/10 transition-all">
                    <Info className="h-3 w-3 text-white" />
                </div>
            </div>

            {/* Custom Tooltip / Detailed Info */}
            <div className="absolute top-[110%] left-1/2 -translate-x-1/2 w-64 p-4 bg-[#14161b]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-[60]">
                <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                        <p className="font-black text-[10px] uppercase tracking-[0.2em] text-blue-400">Настроение Поселения</p>
                        <div className={cn(
                            "px-2 py-0.5 rounded text-[8px] font-black uppercase",
                            happinessTrend ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                        )}>
                            {happinessTrend ? "Растет" : "Падает"}
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        <div className="flex justify-between items-center group/item">
                            <span className="text-[10px] font-bold text-white/50 group-hover/item:text-white/80 transition-colors uppercase tracking-wider">Продовольствие</span>
                            <span className={cn("text-[10px] font-black px-1.5 py-0.5 rounded", isFoodOk ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}>
                                {isFoodOk ? "+ СЫТОСТЬ" : "- ГОЛОД"}
                            </span>
                        </div>
                        <div className="flex justify-between items-center group/item">
                            <span className="text-[10px] font-bold text-white/50 group-hover/item:text-white/80 transition-colors uppercase tracking-wider">Размещение</span>
                            <span className={cn("text-[10px] font-black px-1.5 py-0.5 rounded", isHousingOk ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}>
                                {isHousingOk ? "+ КОМФОРТ" : "- ТЕСНОТА"}
                            </span>
                        </div>
                    </div>

                    <div className="pt-3 border-t border-white/5">
                        <p className="text-[9px] text-white/30 uppercase font-black mb-2 tracking-widest">Активный Эффект</p>
                        {happiness >= 90 ? (
                            <div className="relative overflow-hidden group/eff">
                                <div className="absolute inset-0 bg-green-500/20 blur-xl animate-pulse" />
                                <div className="relative p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
                                    <p className="text-green-400 font-black text-[11px] animate-pulse">КРИТИЧЕСКИЙ УСПЕХ +5%</p>
                                    <p className="text-[8px] text-green-400/60 mt-1 font-bold">Производство может удвоиться</p>
                                </div>
                            </div>
                        ) : happiness < 25 ? (
                            <div className="p-3 bg-red-600/10 border border-red-600/30 rounded-xl relative overflow-hidden text-center">
                                <div className="absolute inset-0 bg-red-600/5 animate-pulse" />
                                <p className="text-red-500 font-black text-[11px] mb-1">РИСК ЗАБАСТОВКИ</p>
                                <p className="text-[8px] text-red-500/60 font-bold">Здания могут прекратить работу</p>
                            </div>
                        ) : (
                            <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-center">
                                <p className="text-white/80 font-black text-[10px] mb-1 uppercase tracking-wide">Стабильное развитие</p>
                                <p className="text-[8px] text-white/40 font-bold">Эффекты отсутствуют</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
