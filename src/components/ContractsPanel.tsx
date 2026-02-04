import React from 'react';
import { useGame } from '@/context/GameContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Coins, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ContractsPanel: React.FC = () => {
    const { state, completeContract } = useGame();

    return (
        <Card className="border-t md:border-t-0 md:border-l rounded-none">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-blue-500" /> Активные Контракты
                </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
                {state.activeContracts.length === 0 && (
                    <div className="text-[10px] text-muted-foreground uppercase text-center py-4 border-2 border-dashed rounded-lg opacity-50">
                        Ожидание новых заказов...
                    </div>
                )}
                {state.activeContracts.map(contract => {
                    const req = contract.requirement;
                    const hasEnough = req.type === 'balance'
                        ? state.balance >= req.amount
                        : (state.resources[req.type] || 0) >= req.amount;

                    return (
                        <div key={contract.id} className="p-3 bg-secondary/20 rounded-lg border border-primary/10 space-y-2">
                            <div className="flex justify-between items-start">
                                <h4 className="text-[11px] font-black uppercase leading-tight">{contract.title}</h4>
                                <div className="p-1 bg-blue-500/10 rounded">
                                    <Package className="w-3 h-3 text-blue-400" />
                                </div>
                            </div>
                            <p className="text-[9px] text-muted-foreground leading-snug">{contract.description}</p>

                            <div className="flex items-center justify-between pt-1">
                                <div className="flex flex-col gap-0.5">
                                    <div className={cn("text-[9px] font-bold", hasEnough ? "text-green-500" : "text-destructive")}>
                                        НУЖНО: {req.amount} {req.type.toUpperCase()}
                                    </div>
                                    <div className="text-[9px] text-yellow-500 font-bold flex items-center gap-1">
                                        НАГРАДА: {contract.reward.amount} {contract.reward.type.toUpperCase()}
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    disabled={!hasEnough}
                                    onClick={() => completeContract(contract.id)}
                                    className="h-6 text-[9px] px-2 font-black uppercase bg-blue-600 hover:bg-blue-500 text-white"
                                >
                                    СДАТЬ
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
};
