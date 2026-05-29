/**
 * Safely extracts a user-friendly error message from a backend API response.
 * Handles FastAPI's validation error list format as well as standard string details.
 */
export const getErrorMessage = (data: any, fallback: string): string => {
  if (!data || !data.detail) {
    return fallback;
  }
  
  const detail = data.detail;
  
  if (typeof detail === 'string') {
    return detail;
  }
  
  if (Array.isArray(detail)) {
    return detail
      .map((err: any) => {
        const loc = err.loc ? err.loc.filter((l: any) => l !== 'body').join('.') : '';
        return loc ? `${loc}: ${err.msg}` : err.msg;
      })
      .join(', ');
  }
  
  if (typeof detail === 'object') {
    return JSON.stringify(detail);
  }
  
  return fallback;
};
