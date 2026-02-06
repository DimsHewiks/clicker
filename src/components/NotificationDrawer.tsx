import React, { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Bell, Mail, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification, Reward } from '@/types';
import { GENERATORS_CONFIG } from '@/config';

export const NotificationDrawer: React.FC = () => {
    const { state, dispatch } = useGame();
    const [isOpen, setIsOpen] = useState(false);
    const [activeSection, setActiveSection] = useState<'notifications' | 'letters'>('notifications');

    const unreadCount = state.notifications.filter(n => !n.read).length + state.letters.filter(l => !l.read).length;

    const handleToggle = () => {
        setIsOpen(!isOpen);
        // Mark all as read when opening
        if (!isOpen) {
            state.notifications.forEach(n => {
                if (!n.read) {
                    dispatch({ type: 'MARK_NOTIFICATION_READ', id: n.id });
                }
            });
            state.letters.forEach(l => {
                if (!l.read) {
                    dispatch({ type: 'MARK_LETTER_READ', id: l.id });
                }
            });
        }
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleString(undefined, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const renderRewards = (rewards?: Reward[]) => {
        if (!rewards || rewards.length === 0) return null;
        return (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-2">
                {rewards.map((reward, idx) => {
                    if (reward.kind === 'tech') {
                        const gen = GENERATORS_CONFIG.find(g => g.id === reward.id);
                        const Icon = gen?.icon;
                        return (
                            <div key={`${reward.id}-${idx}`} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-wider">
                                {Icon && <Icon className="w-3 h-3 text-primary" />}
                                <span className="text-white/70">{gen?.name || reward.id}</span>
                            </div>
                        );
                    }
                    if (reward.kind === 'category') {
                        return (
                            <div key={`${reward.id}-${idx}`} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-wider">
                                <span className="text-primary">*</span>
                                <span className="text-white/70">{reward.label}</span>
                            </div>
                        );
                    }
                    return (
                        <div key={`${reward.label}-${idx}`} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-wider">
                            <Zap className="w-3 h-3 text-yellow-400" />
                            <span className="text-white/70">{reward.label}</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="relative w-full border-t border-white/10 bg-[#07090c]/95 backdrop-blur-xl shadow-[0_-10px_25px_rgba(0,0,0,0.35)] z-40 overflow-visible">
            {/* Drawer Content */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 40, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                        className="absolute bottom-full left-0 right-0 mb-2 max-h-[40vh] bg-[#0a0d12]/95 backdrop-blur-xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.45)] rounded-xl overflow-hidden"
                    >
                        <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-white/5">
                            <button
                                onClick={() => setActiveSection('notifications')}
                                className={cn(
                                    "px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full border transition-colors",
                                    activeSection === 'notifications'
                                        ? "bg-primary/10 text-primary border-primary/40"
                                        : "text-white/40 border-white/10 hover:text-white/70"
                                )}
                            >
                                Уведомления
                            </button>
                            <button
                                onClick={() => setActiveSection('letters')}
                                className={cn(
                                    "px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full border transition-colors",
                                    activeSection === 'letters'
                                        ? "bg-primary/10 text-primary border-primary/40"
                                        : "text-white/40 border-white/10 hover:text-white/70"
                                )}
                            >
                                Письма
                            </button>
                        </div>
                        <div className="p-4 space-y-3 overflow-y-auto max-h-[32vh] custom-scrollbar">
                            {activeSection === 'letters' ? (
                                state.letters.length === 0 ? (
                                    <div className="text-center text-white/40 text-sm py-8">
                                        Писем пока нет
                                    </div>
                                ) : (
                                    state.letters.slice().reverse().map((letter) => (
                                        <motion.div
                                            key={letter.id}
                                            initial={{ opacity: 0, y: 16 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={cn(
                                                "relative p-4 rounded-lg border bg-card/50 backdrop-blur-sm",
                                                letter.read ? "border-white/5" : "border-primary/30 bg-primary/5"
                                            )}
                                        >
                                            <div className="absolute top-3 right-3 text-[10px] text-white/40 font-mono">
                                                {formatDate(letter.timestamp)}
                                            </div>
                                            {letter.title && (
                                                <div className="text-sm font-bold text-white mb-2 pr-16">
                                                    {letter.title}
                                                </div>
                                            )}
                                            <div className="text-sm text-white/80 whitespace-pre-line leading-relaxed font-medium pr-16">
                                                {letter.message}
                                            </div>
                                            {renderRewards(letter.rewards)}
                                        </motion.div>
                                    ))
                                )
                            ) : state.notifications.length === 0 ? (
                                <div className="text-center text-white/40 text-sm py-8">
                                    Нет уведомлений
                                </div>
                            ) : (
                                state.notifications.slice().reverse().map((notification: Notification) => (
                                    <motion.div
                                        key={notification.id}
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={cn(
                                            "relative p-4 rounded-lg border bg-card/50 backdrop-blur-sm",
                                            notification.read ? "border-white/5" : "border-primary/30 bg-primary/5"
                                        )}
                                    >
                                        <div className="absolute top-3 right-3 text-[10px] text-white/40 font-mono">
                                            {formatDate(notification.timestamp)}
                                        </div>
                                        {notification.title && (
                                            <div className="text-sm font-bold text-white mb-2 pr-16">
                                                {notification.title}
                                            </div>
                                        )}
                                        <div className="text-sm text-white/80 whitespace-pre-line leading-relaxed font-medium pr-16">
                                            {notification.message}
                                        </div>
                                        {renderRewards(notification.rewards)}
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-black text-white/40">
                    <Bell className="w-3.5 h-3.5 text-white/40" />
                    Уведомления и письма
                </div>
                <motion.button
                    onClick={handleToggle}
                    className={cn(
                        "h-7 w-7 rounded-full border border-white/10 bg-black/30 flex items-center justify-center",
                        "hover:bg-white/5 transition-colors"
                    )}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.94 }}
                >
                    {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-white/60" />
                    ) : (
                        <ChevronUp className="w-4 h-4 text-white/60" />
                    )}
                </motion.button>
            </div>
            {unreadCount > 0 && (
                <div className="absolute -top-2 right-3 h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center shadow-lg">
                    {unreadCount}
                </div>
            )}
            <div className="absolute left-4 -top-2 flex items-center gap-1 px-2 py-1 rounded-full bg-[#0c1016] border border-white/10 text-[9px] uppercase tracking-[0.2em] text-white/30">
                <Mail className="w-3 h-3" />
                Центр
            </div>
        </div>
    );
};
