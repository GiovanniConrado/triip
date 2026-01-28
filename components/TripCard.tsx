import React from 'react';
import { Trip, TripSummary } from '../types';
import { DEFAULT_TRIP_IMAGE } from '../constants';

interface TripCardProps {
  trip: Trip | TripSummary;
  onClick: (id: string) => void;
}

const TripCard: React.FC<TripCardProps> = ({ trip, onClick }) => {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = DEFAULT_TRIP_IMAGE;
  };

  return (
    <div
      onClick={() => onClick(trip.id)}
      className="bg-white rounded-[40px] overflow-hidden trip-card-shadow border border-terracotta-50/50 cursor-pointer active:scale-[0.98] transition-all"
    >
      <div className="relative h-64">
        <img
          src={trip.imageUrl || DEFAULT_TRIP_IMAGE}
          alt={trip.title}
          className="w-full h-full object-cover"
          onError={handleImageError}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
        {trip.isNext && (
          <div className="absolute top-5 left-5 bg-white/95 backdrop-blur-sm px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-terracotta-600 shadow-sm">
            Próxima Viagem
          </div>
        )}
        <div className="absolute bottom-4 right-4">
          <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white">
            <span className="material-symbols-outlined">more_vert</span>
          </button>
        </div>
      </div>
      <div className="p-6">
        <div className="mb-4">
          <h3 className="text-2xl font-bold mb-1">{trip.title}</h3>
          <div className="flex items-center gap-2 text-sunset-muted text-sm font-medium">
            <span className="material-symbols-outlined text-base">calendar_today</span>
            <span>{trip.dateRange}</span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-6">
          <div className="flex -space-x-3">
            {trip.participants.slice(0, 3).map((p) => (
              <img
                key={p.id}
                src={p.avatar}
                alt={p.name}
                className="w-10 h-10 rounded-full border-2 border-white object-cover"
              />
            ))}
            {trip.participants.length > 3 && (
              <div className="w-10 h-10 rounded-full border-2 border-white bg-terracotta-50 flex items-center justify-center text-[11px] font-bold text-terracotta-600">
                +{trip.participants.length - 3}
              </div>
            )}
          </div>
          <button className="h-10 px-4 rounded-xl bg-terracotta-50 text-terracotta-600 font-bold text-sm flex items-center gap-1">
            Detalhes <span className="material-symbols-outlined text-lg">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TripCard;
