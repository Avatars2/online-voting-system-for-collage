import { useState, useCallback } from 'react';

export const useToast = () => {
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const success = useCallback((message) => {
    setSuccessMessage(message);
    // You could also show a success toast here
    console.log('Success:', message);
  }, []);

  const error = useCallback((message) => {
    setErrorMessage(message);
    // You could also show an error toast here
    console.error('Error:', message);
  }, []);

  return { success, error };
};

export default useToast;
