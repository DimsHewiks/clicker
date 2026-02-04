import { Truck, Pickaxe, Factory, TowerControl, Tent, Plane, Trophy, Banknote, Hammer, Zap, Star, Utensils, Fish } from 'lucide-react';
import type { Generator, Achievement, WorkerType, ResourceType } from './types';

export const WORKER_COSTS: Record<WorkerType, number> = {
    lumberjack: 150,
    welder: 400,
    fisherman: 100,
    cook: 300,
    driver: 500,
    engineer: 2000,
    guard: 1000,
    foreman: 5000,
    head_chef: 3000,
    miner: 800,
};

export const FOOD_CONSUMPTION_RATE = 0.15;

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

export const LUNCH_INTERVAL = 60;
export const WALK_SPEED = 40;
export const GRID_SIZE = 40;

export const ERAS = [
    { id: 0, name: 'Эпоха Лагеря' },
    { id: 1, name: 'Эпоха Карьера' },
    { id: 2, name: 'Эпоха Промышленности' }
];

export const GENERATORS_CONFIG: Generator[] = [
    {
        id: 'sawmill',
        name: 'Лесопилка',
        baseCost: 200,
        baseIncome: 0,
        icon: Hammer,
        produces: { wood: 1 },
        workerReq: { lumberjack: 1 },
        era: 0
    },
    {
        id: 'house',
        name: 'Жилой дом',
        baseCost: 500,
        baseIncome: 0,
        icon: Tent,
        era: 0
    },
    {
        id: 'canteen',
        name: 'Столовая',
        baseCost: 300,
        baseIncome: 0,
        icon: Utensils,
        produces: { food: 2 },
        resRequirements: { wood: 50 },
        researchCost: { wood: 20 },
        workerReq: { cook: 1 },
        era: 0
    },
    {
        id: 'fishing_dock',
        name: 'Рыбацкий причал',
        baseCost: 800,
        baseIncome: 0,
        icon: Fish,
        produces: { food: 4 },
        resRequirements: { wood: 100 },
        requiredTech: ['canteen'],
        researchCost: { wood: 50 },
        workerReq: { fisherman: 1 },
        era: 1
    },
    {
        id: 'truck',
        name: 'Грузовик',
        baseCost: 1500,
        baseIncome: 25,
        icon: Truck,
        researchCost: { balance: 500 },
        workerReq: { driver: 1 },
        era: 1
    },
    {
        id: 'iron_mine',
        name: 'Железный рудник',
        baseCost: 12000,
        baseIncome: 0,
        icon: Factory,
        produces: { metal: 2 },
        resRequirements: { wood: 200 },
        researchCost: { wood: 300 },
        workerReq: { miner: 3 },
        era: 1
    },
    {
        id: 'sand_quarry',
        name: 'Песчаный карьер',
        baseCost: 8000,
        baseIncome: 0,
        icon: Pickaxe,
        produces: { sand: 5 },
        resRequirements: { wood: 150 },
        researchCost: { wood: 200 },
        workerReq: { miner: 2 },
        era: 1
    },
    {
        id: 'excavator',
        name: 'Экскаватор',
        baseCost: 5000,
        baseIncome: 100,
        icon: Pickaxe,
        requiredTech: ['truck'],
        researchCost: { balance: 2000, metal: 200 },
        workerReq: { driver: 1, engineer: 1 },
        era: 1
    },
    {
        id: 'workshop',
        name: 'Мастерская',
        baseCost: 50000,
        baseIncome: 1000,
        icon: Hammer,
        consumes: { metal: 5, wood: 10 },
        produces: { concrete: 2 },
        requiredTech: ['iron_mine'],
        researchCost: { metal: 500, wood: 1000 },
        workerReq: { welder: 2, lumberjack: 2 },
        era: 2
    },
    {
        id: 'concrete_plant',
        name: 'Бетонный завод',
        baseCost: 25000,
        baseIncome: 400,
        icon: Factory,
        requiredTech: ['workshop'],
        researchCost: { balance: 10000, metal: 1000 },
        workerReq: { engineer: 2, welder: 5 },
        era: 2
    },
    {
        id: 'crane',
        name: 'Кран-башня',
        baseCost: 150000,
        baseIncome: 1500,
        icon: TowerControl,
        requiredTech: ['excavator'],
        researchCost: { concrete: 1000, metal: 2000 },
        workerReq: { engineer: 3, welder: 2 },
        era: 2
    },
];

export const INITIAL_STATE = {
    balance: 1000,
    resources: { food: 500, wood: 0, metal: 0, concrete: 0, sand: 0 },
    workers: { lumberjack: 0, welder: 0, fisherman: 0, cook: 0, driver: 0, engineer: 0, guard: 0, foreman: 0, head_chef: 0, miner: 0 },
    clickCount: 0,
    generators: {
        sawmill: 0, house: 0, canteen: 0, fishing_dock: 0, truck: 0,
        excavator: 0, iron_mine: 0, sand_quarry: 0, concrete_plant: 0,
        crane: 0, workshop: 0
    },
    buildings: [],
    unlockedTechs: ['sawmill', 'house'],
    activeContracts: [],
    lastSaveTime: Date.now(),
    weather: 'neutral' as const,
    weatherTimer: 60,
    shiftActive: false,
    shiftTimer: 300,
    constructionStage: 0,
    achievements: [],
    placingBuildingTypeId: null as string | null,
};

export const WEATHER_MODIFIERS = {
    sun: 1.2,
    rain: 0.7,
    neutral: 1.0,
};

export const SHIFT_DURATION = 30;
export const SHIFT_COOLDOWN = 300;
export const SHIFT_MULTIPLIER = 2.0;
