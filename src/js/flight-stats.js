import { get } from "svelte/store";

import { i18n } from "@/js/i18n.js";

export function getDuration() {
  const hours = Math.floor(FC.FLIGHT_STATS.stats_total_time_s / 60 / 60);
  const minutes = Math.floor((FC.FLIGHT_STATS.stats_total_time_s / 60) % 60);

  return get(i18n).t("flight_stats.duration.value", { hours, minutes });
}
