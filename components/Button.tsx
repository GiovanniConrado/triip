import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    icon?: string;
    iconPosition?: 'left' | 'right';
    fullWidth?: boolean;
    loading?: boolean;
    children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'md',
    icon,
    iconPosition = 'left',
    fullWidth = false,
    loading = false,
    children,
    className = '',
    disabled,
    ...props
}) => {
    const baseStyles = 'font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed';

    const variantStyles: Record<ButtonVariant, string> = {
        primary: 'bg-terracotta-500 hover:bg-terracotta-600 text-white shadow-lg shadow-terracotta-500/30',
        secondary: 'bg-white border-2 border-terracotta-100 text-sunset-dark hover:bg-terracotta-50',
        danger: 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30',
        ghost: 'bg-transparent text-terracotta-500 hover:bg-terracotta-50',
    };

    const sizeStyles: Record<ButtonSize, string> = {
        sm: 'h-10 px-4 text-sm',
        md: 'h-12 px-6 text-sm',
        lg: 'h-14 px-8 text-base',
    };

    const widthStyle = fullWidth ? 'w-full' : '';

    return (
        <button
            className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <>
                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                    Carregando...
                </>
            ) : (
                <>
                    {icon && iconPosition === 'left' && (
                        <span className="material-symbols-outlined text-lg">{icon}</span>
                    )}
                    {children}
                    {icon && iconPosition === 'right' && (
                        <span className="material-symbols-outlined text-lg">{icon}</span>
                    )}
                </>
            )}
        </button>
    );
};

export default Button;
