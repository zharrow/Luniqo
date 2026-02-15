import React from "react";
import { colors, shadows } from "../../colors";
import { Badge } from "./Badge";

interface TableColumn {
  key: string;
  label: string;
  width?: string;
}

interface TableRow {
  [key: string]: string | React.ReactNode;
}

interface TableMockProps {
  columns: TableColumn[];
  rows: TableRow[];
  title?: string;
  style?: React.CSSProperties;
}

export const TableMock: React.FC<TableMockProps> = ({
  columns,
  rows,
  title,
  style,
}) => {
  return (
    <div
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        boxShadow: shadows.sm,
        border: `1px solid ${colors.border}`,
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Title */}
      {title && (
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <h3
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: colors.foreground,
              fontFamily: "system-ui, sans-serif",
              margin: 0,
            }}
          >
            {title}
          </h3>
        </div>
      )}

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        {/* Header */}
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th
                key={col.key}
                style={{
                  padding: "12px 16px",
                  textAlign: "left",
                  fontSize: 12,
                  fontWeight: 600,
                  color: `${colors.foreground}70`,
                  fontFamily: "system-ui, sans-serif",
                  backgroundColor: colors.background,
                  borderBottom: `1px solid ${colors.border}`,
                  width: col.width,
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((col, colIndex) => (
                <td
                  key={col.key}
                  style={{
                    padding: "14px 16px",
                    fontSize: 13,
                    color: colors.foreground,
                    fontFamily: "system-ui, sans-serif",
                    borderBottom:
                      rowIndex < rows.length - 1 ? `1px solid ${colors.border}` : "none",
                  }}
                >
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Default example data for HACCP logs
export const haccpTableColumns = [
  { key: "time", label: "Heure", width: "20%" },
  { key: "action", label: "Action", width: "35%" },
  { key: "user", label: "Opérateur", width: "25%" },
  { key: "status", label: "Statut", width: "20%" },
];

export const haccpTableRows = [
  {
    time: "08:15",
    action: "Relevé température frigo",
    user: "Marie D.",
    status: <Badge variant="success">Conforme</Badge>,
  },
  {
    time: "09:30",
    action: "Réception livraison",
    user: "Sophie L.",
    status: <Badge variant="success">Validé</Badge>,
  },
  {
    time: "11:45",
    action: "Nettoyage cuisine",
    user: "Marie D.",
    status: <Badge variant="success">Terminé</Badge>,
  },
  {
    time: "14:00",
    action: "Contrôle allergènes",
    user: "Pierre M.",
    status: <Badge variant="warning">En cours</Badge>,
  },
];
