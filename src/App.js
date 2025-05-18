
import React, { useState, useEffect } from 'react';

function App() {
  const [kpi, setKpi] = useState({ pre_value: 231 });
  const [postEntries, setPostEntries] = useState([
    { title: 'Update 1', value: 141 },
    { title: 'Update 2', value: 330 }
  ]);

  return (
    <div style={{ padding: '20px' }}>
      <h2>KPI Comparison</h2>
      {postEntries.map((entry, index) => (
        <div key={index} style={{ marginBottom: '12px' }}>
          <strong>{entry.title} (Added: 5/18/2025)</strong>
          <br />
          {(() => {
            const pre = parseFloat(kpi.pre_value);
            const post = parseFloat(entry.value);
            if (!isNaN(pre) && !isNaN(post)) {
              const diff = post - pre;
              const percent = ((diff / pre) * 100).toFixed(1);
              const symbol = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
              const color = diff > 0 ? 'green' : diff < 0 ? 'red' : 'gray';
              return (
                <p>
                  Value: {entry.value} (<span style={{ color }}>{symbol} {percent}%</span>, {diff > 0 ? '+' : ''}{diff})
                </p>
              );
            }
            return <p>Value: {entry.value}</p>;
          })()}
        </div>
      ))}
    </div>
  );
}

export default App;
