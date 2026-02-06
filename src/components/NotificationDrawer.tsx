import React, { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification } from '@/types';

export const NotificationDrawer: React.FC = () => {
    const { state, dispatch } = useGame();
    const [isOpen, setIsOpen] = useState(false);

    const unreadCount = state.notifications.filter(n => !n.read).length;

    const handleToggle = () => {
        setIsOpen(!isOpen);
        // Mark all as read when opening
        if (!isOpen) {
            state.notifications.forEach(n => {
                if (!n.read) {
                    dispatch({ type: 'MARK_NOTIFICATION_READ', id: n.id });
                }
            });
        }
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="absolute bottom-0 left-0 right-0 z-50 flex flex-col items-center pointer-events-none">
            {/* Drawer Content */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="w-full max-h-[40vh] bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/10 overflow-y-auto pointer-events-auto"
                    >
                        <div className="p-4 space-y-3">
                            {state.notifications.length === 0 ? (
                                <div className="text-center text-white/40 text-sm py-8">
                                    Нет уведомлений
                                </div>
                            ) : (
                                state.notifications.slice().reverse().map((notification: Notification) => (
                                    <motion.div
                                        key={notification.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={cn(
                                            "p-4 rounded-lg border bg-card/50 backdrop-blur-sm",
                                            notification.read ? "border-white/5" : "border-primary/30 bg-primary/5"
                                        )}
                                    >
                                        {notification.title && (
                                            <div className="text-sm font-bold text-white mb-2">
                                                {notification.title}
                                            </div>
                                        )}
                                        <div className="text-sm text-white/80 whitespace-pre-line leading-relaxed font-medium">
                                            {notification.message}
                                        </div>
                                        <div className="mt-3 text-[10px] text-white/40 text-right font-mono">
                                            {formatDate(notification.timestamp)}
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button */}
            <motion.button
                onClick={handleToggle}
                className={cn(
                    "mb-2 px-6 py-2 rounded-t-xl border border-b-0 border-white/10 bg-[#0a0a0a]/95 backdrop-blur-xl",
                    "hover:bg-white/5 transition-colors pointer-events-auto flex items-center gap-2",
                    "shadow-[0_-4px_12px_rgba(0,0,0,0.3)]"
                )}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
            >
                {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-white/60" />
                ) : (
                    <>
                        <ChevronUp className="w-4 h-4 text-white/60" />
                        <Bell className="w-3.5 h-3.5 text-white/60" />
                        {unreadCount > 0 && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center"
                            >
                                {unreadCount}
                            </motion.div>
                        )}
                    </>
                )}
            </motion.button>
        </div>
    );
};
