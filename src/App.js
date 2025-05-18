// Highlighted snippet for post-change KPI comparison with color

// Relevant snippet integrated into your rendering logic
<span>
  Value: {entry.value}
  <span style={{ color: percentDiff > 0 ? 'green' : percentDiff < 0 ? 'red' : 'black', marginLeft: '5px' }}>
    {percentDiff > 0 ? '↑' : percentDiff < 0 ? '↓' : ''}
    {Math.abs(percentDiff).toFixed(1)}%
  </span>
  <span style={{ marginLeft: '3px' }}>
    ({diff > 0 ? '+' : ''}{diff})
  </span>
</span>
