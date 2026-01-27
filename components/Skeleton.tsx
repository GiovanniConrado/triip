import React from 'react';

export type SkeletonVariant = 'card' | 'list' | 'avatar' | 'text' | 'title' | 'button';

interface SkeletonProps {
    variant?: SkeletonVariant;
    width?: string;
    height?: string;
    className?: string;
    count?: number;
}

const Skeleton: React.FC<SkeletonProps> = ({
    variant = 'text',
    width,
    height,
    className = '',
    count = 1,
}) => {
    const baseClass = 'animate-pulse bg-gradient-to-r from-terracotta-100 via-terracotta-50 to-terracotta-100 bg-[length:200%_100%] rounded-xl';

    const getVariantStyles = (): string => {
        switch (variant) {
            case 'card':
                return `${baseClass} w-full h-64 rounded-[32px]`;
            case 'list':
                return `${baseClass} w-full h-20 rounded-2xl`;
            case 'avatar':
                return `${baseClass} w-12 h-12 rounded-full`;
            case 'text':
                return `${baseClass} h-4 rounded-lg`;
            case 'title':
                return `${baseClass} h-6 rounded-lg`;
            case 'button':
                return `${baseClass} h-12 rounded-2xl`;
            default:
                return baseClass;
        }
    };

    const style: React.CSSProperties = {};
    if (width) style.width = width;
    if (height) style.height = height;

    if (count > 1) {
        return (
            <div className="space-y-3">
                {Array.from({ length: count }).map((_, index) => (
                    <div
                        key={index}
                        className={`${getVariantStyles()} ${className}`}
                        style={style}
                    />
                ))}
            </div>
        );
    }

    return (
        <div
            className={`${getVariantStyles()} ${className}`}
            style={style}
        />
    );
};

// Specialized Skeleton Components
export const TripCardSkeleton: React.FC = () => (
    <div className="bg-white rounded-[40px] overflow-hidden border border-terracotta-50/50 shadow-sm">
        <Skeleton variant="card" height="256px" className="rounded-none rounded-t-[40px]" />
        <div className="p-6 space-y-4">
            <div className="space-y-2">
                <Skeleton variant="title" width="70%" />
                <Skeleton variant="text" width="50%" />
            </div>
            <div className="flex items-center justify-between mt-4">
                <div className="flex -space-x-3">
                    <Skeleton variant="avatar" />
                    <Skeleton variant="avatar" />
                    <Skeleton variant="avatar" />
                </div>
                <Skeleton variant="button" width="100px" />
            </div>
        </div>
    </div>
);

export const ExpenseListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
    <div className="space-y-3">
        {Array.from({ length: count }).map((_, index) => (
            <div key={index} className="bg-white rounded-2xl p-4 border border-terracotta-100 flex items-center gap-4">
                <Skeleton variant="avatar" className="w-12 h-12" />
                <div className="flex-1 space-y-2">
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="40%" />
                </div>
                <Skeleton variant="text" width="80px" />
            </div>
        ))}
    </div>
);

export const ListItemSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
    <div className="space-y-3">
        {Array.from({ length: count }).map((_, index) => (
            <div key={index} className="bg-white rounded-2xl p-4 border border-terracotta-100 flex items-center gap-4">
                <Skeleton variant="avatar" className="w-10 h-10" />
                <div className="flex-1 space-y-2">
                    <Skeleton variant="text" width="70%" />
                    <Skeleton variant="text" width="50%" />
                </div>
            </div>
        ))}
    </div>
);

export default Skeleton;
