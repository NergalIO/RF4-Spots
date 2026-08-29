import type { GuideDataset, GuideRow } from "../types";
import type { Http } from "./http";

export function guidesApi(http: Http) {
  return {
    guides: () => http.req<{ datasets: GuideDataset[] }>("/guides"),
    guide: (key: string) => http.req<GuideDataset>(`/guides/${key}`),
    saveGuide: (key: string, rows: GuideRow[]) =>
      http.req<GuideDataset>(`/guides/${key}`, {
        method: "PUT",
        body: JSON.stringify({ rows }),
      }),
    addGuideRow: (key: string, row: GuideRow) =>
      http.req<GuideDataset>(`/guides/${key}/row`, {
        method: "POST",
        body: JSON.stringify(row),
      }),
    updateGuideRow: (key: string, index: number, row: GuideRow) =>
      http.req<GuideDataset>(`/guides/${key}/row/${index}`, {
        method: "PUT",
        body: JSON.stringify(row),
      }),
    deleteGuideRow: (key: string, index: number) =>
      http.req<GuideDataset>(`/guides/${key}/row/${index}`, { method: "DELETE" }),
  };
}
