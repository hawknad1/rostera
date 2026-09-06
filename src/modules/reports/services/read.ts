import { isReportError } from "@/modules/reports/errors"

export async function readReport<T>(loader: () => Promise<T>) {
  try {
    return { data: await loader(), error: null }
  } catch (error) {
    if (!isReportError(error)) {
      throw error
    }

    return { data: null, error: error.message }
  }
}
