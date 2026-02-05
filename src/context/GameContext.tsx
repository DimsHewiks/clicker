import React, { createContext, useContext, useEffect, useReducer, useRef, useMemo } from 'react';
import { type GameState, type GameAction, type WeatherType, type WorkerType, type ResourceType, type Building } from '../types';
import {
    GENERATORS_CONFIG, INITIAL_STATE, SHIFT_COOLDOWN,
    WEATHER_MODIFIERS, SHIFT_MULTIPLIER,
    FOOD_CONSUMPTION_RATE, WORKER_COSTS, LUNCH_INTERVAL, WALK_SPEED, SHIFT_DURATION,
    SYNERGY_CONFIG, CHAPEL_WORK_DURATION, CHAPEL_LUNCH_DURATION, CHAPEL_RADIUS
} from '../constants';
import { soundManager } from '../lib/sound';

const GameContext = createContext<{
    state: GameState;
    incomePerSecond: number;
    resourceRates: Record<ResourceType, number>;
    workerCaps: { current: number; max: number };
    click: () => void;
    buyGenerator: (id: string) => void;
    researchTech: (id: string) => void;
    upgradeBuilding: (id: string) => void;
    completeContract: (id: string) => void;
    startPlacement: (typeId: string) => void;
    placeBuilding: (x: number, y: number) => void;
    moveBuilding: (id: string, x: number, y: number) => void;
    toggleBuilding: (id: string) => void;
    cancelPlacement: () => void;
    hireWorker: (type: WorkerType) => void;
    fireWorker: (type: WorkerType) => void;
    activateShift: () => void;
    setWeather: (weather: WeatherType) => void;
    resetGame: () => void;
    loadGame: (state: GameState) => void;
    emitJuice: (x: number, y: number, text: string) => void;
    toggleGodMode: () => void;
} | null>(null);

const juiceListeners: ((x: number, y: number, text: string) => void)[] = [];

