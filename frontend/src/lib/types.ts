export type DashboardSummary = {
  dinner_time: string;
  mess_skipped_today: number;
  fixit_pending: number;
  roomtab_balance: string;
  parcel_arrived: number;
  recent_activity: string[];
};

export type BunkyResponse = {
  intent: string;
  result: {
    tool: string;
    message: string;
  };
};

export type MealSlot = {
  meal: string;
  time: string;
  title: string;
  menu: string[];
  status: string;
  skipped: boolean;
};

export type WeeklyMealCell = {
  items: string[];
};

export type WeeklyMenuDay = {
  day: string;
  date: string;
  breakfast: WeeklyMealCell;
  lunch: WeeklyMealCell;
  dinner: WeeklyMealCell;
};

export type MessMateResponse = {
  period: string;
  today_label: string;
  slots: MealSlot[];
  week: WeeklyMenuDay[];
};

export type MessMateSkipResponse = {
  meal: string;
  date: string;
  already_skipped: boolean;
  message: string;
};

export type MessMateUnskipResponse = {
  meal: string;
  date: string;
  was_skipped: boolean;
  message: string;
};

export type FixItTicket = {
  id: string;
  title: string;
  assignee: string;
  status: string;
  eta: string;
};

export type RoomTabExpense = {
  id: string;
  title: string;
  payer: string;
  total: number;
  share: number;
  status: string;
};

export type RoomTabSummary = {
  currency: string;
  net_balance: number;
  you_are_owed: number;
  you_owe: number;
  expenses: RoomTabExpense[];
};

export type ParcelItem = {
  id: string;
  vendor: string;
  location: string;
  status: string;
  eta: string;
  picked_up: boolean;
};

export type MealRating = {
  meal: string;
  date: string;
  rating: number;
  average: number;
  total_ratings: number;
};

export type MealRatingsResponse = {
  ratings: MealRating[];
};
