// Mock data for ClarityBoard dashboard

export type DatasetStatus = 'uploaded' | 'cleaning' | 'processing' | 'ready' | 'error'

export interface Dataset {
  id: string
  name: string
  fileType: string
  status: DatasetStatus
  recordsCount: number
  lastUpdated: string
  size: string
}

export interface KPIData {
  totalRevenue: number
  totalExpenses: number
  totalProfit: number
  totalLoss: number
  todayRevenue: number
  todayExpenses: number
  todayProfit: number
  todayLoss: number
  weeklyProfit: number
  monthlyProfit: number
  revenueChange: number
  expensesChange: number
  profitChange: number
}

export interface Product {
  id: string
  name: string
  category: string
  revenue: number
  expense: number
  profit: number
  inventory: number
  status: 'healthy' | 'low-stock' | 'out-of-stock' | 'at-risk'
  date: string
}

export interface ChartDataPoint {
  date: string
  revenue: number
  expenses: number
  profit: number
}

export interface Suggestion {
  id: string
  type: 'stock' | 'expense' | 'revenue' | 'profit'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  actionLabel: string
}

export interface NotificationItem {
  id: string
  type: 'payment' | 'client' | 'alert' | 'document'
  title: string
  description: string
  time: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// Mock datasets
export const mockDatasets: Dataset[] = [
  {
    id: '1',
    name: 'Q4 Sales Report',
    fileType: 'CSV',
    status: 'ready',
    recordsCount: 15420,
    lastUpdated: '2 hours ago',
    size: '2.4 MB',
  },
  {
    id: '2',
    name: 'Inventory Snapshot',
    fileType: 'Excel',
    status: 'ready',
    recordsCount: 3250,
    lastUpdated: '5 hours ago',
    size: '1.8 MB',
  },
  {
    id: '3',
    name: 'Customer Feedback',
    fileType: 'PDF',
    status: 'processing',
    recordsCount: 0,
    lastUpdated: '10 minutes ago',
    size: '4.2 MB',
  },
  {
    id: '4',
    name: 'Product Catalog',
    fileType: 'JSON',
    status: 'cleaning',
    recordsCount: 0,
    lastUpdated: '30 minutes ago',
    size: '890 KB',
  },
  {
    id: '5',
    name: 'Receipt Images',
    fileType: 'Images',
    status: 'uploaded',
    recordsCount: 0,
    lastUpdated: 'Just now',
    size: '12.5 MB',
  },
]

// Mock KPI data
export const mockKPIData: KPIData = {
  totalRevenue: 2847500,
  totalExpenses: 1923400,
  totalProfit: 924100,
  totalLoss: 45200,
  todayRevenue: 48750,
  todayExpenses: 31200,
  todayProfit: 17550,
  todayLoss: 1200,
  weeklyProfit: 89400,
  monthlyProfit: 345600,
  revenueChange: 12.5,
  expensesChange: -3.2,
  profitChange: 18.7,
}

// Mock products
export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Premium Wireless Headphones',
    category: 'Electronics',
    revenue: 125400,
    expense: 68200,
    profit: 57200,
    inventory: 245,
    status: 'healthy',
    date: '2026-01-30',
  },
  {
    id: '2',
    name: 'Organic Coffee Blend',
    category: 'Food & Beverage',
    revenue: 89600,
    expense: 52100,
    profit: 37500,
    inventory: 12,
    status: 'low-stock',
    date: '2026-01-30',
  },
  {
    id: '3',
    name: 'Fitness Tracker Pro',
    category: 'Electronics',
    revenue: 234500,
    expense: 145800,
    profit: 88700,
    inventory: 0,
    status: 'out-of-stock',
    date: '2026-01-29',
  },
  {
    id: '4',
    name: 'Eco-Friendly Water Bottle',
    category: 'Home & Garden',
    revenue: 45200,
    expense: 48900,
    profit: -3700,
    inventory: 890,
    status: 'at-risk',
    date: '2026-01-29',
  },
  {
    id: '5',
    name: 'Smart Home Hub',
    category: 'Electronics',
    revenue: 178900,
    expense: 98700,
    profit: 80200,
    inventory: 156,
    status: 'healthy',
    date: '2026-01-28',
  },
  {
    id: '6',
    name: 'Yoga Mat Premium',
    category: 'Sports',
    revenue: 67800,
    expense: 34500,
    profit: 33300,
    inventory: 423,
    status: 'healthy',
    date: '2026-01-28',
  },
  {
    id: '7',
    name: 'Bluetooth Speaker Mini',
    category: 'Electronics',
    revenue: 92100,
    expense: 61400,
    profit: 30700,
    inventory: 8,
    status: 'low-stock',
    date: '2026-01-27',
  },
  {
    id: '8',
    name: 'Desk Organizer Set',
    category: 'Office',
    revenue: 23400,
    expense: 12800,
    profit: 10600,
    inventory: 567,
    status: 'healthy',
    date: '2026-01-27',
  },
]

