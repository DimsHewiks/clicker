export type WeatherType = 'sun' | 'rain' | 'neutral';
export type ResourceType = 'food' | 'wood' | 'metal' | 'concrete' | 'sand' | 'stone';
export type WorkerType = 'lumberjack' | 'welder' | 'fisherman' | 'cook' | 'driver' | 'engineer' | 'guard' | 'foreman' | 'head_chef' | 'miner' | 'stonecutter' | 'hunter';

export interface Generator {
    id: string;
    name: string;
    baseCost: number;
    baseIncome: number;
    icon: React.ElementType; // Lucide icon
    workerReq?: Partial<Record<WorkerType, number>>;
    consumes?: Partial<Record<ResourceType, number>>;
    produces?: Partial<Record<ResourceType, number>>;
    resRequirements?: Partial<Record<ResourceType, number>>;
    researchCost?: Partial<Record<ResourceType | 'balance', number>>; // New: Resource cost to unlock
    requiredTech?: string[]; // Existing: Building ID required to unlock this
    era: number; // New: 0 (Camp), 1 (Quarry), 2 (Industrial)
    category: 'production' | 'residential' | 'utility' | 'market';
}

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: React.ElementType;
    condition: (state: GameState) => boolean;
}

export interface Contract {
    id: string;
    title: string;
    description: string;
    requirement: { type: ResourceType | 'balance'; amount: number };
    reward: { type: 'balance' | ResourceType; amount: number };
}

export interface Building {
    id: string; // Unique instance ID
    typeId: string; // Ref to Generator ID
    x: number;
    y: number;
    isPlaced: boolean;
    status: 'working' | 'lunch' | 'starving';
    lunchTimer: number;
    level: number;
    targetCanteenId?: string; // New: For visual lines
    isMissingWorkers: boolean; // New: For UI feedback
    isActive: boolean;
}

export interface GameState {
    balance: number;
    resources: Record<ResourceType, number>;
    workers: Record<WorkerType, number>;
    clickCount: number;
    generators: Record<string, number>; // id -> count
    buildings: Building[];
    unlockedTechs: string[]; // New: List of researched buildings
    activeContracts: Contract[];
    lastSaveTime: number;
    weather: WeatherType;
    weatherTimer: number;
    shiftActive: boolean;
    shiftTimer: number;
    constructionStage: number;
    achievements: string[];
    placingBuildingTypeId: string | null;
    discoveredResources: ResourceType[];
}

export type GameAction =
    | { type: 'CLICK'; amount: number }
    | { type: 'TICK'; dt: number }
    | { type: 'BUY_GENERATOR'; id: string; cost: number }
    | { type: 'RESEARCH_TECH'; id: string }
    | { type: 'UPGRADE_BUILDING'; buildingId: string }
    | { type: 'COMPLETE_CONTRACT'; contractId: string }
    | { type: 'HIRE_WORKER'; workerType: WorkerType; cost: number }
    | { type: 'SET_WEATHER'; weather: WeatherType }
    | { type: 'ACTIVATE_SHIFT' }
    | { type: 'END_SHIFT' }
    | { type: 'UNLOCK_ACHIEVEMENT'; id: string }
    | { type: 'LOAD_GAME'; state: GameState }
    | { type: 'RESET_GAME' }
    | { type: 'START_PLACEMENT'; typeId: string }
    | { type: 'PLACE_BUILDING'; x: number; y: number }
    | { type: 'MOVE_BUILDING'; id: string; x: number; y: number }
    | { type: 'TOGGLE_BUILDING'; id: string }
    | { type: 'FIRE_WORKER'; workerType: WorkerType }
    | { type: 'CANCEL_PLACEMENT' };

export const CONSTRUCTION_STAGES = [
    { id: 0, name: 'Swamp', threshold: 0 },
    { id: 1, name: 'Foundation', threshold: 10000 },
    { id: 2, name: 'Skeleton', threshold: 100000 },
    { id: 3, name: 'Walls', threshold: 500000 },
    { id: 4, name: 'Finishing', threshold: 2500000 },
    { id: 5, name: 'Skyscraper', threshold: 25000000 },
];
