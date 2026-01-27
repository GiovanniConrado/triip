import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    icon?: string;
    error?: string;
    helperText?: string;
}

const Input: React.FC<InputProps> = ({
    label,
    icon,
    error,
    helperText,
    className = '',
    ...props
}) => {
    const hasError = !!error;

    return (
        <div className="w-full">
            {label && (
                <label className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest block mb-2">
                    {label}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-sunset-muted">
                        {icon}
                    </span>
                )}
                <input
                    className={`w-full h-14 bg-white border rounded-2xl text-sunset-dark placeholder:text-sunset-muted/50 focus:outline-none focus:ring-2 transition-all ${icon ? 'pl-12 pr-5' : 'px-5'
                        } ${hasError
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-terracotta-100 focus:ring-terracotta-500'
                        } ${className}`}
                    {...props}
                />
            </div>
            {(error || helperText) && (
                <p className={`text-xs mt-1.5 ${hasError ? 'text-red-500' : 'text-sunset-muted'}`}>
                    {error || helperText}
                </p>
            )}
        </div>
    );
};

export default Input;
