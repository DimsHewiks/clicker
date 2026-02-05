import { Truck, Pickaxe, Factory, TowerControl, Tent, Banknote, Hammer, Zap, Star, Utensils, Fish, Mountain, Bird, Waves, Anchor, Droplets, Church } from 'lucide-react';
import type { Generator, Achievement, WorkerType, ResourceType } from './types';

export const WORKER_COSTS: Record<WorkerType, number> = {
    lumberjack: 150,
    stonecutter: 120,
    hunter: 80,
    fisherman: 100,
    cook: 300,
    miner: 800,
    driver: 500,
    welder: 400,
    engineer: 2000,
    guard: 1000,
    foreman: 5000,
    head_chef: 3000,
};

export const FOOD_CONSUMPTION_RATE = 0.4;

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
    { id: 0, name: 'Геология: Дерево и Камень' },
    { id: 1, name: 'Разведка: Железо и Карьер' },
    { id: 2, name: 'Индустрия: Бетон и Дроны' }
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
        era: 0,
        category: 'production',
        terrain: 'land',
        description: 'Обеспечивает базовый приток древесины, необходимой для строительства первых зданий.'
    },
    {
        id: 'house',
        name: 'Жилой дом',
        baseCost: 500,
        baseIncome: 0,
        icon: Tent,
        era: 0,
        category: 'residential',
        terrain: 'land',
        description: 'Предоставляет жилье для ваших рабочих. Чем больше домов, тем больше населения может работать на ваших объектах.'
    },
    {
        id: 'stone_quarry',
        name: 'Каменоломня',
        baseCost: 400,
        baseIncome: 0,
        icon: Mountain,
        produces: { stone: 1 },
        researchCost: { wood: 40 },
        workerReq: { stonecutter: 1 },
        era: 0,
        category: 'production',
        terrain: 'land',
        description: 'Добывает необработанный камень. Необходим для фундамента и более прочных конструкций.'
    },
    {
        id: 'hunter_cabin',
        name: 'Хижина охотника',
        baseCost: 250,
        baseIncome: 0,
        icon: Bird,
        produces: { food: 1.5 },
        researchCost: { wood: 30 },
        workerReq: { hunter: 1 },
        era: 0,
        category: 'production',
        terrain: 'land',
        description: 'Охотники добывают свежее мясо, пополняя запасы еды в лагере.'
    },
    {
        id: 'canteen',
        name: 'Столовая',
        baseCost: 300,
        baseIncome: 0,
        icon: Utensils,
        produces: { food: 3 },
        resRequirements: { wood: 50, stone: 30 },
        researchCost: { wood: 50, stone: 20 },
        workerReq: { cook: 1 },
        era: 0,
        category: 'production',
        terrain: 'land',
        description: 'Место, где повара готовят еду из сырых ресурсов. Важна для поддержания работоспособности персонала.'
    },
    {
        id: 'wood_market',
        name: 'Рынок дерева',
        baseCost: 1000,
        baseIncome: 5,
        icon: Banknote,
        consumes: { wood: 1 },
        researchCost: { wood: 500 },
        era: 0,
        category: 'market',
        terrain: 'land',
        description: 'Позволяет продавать излишки древесины за СК. Первый шаг к созданию стабильной экономики.'
    },
    {
        id: 'fish_trap',
        name: 'Верша',
        baseCost: 300,
        baseIncome: 0,
        icon: Waves,
        produces: { food: 1 },
        era: 0,
        category: 'production',
        terrain: 'water',
        description: 'Простейшее устройство для ловли прибрежной рыбы. Работает автономно в воде.'
    },
    {
        id: 'water_purifier',
        name: 'Фильтр воды',
        baseCost: 650,
        baseIncome: 0,
        icon: Droplets,
        produces: { food: 2 },
        researchCost: { wood: 40 },
        workerReq: { fisherman: 1 },
        era: 0,
        category: 'production',
        terrain: 'water',
        description: 'Очищает воду и привлекает больше рыбы, значительно повышая эффективность добычи пропитания.'
    },
    {
        id: 'river_trading_post',
        name: 'Речной пост',
        baseCost: 1500,
        baseIncome: 30,
        icon: Anchor,
        consumes: { food: 4 },
        researchCost: { wood: 100, stone: 40 },
        era: 0,
        category: 'market',
        terrain: 'water',
        description: 'Торговая точка на воде, обеспечивающая приток СК от продажи рыбных деликатесов.'
    },
    {
        id: 'fishing_dock',
        name: 'Рыбацкий причал',
        baseCost: 2000,
        baseIncome: 0,
        icon: Fish,
        produces: { food: 8 },
        resRequirements: { wood: 200, stone: 100 },
        requiredTech: ['water_purifier'],
        researchCost: { wood: 150, stone: 80 },
        workerReq: { fisherman: 2 },
        era: 1,
        category: 'production',
        terrain: 'water',
        description: 'Полноценный причал для рыболовных судов. Производит огромное количество еды для растущего поселения.'
    },
    {
        id: 'fish_market',
        name: 'Магазин рыбы',
        baseCost: 2000,
        baseIncome: 150,
        icon: Banknote,
        consumes: { food: 10 },
        researchCost: { balance: 1500, food: 500 },
        era: 1,
        category: 'market',
        terrain: 'land',
        description: 'Специализированный магазин для продажи морепродуктов. Приносит высокую прибыль в СК.'
    },
    {
        id: 'truck',
        name: 'Грузовик',
        baseCost: 1500,
        baseIncome: 30,
        icon: Truck,
        resRequirements: { metal: 50 },
        researchCost: { balance: 1000 },
        workerReq: { driver: 1 },
        era: 1,
        category: 'production',
        terrain: 'land',
        description: 'Перевозит грузы и приносит доход от логистических услуг.'
    },
    {
        id: 'iron_mine',
        name: 'Железный рудник',
        baseCost: 12000,
        baseIncome: 0,
        icon: Factory,
        produces: { metal: 2 },
        resRequirements: { wood: 200, stone: 500 },
        researchCost: { wood: 300, stone: 200 },
        workerReq: { miner: 3 },
        era: 1,
        category: 'production',
        terrain: 'land',
        description: 'Глубокая шахта для добычи железной руды. Необходима для перехода в индустриальную эпоху.'
    },
    {
        id: 'sand_quarry',
        name: 'Песчаный карьер',
        baseCost: 8000,
        baseIncome: 0,
        icon: Pickaxe,
        produces: { sand: 5 },
        resRequirements: { wood: 150, stone: 300 },
        researchCost: { wood: 200, stone: 150 },
        workerReq: { miner: 2 },
        era: 1,
        category: 'production',
        terrain: 'land',
        description: 'Огромный карьер для масштабной добычи песка, необходимого для производства бетона.'
    },
    {
        id: 'excavator',
        name: 'Экскаватор',
        baseCost: 5000,
        baseIncome: 120,
        icon: Pickaxe,
        requiredTech: ['truck'],
        researchCost: { balance: 2500, metal: 300 },
        workerReq: { driver: 1, engineer: 1 },
        era: 1,
        category: 'production',
        terrain: 'land',
        description: 'Мощная техника для земляных работ. Ускоряет подготовку площадок и приносит стабильный доход.'
    },
    {
        id: 'workshop',
        name: 'Мастерская',
        baseCost: 50000,
        baseIncome: 1200,
        icon: Hammer,
        consumes: { metal: 5, wood: 10 },
        produces: { concrete: 3 },
        requiredTech: ['iron_mine'],
        researchCost: { metal: 1000, wood: 2000 },
        workerReq: { welder: 2, lumberjack: 2 },
        era: 2,
        category: 'production',
        terrain: 'land',
        description: 'Продвинутый цех для переработки сырья в сложные строительные компоненты, такие как бетон.'
    },
    {
        id: 'concrete_plant',
        name: 'Бетонный завод',
        baseCost: 25000,
        baseIncome: 500,
        icon: Factory,
        requiredTech: ['workshop'],
        researchCost: { balance: 15000, metal: 2000 },
        workerReq: { engineer: 2, welder: 5 },
        era: 2,
        category: 'production',
        terrain: 'land',
        description: 'Автоматизированная линия производства бетона. Ключевое здание для строительства небоскребов.'
    },
    {
        id: 'crane',
        name: 'Кран-башня',
        baseCost: 150000,
        baseIncome: 2000,
        icon: TowerControl,
        requiredTech: ['excavator'],
        researchCost: { concrete: 2000, metal: 5000 },
        workerReq: { engineer: 3, welder: 2 },
        era: 2,
        category: 'production',
        terrain: 'land',
        description: 'Вершина строительной инженерии. Позволяет возводить высочайшие конструкции города.'
    },
    {
        id: 'chapel',
        name: 'Часовня',
        baseCost: 5000,
        baseIncome: 0,
        icon: Church,
        resRequirements: { wood: 500, stone: 300 },
        researchCost: { balance: 2000, wood: 400 },
        era: 0,
        category: 'optimization',
        terrain: 'land',
        description: 'Синхронизирует обеденное время: все здания в радиусе 5 клеток уходят на обед одновременно по сигналу Часовни. Это позволяет лучше планировать логистику и производство.\nЦикл работы: 2 смены (336с) накопления прогресса и 30с общего перерыва.'
    },
];

