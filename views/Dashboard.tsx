
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { ViewMode, DashboardTab, TripSummary } from '../types';
import TripCard from '../components/TripCard';
import TripListCard from '../components/TripListCard';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import EmptyState from '../components/EmptyState';
import { TripCardSkeleton } from '../components/Skeleton';

const Dashboard: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeTab, setActiveTab] = useState<DashboardTab>('Confirmadas');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadTrips();
    return storageService.subscribe(loadTrips);
  }, [activeTab]);

  const loadTrips = async () => {
    // Only show loading skeletons if we don't have any trips yet
    if (trips.length === 0) {
      setIsLoading(true);
    }

    try {
      const allTrips = await storageService.getTripsSummary();
      let filteredTrips: TripSummary[] = [];

      switch (activeTab) {
        case 'Confirmadas':
          filteredTrips = allTrips.filter(t => t.status === 'confirmed');
          break;
        case 'Rascunhos':
          filteredTrips = allTrips.filter(t => t.status === 'draft');
          break;
        case 'Passadas':
          filteredTrips = allTrips.filter(t => t.status === 'past');
          break;
      }

      setTrips(filteredTrips);
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTripClick = (id: string) => {
    navigate(`/trip/${id}`);
  };

  // Filter trips by search query
  const filteredTrips = trips.filter(trip => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      trip.title.toLowerCase().includes(query) ||
      trip.destination?.toLowerCase().includes(query)
    );
  });

  const getEmptyStateMessage = () => {
    if (searchQuery.trim()) {
      return {
        variant: 'search' as const,
        title: 'Nenhuma viagem encontrada',
        description: `Não encontramos viagens com "${searchQuery}"`,
      };
    }
    switch (activeTab) {
      case 'Confirmadas':
        return {
          variant: 'trips' as const,
          title: 'Nenhuma viagem confirmada',
          description: 'Confirme uma viagem ou crie uma nova para começar!',
        };
      case 'Rascunhos':
        return {
          variant: 'trips' as const,
          title: 'Nenhum rascunho',
          description: 'Seus rascunhos de viagem aparecerão aqui.',
        };
      case 'Passadas':
        return {
          variant: 'trips' as const,
          title: 'Sem histórico de viagens',
          description: 'Suas viagens passadas aparecerão aqui.',
        };
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col max-w-[480px] mx-auto bg-warm-cream pb-32">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <header className="sticky top-0 z-30 bg-warm-cream/90 backdrop-blur-md px-6 pt-14 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="flex items-center justify-center transition-transform active:scale-90"
            >
              <span className="material-symbols-outlined text-2xl text-sunset-dark">menu</span>
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-sunset-dark">Minhas Viagens</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-terracotta-100/60 p-1 rounded-full flex items-center">
              <button
                onClick={() => setViewMode('grid')}
                className={`w-8 h-8 flex items-center justify-center rounded-full ${viewMode === 'grid' ? 'bg-white shadow-sm text-terracotta-600' : 'text-sunset-muted'}`}
              >
                <span className={`material-symbols-outlined text-lg ${viewMode === 'grid' ? 'fill' : ''}`}>grid_view</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`w-8 h-8 flex items-center justify-center rounded-full ${viewMode === 'list' ? 'bg-white shadow-sm text-terracotta-600' : 'text-sunset-muted'}`}
              >
                <span className={`material-symbols-outlined text-lg ${viewMode === 'list' ? 'fill' : ''}`}>format_list_bulleted</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-sunset-muted">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar viagem..."
            className="w-full h-12 pl-12 pr-4 bg-white border border-terracotta-100 rounded-2xl text-sm font-medium text-sunset-dark placeholder:text-sunset-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-terracotta-100 flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-sm text-sunset-muted">close</span>
            </button>
          )}
        </div>

        <div className="bg-terracotta-100/50 p-1 rounded-2xl flex items-center">
          {(['Confirmadas', 'Rascunhos', 'Passadas'] as DashboardTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${activeTab === tab ? 'bg-white text-terracotta-500 shadow-sm' : 'text-sunset-muted'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 px-6 space-y-6 mt-4">
        {isLoading ? (
          <div className="space-y-6">
            <TripCardSkeleton />
            <TripCardSkeleton />
          </div>
        ) : filteredTrips.length > 0 ? (
          filteredTrips.map(trip => (
            viewMode === 'grid' ? (
              <TripCard key={trip.id} trip={trip} onClick={handleTripClick} />
            ) : (
              <TripListCard key={trip.id} trip={trip} onClick={handleTripClick} />
            )
          ))
        ) : (
          <EmptyState
            {...getEmptyStateMessage()}
            actionLabel={!searchQuery ? 'Nova Viagem' : undefined}
            onAction={!searchQuery ? () => navigate('/add-trip') : undefined}
          />
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
