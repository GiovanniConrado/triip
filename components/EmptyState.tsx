import React from 'react';

export type EmptyStateVariant = 'trips' | 'expenses' | 'notifications' | 'friends' | 'suggestions' | 'search' | 'default';

interface EmptyStateProps {
    variant?: EmptyStateVariant;
    title?: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    icon?: string;
}

const VARIANTS: Record<EmptyStateVariant, { icon: string; title: string; description: string }> = {
    trips: {
        icon: 'flight_takeoff',
        title: 'Nenhuma viagem ainda',
        description: 'Comece planejando sua próxima aventura!',
    },
    expenses: {
        icon: 'payments',
        title: 'Sem despesas registradas',
        description: 'Adicione gastos para acompanhar o orçamento.',
    },
    notifications: {
        icon: 'notifications_off',
        title: 'Tudo em dia!',
        description: 'Você não tem notificações no momento.',
    },
    friends: {
        icon: 'group_add',
        title: 'Sua rede está crescendo',
        description: 'Em breve você poderá adicionar amigos.',
    },
    suggestions: {
        icon: 'lightbulb',
        title: 'Nenhuma sugestão ainda',
        description: 'Adicione ideias para sua viagem!',
    },
    search: {
        icon: 'search_off',
        title: 'Nenhum resultado encontrado',
        description: 'Tente buscar com outras palavras.',
    },
    default: {
        icon: 'inbox',
        title: 'Nada aqui',
        description: 'Não há itens para exibir.',
    },
};

const EmptyState: React.FC<EmptyStateProps> = ({
    variant = 'default',
    title,
    description,
    actionLabel,
    onAction,
    icon,
}) => {
    const config = VARIANTS[variant];
    const displayIcon = icon || config.icon;
    const displayTitle = title || config.title;
    const displayDescription = description || config.description;

    return (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-terracotta-50 flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-4xl text-terracotta-300">
                    {displayIcon}
                </span>
            </div>
            <h3 className="text-lg font-bold text-sunset-dark mb-2">{displayTitle}</h3>
            <p className="text-sm text-sunset-muted max-w-xs leading-relaxed">{displayDescription}</p>
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="mt-6 px-6 py-3 bg-terracotta-500 text-white font-bold rounded-2xl shadow-lg shadow-terracotta-500/30 active:scale-[0.98] transition-all flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-lg">add</span>
                    {actionLabel}
                </button>
            )}
        </div>
    );
};

export default EmptyState;
