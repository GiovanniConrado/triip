
import React from 'react';
import { Trip } from '../types';
import { DEFAULT_TRIP_IMAGE } from '../constants';

interface TripListCardProps {
  trip: Trip;
  onClick: (id: string) => void;
}

const TripListCard: React.FC<TripListCardProps> = ({ trip, onClick }) => {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = DEFAULT_TRIP_IMAGE;
  };

  return (
    <div
      onClick={() => onClick(trip.id)}
      className="bg-white rounded-2xl p-3 flex items-center gap-4 border border-terracotta-50/50 shadow-sm active:bg-terracotta-50/30 transition-colors cursor-pointer"
    >
      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
        <img
          src={trip.imageUrl || DEFAULT_TRIP_IMAGE}
          alt={trip.title}
          className="w-full h-full object-cover"
          onError={handleImageError}
        />
      </div>
      <div className="flex-1 flex flex-col justify-between h-20 py-0.5">
        <div>
          <h3 className="font-bold text-base leading-tight">{trip.title}</h3>
          <div className="flex items-center gap-1.5 text-sunset-muted text-[11px] mt-1">
            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
            <span>{trip.dateRange}</span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-auto">
          <div className="flex -space-x-2">
            {trip.participants.slice(0, 2).map((p) => (
              <img
                key={p.id}
                src={p.avatar}
                alt={p.name}
                className="w-6 h-6 rounded-full border-2 border-white object-cover"
              />
            ))}
            {trip.participants.length > 2 && (
              <div className="w-6 h-6 rounded-full border-2 border-white bg-terracotta-50 flex items-center justify-center text-[8px] font-bold text-terracotta-600">
                +{trip.participants.length - 2}
              </div>
            )}
          </div>
          <span className="material-symbols-outlined text-terracotta-400">chevron_right</span>
        </div>
      </div>
    </div>
  );
};

export default TripListCard;
