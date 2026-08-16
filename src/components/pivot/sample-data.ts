import type { FieldDef, PivotRow } from "./types";

const regions = ["North", "South", "East", "West"] as const;
const countries: Record<string, string[]> = {
  North: ["Canada", "Sweden"],
  South: ["Brazil", "Spain"],
  East: ["Japan", "India"],
  West: ["USA", "Mexico"],
};
const categories: Record<string, string[]> = {
  Bikes: ["Mountain bike", "Road bike"],
  Clothing: ["Jersey", "Gloves"],
  Accessories: ["Helmet", "Bottle"],
};
const channels = ["Online", "Retail", "Partner"] as const;
const quarters = ["Q1", "Q2", "Q3", "Q4"] as const;

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

export function generateSalesData(count = 480, seed = 42): PivotRow[] {
  const rand = mulberry32(seed);
  const rows: PivotRow[] = [];
  for (let i = 0; i < count; i++) {
    const region = regions[Math.floor(rand() * regions.length)] as string;
    const countryList = countries[region] as string[];
    const country = countryList[Math.floor(rand() * countryList.length)] as string;
    const category = Object.keys(categories)[Math.floor(rand() * 3)] as string;
    const productList = categories[category] as string[];
    const product = productList[Math.floor(rand() * productList.length)] as string;
    const channel = channels[Math.floor(rand() * channels.length)] as string;
    const quarter = quarters[Math.floor(rand() * quarters.length)] as string;
    const quantity = 1 + Math.floor(rand() * 40);
    const unitPrice = Math.round((20 + rand() * 480) * 100) / 100;
    const revenue = Math.round(quantity * unitPrice * 100) / 100;
    const cost = Math.round(revenue * (0.45 + rand() * 0.3) * 100) / 100;
    rows.push({
      id: i + 1,
      year: 2024 + (rand() > 0.5 ? 1 : 0),
      quarter,
      region,
      country,
      category,
      product,
      channel,
      salesperson: `Rep ${1 + Math.floor(rand() * 12)}`,
      quantity,
      unitPrice,
      revenue,
      cost,
    });
  }
  return rows;
}

export const sampleFields: FieldDef[] = [
  { name: "year", caption: "Year", type: "number", folder: "Time" },
  { name: "quarter", caption: "Quarter", type: "string", folder: "Time" },
  { name: "region", caption: "Region", type: "string", folder: "Geography" },
  { name: "country", caption: "Country", type: "string", folder: "Geography" },
  { name: "category", caption: "Category", type: "string", folder: "Product" },
  { name: "product", caption: "Product", type: "string", folder: "Product" },
  { name: "channel", caption: "Channel", type: "string", folder: "Sales" },
  { name: "salesperson", caption: "Salesperson", type: "string", folder: "Sales" },
  { name: "quantity", caption: "Quantity", type: "number", folder: "Measures" },
  { name: "unitPrice", caption: "Unit price", type: "number", folder: "Measures" },
  { name: "revenue", caption: "Revenue", type: "number", folder: "Measures" },
  { name: "cost", caption: "Cost", type: "number", folder: "Measures" },
];

export const sampleData = generateSalesData();

export const sampleCsv = `region,category,quarter,revenue,cost
North,Bikes,Q1,1200,700
North,Clothing,Q1,300,120
South,Bikes,Q2,900,540
South,Accessories,Q2,150,60`;
