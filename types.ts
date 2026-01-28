export type TripStatus = 'confirmed' | 'draft' | 'past';
export type TripType = 'solo' | 'group';
export type FinanceMode = 'track' | 'split';
export type ExpenseStatus = 'pending' | 'settled';
export type ExpenseCategory = 'Hospedagem' | 'Transporte' | 'Alimentação' | 'Passeios' | 'Outros';
export type PaymentMethod = 'cash' | 'installment';

export interface Participant {
  id: string;
  name: string;
  email?: string;
  avatar: string;
  isExternal?: boolean;
  role?: 'admin' | 'member';
}

export interface Installment {
  total: number;          // Total de parcelas (ex: 12)
  paid: number;           // Parcelas já pagas (ex: 3)
  firstDueDate: string;   // Data da primeira parcela (ex: "2025-02-01")
  amount: number;         // Valor de cada parcela
}

export interface Expense {
  id: string;
  tripId: string;
  category: ExpenseCategory;
  amount: number;
  paidBy: string;
  participants: string[];
  status: ExpenseStatus;
  date: string;
  description?: string;
  paymentMethod?: PaymentMethod;
  installment?: Installment;
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  dateRange: string;
  startDate: string;
  endDate: string;
  imageUrl: string;
  budget?: number;
  status: TripStatus;
  tripType?: TripType;
  financeMode?: FinanceMode;
  isNext?: boolean;
  participants: Participant[];
  expenses: Expense[];
  createdAt: string;
  updatedAt: string;
}

export interface TripSummary {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  dateRange: string;
  imageUrl: string;
  status: TripStatus;
  participants: { id: string; avatar: string; name: string }[];
  totalSpent?: number;
}

export type SuggestionStatus = 'confirmed' | 'idea';

export interface SuggestionComment {
  id: string;
  suggestionId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: string;
}

export interface Suggestion {
  id: string;
  tripId?: string;
  title: string;
  category: string;
  location: string;
  price: string;
  rating: number;
  imageUrl: string;
  description?: string;
  status: SuggestionStatus;
  confirmedBy?: string;
  comments: SuggestionComment[];
  externalUrl?: string;
  externalType?: 'website' | 'instagram' | 'maps' | 'booking';
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  timeAgo: string;
  avatar: string;
}

export type ViewMode = 'grid' | 'list';
export type DashboardTab = 'Confirmadas' | 'Rascunhos' | 'Passadas';
