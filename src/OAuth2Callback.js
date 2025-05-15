import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Assuming React Router v6 for navigation

const GA4_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const GA4_CLIENT_SECRET = process.env.REACT_APP_GOOGLE_CLIENT_SECRET;
const GA4_REDIRECT_URI_TOKEN_EXCHANGE = process.env.REACT_APP_REDIRECT_URI;

const OAuth2Callback = () => {
    const navigate = useNavigate();
    const [message, setMessage] = useState('Processing authentication...');
    const [error, setError] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const oauthError = params.get('error');

        if (oauthError) {
            setError(`Google Authentication Error: ${oauthError}. Please try connecting again.`);
            setMessage('');
            // Clean URL and optionally redirect or just show error
            window.history.replaceState({}, document.title, window.location.pathname.replace('oauth2callback', '')); 
            // No automatic redirect here, user sees error on this page.
            // Or redirect to dashboard with error: navigate('/?auth_error=' + encodeURIComponent(oauthError));
            return;
        }

        if (code) {
            fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    code: code,
                    client_id: GA4_CLIENT_ID,
                    client_secret: GA4_CLIENT_SECRET, // SECURITY WARNING!
                    redirect_uri: GA4_REDIRECT_URI_TOKEN_EXCHANGE, // Use the specific one for token exchange
                    grant_type: 'authorization_code'
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.access_token) {
                    localStorage.setItem('ga4AccessToken', data.access_token);
                    // Fetch user email for display (optional, but good for UX)
                    fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
                        headers: { 'Authorization': `Bearer ${data.access_token}` }
                    })
                    .then(res => res.json())
                    .then(userData => {
                        if(userData.email) {
                            localStorage.setItem('ga4UserEmail', userData.email);
                        }
                    }).catch(err => console.error('Error fetching GA4 user info:', err));
                    
                    // Redirect to dashboard with success message
                    // Using localStorage for success message as it's a simple way to pass state across redirect
                    localStorage.setItem('ga4AuthSuccess', 'Google Analytics connected successfully.');
                    navigate('/'); // Redirect to dashboard
                } else {
                    setError(data.error_description || 'Failed to obtain GA4 access token. Please try again.');
                    setMessage('');
                }
            })
            .catch(err => {
                console.error('GA4 Token Exchange Error:', err);
                setError('Error connecting to Google Analytics during token exchange. Please try again.');
                setMessage('');
            })
            .finally(() => {
                 // Clean the URL parameters only if not redirecting immediately or if error
                if (error || !localStorage.getItem('ga4AccessToken')) {
                    window.history.replaceState({}, document.title, window.location.pathname.replace('oauth2callback', ''));
                }
            });
        } else if (!oauthError) {
            setError('No authorization code found. Please try connecting again.');
            setMessage('');
            window.history.replaceState({}, document.title, window.location.pathname.replace('oauth2callback', ''));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate]); // navigate added to dependency array

    return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2>Google Analytics Authentication</h2>
            {message && <p>{message}</p>}
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
            {error && <button onClick={() => navigate('/')}>Return to Dashboard</button>}
            {/* Production: Client Secret should never be in frontend. This is for exercise purposes only. */}
            <p style={{ fontSize: '0.8em', color: 'grey', marginTop: '20px' }}>
                SECURITY WARNING: The Google Client Secret is used directly in the frontend for this demonstration. 
                In a production environment, the token exchange process must be handled by a secure backend server.
            </p>
        </div>
    );
};

export default OAuth2Callback;

