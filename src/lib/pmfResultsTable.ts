const PMF_RESULTS_TABLE = 'pmf_analysis_results' as any;

let pmfResultsTableMissing = false;
let loggedMissingTableWarning = false;

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

  if (!loggedMissingTableWarning) {
    loggedMissingTableWarning = true;
    console.warn('pmf_analysis_results is unavailable in this environment; PMF history features are disabled.');
  }

  return true;
};

export const isPmfResultsTableAvailable = (): boolean => !pmfResultsTableMissing;

export const getPmfResultsTableName = () => PMF_RESULTS_TABLE;
