export const FOOD_CONSUMPTION_RATE = 0.4;

export const LUNCH_INTERVAL = 60;
export const WALK_SPEED = 40;
export const GRID_SIZE = 40;

export const ERAS = [
    { id: 0, name: 'Геология: Дерево и Камень' },
    { id: 1, name: 'Разведка: Железо и Карьер' },
    { id: 2, name: 'Индустрия: Бетон и Дроны' }
];

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

export const HAPPINESS_THRESHOLDS = {
    EUPHORIA: 90,
    STABLE: 50,
    DISCONTENT: 25,
    CRISIS: 10
};

export const NOTIFICATIONS_CONTENT = {
    MARKET_UNLOCK: {
        message: `Найдено прибитым к стволу дуба у лесопилки\n«Ты рубишь дерево. Но не продаёшь.\nСколько ещё будешь копить щепки?\nРынок ждёт у восточных ворот.\n— Наблюдатель»`
    }
};

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
