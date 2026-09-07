import type { GuideDataset, GuideRow } from "../types";
import type { Http } from "./http";

export function guidesApi(http: Http) {
  return {
    list: () => http.req<{ datasets: GuideDataset[] }>("/guides"),
    get: (key: string) => http.req<GuideDataset>(`/guides/${key}`),
    save: (key: string, rows: GuideRow[]) =>
      http.req<GuideDataset>(`/guides/${key}`, {
        method: "PUT",
        body: JSON.stringify({ rows }),
      }),
    addRow: (key: string, row: GuideRow) =>
      http.req<GuideDataset>(`/guides/${key}/row`, {
        method: "POST",
        body: JSON.stringify(row),
      }),
    updateRow: (key: string, index: number, row: GuideRow) =>
      http.req<GuideDataset>(`/guides/${key}/row/${index}`, {
        method: "PUT",
        body: JSON.stringify(row),
      }),
    deleteRow: (key: string, index: number) =>
      http.req<GuideDataset>(`/guides/${key}/row/${index}`, { method: "DELETE" }),
  };
}
