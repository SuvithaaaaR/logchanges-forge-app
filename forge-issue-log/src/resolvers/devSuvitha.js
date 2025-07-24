import api, { route } from "@forge/api";

/**
 * Parse a relative time filter string to a Date cutoff.
 * @param {string} filterValue Relative time filter: '24h', '7d', '30d', '6m', '1y', 'all'
 * @returns {Date|null} Date object for cutoff, or null for no filtering.
 */
const parseRelativeTime = (filterValue) => {
  const now = new Date();
  switch (filterValue) {
    case "24h":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "6m": {
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return sixMonthsAgo;
    }
    case "1y": {
      const oneYearAgo = new Date(now);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      return oneYearAgo;
    }
    case "all":
    default:
      return null;
  }
};

/**
 * Fetches and filters Jira issue changelog entries by a relative date filter.
 * @param {object} req The incoming request containing issueKey and filter.
 * @returns {Promise<Array>} Filtered changelog entry objects.
 */
const devSuvitha = async (req) => {
  try {
    // Extract parameters with fallback defaults
    const issueKey = req.issueKey || req.payload?.issueKey || "KC-24";
    const rawFilter = req.filter || req.payload?.filter || "all";

    // Properly extract value for filtering
    const filterValue = typeof rawFilter === "string"
      ? rawFilter
      : (rawFilter?.value || "all");

    console.log("Filter received:", rawFilter);
    console.log("Using filter value for parsing:", filterValue);
    console.log("Issue key:", issueKey);

    // Fetch issue with changelog expanded
    const res = await api
      .asUser()
      .requestJira(route`/rest/api/3/issue/${issueKey}?expand=changelog`);

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Jira API error:", res.status, errorText);
      return [];
    }

    const json = await res.json();
    const allChanges = json.changelog?.histories || [];
    console.log("Total changelog entries:", allChanges.length);

    // Determine the cutoff date to filter changelog entries
    const cutoffDate = parseRelativeTime(filterValue);
    console.log("Cutoff date:", cutoffDate);

    // Filter changelog entries by cutoff date, or include all if cutoffDate is null
    const changelogEntries = allChanges
      .filter((entry) => {
        if (!cutoffDate) return true;
        const entryDate = new Date(entry.created);
        const isIncluded = entryDate >= cutoffDate;
        // Uncomment for detailed trace:
        // console.log(`Entry ${entry.created}: ${isIncluded ? "INCLUDED" : "FILTERED OUT"}`);
        return isIncluded;
      })
      // Flatten mapped items for each changelog entry to get meaningful change logs
      .flatMap((entry) =>
        entry.items.map((item) => ({
          author: entry.author?.displayName || "Unknown",
          field: item.field,
          from: item.fromString || "-",
          to: item.toString || "-",
          date: new Date(entry.created).toISOString(),
        }))
      );

    console.log("Filtered entries count:", changelogEntries.length);

    return changelogEntries;
  } catch (e) {
    console.error("Error fetching changelog:", e);
    return [];
  }
};

export default devSuvitha;
