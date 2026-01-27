import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import Sidebar from '../components/Sidebar';
import EmptyState from '../components/EmptyState';
import { ListItemSkeleton } from '../components/Skeleton';
import Toast, { ToastType } from '../components/Toast';
import { notificationService, Notification } from '../services/notificationService';

const Notifications: React.FC = () => {
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        setIsLoading(true);
        try {
            const data = await notificationService.getNotifications();
            setNotifications(data);
        } catch (error) {
            console.error('Error loading notifications:', error);
            setToast({ message: 'Erro ao carregar notificações', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;
    const filteredNotifications = filter === 'unread'
        ? notifications.filter(n => !n.is_read)
        : notifications;

    const handleMarkAsRead = async (id: string) => {
        const success = await notificationService.markAsRead(id);
        if (success) {
            setNotifications(notifications.map(n =>
                n.id === id ? { ...n, is_read: true } : n
            ));
        }
    };

    const handleMarkAllAsRead = async () => {
        const success = await notificationService.markAllAsRead();
        if (success) {
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
            setToast({ message: 'Todas marcadas como lidas', type: 'success' });
        }
    };

    const handleDeleteNotification = async (id: string) => {
        const success = await notificationService.deleteNotification(id);
        if (success) {
            setNotifications(notifications.filter(n => n.id !== id));
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        handleMarkAsRead(notification.id);

        // Navigate based on notification type and data
        if (notification.data?.trip_id) {
            navigate(`/trip/${notification.data.trip_id}`);
        } else if (notification.data?.expense_id && notification.data?.trip_id) {
            navigate(`/finance/${notification.data.trip_id}`);
        }
    };

    return (
        <div className="relative min-h-screen w-full flex flex-col max-w-[480px] mx-auto bg-warm-cream pb-32">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Header */}
            <header className="sticky top-0 z-30 bg-warm-cream/95 backdrop-blur-md px-6 pt-14 pb-4 border-b border-terracotta-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="flex items-center justify-center transition-transform active:scale-90"
                        >
                            <span className="material-symbols-outlined text-2xl text-sunset-dark">menu</span>
                        </button>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-sunset-dark">Notificações</h1>
                            {unreadCount > 0 && (
                                <p className="text-xs text-terracotta-500 font-bold">{unreadCount} não lida(s)</p>
                            )}
                        </div>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllAsRead}
                            className="text-xs font-bold text-terracotta-500 active:scale-95 transition-transform"
                        >
                            Marcar todas como lidas
                        </button>
                    )}
                </div>

                {/* Filter Tabs */}
                <div className="flex p-1 bg-terracotta-100/40 rounded-2xl">
                    <button
                        onClick={() => setFilter('all')}
                        className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${filter === 'all' ? 'bg-white text-terracotta-600 shadow-sm' : 'text-sunset-muted'
                            }`}
                    >
                        Todas
                    </button>
                    <button
                        onClick={() => setFilter('unread')}
                        className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${filter === 'unread' ? 'bg-white text-terracotta-600 shadow-sm' : 'text-sunset-muted'
                            }`}
                    >
                        Não lidas
                        {unreadCount > 0 && (
                            <span className="w-5 h-5 bg-terracotta-500 text-white text-[10px] rounded-full flex items-center justify-center">
                                {unreadCount}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            <main className="flex-1 px-6 py-4 space-y-3">
                {isLoading ? (
                    <ListItemSkeleton count={5} />
                ) : filteredNotifications.length === 0 ? (
                    <EmptyState
                        variant="notifications"
                        title={filter === 'unread' ? 'Nenhuma notificação não lida' : 'Nenhuma notificação'}
                        description="Você está em dia! Suas notificações aparecerão aqui."
                    />
                ) : (
                    filteredNotifications.map(notification => (
                        <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`bg-white rounded-2xl p-4 border shadow-sm cursor-pointer active:scale-[0.99] transition-all group ${notification.is_read ? 'border-terracotta-100' : 'border-terracotta-300 border-l-4'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${notificationService.getNotificationColor(notification.type)}`}>
                                    <span className="material-symbols-outlined text-xl">
                                        {notificationService.getNotificationIcon(notification.type)}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                            <p className={`text-sm font-bold text-sunset-dark ${!notification.is_read ? 'text-terracotta-600' : ''}`}>
                                                {notification.title}
                                            </p>
                                            <p className="text-xs text-sunset-muted mt-0.5 line-clamp-2">{notification.message}</p>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteNotification(notification.id); }}
                                            className="w-6 h-6 rounded-full flex items-center justify-center text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <span className="material-symbols-outlined text-sm">close</span>
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-sunset-muted mt-2 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[10px]">schedule</span>
                                        {notificationService.getRelativeTime(notification.created_at)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </main>

            <BottomNav />
        </div>
    );
};

export default Notifications;
