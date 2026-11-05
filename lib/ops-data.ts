export type BatteryRow = {
  id: string;
  status: string;
  station: string;
  soc: number;
  soh: number;
};

export type SwapRow = {
  id: string;
  rider: string;
  bike: string;
  battery: string;
  station: string;
  time: string;
  status: string;
  fee: string;
};

export type StationRow = {
  id: string;
  name: string;
  online: boolean;
  throughput: number;
  available: number;
  capacity: number;
};

export type RiderRow = {
  id: string;
  name: string;
  phone: string;
  bike: string;
  card: string;
  wallet: string;
  status: string;
};

export const batteries: BatteryRow[] = [
  { id: "BAT-1042", status: "Available", station: "Goma Central", soc: 92, soh: 98 },
  { id: "BAT-2018", status: "Assigned", station: "Goma West", soc: 64, soh: 91 },
  { id: "BAT-3011", status: "Charging", station: "Goma South", soc: 38, soh: 88 },
  { id: "BAT-4871", status: "Faulty", station: "Goma Hub", soc: 11, soh: 62 },
  { id: "BAT-5520", status: "Available", station: "Goma Central", soc: 81, soh: 96 },
];

export const swaps: SwapRow[] = [
  { id: "SW-1842", rider: "A. Marie", bike: "KDG 834P", battery: "BAT-1042", station: "Goma Central", time: "08:15", status: "Completed", fee: "CDF 4,500" },
  { id: "SW-1843", rider: "M. Romain", bike: "KBA 412X", battery: "BAT-2018", station: "Goma West", time: "08:42", status: "Installed", fee: "CDF 4,500" },
  { id: "SW-1844", rider: "P. Quentin", bike: "KCC 774M", battery: "BAT-3011", station: "Goma South", time: "09:05", status: "Assigned", fee: "CDF 4,500" },
  { id: "SW-1845", rider: "J. Rosalinda", bike: "KDL 219Y", battery: "BAT-4871", station: "Goma Hub", time: "09:28", status: "Failed", fee: "CDF 0" },
];

export const stations: StationRow[] = [
  { id: "GMC", name: "Goma Central", online: true, throughput: 96, available: 24, capacity: 32 },
  { id: "GMW", name: "Goma West", online: true, throughput: 89, available: 18, capacity: 28 },
  { id: "GMS", name: "Goma South", online: false, throughput: 62, available: 9, capacity: 20 },
  { id: "GMH", name: "Goma Hub", online: true, throughput: 91, available: 17, capacity: 24 },
];

export const riders: RiderRow[] = [
  { id: "R-102", name: "Aline Marie", phone: "+243 810 220 114", bike: "KDG 834P", card: "NFC-4412", wallet: "CDF 28,400", status: "Active" },
  { id: "R-118", name: "Marc Romain", phone: "+243 970 441 882", bike: "KBA 412X", card: "NFC-2281", wallet: "CDF 6,200", status: "Active" },
  { id: "R-141", name: "Paul Quentin", phone: "+243 812 009 331", bike: "KCC 774M", card: "NFC-9033", wallet: "CDF 1,150", status: "Pending" },
  { id: "R-166", name: "Jeanne Rosalinda", phone: "+243 990 118 640", bike: "KDL 219Y", card: "NFC-1104", wallet: "CDF 0", status: "Active" },
];

export const hourlySwaps = [
  { label: "06", value: 18 },
  { label: "08", value: 42 },
  { label: "10", value: 36 },
  { label: "12", value: 51 },
  { label: "14", value: 29 },
  { label: "16", value: 47 },
  { label: "18", value: 33 },
];

export const notices = [
  { id: "n1", title: "Low stock", message: "Goma South has 9 batteries against a capacity of 20.", tone: "warning" as const },
  { id: "n2", title: "Swap failed", message: "SW-1845 could not complete. Battery BAT-4871 is faulty.", tone: "error" as const },
  { id: "n3", title: "Rotation policy", message: "North corridor stations now assign the oldest available pack.", tone: "info" as const },
];
