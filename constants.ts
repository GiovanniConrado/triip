
import { Trip, Suggestion, Comment } from './types';

export const DEFAULT_TRIP_IMAGE = '/default-trip.jpg';

// Mocks are now strictly for reference as we use Supabase for real data
export const MOCK_TRIPS: Trip[] = [
  {
    id: '1',
    title: 'Costa Amalfitana',
    destination: 'Itália',
    dateRange: '15 Set - 22 Set, 2024',
    startDate: '2024-09-15',
    endDate: '2024-09-22',
    imageUrl: DEFAULT_TRIP_IMAGE,
    isNext: true,
    status: 'confirmed',
    participants: [],
    expenses: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const MOCK_SUGGESTIONS: Suggestion[] = [
  {
    id: 's1',
    title: 'Hotel Fasano',
    category: 'Hospedagem',
    location: 'Ipanema',
    price: 'R$ 16.800',
    rating: 4.9,
    imageUrl: DEFAULT_TRIP_IMAGE,
    description: 'Hotel de luxo em frente à praia de Ipanema.',
    status: 'confirmed',
    confirmedBy: 'Marcus',
    externalUrl: 'https://www.fasano.com.br/hotel/rio-de-janeiro',
    externalType: 'website',
    comments: []
  }
];

export const MOCK_COMMENTS: Comment[] = [
  {
    id: 'c1',
    author: 'Julia',
    text: 'Essa cobertura é incrível!',
    timeAgo: '2h atrás',
    avatar: DEFAULT_TRIP_IMAGE
  }
];
