export type WeatherBlock = {
  place: string;
  condition: string;
  code: number | null;
  high: number | null;
  low: number | null;
  precipChance: number | null;
  unit: "F" | "C";
  unavailable?: boolean;
};

export type HeadlineGroup = {
  place: string;
  items: Array<{ title: string; source?: string }>;
  unavailable?: boolean;
};

export type ReceiptEvent = {
  when: string;
  title: string;
};

export type ReceiptNote = {
  author: string | null;
  body: string;
};

export type ReceiptTodo = {
  title: string;
  dueLabel: string;
  status: "new" | "in_progress";
};

export type ReceiptDocument = {
  dateLabel: string;
  weather: WeatherBlock[];
  headlines: HeadlineGroup[];
  events: ReceiptEvent[] | null;
  eventsLabel?: string;
  eventsError?: string;
  notes: ReceiptNote[];
  todos: ReceiptTodo[];
  todoUrl: string;
  showWeatherCredit: boolean;
};
