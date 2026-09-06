const FORMULA_PREFIX = /^[=+\-@\t\r]/

export function csvCell(value: string | number | null | undefined) {
  let text = value == null ? "" : String(value)

  if (FORMULA_PREFIX.test(text)) {
    text = `'${text}`
  }

  return `"${text.replaceAll('"', '""')}"`
}

export function csvRow(values: Array<string | number | null | undefined>) {
  return values.map(csvCell).join(",")
}

export function buildCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  const lines = [csvRow(headers), ...rows.map(csvRow)]
  return `\uFEFF${lines.join("\r\n")}`
}

export const CSV_CONTENT_TYPE = "text/csv; charset=utf-8"
