import type { FieldDef, PivotRow } from "./types";

/**
 * Sample sales dataset with deep, multi-level hierarchies and 50+ columns so
 * the demo can show real drill up / drill down behaviour:
 *
 *   Geography : Region > Country > State > City > Store
 *   Product   : Division > Category > Subcategory > Product > SKU
 *   Time      : Year > Half > Quarter > Month > Week
 *   Customer  : Segment > Type > Loyalty tier > Customer
 *   Sales org : Channel > Sales team > Salesperson
 */

interface GeoNode {
  region: string;
  country: string;
  states: { state: string; cities: string[] }[];
}

const geography: GeoNode[] = [
  {
    region: "North America",
    country: "USA",
    states: [
      { state: "California", cities: ["San Francisco", "Los Angeles"] },
      { state: "New York", cities: ["New York City", "Buffalo"] },
    ],
  },
  {
    region: "North America",
    country: "Canada",
    states: [{ state: "Ontario", cities: ["Toronto", "Ottawa"] }],
  },
  {
    region: "Europe",
    country: "Germany",
    states: [{ state: "Bavaria", cities: ["Munich", "Nuremberg"] }],
  },
  {
    region: "Europe",
    country: "Spain",
    states: [{ state: "Catalonia", cities: ["Barcelona", "Girona"] }],
  },
  {
    region: "Asia Pacific",
    country: "Japan",
    states: [{ state: "Kanto", cities: ["Tokyo", "Yokohama"] }],
  },
  {
    region: "Asia Pacific",
    country: "India",
    states: [{ state: "Maharashtra", cities: ["Mumbai", "Pune"] }],
  },
  {
    region: "Latin America",
    country: "Brazil",
    states: [{ state: "Sao Paulo", cities: ["Sao Paulo", "Campinas"] }],
  },
  {
    region: "Latin America",
    country: "Mexico",
    states: [{ state: "Jalisco", cities: ["Guadalajara", "Zapopan"] }],
  },
];

interface ProductNode {
  division: string;
  category: string;
  subcategory: string;
  products: string[];
}

const catalogue: ProductNode[] = [
  { division: "Hardware", category: "Bikes", subcategory: "Mountain bikes", products: ["Trail 100", "Trail 300"] },
  { division: "Hardware", category: "Bikes", subcategory: "Road bikes", products: ["Speedster", "Aero Pro"] },
  { division: "Hardware", category: "Components", subcategory: "Wheels", products: ["Alloy wheel", "Carbon wheel"] },
  { division: "Hardware", category: "Components", subcategory: "Brakes", products: ["Disc brake", "Rim brake"] },
  { division: "Softgoods", category: "Clothing", subcategory: "Jerseys", products: ["Team jersey", "Classic jersey"] },
  { division: "Softgoods", category: "Clothing", subcategory: "Gloves", products: ["Winter gloves", "Summer gloves"] },
  { division: "Softgoods", category: "Accessories", subcategory: "Safety", products: ["Helmet", "Light set"] },
  { division: "Softgoods", category: "Accessories", subcategory: "Hydration", products: ["Bottle", "Hydration pack"] },
];

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;
const quarterOf = (monthIndex: number) => `Q${Math.floor(monthIndex / 3) + 1}`;
const halfOf = (monthIndex: number) => (monthIndex < 6 ? "H1" : "H2");
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

const channels = ["Online", "Retail", "Partner"] as const;
const teamsByChannel: Record<string, string[]> = {
  Online: ["Digital East", "Digital West"],
  Retail: ["Store North", "Store South"],
  Partner: ["Alliance A", "Alliance B"],
};
const segments = ["Enterprise", "Mid market", "Consumer"] as const;
const typesBySegment: Record<string, string[]> = {
  Enterprise: ["Key account", "Global account"],
  "Mid market": ["Direct", "Reseller"],
  Consumer: ["Individual", "Club"],
};
const loyaltyTiers = ["Platinum", "Gold", "Silver", "Bronze"] as const;
const paymentMethods = ["Credit card", "Invoice", "Wire transfer", "Wallet"] as const;
const currencies = ["USD", "EUR", "JPY", "BRL"] as const;
const shippingModes = ["Standard", "Express", "Same day", "Pickup"] as const;
const warehouses = ["WH-01", "WH-02", "WH-03"] as const;
const suppliers = ["Nordic Parts", "Alpine Works", "Pacific Supply"] as const;
const campaigns = ["Spring push", "Summer sale", "Back to school", "Holiday"] as const;
const leadSources = ["Search", "Email", "Referral", "Event"] as const;
const statuses = ["Completed", "Shipped", "Pending", "Cancelled"] as const;
const priorities = ["High", "Normal", "Low"] as const;
const colors = ["Black", "Red", "Blue", "White"] as const;
const sizes = ["S", "M", "L", "XL"] as const;
const brands = ["Vertex", "Cadence", "Summit"] as const;

