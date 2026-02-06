import React, { createContext, useContext, useEffect, useReducer, useRef, useMemo } from 'react';
import { type GameState, type GameAction, type WeatherType, type WorkerType, type ResourceType } from '@/types';
import {
    GENERATORS_CONFIG,
    INITIAL_STATE,
    FOOD_CONSUMPTION_RATE,
    FUEL_CONSUMPTION_RATE,
    WEATHER_MODIFIERS,
    SHIFT_MULTIPLIER,
    WORKER_COSTS,
    CANTEEN_DISTANCE_PENALTY,
    CANTEEN_INFLUENCE_RADIUS,
    GRID_SIZE,
    INTEREST_BONUS,
    MARKET_MORALE_PENALTY,
    MARKET_MORALE_THRESHOLD,
    getCellType,
    getSuitabilityMultiplier,
    isInterestCell
} from '@/config';
import { gameReducer } from './gameReducer';
import { soundManager } from '../lib/sound';

const GameContext = createContext<{
    state: GameState;
    dispatch: React.Dispatch<GameAction>;
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

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE as GameState);
    const lastTickRef = useRef<number>(0);
    const stateRef = useRef(state);

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
        const resRates: Record<ResourceType, number> = { food: 0, wood: 0, metal: 0, concrete: 0, sand: 0, stone: 0, fuel: 0, hides: 0, clay: 0 };
        const tWrk = Object.values(state.workers).reduce((a, b) => a + (b || 0), 0);
        resRates.food -= tWrk * FOOD_CONSUMPTION_RATE;
        if (state.heatEnabled) resRates.fuel -= tWrk * FUEL_CONSUMPTION_RATE * (1 - state.fuelEfficiencyBonus);

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

        const canteens = state.buildings.filter(b => b.typeId === 'canteen' && b.isPlaced && b.isActive);

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
            const cellType = getCellType(b.x / GRID_SIZE, b.y / GRID_SIZE);
            const suitabilityMul = getSuitabilityMultiplier(b.typeId, cellType);
            const isInterest = isInterestCell(b.x / GRID_SIZE, b.y / GRID_SIZE, cellType);
            const interestMul = isInterest && ((cellType === 'forest' && config.produces?.wood) || (cellType === 'stone' && config.produces?.stone))
                ? (1 + INTEREST_BONUS)
                : 1;
            const hasNearbyCanteen = canteens.some(c => {
                const dist = Math.sqrt(Math.pow(c.x - b.x, 2) + Math.pow(c.y - b.y, 2));
                return dist <= CANTEEN_INFLUENCE_RADIUS;
            });
            const canteenMul = (config.category === 'production' || config.category === 'market')
                ? (hasNearbyCanteen ? 1 : (1 - CANTEEN_DISTANCE_PENALTY))
                : 1;
            const marketMoraleMul = state.marketMoralePenaltyEnabled && config.category === 'market' && state.happiness < MARKET_MORALE_THRESHOLD
                ? (1 - MARKET_MORALE_PENALTY)
                : 1;
            // Use cached synergyBonus in memo too
            const totalBoost = eff * (1 + b.synergyBonus) * upgradeBonus * foremanMul * weatherMul * shiftMul * suitabilityMul * canteenMul * marketMoraleMul;

            incomeTotal += config.baseIncome * totalBoost;

            if (config.produces && eff > 0) {
                Object.entries(config.produces).forEach(([rType, val]) => {
                    resRates[rType as ResourceType] += val * totalBoost * interestMul;
                });
            }

            if (config.consumes && eff > 0) {
                Object.entries(config.consumes).forEach(([rType, val]) => {
                    resRates[rType as ResourceType] -= val * totalBoost;
                });
            }
        });

        return { incomePerSecond: incomeTotal, resourceRates: resRates };
    }, [state.buildings, state.workers, state.weather, state.shiftActive, state.resources, state.heatEnabled, state.fuelEfficiencyBonus, state.marketMoralePenaltyEnabled, state.happiness]); // Optimized dependencies

    const workerCaps = useMemo(() => {
        const total = Object.values(state.workers || {}).reduce((a, b) => a + (b || 0), 0);
        const houseCount = state.generators?.house || 0;
        const max = 5 + (houseCount * 5);
        return { current: total, max };
    }, [state.workers, state.generators.house]); // Optimized dependencies

    useEffect(() => {
        const saved = localStorage.getItem('story-imperia-save');
        if (saved) {
            try {
                const parsed = JSON.parse(saved) as Partial<GameState>;
                dispatch({ type: 'LOAD_GAME', state: { ...INITIAL_STATE, ...parsed } });
            }
            catch (e) { console.error("Load failed", e); }
        }
    }, []);

    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    useEffect(() => {
        const interval = setInterval(() => {
            try {
                localStorage.setItem('story-imperia-save', JSON.stringify(stateRef.current));
            } catch (e) {
                console.error("Auto-save failed", e);
            }
        }, 10000); // Reduce save frequency
        return () => clearInterval(interval);
    }, []);

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
                if (confirm("Сбросить весь прогресс?")) {
                    localStorage.removeItem('story-imperia-save');
                    dispatch({ type: 'RESET_GAME' });
                }
            },
            loadGame: (s) => dispatch({ type: 'LOAD_GAME', state: s }),
            toggleGodMode: () => dispatch({ type: 'TOGGLE_GOD_MODE' }),
            emitJuice,
            dispatch
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
