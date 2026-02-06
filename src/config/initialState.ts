import type { GameState, ResourceType } from '@/types';

export const INITIAL_STATE: GameState = {
    balance: 1500,
    resources: { food: 800, wood: 0, metal: 0, concrete: 0, sand: 0, stone: 0 },
    workers: { lumberjack: 0, stonecutter: 0, hunter: 0, fisherman: 0, cook: 0, miner: 0, driver: 0, welder: 0, engineer: 0, guard: 0, foreman: 0, head_chef: 0 },
    clickCount: 0,
    generators: {
        sawmill: 0, house: 0, stone_quarry: 0, hunter_cabin: 0, canteen: 0,
        fish_trap: 0, water_purifier: 0, river_trading_post: 0,
        fishing_dock: 0, truck: 0, iron_mine: 0, sand_quarry: 0, excavator: 0,
        workshop: 0, concrete_plant: 0, crane: 0, wood_market: 0, fish_market: 0
    },
    buildings: [],
    unlockedTechs: ['sawmill', 'house', 'wood_market', 'fish_trap', 'chapel'],
    discoveredResources: ['food'] as ResourceType[],
    activeContracts: [],
    lastSaveTime: Date.now(),
    weather: 'neutral' as const,
    weatherTimer: 60,
    shiftActive: false,
    shiftTimer: 300,
    constructionStage: 0,
    achievements: [],
    placingBuildingTypeId: null as string | null,
    happiness: 100,
    reputation: 0,
    godMode: false,
    notifications: [],
    unlockedCategories: ['production', 'residential'],
};
