import type { GameState, Letter, Notification, Reward } from '@/types';

export type StoryEvent = {
    id: string;
    kind: 'notification' | 'letter';
    title?: string;
    message: string;
    rewards?: Reward[];
    condition: (state: GameState) => boolean;
    actions?: {
        unlockCategories?: string[];
        unlockTechs?: string[];
        addHappinessBonus?: number;
        addFuelEfficiencyBonus?: number;
        enableHeat?: boolean;
        enableMarketMoralePenalty?: boolean;
    };
    once?: boolean;
};

export const STORY_EVENTS: StoryEvent[] = [
    {
        id: 'spark_wood_50',
        kind: 'notification',
        message: `*** Найдено: сырая щепа годится на костёр.`,
        rewards: [{ kind: 'tech', id: 'log_splitter' }],
        condition: (state) => state.resources.wood >= 50,
        actions: { unlockTechs: ['log_splitter'] },
        once: true
    },
    {
        id: 'heat_for_shift_fuel_30',
        kind: 'letter',
        title: 'Староста Урд',
        message: `*** Без огня смена мёрзнет. Нужен запас.`,
        rewards: [{ kind: 'boost', label: 'Механика: тепло лагеря' }],
        condition: (state) => state.resources.fuel >= 30,
        actions: { enableHeat: true },
        once: true
    },
    {
        id: 'not_hungry_food_150',
        kind: 'notification',
        message: `*** Найдено: следы дичи на северной кромке.`,
        rewards: [{ kind: 'tech', id: 'hunter_cabin' }],
        condition: (state) => state.resources.food >= 150,
        actions: { unlockTechs: ['hunter_cabin'] },
        once: true
    },
    {
        id: 'clean_food_hunter_cabin_1',
        kind: 'letter',
        title: 'Рыбак Тир',
        message: `*** Мясо есть, но без кухни всё пропадёт.`,
        rewards: [{ kind: 'tech', id: 'canteen' }],
        condition: (state) => (state.generators.hunter_cabin || 0) >= 1,
        actions: { unlockTechs: ['canteen'] },
        once: true
    },
    {
        id: 'warm_shift_hides_50',
        kind: 'letter',
        title: 'Староста Урд',
        message: `*** Одежда удержит людей на работе.`,
        rewards: [{ kind: 'boost', label: 'Постоянно: +5 к настроению' }],
        condition: (state) => state.resources.hides >= 50,
        actions: { addHappinessBonus: 5 },
        once: true
    },
    {
        id: 'clay_underfoot_stone_100',
        kind: 'letter',
        title: 'Затворница Мила',
        message: `*** Глина тут липкая, но стены из неё держат.`,
        rewards: [{ kind: 'tech', id: 'clay_pit' }],
        condition: (state) => state.resources.stone >= 100,
        actions: { unlockTechs: ['clay_pit'] },
        once: true
    },
    {
        id: 'first_house_built',
        kind: 'notification',
        message: `*** Укрытие найдено: крыша важнее любых слов.`,
        rewards: [{ kind: 'boost', label: 'Жильё: базовая устойчивость' }],
        condition: (state) => (state.generators.house || 0) >= 1,
        once: true
    },
    {
        id: 'autumn_reserve_wood_500_food_300',
        kind: 'letter',
        title: 'Наблюдатель',
        message: `*** Кто копит — живёт. Кто тратит — мерзнет.`,
        rewards: [{ kind: 'boost', label: 'Топливо: расход -10%' }],
        condition: (state) => state.resources.wood >= 500 && state.resources.food >= 300,
        actions: { addFuelEfficiencyBonus: 0.1 },
        once: true
    },
    {
        id: 'market_unlock_wood_stone_1k',
        kind: 'notification',
        message: `*** Найдено прибитым к стволу дуба у лесопилки
«Ты рубишь дерево. Но не продаёшь.
Сколько ещё будешь копить щепки?
Рынок ждёт у восточных ворот.
— Наблюдатель»

PS: открывает категорию строений "Бизнес"`,
        rewards: [{ kind: 'category', id: 'market', label: 'Категория: Бизнес' }],
        condition: (state) => state.resources.wood >= 1000 && state.resources.stone >= 1000 && state.heat >= 50,
        actions: { unlockCategories: ['market'] },
        once: true
    },
    {
        id: 'market_at_gates',
        kind: 'letter',
        title: 'Наблюдатель',
        message: `*** Торг идёт там, где люди не боятся ночи.`,
        rewards: [{ kind: 'boost', label: 'Торг зависит от морали' }],
        condition: (state) => (state.generators.wood_market || 0) >= 1,
        actions: { enableMarketMoralePenalty: true },
        once: true
    }
];

