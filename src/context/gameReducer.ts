import {
    CHAPEL_LUNCH_DURATION,
    CHAPEL_RADIUS,
    CHAPEL_WORK_DURATION,
    FOOD_CONSUMPTION_RATE,
    GENERATORS_CONFIG,
    INITIAL_STATE,
    LUNCH_INTERVAL,
    SHIFT_COOLDOWN,
    SHIFT_DURATION,
    SHIFT_MULTIPLIER,
    SYNERGY_CONFIG,
    WEATHER_MODIFIERS,
    WORKER_COSTS,
    WALK_SPEED
} from '@/config';
import type { Building, GameAction, GameState, ResourceType, WeatherType, WorkerType } from '@/types';

export const calculateSynergies = (building: Building, allBuildings: Building[]): { bonus: number; stats: { cluster: number; chain: number; res: number } } => {
    const config = GENERATORS_CONFIG.find(g => g.id === building.typeId);
    if (!config) return { bonus: 0, stats: { cluster: 0, chain: 0, res: 0 } };

    let cluster = 0;
    let chain = 0;
    let res = 0;

    allBuildings.forEach(other => {
        if (other.id === building.id || !other.isActive || !other.isPlaced) return;
        const dist = Math.sqrt(Math.pow(other.x - building.x, 2) + Math.pow(other.y - building.y, 2));

        if (other.typeId === building.typeId && dist < SYNERGY_CONFIG.CLUSTER_RADIUS) {
            cluster++;
        }

        const chainRule = SYNERGY_CONFIG.CHAINS.find(c => c.target === building.typeId && c.source === other.typeId);
        if (chainRule && dist < SYNERGY_CONFIG.CHAIN_RADIUS) {
            chain++;
        }

        if (other.typeId === 'house' && dist < SYNERGY_CONFIG.RESIDENTIAL_RADIUS) {
            if (config.category === 'market' || building.typeId === 'canteen') res++;
        }
    });

    const bonus = (cluster * SYNERGY_CONFIG.BONUSES.CLUSTER_PER_BUILDING) +
        (chain * SYNERGY_CONFIG.BONUSES.CHAIN_PROCESSOR) +
        (res * (config.category === 'market' ? SYNERGY_CONFIG.BONUSES.MARKET_PER_HOUSE : (building.typeId === 'canteen' ? SYNERGY_CONFIG.BONUSES.CANTEEN_PER_HOUSE : 0)));

    return { bonus, stats: { cluster, chain, res } };
};

export const recalculateSynergies = (buildings: Building[]) =>
    buildings.map(b => {
        const { bonus, stats } = calculateSynergies(b, buildings);
        return { ...b, synergyBonus: bonus, synergyStats: stats };
    });

