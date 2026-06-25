import { Routes, Route, Navigate } from 'react-router-dom';
import Items from './Items';
import Categories from './Categories';
import Customers from './Customers';
import Suppliers from './Suppliers';
import './Library.css';

const Library = () => {
  return (
    <div className="library-container">
      <div className="library-header">
        <h1>Library Data</h1>
        <p>Kelola data master toko Anda.</p>
      </div>

      <div className="library-content">
        <Routes>
          <Route path="/" element={<Navigate to="items" replace />} />
          <Route path="items" element={<Items />} />
          <Route path="categories" element={<Categories />} />
          <Route path="customers" element={<Customers />} />
          <Route path="suppliers" element={<Suppliers />} />
        </Routes>
      </div>
    </div>
  );
};

export default Library;