// Mock chart data
export const mockChartData: ChartDataPoint[] = [
  { date: 'Jan 1', revenue: 42000, expenses: 28000, profit: 14000 },
  { date: 'Jan 5', revenue: 48000, expenses: 31000, profit: 17000 },
  { date: 'Jan 10', revenue: 51000, expenses: 29500, profit: 21500 },
  { date: 'Jan 15', revenue: 47000, expenses: 32000, profit: 15000 },
  { date: 'Jan 20', revenue: 55000, expenses: 33500, profit: 21500 },
  { date: 'Jan 25', revenue: 62000, expenses: 35000, profit: 27000 },
  { date: 'Jan 30', revenue: 58000, expenses: 34000, profit: 24000 },
]

// Mock suggestions
export const mockSuggestions: Suggestion[] = [
  {
    id: '1',
    type: 'stock',
    title: 'Restock Organic Coffee Blend',
    description: 'Only 12 units remaining. Based on sales velocity, stock will deplete in 3 days.',
    impact: 'high',
    actionLabel: 'Create Purchase Order',
  },
  {
    id: '2',
    type: 'revenue',
    title: 'Fitness Tracker Pro Opportunity',
    description: 'High demand detected but out of stock. Potential revenue loss of $12,400/day.',
    impact: 'high',
    actionLabel: 'Expedite Restock',
  },
  {
    id: '3',
    type: 'expense',
    title: 'Reduce Water Bottle Production Cost',
    description: 'Current margins are negative. Consider renegotiating supplier contract.',
    impact: 'medium',
    actionLabel: 'View Suppliers',
  },
  {
    id: '4',
    type: 'profit',
    title: 'Premium Headphones Upsell',
    description: 'Bundle with accessories to increase average order value by 23%.',
    impact: 'medium',
    actionLabel: 'Create Bundle',
  },
]

// Mock notifications
export const mockNotifications: NotificationItem[] = [
  {
    id: '1',
    type: 'payment',
    title: 'Invoice paid by Polaris Dental',
    description: 'Payment of $2,480 was deposited into Checking **** 2314.',
    time: '12m ago',
  },
  {
    id: '2',
    type: 'client',
    title: 'New client: Redwood Realty',
    description: 'Onboarding completed. Add their first invoice to start tracking.',
    time: '1h ago',
  },
  {
    id: '3',
    type: 'alert',
    title: 'Card spend near limit',
    description: 'Marketing card is at 92% of the monthly budget.',
    time: '3h ago',
  },
  {
    id: '4',
    type: 'document',
    title: 'January statements ready',
    description: 'Monthly statements are available for download.',
    time: 'Yesterday',
  },
]

// Mock chat messages
export const mockChatMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Welcome to ClarityBoard! I can help you understand your business data. Ask me anything about your revenue, inventory, or trends.',
    timestamp: '10:00 AM',
  },
]

// Suggested questions for the AI assistant
export const suggestedQuestions = [
  'Which products are going out of stock?',
  'What products are underperforming?',
  'How can I increase my sales?',
  'What should I restock?',
  'Show me this month\'s trends',
  'Which category has the best margins?',
]
