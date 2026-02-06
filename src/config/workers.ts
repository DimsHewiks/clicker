import type { WorkerType } from '@/types';

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
