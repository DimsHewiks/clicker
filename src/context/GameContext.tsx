import React, { createContext, useContext, useEffect, useReducer, useRef, useMemo } from 'react';
import { type GameState, type GameAction, type WeatherType, type WorkerType, type ResourceType, type Building } from '../types';
import {
    GENERATORS_CONFIG, INITIAL_STATE, SHIFT_COOLDOWN,
    WEATHER_MODIFIERS, SHIFT_MULTIPLIER,
    FOOD_CONSUMPTION_RATE, WORKER_COSTS, LUNCH_INTERVAL, WALK_SPEED, SHIFT_DURATION,
    SYNERGY_CONFIG
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
} | null>(null);

const juiceListeners: ((x: number, y: number, text: string) => void)[] = [];

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

            if (hasRes) {
                const newRes = { ...state.resources };
                Object.entries(resReqs).forEach(([res, amount]) => {
                    if (res !== 'balance') newRes[res as ResourceType] -= (amount as number);
                });

                return {
                    ...state,
                    balance: state.balance - scCost,
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

            if (state.balance >= bCost && hasRes) {
                const newRes = { ...state.resources };
                Object.entries(config.resRequirements || {}).forEach(([res, amount]) => {
                    newRes[res as ResourceType] -= amount;
                });

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
                    isMissingWorkers: false
                };

                return {
                    ...state,
                    balance: state.balance - bCost,
                    resources: newRes,
                    generators: { ...state.generators, [typeId]: bCount + 1 },
                    buildings: [...state.buildings, newBuilding],
                    placingBuildingTypeId: null
                };
            }
            return { ...state, placingBuildingTypeId: null };
        }

        case 'TOGGLE_BUILDING':
            return {
                ...state,
                buildings: state.buildings.map(b => b.id === action.id ? { ...b, isActive: !b.isActive } : b)
            };

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

            if (state.balance >= scCost && hasRes) {
                const newRes = { ...state.resources };
                Object.entries(resReqs || {}).forEach(([res, amount]) => {
                    newRes[res as ResourceType] -= amount * upgradeMultiplier;
                });

                return {
                    ...state,
                    balance: state.balance - scCost,
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

            nRes.food -= tWrk * FOOD_CONSUMPTION_RATE * dt;
            const isStarving = nRes.food <= 0;
            if (nRes.food < 0) { nRes.food = 0; }

            // Efficiency
            const wDmd: Record<string, number> = {};
            GENERATORS_CONFIG.forEach(gen => {
                const count = state.generators[gen.id] || 0;
                if (count > 0 && gen.workerReq) {
                    Object.entries(gen.workerReq).forEach(([wType, wNeeded]) => {
                        wDmd[wType] = (wDmd[wType] || 0) + (wNeeded * count);
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

            const canteens = state.buildings.filter(b => b.typeId === 'canteen' && b.isPlaced && b.isActive);

            const blds = state.buildings.map(b => {
                const config = GENERATORS_CONFIG.find(g => g.id === b.typeId);
                let s = b.status;
                let t = b.lunchTimer - dt;
                let targetCanteenId = b.targetCanteenId;
                let isMissingWorkers = false;

                if (config?.workerReq) {
                    const eff = Math.min(...Object.keys(config.workerReq).map(wType => wEff[wType] ?? 0));
                    isMissingWorkers = eff < 1;
                }

                if (config?.category === 'residential') {
                    return { ...b, status: 'working' as const, lunchTimer: LUNCH_INTERVAL, isMissingWorkers: false };
                }

                if (s === 'working' && t <= 0 && b.isActive) {
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
                return { ...b, status: s as any, lunchTimer: t, targetCanteenId, isMissingWorkers };
            });

            let incomeTotal = 0;
            const foremanMul = 1 + (state.workers.foreman || 0) * 0.2;
            const weatherMul = WEATHER_MODIFIERS[state.weather] || 1.0;
            const shiftMul = state.shiftActive ? SHIFT_MULTIPLIER : 1.0;

            blds.forEach(b => {
                const config = GENERATORS_CONFIG.find(g => g.id === b.typeId);
                if (!config || b.status === 'lunch' || !b.isPlaced || !b.isActive) return;

                // --- SYNERGY CALCULATION ---
                let clusterBonus = 0;
                let chainBonus = 0;
                let resBonus = 0;

                state.buildings.forEach(other => {
                    if (other.id === b.id || !other.isActive) return;
                    const dist = Math.sqrt(Math.pow(other.x - b.x, 2) + Math.pow(other.y - b.y, 2));

                    // Cluster
                    if (other.typeId === b.typeId && dist < SYNERGY_CONFIG.CLUSTER_RADIUS) {
                        clusterBonus += SYNERGY_CONFIG.BONUSES.CLUSTER_PER_BUILDING;
                    }

                    // Chain
                    const chain = SYNERGY_CONFIG.CHAINS.find(c => c.target === b.typeId && c.source === other.typeId);
                    if (chain && dist < SYNERGY_CONFIG.CHAIN_RADIUS) {
                        chainBonus += SYNERGY_CONFIG.BONUSES.CHAIN_PROCESSOR;
                    }

                    // Residential
                    if (other.typeId === 'house' && dist < SYNERGY_CONFIG.RESIDENTIAL_RADIUS) {
                        if (config.category === 'market') resBonus += SYNERGY_CONFIG.BONUSES.MARKET_PER_HOUSE;
                        if (b.typeId === 'canteen') resBonus += SYNERGY_CONFIG.BONUSES.CANTEEN_PER_HOUSE;
                    }
                });

                let eff = 1.0;
                if (config.workerReq) {
                    const reqTypes = Object.keys(config.workerReq) as WorkerType[];
                    eff = Math.min(...reqTypes.map(wType => wEff[wType] ?? 0));
                }

                if (isStarving && config.category !== 'residential') {
                    eff = 0;
                }

                if (config.consumes && eff > 0) {
                    const canConsume = Object.entries(config.consumes).every(([res, val]) => (nRes[res as ResourceType] || 0) >= val * dt);
                    if (!canConsume) {
                        eff = 0;
                    } else {
                        Object.entries(config.consumes).forEach(([res, val]) => nRes[res as ResourceType] -= val * dt);
                    }
                }

                const upgradeBonus = 1 + (b.level - 1) * 0.5;
                const totalBoost = eff * (1 + clusterBonus + chainBonus + resBonus) * upgradeBonus * foremanMul * weatherMul * shiftMul;

                incomeTotal += config.baseIncome * totalBoost * dt;

                if (config.produces && eff > 0) {
                    Object.entries(config.produces).forEach(([rType, val]) => {
                        const amount = val * totalBoost * dt;
                        nRes[rType as ResourceType] += amount;
                        if (!nDiscovered.includes(rType as ResourceType)) nDiscovered.push(rType as ResourceType);
                    });
                }
            });

            const newContracts = [...state.activeContracts];
            if (state.activeContracts.length < 3 && Math.random() < (0.001 * dt * 10)) {
                // Era-appropriate resources
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

        case 'LOAD_GAME': return { ...state, ...action.state };
        case 'RESET_GAME': return INITIAL_STATE as GameState;
        case 'MOVE_BUILDING': return { ...state, buildings: state.buildings.map(b => b.id === action.id ? { ...b, x: action.x, y: action.y } : b) };
        case 'HIRE_WORKER': return { ...state, balance: state.balance - action.cost, workers: { ...state.workers, [action.workerType]: (state.workers[action.workerType] || 0) + 1 } };
        case 'FIRE_WORKER':
            if ((state.workers[action.workerType] || 0) <= 0) return state;
            const refund = Math.floor(WORKER_COSTS[action.workerType] * 0.7);
            return {
                ...state,
                balance: state.balance + refund,
                workers: { ...state.workers, [action.workerType]: state.workers[action.workerType] - 1 }
            };
        default: return state;
    }
}

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE as GameState);
    const lastTickRef = useRef<number>(Date.now());

    const { incomePerSecond, resourceRates } = useMemo(() => {
        const wDmd: Record<string, number> = {};
        GENERATORS_CONFIG.forEach(gen => {
            const count = state.generators[gen.id] || 0;
            if (count > 0 && gen.workerReq) {
                Object.entries(gen.workerReq).forEach(([wType, wNeeded]) => {
                    wDmd[wType] = (wDmd[wType] || 0) + (wNeeded * count);
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

        const foremanMul = 1 + (state.workers.foreman || 0) * 0.2;
        const weatherMul = WEATHER_MODIFIERS[state.weather] || 1.0;
        const shiftMul = state.shiftActive ? SHIFT_MULTIPLIER : 1.0;

        state.buildings.forEach(b => {
            const config = GENERATORS_CONFIG.find(g => g.id === b.typeId);
            if (!config || b.status === 'lunch' || !b.isPlaced || !b.isActive) return;

            // --- SYNERGY CALCULATION IN MEMO ---
            let clusterBonus = 0;
            let chainBonus = 0;
            let resBonus = 0;

            state.buildings.forEach(other => {
                if (other.id === b.id || !other.isActive) return;
                const dist = Math.sqrt(Math.pow(other.x - b.x, 2) + Math.pow(other.y - b.y, 2));

                if (other.typeId === b.typeId && dist < SYNERGY_CONFIG.CLUSTER_RADIUS) {
                    clusterBonus += SYNERGY_CONFIG.BONUSES.CLUSTER_PER_BUILDING;
                }

                const chain = SYNERGY_CONFIG.CHAINS.find(c => c.target === b.typeId && c.source === other.typeId);
                if (chain && dist < SYNERGY_CONFIG.CHAIN_RADIUS) {
                    chainBonus += SYNERGY_CONFIG.BONUSES.CHAIN_PROCESSOR;
                }

                if (other.typeId === 'house' && dist < SYNERGY_CONFIG.RESIDENTIAL_RADIUS) {
                    if (config.category === 'market') resBonus += SYNERGY_CONFIG.BONUSES.MARKET_PER_HOUSE;
                    if (b.typeId === 'canteen') resBonus += SYNERGY_CONFIG.BONUSES.CANTEEN_PER_HOUSE;
                }
            });

            let eff = 1.0;
            if (config.workerReq) {
                const reqTypes = Object.keys(config.workerReq) as WorkerType[];
                eff = Math.min(...reqTypes.map(wType => wEff[wType] ?? 0));
            }

            if (config.consumes) {
                const canConsume = Object.entries(config.consumes).every(([res]) => (state.resources[res as ResourceType] || 0) > 0);
                if (!canConsume) eff = 0;
            }

            const upgradeBonus = 1 + (b.level - 1) * 0.5;
            const totalBoost = eff * (1 + clusterBonus + chainBonus + resBonus) * upgradeBonus * foremanMul * weatherMul * shiftMul;

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
    }, [state]);

    const workerCaps = useMemo(() => {
        const total = Object.values(state.workers || {}).reduce((a, b) => a + (b || 0), 0);
        const houseCount = state.generators?.house || 0;
        const max = 5 + (houseCount * 5);
        return { current: total, max };
    }, [state.workers, state.generators]);

    useEffect(() => {
        const saved = localStorage.getItem('story-imperia-save');
        if (saved) {
            try { dispatch({ type: 'LOAD_GAME', state: { ...INITIAL_STATE, ...JSON.parse(saved) } } as any); }
            catch (e) { console.error("Load failed", e); }
        }
    }, []);

    useEffect(() => {
        const interval = setInterval(() => localStorage.setItem('story-imperia-save', JSON.stringify(state)), 5000);
        return () => clearInterval(interval);
    }, [state]);

    useEffect(() => {
        let frameId: number;
        const loop = () => {
            const now = Date.now();
            const dt = Math.min((now - lastTickRef.current) / 1000, 1.0);
            lastTickRef.current = now;
            if (dt > 0) dispatch({ type: 'TICK', dt });
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
                if (state.balance >= cost && workerCaps.current < workerCaps.max) {
                    dispatch({ type: 'HIRE_WORKER', workerType, cost });
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