export const INITIAL_STATE = {
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
};

export const WEATHER_MODIFIERS = {
    sun: 1.2,
    rain: 0.7,
    neutral: 1.0,
};

export const SHIFT_DURATION = 30;
export const SHIFT_COOLDOWN = 300;
export const SHIFT_MULTIPLIER = 2.5;

export const CHAPEL_WORK_DURATION = 336; // 2 weeks (1s = 1h)
export const CHAPEL_LUNCH_DURATION = 30;
export const CHAPEL_RADIUS = 200; // 5 cells

export const SYNERGY_CONFIG = {
    CLUSTER_RADIUS: 85, // cells are 40x40, so 85px is ~2 cells diag
    RESIDENTIAL_RADIUS: 125, // ~3 cells
    CHAIN_RADIUS: 100, // ~2.5 cells
    BONUSES: {
        CLUSTER_PER_BUILDING: 0.10, // +10%
        MARKET_PER_HOUSE: 0.05, // +5%
        CANTEEN_PER_HOUSE: 0.05, // +5%
        CHAIN_PROCESSOR: 0.25, // +25%
    },
    CHAINS: [
        { source: 'sawmill', target: 'wood_market' },
        { source: 'fish_trap', target: 'river_trading_post' },
        { source: 'fishing_dock', target: 'fish_market' },
        { source: 'iron_mine', target: 'workshop' },
        { source: 'sand_quarry', target: 'concrete_plant' },
        { source: 'hunter_cabin', target: 'canteen' },
    ]
};

export const HAPPINESS_THRESHOLDS = {
    EUPHORIA: 90,
    STABLE: 50,
    DISCONTENT: 25,
    CRISIS: 10
};