export function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case 'CLICK':
            return {
                ...state,
                balance: state.balance + action.amount,
                clickCount: state.clickCount + 1,
            };

        case 'START_PLACEMENT':
            return { ...state, placingBuildingTypeId: action.typeId };

        case 'CANCEL_PLACEMENT':
            return { ...state, placingBuildingTypeId: null };

        case 'RESEARCH_TECH': {
            const config = GENERATORS_CONFIG.find(g => g.id === action.id);
            if (!config || state.unlockedTechs.includes(action.id)) return state;

            const resReqs = config.researchCost || {};
            const scCost = resReqs.balance || 0;

            if (!state.godMode) {
                if (state.constructionStage < config.era) return state;
                if (config.requiredTech && !config.requiredTech.every(id => (state.generators[id] || 0) > 0)) return state;
            }

            const hasRes = Object.entries(resReqs).every(([res, amount]) => {
                if (res === 'balance') return state.balance >= (amount as number);
                return (state.resources[res as ResourceType] || 0) >= (amount as number);
            });

            if (state.godMode || hasRes) {
                const newRes = { ...state.resources };
                if (!state.godMode) {
                    Object.entries(resReqs).forEach(([res, amount]) => {
                        if (res !== 'balance') newRes[res as ResourceType] -= (amount as number);
                    });
                }

                return {
                    ...state,
                    balance: state.godMode ? state.balance : state.balance - scCost,
                    resources: newRes,
                    unlockedTechs: [...state.unlockedTechs, action.id]
                };
            }
            return state;
        }

        case 'PLACE_BUILDING': {
            if (!state.placingBuildingTypeId) return state;
            const typeId = state.placingBuildingTypeId;
            const config = GENERATORS_CONFIG.find(g => g.id === typeId);
            if (!config) return state;

            if (!state.godMode) {
                if (!state.unlockedTechs.includes(typeId)) return state;
                if (state.constructionStage < config.era) return state;
                if (config.requiredTech && !config.requiredTech.every(id => (state.generators[id] || 0) > 0)) return state;
            }

            const bCount = state.generators[typeId] || 0;
            const bCost = Math.floor(config.baseCost * Math.pow(1.15, bCount));
            const hasRes = Object.entries(config.resRequirements || {}).every(([res, amount]) =>
                (state.resources[res as ResourceType] || 0) >= amount
            );

            if (state.godMode || (state.balance >= bCost && hasRes)) {
                const newRes = { ...state.resources };
                if (!state.godMode) {
                    Object.entries(config.resRequirements || {}).forEach(([res, amount]) => {
                        newRes[res as ResourceType] -= amount;
                    });
                }

                const newBuilding: Building = {
                    id: Math.random().toString(36).substr(2, 9),
                    typeId,
                    x: action.x,
                    y: action.y,
                    isPlaced: true,
                    isActive: true,
                    status: 'working',
                    lunchTimer: LUNCH_INTERVAL + Math.random() * 20,
                    level: 1,
                    isMissingWorkers: false,
                    synergyBonus: 0,
                    synergyStats: { cluster: 0, chain: 0, res: 0 },
                    chapelTimer: state.placingBuildingTypeId === 'chapel' ? CHAPEL_WORK_DURATION : undefined,
                    createdAt: Date.now()
                };
                const buildings = [...state.buildings, newBuilding];
                const updatedBuildings = recalculateSynergies(buildings);

                return {
                    ...state,
                    balance: state.godMode ? state.balance : state.balance - bCost,
                    resources: newRes,
                    generators: { ...state.generators, [typeId]: bCount + 1 },
                    buildings: updatedBuildings,
                    placingBuildingTypeId: null
                };
            }
            return { ...state, placingBuildingTypeId: null };
        }

        case 'TOGGLE_BUILDING': {
            const buildings = state.buildings.map(b => b.id === action.id ? { ...b, isActive: !b.isActive } : b);
            const updatedBuildings = recalculateSynergies(buildings);
            return { ...state, buildings: updatedBuildings };
        }

        case 'UPGRADE_BUILDING': {
            const bld = state.buildings.find(b => b.id === action.buildingId);
            if (!bld || bld.level >= 5) return state;

            const config = GENERATORS_CONFIG.find(g => g.id === bld.typeId);
            if (!config) return state;

            const upgradeMultiplier = Math.pow(2, bld.level);
            const scCost = Math.floor(config.baseCost * upgradeMultiplier);
            const resReqs = config.resRequirements;

            const hasRes = Object.entries(resReqs || {}).every(([res, amount]) =>
                (state.resources[res as ResourceType] || 0) >= amount * upgradeMultiplier
            );

            if (state.godMode || (state.balance >= scCost && hasRes)) {
                const newRes = { ...state.resources };
                if (!state.godMode) {
                    Object.entries(resReqs || {}).forEach(([res, amount]) => {
                        newRes[res as ResourceType] -= amount * upgradeMultiplier;
                    });
                }

                return {
                    ...state,
                    balance: state.godMode ? state.balance : state.balance - scCost,
                    resources: newRes,
                    buildings: state.buildings.map(b =>
                        b.id === action.buildingId ? { ...b, level: b.level + 1 } : b
                    )
                };
            }
            return state;
        }

        case 'COMPLETE_CONTRACT': {
            const contract = state.activeContracts.find(c => c.id === action.contractId);
            if (!contract) return state;

            const reqType = contract.requirement.type;
            const reqAmount = contract.requirement.amount;

            if (reqType === 'balance') {
                if (state.balance < reqAmount) return state;
                return {
                    ...state,
                    balance: state.balance - reqAmount + (contract.reward.type === 'balance' ? contract.reward.amount : 0),
                    resources: contract.reward.type !== 'balance'
                        ? { ...state.resources, [contract.reward.type]: state.resources[contract.reward.type] + contract.reward.amount }
                        : state.resources,
                    activeContracts: state.activeContracts.filter(c => c.id !== action.contractId)
                };
            } else {
                if ((state.resources[reqType] || 0) < reqAmount) return state;
                const newRes = { ...state.resources };
                newRes[reqType] -= reqAmount;
                if (contract.reward.type !== 'balance') {
                    newRes[contract.reward.type] += contract.reward.amount;
                }
                return {
                    ...state,
                    balance: state.balance + (contract.reward.type === 'balance' ? contract.reward.amount : 0),
                    resources: newRes,
                    activeContracts: state.activeContracts.filter(c => c.id !== action.contractId)
                };
            }
        }

        case 'TICK': {
            const { dt } = action;
            let nRes = { ...state.resources };
            let nWrk = { ...state.workers };
            let nDiscovered = [...state.discoveredResources];
            const tWrk = Object.values(state.workers).reduce((a, b) => a + (b || 0), 0);

            if (!state.godMode) {
                nRes.food -= tWrk * FOOD_CONSUMPTION_RATE * dt;

                const lunchWorkersCount = state.buildings
                    .filter(b => b.status === 'lunch' && b.isPlaced && b.isActive)
                    .reduce((acc, b) => {
                        const config = GENERATORS_CONFIG.find(g => g.id === b.typeId);
                        if (!config?.workerReq) return acc;
                        return acc + Object.values(config.workerReq).reduce((a, b_val) => a + (b_val || 0), 0);
                    }, 0);
                nRes.food -= lunchWorkersCount * FOOD_CONSUMPTION_RATE * 0.5 * dt;
            }

            const isStarving = nRes.food <= 0;
            if (nRes.food < 0) { nRes.food = 0; }

            const houseCount = state.generators.house || 0;
            const housingCapacity = 5 + (houseCount * 5);

            let happinessDelta = 0;
            if (nRes.food > 100) happinessDelta += 0.5;
            else if (nRes.food <= 0) happinessDelta -= 3.0;

            if (tWrk > housingCapacity) {
                happinessDelta -= (tWrk - housingCapacity) * 0.8;
            } else {
                happinessDelta += 0.2;
            }

            const activeTypeIds = new Set(state.buildings.filter(b => b.isPlaced && b.isActive).map(b => b.typeId));
            happinessDelta += activeTypeIds.size * 0.1;

            let nHappiness = Math.max(0, Math.min(100, state.happiness + happinessDelta * dt));
            let nReputation = state.reputation;
            if (nHappiness > 80) nReputation += 0.01 * dt;

            const wDmd: Record<string, number> = {};
            state.buildings.forEach(b => {
                if (!b.isActive || !b.isPlaced) return;
                const config = GENERATORS_CONFIG.find(g => g.id === b.typeId);
                if (config?.workerReq) {
                    Object.entries(config.workerReq).forEach(([wType, wNeeded]) => {
                        wDmd[wType] = (wDmd[wType] || 0) + (wNeeded as number);
                    });
                }
            });

            const wEff: Record<string, number> = {};
            (Object.keys(nWrk) as WorkerType[]).forEach(wType => {
                const needed = wDmd[wType] || 0;
                const avail = nWrk[wType] || 0;
                if (needed > 0) {
                    const slotted = Math.min(avail, needed);
                    const extra = Math.max(0, avail - needed);
                    wEff[wType] = (slotted + extra * 0.2) / needed;
                } else {
                    wEff[wType] = 1;
                }
            });

            const cacheConfigs = new Map<string, Generator | undefined>();
            const getCachedConfig = (typeId: string) => {
                if (!cacheConfigs.has(typeId)) cacheConfigs.set(typeId, GENERATORS_CONFIG.find(g => g.id === typeId));
                return cacheConfigs.get(typeId);
            };

            const canteens = state.buildings.filter(b => b.typeId === 'canteen' && b.isPlaced && b.isActive);
            const blds = state.buildings.map(b => {
                const config = getCachedConfig(b.typeId);
                let s: Building['status'] = b.status;
                let t = b.lunchTimer - dt;
                let targetCanteenId = b.targetCanteenId;
                let isMissingWorkers = false;

                if (config?.workerReq) {
                    const eff = Math.min(...Object.keys(config.workerReq).map(wType => wEff[wType] ?? 0));
                    isMissingWorkers = eff < 1;
                }

                let chapelTimer = b.chapelTimer;
                if (b.typeId === 'chapel') {
                    chapelTimer = (chapelTimer || 0) - dt;
                    if (chapelTimer <= -CHAPEL_LUNCH_DURATION) {
                        chapelTimer = CHAPEL_WORK_DURATION;
                    }
                }

                if (config?.category === 'residential' || config?.category === 'optimization') {
                    return { ...b, status: 'working' as const, lunchTimer: LUNCH_INTERVAL, isMissingWorkers: false, isStriking: false, chapelTimer };
                }

                let nIsStriking = b.isStriking;
                if (nHappiness < 25 && b.isActive && b.status === 'working' && Math.random() < 0.005 * dt) {
                    nIsStriking = true;
                }
                if (nHappiness >= 50) {
                    nIsStriking = false;
                }

                if (s === 'working' && t <= 0 && b.isActive && !nIsStriking) {
                    s = 'lunch' as const;
                    const nearestCanteen = canteens.length > 0
                        ? canteens.reduce((prev, curr) => {
                            const d1 = Math.sqrt(Math.pow(curr.x - b.x, 2) + Math.pow(curr.y - b.y, 2));
                            const d2 = Math.sqrt(Math.pow(prev.x - b.x, 2) + Math.pow(prev.y - b.y, 2));
                            return d1 < d2 ? curr : prev;
                        })
                        : null;

                    targetCanteenId = nearestCanteen?.id;
                    const dist = nearestCanteen ? Math.sqrt(Math.pow(nearestCanteen.x - b.x, 2) + Math.pow(nearestCanteen.y - b.y, 2)) : 800;
                    t = Math.max(5, (dist / WALK_SPEED) * 2);
                } else if (s === 'lunch' && t <= 0) {
                    s = 'working' as const;
                    t = LUNCH_INTERVAL;
                    targetCanteenId = undefined;
                }

                if (b.typeId !== 'chapel' && b.typeId !== 'house' && b.isPlaced && b.isActive) {
                    const nearbyChapels = state.buildings
                        .filter(c =>
                            c.typeId === 'chapel' &&
                            c.isPlaced &&
                            c.isActive
                        )
                        .map(c => ({
                            chapel: c,
                            dist: Math.sqrt(Math.pow(c.x - b.x, 2) + Math.pow(c.y - b.y, 2))
                        }))
                        .filter(c => c.dist <= CHAPEL_RADIUS)
                        .sort((a, b_chap) => a.dist - b_chap.dist);

                    if (nearbyChapels.length > 0) {
                        const nearestChapel = nearbyChapels[0].chapel;
                        const isLunching = (nearestChapel.chapelTimer || 0) <= 0;

                        if (isLunching) {
                            if (s === 'working') {
                                s = 'lunch' as const;
                                const nearestCanteen = canteens.length > 0
                                    ? canteens.reduce((prev, curr) => {
                                        const d1 = Math.sqrt(Math.pow(curr.x - b.x, 2) + Math.pow(curr.y - b.y, 2));
                                        const d2 = Math.sqrt(Math.pow(prev.x - b.x, 2) + Math.pow(prev.y - b.y, 2));
                                        return d1 < d2 ? curr : prev;
                                    })
                                    : null;
                                targetCanteenId = nearestCanteen?.id;
                                const dist = nearestCanteen ? Math.sqrt(Math.pow(nearestCanteen.x - b.x, 2) + Math.pow(nearestCanteen.y - b.y, 2)) : 800;
                                t = Math.max(5, (dist / WALK_SPEED) * 2);
                            }
                        } else {
                            s = 'working' as const;
                            t = LUNCH_INTERVAL;
                            targetCanteenId = undefined;
                        }
                    }
                }

                return { ...b, status: s, lunchTimer: t, targetCanteenId, isMissingWorkers, isStriking: nIsStriking, chapelTimer };
            });

            let incomeTotal = 0;
            const foremanMul = 1 + (state.workers.foreman || 0) * 0.2;
            const weatherMul = WEATHER_MODIFIERS[state.weather] || 1.0;
            const shiftMul = state.shiftActive ? SHIFT_MULTIPLIER : 1.0;

            blds.forEach(b => {
                const config = getCachedConfig(b.typeId);
                if (!config || b.status === 'lunch' || !b.isPlaced || !b.isActive || b.isStriking) return;

                let eff = 1.0;
                if (config.workerReq) {
                    const reqTypes = Object.keys(config.workerReq) as WorkerType[];
                    eff = Math.min(...reqTypes.map(wType => wEff[wType] ?? 0));
                }

                if (isStarving && config.category !== 'residential') {
                    eff = 0;
                }

                if (config.consumes && eff > 0) {
                    const canConsume = Object.entries(config.consumes).every(([res, val]) => (nRes[res as ResourceType] || 0) >= (val as number) * dt);
                    if (!canConsume) {
                        eff = 0;
                    } else {
                        Object.entries(config.consumes).forEach(([res, val]) => nRes[res as ResourceType] -= (val as number) * dt);
                    }
                }

                const upgradeBonus = 1 + (b.level - 1) * 0.5;

                let critMul = 1.0;
                if (nHappiness >= 90 && Math.random() < 0.05) {
                    critMul = 2.0;
                }

                const totalBoost = eff * (1 + b.synergyBonus) * upgradeBonus * foremanMul * weatherMul * shiftMul * critMul;

                incomeTotal += config.baseIncome * totalBoost * dt;

                if (config.produces && eff > 0) {
                    Object.entries(config.produces).forEach(([rType, val]) => {
                        const amount = (val as number) * totalBoost * dt;
                        nRes[rType as ResourceType] += amount;
                        if (!nDiscovered.includes(rType as ResourceType)) nDiscovered.push(rType as ResourceType);
                    });
                }
            });

            const newContracts = [...state.activeContracts];
            if (state.activeContracts.length < 3 && Math.random() < (0.001 * dt * 10)) {
                const possibleRes: ResourceType[] = ['wood', 'food'];
                if (state.discoveredResources.includes('stone')) possibleRes.push('stone');
                if (state.discoveredResources.includes('metal')) possibleRes.push('metal');
                if (state.discoveredResources.includes('sand')) possibleRes.push('sand');
                if (state.discoveredResources.includes('concrete')) possibleRes.push('concrete');

                const rType = possibleRes[Math.floor(Math.random() * possibleRes.length)];
                const reqAmount = 100 + Math.floor(Math.random() * 9) * 100;
                newContracts.push({
                    id: Math.random().toString(36).substr(2, 9),
                    title: `Экспорт: ${rType}`,
                    description: `Нужно ${reqAmount} ед. для партнера.`,
                    requirement: { type: rType, amount: reqAmount },
                    reward: { type: 'balance', amount: reqAmount * 10 }
                });
            }

            let nWeather = state.weather;
            let nWeatherTimer = state.weatherTimer - dt;
            if (nWeatherTimer <= 0) {
                const weathers: WeatherType[] = ['sun', 'rain', 'neutral'];
                nWeather = weathers[Math.floor(Math.random() * weathers.length)];
                nWeatherTimer = 60 + Math.random() * 60;
            }

            let nShiftActive = state.shiftActive;
            let nShiftTimer = state.shiftTimer - dt;
            if (nShiftActive && nShiftTimer <= 0) {
                nShiftActive = false;
                nShiftTimer = SHIFT_COOLDOWN;
            } else if (!nShiftActive && nShiftTimer < 0) {
                nShiftTimer = 0;
            }

            let newNotifications = [...state.notifications];
            let newUnlockedCategories = [...state.unlockedCategories];

            if (!state.unlockedCategories.includes('market') &&
                nRes.wood >= 1000 &&
                nRes.stone >= 500) {
                newUnlockedCategories.push('market');
                newNotifications.push({
                    id: `market-unlock-${Date.now()}`,
                    message: `Найдено прибитым к стволу дуба у лесопилки\n«Ты рубишь дерево. Но не продаёшь.\nСколько ещё будешь копить щепки?\nРынок ждёт у восточных ворот.\n— Наблюдатель»`,
                    timestamp: Date.now(),
                    read: false
                });
            }

            return {
                ...state,
                balance: state.balance + incomeTotal,
                resources: nRes,
                workers: nWrk,
                buildings: blds,
                discoveredResources: nDiscovered,
                activeContracts: newContracts,
                weather: nWeather,
                weatherTimer: nWeatherTimer,
                shiftActive: nShiftActive,
                shiftTimer: nShiftTimer,
                happiness: nHappiness,
                reputation: nReputation,
                notifications: newNotifications,
                unlockedCategories: newUnlockedCategories,
                lastSaveTime: Date.now()
            };
        }

        case 'ACTIVATE_SHIFT':
            if (state.shiftActive || (state.shiftTimer || 0) > 0) return state;
            return {
                ...state,
                shiftActive: true,
                shiftTimer: SHIFT_DURATION
            };

        case 'END_SHIFT':
            return {
                ...state,
                shiftActive: false,
                shiftTimer: SHIFT_COOLDOWN
            };

        case 'SET_WEATHER':
            return {
                ...state,
                weather: action.weather,
                weatherTimer: 60
            };

        case 'UNLOCK_ACHIEVEMENT':
            if (state.achievements.includes(action.id)) return state;
            return {
                ...state,
                achievements: [...state.achievements, action.id]
            };

        case 'LOAD_GAME': {
            const loadedState = { ...state, ...action.state };
            loadedState.buildings = (loadedState.buildings || []).map(b => {
                if (b.synergyBonus !== undefined) return b;
                const { bonus, stats } = calculateSynergies(b, loadedState.buildings);
                return { ...b, synergyBonus: bonus, synergyStats: stats };
            });
            return loadedState;
        }
        case 'RESET_GAME': return INITIAL_STATE as GameState;
        case 'MOVE_BUILDING': {
            const buildings = state.buildings.map(b => b.id === action.id ? { ...b, x: action.x, y: action.y } : b);
            const updatedBuildings = recalculateSynergies(buildings);
            return { ...state, buildings: updatedBuildings };
        }
        case 'HIRE_WORKER': return { ...state, balance: state.balance - action.cost, workers: { ...state.workers, [action.workerType]: (state.workers[action.workerType] || 0) + 1 } };
        case 'FIRE_WORKER':
            if ((state.workers[action.workerType] || 0) <= 0) return state;
            const refund = Math.floor(WORKER_COSTS[action.workerType] * 0.7);
            return {
                ...state,
                balance: state.balance + refund,
                workers: { ...state.workers, [action.workerType]: state.workers[action.workerType] - 1 }
            };
        case 'TOGGLE_GOD_MODE':
            return { ...state, godMode: !state.godMode };

        case 'ADD_NOTIFICATION':
            return {
                ...state,
                notifications: [...state.notifications, action.notification]
            };

        case 'MARK_NOTIFICATION_READ':
            return {
                ...state,
                notifications: state.notifications.map(n =>
                    n.id === action.id ? { ...n, read: true } : n
                )
            };

        case 'UNLOCK_CATEGORY':
            if (state.unlockedCategories.includes(action.category)) return state;
            return {
                ...state,
                unlockedCategories: [...state.unlockedCategories, action.category]
            };
        default: return state;
    }
}
