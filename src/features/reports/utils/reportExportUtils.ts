/**
 * Runs report export downloads directly to device storage.
 */

import { Alert } from 'react-native';
import { downloadBinaryFile } from '../../../utils/fileExport';

export async function runReportExport(
  format: 'excel' | 'pdf',
  fetchFile: () => Promise<{ data: ArrayBuffer }>,
  filename: string,
): Promise<void> {
  try {
    const response = await fetchFile();
    const mimeType = format === 'excel'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/pdf';
    const location = await downloadBinaryFile(response.data, filename, mimeType);
    Alert.alert('Download complete', `${filename} saved to ${location}.`);
  } catch {
    Alert.alert('Export failed', `Could not export ${format.toUpperCase()} file. Please try again.`);
  }
}

export function stripReportPagination(
  params: Record<string, string | number>,
): Record<string, string | number> {
  const rest = {...params};
  delete rest.pageNo;
  delete rest.pageSize;
  return rest;
}
