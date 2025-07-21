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

    let result = "";
    if (seconds < 60) result = "just now";
    else if (minutes < 60)
      result = `${minutes} minute${minutes !== 1 ? "s" : ""}`;
    else if (hours < 24) result = `${hours} hour${hours !== 1 ? "s" : ""}`;
    else if (days < 30) result = `${days} day${days !== 1 ? "s" : ""}`;
    else if (months < 12) result = `${months} month${months !== 1 ? "s" : ""}`;
    else result = `${years} year${years !== 1 ? "s" : ""}`;

    return `${result} ago`;
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
    const fetchData = async () => {
      try {
        const result = await invoke(currentDev, {
          filter: filter,
          issueKey: "KC-24", // Pass issueKey as well
        });
        setData(result || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        setData([]);
      }
    };

    fetchData();
  }, [filter]);

  const sortedData = [...data].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
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
        <HeaderCell cellStyle={cellStyle}>Author</HeaderCell>
        <HeaderCell cellStyle={cellStyle}>Field</HeaderCell>
        <HeaderCell cellStyle={cellStyle}>From</HeaderCell>
        <HeaderCell cellStyle={cellStyle}>To</HeaderCell>
        <HeaderCell cellStyle={cellStyle}>Date</HeaderCell>
      </Inline>

      {/* Table Rows */}
      {sortedData.length === 0 ? (
        <Text>No changelog entries found.</Text>
      ) : (
        sortedData.map((entry, index) => (
          <Inline alignBlock="start" key={index} xcss={rowStyle}>
            <DataCell cellStyle={cellStyle}>{entry.author || "-"}</DataCell>
            <DataCell cellStyle={cellStyle}>
              {entry.field === "status" ? "🚦 " : ""}
              {entry.field === "priority" ? "⚠️ " : ""}
              {entry.field === "assignee" ? "👤 " : ""}
              {entry.field || "-"}
            </DataCell>
            <DataCell cellStyle={cellStyle}>{entry.from || "-"}</DataCell>
            <DataCell cellStyle={cellStyle}>{entry.to || "-"}</DataCell>
            <DataCell cellStyle={cellStyle}>
              <Text>
                {formatDate(entry.date, userTimeZone)}{" "}
                <Text as="span" size="small" tone="subtle">
                  ({getRelativeTime(entry.date)})
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
