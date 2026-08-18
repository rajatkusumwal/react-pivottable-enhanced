/** UI strings + number locale for the pivot components. */

export interface PivotStrings {
  fields: string;
  rows: string;
  columns: string;
  values: string;
  filters: string;
  grandTotal: string;
  total: string;
  search: string;
  export: string;
  print: string;
  chart: string;
  grid: string;
  drillThrough: string;
  calculatedValue: string;
  addFilter: string;
  clear: string;
  options: string;
  subtotals: string;
  grandTotals: string;
  expandAll: string;
  collapseAll: string;
  records: string;
  close: string;
  noData: string;
}

const en: PivotStrings = {
  fields: "Fields",
  rows: "Rows",
  columns: "Columns",
  values: "Values",
  filters: "Filters",
  grandTotal: "Grand total",
  total: "Total",
  search: "Search",
  export: "Export",
  print: "Print",
  chart: "Chart",
  grid: "Table",
  drillThrough: "See the records behind this number",
  calculatedValue: "Calculated value",
  addFilter: "Add filter",
  clear: "Clear",
  options: "Options",
  subtotals: "Sub-totals",
  grandTotals: "Grand totals",
  expandAll: "Expand all",
  collapseAll: "Collapse all",
  records: "records",
  close: "Close",
  noData: "No data to show",
};

export const locales: Record<
  string,
  { label: string; numberLocale: string; strings: PivotStrings }
> = {
  en: { label: "English", numberLocale: "en-US", strings: en },
  fr: {
    label: "Français",
    numberLocale: "fr-FR",
    strings: {
      ...en,
      fields: "Champs",
      rows: "Lignes",
      columns: "Colonnes",
      values: "Valeurs",
      filters: "Filtres",
      grandTotal: "Total général",
      total: "Total",
      search: "Rechercher",
      export: "Exporter",
      print: "Imprimer",
      chart: "Graphique",
      grid: "Tableau",
      drillThrough: "Voir les enregistrements",
      calculatedValue: "Valeur calculée",
      addFilter: "Ajouter un filtre",
      clear: "Effacer",
      options: "Options",
      subtotals: "Sous-totaux",
      grandTotals: "Totaux généraux",
      expandAll: "Tout développer",
      collapseAll: "Tout réduire",
      records: "enregistrements",
      close: "Fermer",
      noData: "Aucune donnée",
    },
  },
  de: {
    label: "Deutsch",
    numberLocale: "de-DE",
    strings: {
      ...en,
      fields: "Felder",
      rows: "Zeilen",
      columns: "Spalten",
      values: "Werte",
      filters: "Filter",
      grandTotal: "Gesamtsumme",
      total: "Summe",
      search: "Suchen",
      export: "Exportieren",
      print: "Drucken",
      chart: "Diagramm",
      grid: "Tabelle",
      drillThrough: "Datensätze anzeigen",
      calculatedValue: "Berechneter Wert",
      addFilter: "Filter hinzufügen",
      clear: "Zurücksetzen",
      options: "Optionen",
      subtotals: "Zwischensummen",
      grandTotals: "Gesamtsummen",
      expandAll: "Alle ausklappen",
      collapseAll: "Alle einklappen",
      records: "Datensätze",
      close: "Schließen",
      noData: "Keine Daten",
    },
  },
  es: {
    label: "Español",
    numberLocale: "es-ES",
    strings: {
      ...en,
      fields: "Campos",
      rows: "Filas",
      columns: "Columnas",
      values: "Valores",
      filters: "Filtros",
      grandTotal: "Total general",
      total: "Total",
      search: "Buscar",
      export: "Exportar",
      print: "Imprimir",
      chart: "Gráfico",
      grid: "Tabla",
      drillThrough: "Ver los registros",
      calculatedValue: "Valor calculado",
      addFilter: "Añadir filtro",
      clear: "Limpiar",
      options: "Opciones",
      subtotals: "Subtotales",
      grandTotals: "Totales generales",
      expandAll: "Expandir todo",
      collapseAll: "Contraer todo",
      records: "registros",
      close: "Cerrar",
      noData: "Sin datos",
    },
  },
  ja: {
    label: "日本語",
    numberLocale: "ja-JP",
    strings: {
      ...en,
      fields: "フィールド",
      rows: "行",
      columns: "列",
      values: "値",
      filters: "フィルター",
      grandTotal: "総計",
      total: "合計",
      search: "検索",
      export: "エクスポート",
      print: "印刷",
      chart: "グラフ",
      grid: "表",
      drillThrough: "元データを見る",
      calculatedValue: "計算値",
      addFilter: "フィルター追加",
      clear: "クリア",
      options: "オプション",
      subtotals: "小計",
      grandTotals: "総計",
      expandAll: "すべて展開",
      collapseAll: "すべて折りたたむ",
      records: "件",
      close: "閉じる",
      noData: "データがありません",
    },
  },
};

export function getLocale(code: string) {
  return locales[code] ?? (locales["en"] as (typeof locales)[string]);
}
