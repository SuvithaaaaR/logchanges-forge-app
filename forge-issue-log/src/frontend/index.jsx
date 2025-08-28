import React, { useEffect, useState } from "react";
import ForgeReconciler, {
  Text,
  Inline,
  Box,
  Strong,
  xcss,
  Button,
  Select,
} from "@forge/react";
import { invoke } from "@forge/bridge";

const currentDev = "devSuvitha";

// 📍 Get user's local timezone
const useUserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

// 📍 Styling helper
const useStyles = () => {
  const tableStyle = xcss({
    width: "100%",
    padding: "space.100",
    backgroundColor: "color.background.neutral",
  });

  const rowStyle = xcss({
    paddingBottom: "space.050",
    borderBottom: "1px solid",
    borderColor: "color.border",
  });

  const cellStyle = xcss({
    width: "20%",
  });

  return { tableStyle, rowStyle, cellStyle };
};

// 📍 Header Cell component
const HeaderCell = ({ children, cellStyle }) => (
  <Box xcss={cellStyle}>
    <Text>
      <Strong>{children}</Strong>
    </Text>
  </Box>
);

// 📍 Data Cell component
const DataCell = ({ children, cellStyle }) => (
  <Box xcss={cellStyle}>
    <Text>{children}</Text>
  </Box>
);

// 📍 Date Formatter
const formatDate = (dateString, timeZone) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString(undefined, {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// 📍 Relative Time
const getRelativeTime = (date) => {
  if (!date) return "";

  try {
    const targetDate = new Date(date);
    const now = new Date();

    if (isNaN(targetDate.getTime())) return "";

    const diffInMs = now - targetDate;
    const absDiff = Math.abs(diffInMs);

    const seconds = Math.floor(absDiff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(months / 12);

    if (seconds < 60) {
      return "just now";
    } else if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    } else if (hours < 24) {
      return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    } else if (days < 30) {
      return `${days} day${days !== 1 ? "s" : ""} ago`;
    } else if (months < 12) {
      return `${months} month${months !== 1 ? "s" : ""} ago`;
    } else {
      return `${years} year${years !== 1 ? "s" : ""} ago`;
    }
  } catch {
    return "";
  }
};

// 📍 CSV Export
const exportCSV = (data, timeZone) => {
  const headers = ["Author", "Field", "From", "To", "Date"];
  const rows = data.map((row) =>
    [
      row.author,
      row.field,
      row.from,
      row.to,
      formatDate(row.date, timeZone),
    ].join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "changelog.csv";
  a.click();
};

// 📍 Main App
const App = () => {
  const [filter, setFilter] = useState("all");
  const [data, setData] = useState([]);
  const userTimeZone = useUserTimeZone();
  const { tableStyle, rowStyle, cellStyle } = useStyles();

  useEffect(() => {
    let intervalId;
    const fetchData = async () => {
      try {
        const result = await invoke(currentDev, {
          filter: filter,
          issueKey: "KC-24", // Pass issueKey as well
        });
        if (result && typeof result === "object") {
          const allActivities = [
            ...(result.changelog || []),
            ...(result.comments || []),
            ...(result.attachments || []),
          ];
          setData(allActivities);
        } else {
          setData(result || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setData([]);
      }
    };
    fetchData();
    intervalId = setInterval(fetchData, 10000); // Poll every 10 seconds
    return () => clearInterval(intervalId);
  }, [filter]);

  const sortedData = [...data].sort(
    (a, b) => new Date(b.date || b.created) - new Date(a.date || a.created)
  );

  return (
    <Box xcss={tableStyle}>
      {/* Relative Time Filter */}
      <Box marginBlockEnd="space.100">
        <Text>
          <Strong>Filter by Time:</Strong>
        </Text>
        <Select
          options={[
            { label: "All Time", value: "all" },
            { label: "Last 24 hours", value: "24h" },
            { label: "Last 7 days", value: "7d" },
            { label: "Last 30 days", value: "30d" },
            { label: "Last 6 months", value: "6m" },
            { label: "Last 1 year", value: "1y" },
          ]}
          value={filter}
          onChange={(value) => setFilter(value)}
        />

        <Box marginBlockStart="space.100" />
        <Button
          text="Export CSV"
          onClick={() => exportCSV(sortedData, userTimeZone)}
        />
      </Box>

      {/* Table Header */}
      <Inline alignBlock="start" xcss={rowStyle}>
        <HeaderCell cellStyle={cellStyle}>Type</HeaderCell>
        <HeaderCell cellStyle={cellStyle}>Author</HeaderCell>
        <HeaderCell cellStyle={cellStyle}>Field/Content</HeaderCell>
        <HeaderCell cellStyle={cellStyle}>From</HeaderCell>
        <HeaderCell cellStyle={cellStyle}>To</HeaderCell>
        <HeaderCell cellStyle={cellStyle}>Date</HeaderCell>
      </Inline>

      {/* Table Rows */}
      {sortedData.length === 0 ? (
        <Text>No activities found.</Text>
      ) : (
        sortedData.map((entry, index) => (
          <Inline alignBlock="start" key={index} xcss={rowStyle}>
            <DataCell cellStyle={cellStyle}>
              {entry.type === "changelog" && "📝 Change"}
              {entry.type === "comment" && "💬 Comment"}
              {entry.type === "attachment" && "📎 Attachment"}
            </DataCell>
            <DataCell cellStyle={cellStyle}>{entry.author || "-"}</DataCell>
            <DataCell cellStyle={cellStyle}>
              {entry.type === "changelog" && (
                <>
                  {entry.field === "status" ? "🚦 " : ""}
                  {entry.field === "priority" ? "⚠️ " : ""}
                  {entry.field === "assignee" ? "👤 " : ""}
                  {entry.field || "-"}
                </>
              )}
              {entry.type === "comment" && (
                <Text>{entry.content?.substring(0, 50)}...</Text>
              )}
              {entry.type === "attachment" && <Text>{entry.filename}</Text>}
            </DataCell>
            <DataCell cellStyle={cellStyle}>
              {entry.type === "changelog" ? entry.from || "-" : "-"}
            </DataCell>
            <DataCell cellStyle={cellStyle}>
              {entry.type === "changelog"
                ? entry.to || "-"
                : entry.type === "attachment"
                ? `${Math.round(entry.size / 1024)}KB`
                : "-"}
            </DataCell>
            <DataCell cellStyle={cellStyle}>
              <Text>
                {formatDate(entry.date || entry.created, userTimeZone)}{" "}
                <Text as="span" size="small" tone="subtle">
                  ({getRelativeTime(entry.date || entry.created)})
                </Text>
              </Text>
            </DataCell>
          </Inline>
        ))
      )}
    </Box>
  );
};

ForgeReconciler.render(<App />);
