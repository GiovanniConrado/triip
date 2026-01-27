import { supabase } from './supabaseClient';

export interface Notification {
    id: string;
    user_id: string;
    type: 'trip_invite' | 'expense_added' | 'trip_confirmed' | 'reminder' | 'general';
    title: string;
    message: string;
    data?: Record<string, any>;
    is_read: boolean;
    created_at: string;
}

export const notificationService = {
    /**
     * Get all notifications for the current user
     */
    async getNotifications(): Promise<Notification[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[notificationService] Error fetching notifications:', error);
            return [];
        }

        return data || [];
    },

    /**
     * Get unread notifications count
     */
    async getUnreadCount(): Promise<number> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return 0;

        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false);

        if (error) {
            console.error('[notificationService] Error counting unread:', error);
            return 0;
        }

        return count || 0;
    },

    /**
     * Mark a notification as read
     */
    async markAsRead(notificationId: string): Promise<boolean> {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        if (error) {
            console.error('[notificationService] Error marking as read:', error);
            return false;
        }

        return true;
    },

    /**
     * Mark all notifications as read
     */
    async markAllAsRead(): Promise<boolean> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false);

        if (error) {
            console.error('[notificationService] Error marking all as read:', error);
            return false;
        }

        return true;
    },

    /**
     * Delete a notification
     */
    async deleteNotification(notificationId: string): Promise<boolean> {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId);

        if (error) {
            console.error('[notificationService] Error deleting notification:', error);
            return false;
        }

        return true;
    },

    /**
     * Clear all notifications for the current user
     */
    async clearAll(): Promise<boolean> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('user_id', user.id);

        if (error) {
            console.error('[notificationService] Error clearing all:', error);
            return false;
        }

        return true;
    },

    /**
     * Create a notification (for internal use or testing)
     */
    async createNotification(notification: Omit<Notification, 'id' | 'created_at' | 'is_read'>): Promise<Notification | null> {
        const { data, error } = await supabase
            .from('notifications')
            .insert([{ ...notification, is_read: false }])
            .select()
            .single();

        if (error) {
            console.error('[notificationService] Error creating notification:', error);
            return null;
        }

        return data;
    },

    /**
     * Get relative time string (e.g., "2h atrás")
     */
    getRelativeTime(dateString: string): string {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMinutes < 1) return 'Agora';
        if (diffMinutes < 60) return `${diffMinutes}m atrás`;
        if (diffHours < 24) return `${diffHours}h atrás`;
        if (diffDays < 7) return `${diffDays}d atrás`;

        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    },

    /**
     * Get icon for notification type
     */
    getNotificationIcon(type: Notification['type']): string {
        const icons: Record<typeof type, string> = {
            trip_invite: 'mail',
            expense_added: 'payments',
            trip_confirmed: 'check_circle',
            reminder: 'schedule',
            general: 'notifications',
        };
        return icons[type] || 'notifications';
    },

    /**
     * Get color for notification type
     */
    getNotificationColor(type: Notification['type']): string {
        const colors: Record<typeof type, string> = {
            trip_invite: 'bg-blue-100 text-blue-600',
            expense_added: 'bg-emerald-100 text-emerald-600',
            trip_confirmed: 'bg-terracotta-100 text-terracotta-600',
            reminder: 'bg-amber-100 text-amber-600',
            general: 'bg-slate-100 text-slate-600',
        };
        return colors[type] || 'bg-slate-100 text-slate-600';
    },
};
