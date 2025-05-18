export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const accessToken = req.headers.authorization?.split(' ')[1];
  const propertyId = req.query.propertyId || process.env.GA4_PROPERTY_ID;

  if (!accessToken || !propertyId) {
    return res.status(400).json({ error: 'Missing access token or propertyId' });
  }

  try {
    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}/metadata`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON:', text);
      return res.status(500).json({ error: 'Invalid response from Google' });
    }

    if (data.metrics) {
      res.status(200).json({ metrics: data.metrics });
    } else {
      console.error('GA4 metadata error:', data);
      res.status(500).json({ error: 'Failed to load GA4 metrics', details: data });
    }
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}