const calculateSynergies = (building: Building, allBuildings: Building[]): { bonus: number; stats: { cluster: number; chain: number; res: number } } => {
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

function gameReducer(state: GameState, action: GameAction): GameState {
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
                    chapelTimer: state.placingBuildingTypeId === 'chapel' ? CHAPEL_WORK_DURATION : undefined
                };
                const buildings = [...state.buildings, newBuilding];
                // Recalculate synergies for all buildings when a new one is placed
                const updatedBuildings = buildings.map(b => {
                    const { bonus, stats } = calculateSynergies(b, buildings);
                    return { ...b, synergyBonus: bonus, synergyStats: stats };
                });

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
            const updatedBuildings = buildings.map(b => {
                const { bonus, stats } = calculateSynergies(b, buildings);
                return { ...b, synergyBonus: bonus, synergyStats: stats };
            });
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

                // Extra consumption during lunch
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

            // --- Happiness Calculation ---
            const houseCount = state.generators.house || 0;
            const housingCapacity = 5 + (houseCount * 5);

            let happinessDelta = 0;
            // Food Factor
            if (nRes.food > 100) happinessDelta += 0.5;
            else if (nRes.food <= 0) happinessDelta -= 3.0;

            // Housing Factor
            if (tWrk > housingCapacity) {
                happinessDelta -= (tWrk - housingCapacity) * 0.8;
            } else {
                happinessDelta += 0.2;
            }

            // Variety Factor
            const activeTypeIds = new Set(state.buildings.filter(b => b.isPlaced && b.isActive).map(b => b.typeId));
            happinessDelta += activeTypeIds.size * 0.1;

            let nHappiness = Math.max(0, Math.min(100, state.happiness + happinessDelta * dt));

            // Reputation slowly grows with high happiness
            let nReputation = state.reputation;
            if (nHappiness > 80) nReputation += 0.01 * dt;
            // --- End Happiness ---

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

            const cacheConfigs = new Map();
            const getCachedConfig = (typeId: string) => {
                if (!cacheConfigs.has(typeId)) cacheConfigs.set(typeId, GENERATORS_CONFIG.find(g => g.id === typeId));
                return cacheConfigs.get(typeId);
            };

            const canteens = state.buildings.filter(b => b.typeId === 'canteen' && b.isPlaced && b.isActive);
            const activeChapels = state.buildings.filter(b =>
                b.typeId === 'chapel' &&
                b.isPlaced &&
                b.isActive &&
                (b.chapelTimer || 0) <= 0
            );

            const blds = state.buildings.map(b => {
                const config = getCachedConfig(b.typeId);
                let s = b.status;
                let t = b.lunchTimer - dt;
                let targetCanteenId = b.targetCanteenId;
                let isMissingWorkers = false;

                if (config?.workerReq) {
                    const eff = Math.min(...Object.keys(config.workerReq).map(wType => wEff[wType] ?? 0));
                    isMissingWorkers = eff < 1;
                }

                // Chapel timer logic
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

                // Check if this building is in range of ANY active chapel
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
                        // EXCLUSIVITY: Only follow the NEAREST chapel
                        const nearestChapel = nearbyChapels[0].chapel;
                        const isLunching = (nearestChapel.chapelTimer || 0) <= 0;

                        if (isLunching) {
                            // Force lunch if nearest chapel is lunching
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
                            // FORCE WORKING if nearest chapel is not lunching
                            s = 'working' as const;
                            t = LUNCH_INTERVAL; // Reset internal timer
                            targetCanteenId = undefined;
                        }
                    }
                }

                return { ...b, status: s as any, lunchTimer: t, targetCanteenId, isMissingWorkers, isStriking: nIsStriking, chapelTimer };
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

                // Critical success based on happiness
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
                const reqAmount = 100 + Math.floor(Math.random() * 9) * 100; // 100 to 900
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
            // Ensure buildings from old save have synergy fields
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
            const updatedBuildings = buildings.map(b => {
                const { bonus, stats } = calculateSynergies(b, buildings);
                return { ...b, synergyBonus: bonus, synergyStats: stats };
            });
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
        default: return state;
    }
}

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE as GameState);
    const lastTickRef = useRef<number>(Date.now());

    const { incomePerSecond, resourceRates } = useMemo(() => {
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
        (Object.keys(state.workers) as WorkerType[]).forEach(wType => {
            const needed = wDmd[wType] || 0;
            const avail = state.workers[wType] || 0;
            if (needed > 0) {
                const slotted = Math.min(avail, needed);
                const extra = Math.max(0, avail - needed);
                wEff[wType] = (slotted + extra * 0.2) / needed;
            } else {
                wEff[wType] = 1;
            }
        });

        let incomeTotal = 0;
        const resRates: Record<ResourceType, number> = { food: 0, wood: 0, metal: 0, concrete: 0, sand: 0, stone: 0 };
        const tWrk = Object.values(state.workers).reduce((a, b) => a + (b || 0), 0);
        resRates.food -= tWrk * FOOD_CONSUMPTION_RATE;

        // Extra consumption rate during lunch
        const lunchWorkersCount = state.buildings
            .filter(b => b.status === 'lunch' && b.isPlaced && b.isActive)
            .reduce((acc, b) => {
                const config = GENERATORS_CONFIG.find(g => g.id === b.typeId);
                if (!config?.workerReq) return acc;
                return acc + Object.values(config.workerReq).reduce((a, b_val) => a + (b_val || 0), 0);
            }, 0);
        resRates.food -= lunchWorkersCount * FOOD_CONSUMPTION_RATE * 0.5;

        const foremanMul = 1 + (state.workers.foreman || 0) * 0.2;
        const weatherMul = WEATHER_MODIFIERS[state.weather] || 1.0;
        const shiftMul = state.shiftActive ? SHIFT_MULTIPLIER : 1.0;

        state.buildings.forEach(b => {
            const config = GENERATORS_CONFIG.find(g => g.id === b.typeId);
            if (!config || b.status === 'lunch' || !b.isPlaced || !b.isActive) return;

            let eff = 1.0;
            if (config.workerReq) {
                const reqTypes = Object.keys(config.workerReq) as WorkerType[];
                eff = Math.min(...reqTypes.map(wType => wEff[wType] ?? 0));
            }

            if (config.consumes) {
                const canConsume = Object.entries(config.consumes).every(([res]) => {
                    const available = state.resources[res as ResourceType];
                    return available > 0 || resRates[res as ResourceType] > 0;
                });
                if (!canConsume) eff = 0;
            }

            const upgradeBonus = 1 + (b.level - 1) * 0.5;
            // Use cached synergyBonus in memo too
            const totalBoost = eff * (1 + b.synergyBonus) * upgradeBonus * foremanMul * weatherMul * shiftMul;

            incomeTotal += config.baseIncome * totalBoost;

            if (config.produces && eff > 0) {
                Object.entries(config.produces).forEach(([rType, val]) => {
                    resRates[rType as ResourceType] += val * totalBoost;
                });
            }

            if (config.consumes && eff > 0) {
                Object.entries(config.consumes).forEach(([rType, val]) => {
                    resRates[rType as ResourceType] -= val * totalBoost;
                });
            }
        });

        return { incomePerSecond: incomeTotal, resourceRates: resRates };
    }, [state.buildings, state.workers, state.weather, state.shiftActive]); // Optimized dependencies

    const workerCaps = useMemo(() => {
        const total = Object.values(state.workers || {}).reduce((a, b) => a + (b || 0), 0);
        const houseCount = state.generators?.house || 0;
        const max = 5 + (houseCount * 5);
        return { current: total, max };
    }, [state.workers, state.generators.house]); // Optimized dependencies

    useEffect(() => {
        const saved = localStorage.getItem('story-imperia-save');
        if (saved) {
            try { dispatch({ type: 'LOAD_GAME', state: { ...INITIAL_STATE, ...JSON.parse(saved) } } as any); }
            catch (e) { console.error("Load failed", e); }
        }
    }, []);

    useEffect(() => {
        const interval = setInterval(() => localStorage.setItem('story-imperia-save', JSON.stringify(state)), 10000); // Reduce save frequency
        return () => clearInterval(interval);
    }, [state]);

    useEffect(() => {
        let frameId: number;
        let lastTimestamp = 0;
        const tickRate = 1000 / 10; // 10 ticks per second

        const loop = (timestamp: number) => {
            if (!lastTimestamp) lastTimestamp = timestamp;
            const elapsed = timestamp - lastTimestamp;

            if (elapsed >= tickRate) {
                const now = Date.now();
                const dt = Math.min((now - lastTickRef.current) / 1000, 1.0);
                lastTickRef.current = now;
                if (dt > 0) dispatch({ type: 'TICK', dt });
                lastTimestamp = timestamp;
            }
            frameId = requestAnimationFrame(loop);
        };
        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, []);

    const emitJuice = (x: number, y: number, text: string) => juiceListeners.forEach(l => l(x, y, text));

    return (
        <GameContext.Provider value={{
            state, incomePerSecond, resourceRates, workerCaps,
            click: () => {
                const amount = state.constructionStage + 1;
                dispatch({ type: 'CLICK', amount });
                soundManager.playClick();
            },
            buyGenerator: (id) => dispatch({ type: 'START_PLACEMENT', typeId: id }),
            researchTech: (id) => {
                dispatch({ type: 'RESEARCH_TECH', id });
                soundManager.playUpgrade();
            },
            upgradeBuilding: (id) => {
                dispatch({ type: 'UPGRADE_BUILDING', buildingId: id });
                soundManager.playUpgrade();
            },
            completeContract: (id) => dispatch({ type: 'COMPLETE_CONTRACT', contractId: id }),
            startPlacement: (id) => dispatch({ type: 'START_PLACEMENT', typeId: id }),
            placeBuilding: (x, y) => dispatch({ type: 'PLACE_BUILDING', x, y }),
            moveBuilding: (id, x, y) => dispatch({ type: 'MOVE_BUILDING', id, x, y }),
            toggleBuilding: (id) => dispatch({ type: 'TOGGLE_BUILDING', id }),
            cancelPlacement: () => dispatch({ type: 'CANCEL_PLACEMENT' }),
            hireWorker: (workerType) => {
                const cost = WORKER_COSTS[workerType];
                if (state.godMode || (state.balance >= cost && workerCaps.current < workerCaps.max)) {
                    dispatch({ type: 'HIRE_WORKER', workerType, cost: state.godMode ? 0 : cost });
                    soundManager.playUpgrade();
                }
            },
            fireWorker: (workerType) => dispatch({ type: 'FIRE_WORKER', workerType }),
            activateShift: () => dispatch({ type: 'ACTIVATE_SHIFT' }),
            setWeather: (weather) => dispatch({ type: 'SET_WEATHER', weather }),
            resetGame: () => {
                if (confirm("Reset ALL progress?")) {
                    localStorage.removeItem('story-imperia-save');
                    dispatch({ type: 'RESET_GAME' });
                }
            },
            loadGame: (s) => dispatch({ type: 'LOAD_GAME', state: s }),
            toggleGodMode: () => dispatch({ type: 'TOGGLE_GOD_MODE' }),
            emitJuice
        }}>
            {children}
        </GameContext.Provider>
    );
};

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) throw new Error("useGame must be used within GameProvider");
    return context;
};

export const useJuice = (callback: (x: number, y: number, text: string) => void) => {
    useEffect(() => {
        juiceListeners.push(callback);
        return () => {
            const idx = juiceListeners.indexOf(callback);
            if (idx > -1) juiceListeners.splice(idx, 1);
        };
    }, [callback]);
};
