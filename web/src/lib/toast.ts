export const toast = {
  success: (message: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: { message, type: 'success' },
        })
      );
    }
  },
  error: (message: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: { message, type: 'error' },
        })
      );
    }
  },
  // Use this before redirecting to another page
  setForNextPage: (message: string, type: 'success' | 'error' = 'success') => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('appToast', JSON.stringify({ message, type }));
    }
  }
};
