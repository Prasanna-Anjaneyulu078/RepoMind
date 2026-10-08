export const apiEventEmitter = new EventTarget();

export const normalizeApiError = (status, data, method = 'GET') => {
  let backendMessage = null;
  if (typeof data === 'object' && data !== null) {
    backendMessage = data.message || data.error?.message || data.error || null;
  } else if (typeof data === 'string' && data.length < 200) {
    backendMessage = data;
  }

  const normalized = {
    isNormalized: true,
    status,
    title: 'Error',
    message: backendMessage || 'Something went wrong.',
    code: data?.code || null,
  };

  switch (status) {
    case 400:
      normalized.title = 'Invalid Request';
      normalized.message = backendMessage || 'The request could not be processed. Please check the information and try again.';
      break;
    case 401:
      normalized.title = 'Session Expired';
      normalized.message = backendMessage || 'Your session has expired. Please sign in again.';
      break;
    case 403:
      normalized.title = 'Access Denied';
      normalized.message = backendMessage || 'You do not have permission to perform this action.';
      break;
    case 404:
      normalized.title = 'Not Found';
      normalized.message = backendMessage || 'The requested resource could not be found.';
      break;
    case 409:
      normalized.title = 'Conflict';
      normalized.message = backendMessage || 'This action conflicts with the current data. Please refresh and try again.';
      break;
    case 422:
      normalized.title = 'Unable to Process Request';
      normalized.message = backendMessage || 'Some of the provided information is invalid. Please review it and try again.';
      break;
    case 429:
      normalized.title = 'Too Many Requests';
      normalized.message = backendMessage || 'Too many requests, please try again later.';
      break;
    case 500:
      normalized.title = 'Something Went Wrong';
      normalized.message = 'Something went wrong on the server. Please try again.';
      break;
    case 502:
      normalized.title = 'External Service Error';
      normalized.message = 'An external service is temporarily unavailable. Please try again later.';
      break;
    case 503:
      normalized.title = 'Service Unavailable';
      normalized.message = 'The service is temporarily unavailable. Please try again later.';
      break;
    case 504:
      normalized.title = 'Request Timed Out';
      normalized.message = 'The request took too long to complete. Please try again.';
      break;
    default:
      break;
  }

  // Hide Prisma / stack traces for 500 errors but keep safe backend messages if possible
  if (status >= 500) {
    if (backendMessage && (backendMessage.includes('GitHub') || backendMessage.includes('temporarily'))) {
       normalized.message = backendMessage;
    } else {
       normalized.message = 'Something went wrong on the server. Please try again.';
    }
  }

  return normalized;
};
export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://repo-mind-a954.onrender.com').replace(/\/+$/, '');

export const fetchApi = async (pathOrUrl, options = {}, skipPopup = false, customRetry = null) => {
  try {
    const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${API_BASE_URL}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
    const response = await fetch(url, options);
    
    let data;
    const isJson = response.headers.get('content-type')?.includes('application/json');
    if (isJson) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const normalized = normalizeApiError(response.status, data, options.method);
      if (!skipPopup) {
        apiEventEmitter.dispatchEvent(new CustomEvent('apiError', { detail: { normalized, customRetry } }));
      }
      throw normalized;
    }
    
    // Some endpoints return 200 OK but { success: false, message: '...' }
    if (isJson && data.success === false) {
      const normalized = normalizeApiError(400, data, options.method); 
      // Using 400 as default for 200 false success unless it's explicitly given
      if (!skipPopup) {
        apiEventEmitter.dispatchEvent(new CustomEvent('apiError', { detail: { normalized, customRetry } }));
      }
      throw normalized;
    }

    return isJson ? data : { success: true, data };
  } catch (err) {
    if (err.isNormalized) {
      throw err;
    }
    
    // Determine network / timeout errors
    const normalized = {
      isNormalized: true,
      status: 0,
      title: 'Connection Problem',
      message: 'Unable to connect to the RepoMind server. Please check the server connection and try again.'
    };
    
    if (err.name === 'AbortError' || err.message?.toLowerCase().includes('timeout')) {
      normalized.title = 'Request Timed Out';
      normalized.message = 'The request took too long to complete. Please try again.';
    }
    
    if (!skipPopup) {
      apiEventEmitter.dispatchEvent(new CustomEvent('apiError', { detail: { normalized, customRetry } }));
    }
    throw normalized;
  }
};
