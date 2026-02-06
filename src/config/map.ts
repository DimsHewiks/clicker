import type { CellType } from '@/types';
import { GRID_SIZE } from './settings';

export const CANTEEN_INFLUENCE_RADIUS = 4 * GRID_SIZE;
export const HOUSE_NUISANCE_RADIUS = 2 * GRID_SIZE;
export const SUITABILITY_BONUS = 0.1;
export const SUITABILITY_PENALTY = 0.1;
export const INTEREST_BONUS = 0.2;
export const CANTEEN_DISTANCE_PENALTY = 0.15;
export const HOUSE_NUISANCE_HAPPINESS_PENALTY = 0.3;

export const getCellType = (gx: number, gy: number): CellType => {
    const waterNoise = Math.sin(gx * 0.4) * Math.cos(gy * 0.4);
    if (waterNoise > 0.7) return 'water';

    const forestNoise = Math.sin(gx * 0.23 + gy * 0.19) + Math.cos(gy * 0.31);
    if (forestNoise > 1.2) return 'forest';

    const stoneNoise = Math.sin(gx * 0.17 - gy * 0.27) + Math.cos(gx * 0.33);
    if (stoneNoise > 1.15) return 'stone';

    const swampNoise = Math.sin(gx * 0.11 + gy * 0.37) - Math.cos(gx * 0.21);
    if (swampNoise > 0.9) return 'swamp';

    return 'neutral';
};

export const getPreferredCellType = (typeId: string): CellType | null => {
    if (['fish_trap', 'water_purifier', 'river_trading_post', 'fishing_dock'].includes(typeId)) return 'water';
    if (['sawmill', 'hunter_cabin', 'log_splitter'].includes(typeId)) return 'forest';
    if (['stone_quarry'].includes(typeId)) return 'stone';
    if (['clay_pit'].includes(typeId)) return 'swamp';
    return null;
};

export const getSuitabilityMultiplier = (typeId: string, cellType: CellType) => {
    const preferred = getPreferredCellType(typeId);
    if (!preferred) return 1;
    if (cellType === preferred) return 1 + SUITABILITY_BONUS;
    return 1 - SUITABILITY_PENALTY;
};

const hash01 = (gx: number, gy: number) => {
    const val = Math.sin(gx * 12.9898 + gy * 78.233) * 43758.5453;
    return Math.abs(val) % 1;
};

export const isInterestCell = (gx: number, gy: number, cellType: CellType) => {
    if (cellType !== 'forest' && cellType !== 'stone') return false;
    const threshold = cellType === 'forest' ? 0.985 : 0.987;
    return hash01(gx, gy) > threshold;
};
