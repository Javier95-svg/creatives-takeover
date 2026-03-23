const PMF_RESULTS_TABLE = 'pmf_analysis_results' as any;
const PMF_RESULTS_TABLE_CACHE_KEY = 'ct:pmf_results_table_missing';

const readCachedMissingState = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(PMF_RESULTS_TABLE_CACHE_KEY) === '1';
  } catch {
    return false;
  }
};

const cacheMissingState = () => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(PMF_RESULTS_TABLE_CACHE_KEY, '1');
  } catch {
    // Ignore storage failures and keep the in-memory fallback.
  }
};

let pmfResultsTableMissing = readCachedMissingState();

const getErrorText = (error: unknown): string => {
  if (!error) return '';
  if (typeof error === 'string') return error.toLowerCase();
  if (typeof error === 'object') {
    const parts = [
      (error as { message?: string }).message,
      (error as { details?: string }).details,
      (error as { hint?: string }).hint,
      (error as { code?: string }).code,
    ].filter(Boolean);
    return parts.join(' ').toLowerCase();
  }
  return String(error).toLowerCase();
};

export const isPmfResultsTableMissingError = (error: unknown): boolean => {
  const text = getErrorText(error);
  return (
    text.includes('pmf_analysis_results') &&
    (
      text.includes('404') ||
      text.includes('42p01') ||
      text.includes('pgrst') ||
      text.includes('not found') ||
      text.includes('does not exist') ||
      text.includes('could not find the table')
    )
  );
};

export const handlePmfResultsTableError = (error: unknown): boolean => {
  if (!isPmfResultsTableMissingError(error)) return false;

  pmfResultsTableMissing = true;
  cacheMissingState();

  return true;
};

export const isPmfResultsTableAvailable = (): boolean => !pmfResultsTableMissing;

export const getPmfResultsTableName = () => PMF_RESULTS_TABLE;
