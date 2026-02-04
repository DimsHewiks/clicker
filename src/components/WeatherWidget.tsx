import React from 'react';
import { useGame } from '@/context/GameContext';
import { Sun, CloudRain, Cloud, Bus, Timer } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';

export const WeatherWidget: React.FC = () => {
    const { state } = useGame();
    const { weather, weatherTimer, shiftActive, shiftTimer } = state;

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

    return (
        <Card className="p-4 flex flex-col md:flex-row justify-between items-center gap-4 bg-background/80 backdrop-blur-md sticky top-0 z-50 border-b">
            {/* Weather Section */}
            <div className="flex items-center gap-3 min-w-[200px]">
                <div className="p-2 bg-muted rounded-full">
                    {getWeatherIcon()}
                </div>
                <div className="flex flex-col">
                    <span className="font-bold text-sm">{getWeatherLabel()}</span>
                    <span className="text-xs text-muted-foreground">{Math.ceil(weatherTimer)}s</span>
                </div>
            </div>

            {/* Shift Section */}
            <div className="flex flex-col items-end min-w-[200px]">
                <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-bold ${shiftActive ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {shiftActive ? 'ВАХТА (+100%)' : 'Ожидание вахты'}
                    </span>
                    {shiftActive ? <Bus className="h-4 w-4 text-green-500 animate-bounce" /> : <Timer className="h-4 w-4" />}
                </div>
                <div className="w-full max-w-[200px]">
                    <Progress value={(shiftTimer / (shiftActive ? 30 : 300)) * 100} className="h-2" />
                    <div className="text-right text-xs text-muted-foreground mt-1">
                        {Math.ceil(shiftTimer)}s
                    </div>
                </div>
            </div>
        </Card>
    );
};