/** Deterministic pseudo-random so tests and SSR always agree. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(rand: () => number, list: readonly T[]): T =>
  list[Math.floor(rand() * list.length)] as T;

const round = (n: number, decimals = 2) => {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
};

export function generateSalesData(count = 600, seed = 42): PivotRow[] {
  const rand = mulberry32(seed);
  const rows: PivotRow[] = [];

  for (let i = 0; i < count; i++) {
    const geo = pick(rand, geography);
    const stateNode = pick(rand, geo.states);
    const city = pick(rand, stateNode.cities);
    const store = `${city} store ${1 + Math.floor(rand() * 2)}`;

    const prod = pick(rand, catalogue);
    const product = pick(rand, prod.products);
    const sku = `${product.slice(0, 3).toUpperCase()}-${100 + Math.floor(rand() * 4)}`;

    const year = 2024 + (rand() > 0.5 ? 1 : 0);
    const monthIndex = Math.floor(rand() * 12);
    const day = 1 + Math.floor(rand() * 28);
    const date = new Date(Date.UTC(year, monthIndex, day));

    const channel = pick(rand, channels);
    const salesTeam = pick(rand, teamsByChannel[channel] as string[]);
    const salesperson = `${salesTeam.split(" ")[0]} rep ${1 + Math.floor(rand() * 3)}`;
    const manager = `${salesTeam} manager`;

    const customerSegment = pick(rand, segments);
    const customerType = pick(rand, typesBySegment[customerSegment] as string[]);
    const customerName = `${customerType} ${1 + Math.floor(rand() * 15)}`;

    const quantity = 1 + Math.floor(rand() * 40);
    const unitPrice = round(20 + rand() * 480);
    const grossRevenue = round(quantity * unitPrice);
    const discountPct = round(rand() * 0.2, 3);
    const discountAmount = round(grossRevenue * discountPct);
    const revenue = round(grossRevenue - discountAmount);
    const cost = round(revenue * (0.45 + rand() * 0.3));
    const profit = round(revenue - cost);
    const marginPct = round(revenue ? profit / revenue : 0, 4);
    const shippingCost = round(5 + rand() * 60);
    const taxAmount = round(revenue * 0.08);
    const returnedUnits = rand() > 0.85 ? 1 + Math.floor(rand() * 3) : 0;
    const returnedValue = round(returnedUnits * unitPrice);
    const targetRevenue = round(revenue * (0.8 + rand() * 0.5));

    rows.push({
      id: i + 1,
      orderId: `SO-${10000 + i}`,
      orderDate: date.toISOString().slice(0, 10),
      orderTime: `${String(8 + Math.floor(rand() * 12)).padStart(2, "0")}:${String(
        Math.floor(rand() * 60),
      ).padStart(2, "0")}`,
      year,
      half: halfOf(monthIndex),
      quarter: quarterOf(monthIndex),
      month: months[monthIndex] as string,
      week: `W${String(1 + Math.floor((monthIndex * 30 + day) / 7)).padStart(2, "0")}`,
      dayOfWeek: weekdays[date.getUTCDay() === 0 ? 6 : date.getUTCDay() - 1] as string,
      region: geo.region,
      country: geo.country,
      state: stateNode.state,
      city,
      store,
      division: prod.division,
      category: prod.category,
      subcategory: prod.subcategory,
      product,
      sku,
      brand: pick(rand, brands),
      color: pick(rand, colors),
      size: pick(rand, sizes),
      channel,
      salesTeam,
      salesperson,
      manager,
      customerSegment,
      customerType,
      customerName,
      loyaltyTier: pick(rand, loyaltyTiers),
      paymentMethod: pick(rand, paymentMethods),
      currency: pick(rand, currencies),
      shippingMode: pick(rand, shippingModes),
      warehouse: pick(rand, warehouses),
      supplier: pick(rand, suppliers),
      campaign: pick(rand, campaigns),
      leadSource: pick(rand, leadSources),
      orderStatus: pick(rand, statuses),
      priority: pick(rand, priorities),
      quantity,
      unitPrice,
      discountPct,
      grossRevenue,
      discountAmount,
      revenue,
      cost,
      profit,
      marginPct,
      shippingCost,
      taxAmount,
      returnedUnits,
      returnedValue,
      targetRevenue,
      varianceToTarget: round(revenue - targetRevenue),
      orderCount: 1,
    });
  }
  return rows;
}

const baseFields: FieldDef[] = [
  { name: "id", caption: "Record id", type: "number", folder: "Order" },
  { name: "orderId", caption: "Order id", type: "string", folder: "Order" },
  { name: "orderDate", caption: "Order date", type: "date", folder: "Time" },
  { name: "orderTime", caption: "Order time", type: "time", folder: "Time" },
  { name: "year", caption: "Year", type: "number", folder: "Time" },
  { name: "half", caption: "Half year", type: "string", folder: "Time" },
  { name: "quarter", caption: "Quarter", type: "string", folder: "Time" },
  { name: "month", caption: "Month", type: "string", folder: "Time" },
  { name: "week", caption: "Week", type: "string", folder: "Time" },
  { name: "dayOfWeek", caption: "Day of week", type: "string", folder: "Time" },
  { name: "region", caption: "Region", type: "string", folder: "Geography" },
  { name: "country", caption: "Country", type: "string", folder: "Geography" },
  { name: "state", caption: "State", type: "string", folder: "Geography" },
  { name: "city", caption: "City", type: "string", folder: "Geography" },
  { name: "store", caption: "Store", type: "string", folder: "Geography" },
  { name: "division", caption: "Division", type: "string", folder: "Product" },
  { name: "category", caption: "Category", type: "string", folder: "Product" },
  { name: "subcategory", caption: "Subcategory", type: "string", folder: "Product" },
  { name: "product", caption: "Product", type: "string", folder: "Product" },
  { name: "sku", caption: "SKU", type: "string", folder: "Product" },
  { name: "brand", caption: "Brand", type: "string", folder: "Product" },
  { name: "color", caption: "Colour", type: "string", folder: "Product" },
  { name: "size", caption: "Size", type: "string", folder: "Product" },
  { name: "channel", caption: "Channel", type: "string", folder: "Sales org" },
  { name: "salesTeam", caption: "Sales team", type: "string", folder: "Sales org" },
  { name: "salesperson", caption: "Salesperson", type: "string", folder: "Sales org" },
  { name: "manager", caption: "Manager", type: "string", folder: "Sales org" },
  { name: "customerSegment", caption: "Customer segment", type: "string", folder: "Customer" },
  { name: "customerType", caption: "Customer type", type: "string", folder: "Customer" },
  { name: "customerName", caption: "Customer", type: "string", folder: "Customer" },
  { name: "loyaltyTier", caption: "Loyalty tier", type: "string", folder: "Customer" },
  { name: "paymentMethod", caption: "Payment method", type: "string", folder: "Order" },
  { name: "currency", caption: "Currency", type: "string", folder: "Order" },
  { name: "shippingMode", caption: "Shipping mode", type: "string", folder: "Order" },
  { name: "warehouse", caption: "Warehouse", type: "string", folder: "Order" },
  { name: "supplier", caption: "Supplier", type: "string", folder: "Order" },
  { name: "campaign", caption: "Campaign", type: "string", folder: "Marketing" },
  { name: "leadSource", caption: "Lead source", type: "string", folder: "Marketing" },
  { name: "orderStatus", caption: "Order status", type: "string", folder: "Order" },
  { name: "priority", caption: "Priority", type: "string", folder: "Order" },
  { name: "quantity", caption: "Quantity", type: "number", folder: "Measures" },
  {
    name: "unitPrice",
    caption: "Unit price",
    type: "number",
    folder: "Measures",
    // Summing prices is meaningless, so only these aggregations are offered.
    aggregators: ["average", "median", "min", "max"],
  },
  { name: "discountPct", caption: "Discount %", type: "number", folder: "Measures" },
  { name: "grossRevenue", caption: "Gross revenue", type: "number", folder: "Measures" },
  { name: "discountAmount", caption: "Discount amount", type: "number", folder: "Measures" },
  { name: "revenue", caption: "Revenue", type: "number", folder: "Measures" },
  { name: "cost", caption: "Cost", type: "number", folder: "Measures" },
  { name: "profit", caption: "Profit", type: "number", folder: "Measures" },
  {
    name: "marginPct",
    caption: "Margin %",
    type: "number",
    folder: "Measures",
    aggregators: ["average", "min", "max"],
  },
  { name: "shippingCost", caption: "Shipping cost", type: "number", folder: "Measures" },
  { name: "taxAmount", caption: "Tax", type: "number", folder: "Measures" },
  { name: "returnedUnits", caption: "Returned units", type: "number", folder: "Measures" },
  { name: "returnedValue", caption: "Returned value", type: "number", folder: "Measures" },
  { name: "targetRevenue", caption: "Target revenue", type: "number", folder: "Measures" },
  { name: "varianceToTarget", caption: "Variance to target", type: "number", folder: "Measures" },
  { name: "orderCount", caption: "Orders", type: "number", folder: "Measures" },
];

/** Hierarchies the demo uses for drill up / drill down. */
export const sampleHierarchies: { caption: string; levels: string[] }[] = [
  { caption: "Geography", levels: ["region", "country", "state", "city", "store"] },
  { caption: "Product", levels: ["division", "category", "subcategory", "product", "sku"] },
  { caption: "Time", levels: ["year", "half", "quarter", "month", "week"] },
  { caption: "Customer", levels: ["customerSegment", "customerType", "loyaltyTier", "customerName"] },
  { caption: "Sales org", levels: ["channel", "salesTeam", "salesperson"] },
];

/**
 * Field metadata with hierarchy membership attached, so the field list can show
 * "Geography > Region > Country > …" and let users pick a single sublevel.
 */
export const sampleFields: FieldDef[] = baseFields.map((field) => {
  const hierarchy = sampleHierarchies.find((h) => h.levels.includes(field.name));
  if (!hierarchy) return field;
  return {
    ...field,
    hierarchy: hierarchy.caption,
    level: hierarchy.levels.indexOf(field.name) + 1,
  };
});


export const sampleData = generateSalesData();

export const sampleCsv = `region,category,quarter,revenue,cost
North,Bikes,Q1,1200,700
North,Clothing,Q1,300,120
South,Bikes,Q2,900,540
South,Accessories,Q2,150,60`;