export const applyStoryEvents = (state: GameState): GameState => {
    if (STORY_EVENTS.length === 0) return state;

    const triggered = new Set(state.triggeredEvents);
    let notifications = state.notifications;
    let letters = state.letters;
    let unlockedCategories = state.unlockedCategories;
    let unlockedTechs = state.unlockedTechs;
    let happinessBonus = state.happinessBonus;
    let fuelEfficiencyBonus = state.fuelEfficiencyBonus;
    let heatEnabled = state.heatEnabled;
    let marketMoralePenaltyEnabled = state.marketMoralePenaltyEnabled;
    let didChange = false;

    const ensureNotifications = () => {
        if (notifications === state.notifications) notifications = [...state.notifications];
    };

    const ensureLetters = () => {
        if (letters === state.letters) letters = [...state.letters];
    };

    const ensureCategories = () => {
        if (unlockedCategories === state.unlockedCategories) unlockedCategories = [...state.unlockedCategories];
    };
    const ensureTechs = () => {
        if (unlockedTechs === state.unlockedTechs) unlockedTechs = [...state.unlockedTechs];
    };

    STORY_EVENTS.forEach((event) => {
        if (event.once !== false && triggered.has(event.id)) return;
        if (!event.condition(state)) return;

        const now = Date.now();
        if (event.kind === 'notification') {
            ensureNotifications();
            const notification: Notification = {
                id: `${event.id}-${now}`,
                title: event.title,
                message: event.message,
                rewards: event.rewards,
                timestamp: now,
                read: false
            };
            notifications.push(notification);
        } else {
            ensureLetters();
            const letter: Letter = {
                id: `${event.id}-${now}`,
                title: event.title,
                message: event.message,
                rewards: event.rewards,
                timestamp: now,
                read: false
            };
            letters.push(letter);
        }

        if (event.actions?.unlockCategories?.length) {
            ensureCategories();
            event.actions.unlockCategories.forEach((category) => {
                if (!unlockedCategories.includes(category)) unlockedCategories.push(category);
            });
        }
        if (event.actions?.unlockTechs?.length) {
            ensureTechs();
            event.actions.unlockTechs.forEach((id) => {
                if (!unlockedTechs.includes(id)) unlockedTechs.push(id);
            });
        }
        if (event.actions?.addHappinessBonus) {
            happinessBonus += event.actions.addHappinessBonus;
        }
        if (event.actions?.addFuelEfficiencyBonus) {
            fuelEfficiencyBonus += event.actions.addFuelEfficiencyBonus;
        }
        if (event.actions?.enableHeat) {
            heatEnabled = true;
        }
        if (event.actions?.enableMarketMoralePenalty) {
            marketMoralePenaltyEnabled = true;
        }

        if (event.once !== false) triggered.add(event.id);
        didChange = true;
    });

    if (!didChange) return state;

    return {
        ...state,
        notifications,
        letters,
        unlockedCategories,
        unlockedTechs,
        happinessBonus,
        fuelEfficiencyBonus,
        heatEnabled,
        marketMoralePenaltyEnabled,
        triggeredEvents: [...triggered]
    };
};
