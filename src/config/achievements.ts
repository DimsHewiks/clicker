import { Banknote, Hammer, Star, Zap } from 'lucide-react';
import type { Achievement } from '@/types';

export const ACHIEVEMENTS_CONFIG: Achievement[] = [
    {
        id: 'first_click',
        name: 'Первый кирпич',
        description: 'Сделайте первый клик.',
        icon: Hammer,
        condition: (state) => state.clickCount >= 1
    },
    {
        id: 'savings_1k',
        name: 'Копилка',
        description: 'Накопите 1,000 СК.',
        icon: Banknote,
        condition: (state) => state.balance >= 1000
    },
    {
        id: 'builder_lvl2',
        name: 'Фундамент готов',
        description: 'Перейдите на этап "Фундамент".',
        icon: Star,
        condition: (state) => state.constructionStage >= 1
    },
    {
        id: 'shift_master',
        name: 'Стахановец',
        description: 'Активируйте вахту.',
        icon: Zap,
        condition: (state) => state.shiftActive
    }
];
