import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const OAuth2Callback = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Processing authentication...');
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const oauthError = params.get('error');

    if (oauthError) {
      setError("Google Authentication Error: " + oauthError + ". Please try connecting again.");
      setMessage('');
      window.history.replaceState({}, document.title, window.location.pathname.replace('oauth2callback', ''));
      return;
    }

    if (code) {
      fetch('/api/googleAuth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          redirect_uri: window.location.origin + '/oauth2callback'
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data.access_token) {
            localStorage.setItem('ga4AccessToken', data.access_token);
            localStorage.setItem('ga4AuthSuccess', 'Google Analytics connected successfully.');
            navigate('/');
          } else {
            setError(data.error || 'Failed to obtain GA4 access token. Please try again.');
            setMessage('');
          }
        })
        .catch(err => {
          console.error('GA4 Token Exchange Error:', err);
          setError('Error connecting to Google Analytics during token exchange. Please try again.');
          setMessage('');
        })
        .finally(() => {
          if (error || !localStorage.getItem('ga4AccessToken')) {
            window.history.replaceState({}, document.title, window.location.pathname.replace('oauth2callback', ''));
          }
        });
    } else {
      setError('No authorization code found. Please try connecting again.');
      setMessage('');
      window.history.replaceState({}, document.title, window.location.pathname.replace('oauth2callback', ''));
    }
  }, [navigate]);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>Google Analytics Authentication</h2>
      {message && <p>{message}</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {error && <button onClick={() => navigate('/')}>Return to Dashboard</button>}
    </div>
  );
};

export default OAuth2Callback;