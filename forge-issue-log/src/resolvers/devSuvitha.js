import api, { route } from "@forge/api";

const parseRelativeTime = (filterValue) => {
  const now = new Date();

  switch (filterValue) {
    case "24h":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "6m":
      // Fix: Don't mutate the original 'now' date
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return sixMonthsAgo;
    case "1y":
      // Fix: Don't mutate the original 'now' date
      const oneYearAgo = new Date(now);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      return oneYearAgo;
    default:
      return null;
  }
};

const devSuvitha = async (req) => {
  try {
    // Debug: Log the entire request object to see the structure
    console.log("Full request object:", JSON.stringify(req, null, 2));

    // Try different ways to access the parameters
    const issueKey = req.issueKey || req.payload?.issueKey || "KC-24";
    const filter = req.filter || req.payload?.filter || "all";

    console.log("Filter received:", filter);
    console.log("Issue key:", issueKey);

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

    console.log("Total changelog entries:", allChanges.length); // Debug log

    const cutoffDate = parseRelativeTime(filter);
    console.log("Cutoff date:", cutoffDate); // Debug log

    const changelogEntries = allChanges
      .filter((entry) => {
        if (!cutoffDate) return true;
        const entryDate = new Date(entry.created);
        const isIncluded = entryDate >= cutoffDate;
        console.log(
          `Entry ${entry.created}: ${isIncluded ? "INCLUDED" : "FILTERED OUT"}`
        ); // Debug log
        return isIncluded;
      })
      .flatMap((entry) =>
        entry.items.map((item) => ({
          author: entry.author?.displayName || "Unknown",
          field: item.field,
          from: item.fromString || "-",
          to: item.toString || "-",
          date: new Date(entry.created).toISOString(),
        }))
      );

    console.log("Filtered entries count:", changelogEntries.length); // Debug log
    return changelogEntries;
  } catch (e) {
    console.error("Error fetching changelog:", e);
    return [];
  }
};

export default devSuvitha;
