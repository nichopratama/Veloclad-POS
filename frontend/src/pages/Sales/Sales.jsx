import { Routes, Route, Navigate } from 'react-router-dom';
import POSInterface from './POSInterface';
import SalesHistory from './SalesHistory';

const Sales = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      <div className="sales-content">
        <Routes>
          <Route path="/" element={<Navigate to="pos" replace />} />
          <Route path="pos" element={<POSInterface />} />
          <Route path="history" element={<SalesHistory />} />
        </Routes>
      </div>
    </div>
  );
};

export default Sales;
