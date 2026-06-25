import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import axios from 'axios';
import { Search, ShoppingCart, Trash2, CheckCircle } from 'lucide-react';
import './Sales.css';

const POSInterface = () => {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [taxConfig, setTaxConfig] = useState({ rate: 0, isActive: false });

  // Laporan receipt setelah sukses
  const [receipt, setReceipt] = useState(null);

  // Perhitungan dinamis jumlah grid
  const [dynamicLimit, setDynamicLimit] = useState(15);
  const gridContainerRef = useRef(null);

  useLayoutEffect(() => {
    const calculateGridCapacity = () => {
      if (gridContainerRef.current) {
        const width = gridContainerRef.current.clientWidth;
        if (width < 768) {
          // Mobile state: kotak min 110px, gap 8px
          const colsMobile = Math.floor((width + 8) / 118);
          // Kita set 3 baris juga untuk mobile, dan pastikan minimal 9 box!
          setDynamicLimit(Math.max(9, colsMobile * 3));
          return;
        }
        // Rumus kolom CSS Grid: math.floor((lebar area + gap) / (lebar min kotak + gap))
        // Lebar min kotak = 130px, gap = 12px, padding-right = 8px.
        // Toleransi pembulatan yang aman.
        const cols = Math.floor((width - 8 + 12) / 142);
        // Tinggi layar dipaksa 3 baris.
        setDynamicLimit(cols * 3);
      }
    };

    calculateGridCapacity();
    // Beri jeda/debounce untuk resize agar tidak spam render
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(calculateGridCapacity, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const fetchPaymentTypes = async () => {
      try {
        const paymentRes = await axios.get('/api/library/payment-types');
        setPaymentTypes(paymentRes.data.filter(p => p.is_active));
        if (paymentRes.data.length > 0) {
          setSelectedPayment(paymentRes.data[0].id);
        }
      } catch (error) {
        console.error('Failed to load payment types', error);
      }
    };

    const fetchTaxConfig = async () => {
      try {
        const res = await axios.get('/api/settings/store');
        setTaxConfig({
          rate: parseFloat(res.data.tax_rate || 0) / 100,
          isActive: res.data.is_tax_active === undefined ? true : res.data.is_tax_active
        });
      } catch (error) {
        console.error('Failed to load tax settings', error);
      }
    };

    fetchPaymentTypes();
    fetchTaxConfig();
  }, []);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/sales/pos-items?search=${search}&limit=${dynamicLimit}`);
        setItems(res.data);
      } catch (error) {
        console.error('Failed to load POS items', error);
      } finally {
        setLoading(false);
      }
    };
    const debounceId = setTimeout(fetchItems, 300);
    return () => clearTimeout(debounceId);
  }, [search, dynamicLimit]);

  const filteredItems = items;

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        if (existing.qty >= item.stock) {
          alert('Stok tidak mencukupi');
          return prev;
        }
        return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      if (item.stock < 1) {
        alert('Stok habis');
        return prev;
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const updateQty = (id, newQty) => {
    if (newQty < 1) return;
    const itemStock = items.find(i => i.id === id)?.stock || 0;
    if (newQty > itemStock) {
      alert('Stok tidak mencukupi');
      return;
    }
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: newQty } : i));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  // Kalkulasi total
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const tax = taxConfig.isActive ? (subtotal * taxConfig.rate) : 0;
  const total = subtotal + tax;

  const handleCheckout = async () => {
    if (cart.length === 0) return alert('Keranjang kosong');
    if (!paymentAmount || parseFloat(paymentAmount) < total) {
      return alert('Jumlah pembayaran kurang');
    }

    try {
      const res = await axios.post('/api/sales/transactions', {
        items: cart,
        payment_type_id: selectedPayment,
        payment_amount: parseFloat(paymentAmount)
      });
      
      setReceipt(res.data);
      setCart([]);
      setPaymentAmount('');
      // Refresh items stock
      const itemsRes = await axios.get(`/api/sales/pos-items?search=${search}&limit=${dynamicLimit}`);
      setItems(itemsRes.data);
    } catch (error) {
      alert(error.response?.data?.error || 'Gagal memproses transaksi');
    }
  };

  const formatRupiah = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(value);
  };

  const handlePaymentChange = (val) => {
    const rawValue = val.replace(/\D/g, '');
    if (rawValue === '') {
      setPaymentAmount('');
      return;
    }
    setPaymentAmount(rawValue);
  };

  const formatInputNumber = (val) => {
    if (!val) return '';
    return new Intl.NumberFormat('id-ID').format(val);
  };

  if (receipt) {
    return (
      <div className="receipt-container card">
        <div className="receipt-success">
          <CheckCircle size={48} className="text-success" />
          <h2>Transaksi Berhasil!</h2>
          <p>ID Transaksi: {receipt.transaction_id}</p>
        </div>
        <div className="receipt-details">
          <div className="receipt-row"><span>Total Tagihan:</span> <strong>{formatRupiah(receipt.receipt.total)}</strong></div>
          <div className="receipt-row"><span>Pembayaran:</span> <strong>{formatRupiah(receipt.receipt.payment_amount)}</strong></div>
          <div className="receipt-row"><span>Kembalian:</span> <strong>{formatRupiah(receipt.receipt.change_amount)}</strong></div>
        </div>
        <div className="receipt-actions">
          <button className="btn btn-outline" onClick={() => window.print()}>Cetak Struk</button>
          <button className="btn btn-primary" onClick={() => setReceipt(null)}>Transaksi Baru</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pos-layout">
      {/* Kiri: Daftar Produk */}
      <div className="pos-products" ref={gridContainerRef}>
        <div className="pos-search">
          <Search size={20} className="search-icon" />
          <input 
            type="text" 
            placeholder="Cari produk (nama / kode)..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="loading-state">Memuat produk...</div>
        ) : (
          <div className="product-grid">
            {filteredItems.map(item => (
              <div 
                key={item.id} 
                className={`product-card ${item.stock === 0 ? 'out-of-stock' : ''}`}
                onClick={() => item.stock > 0 && addToCart(item)}
              >
                <div className="product-img-placeholder">{item.name.charAt(0)}</div>
                <div className="product-info">
                  <h4 className="product-name">{item.name}</h4>
                  <p className="product-price">{formatRupiah(item.price)}</p>
                  <p className="product-stock">Stok: {item.stock}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kanan: Keranjang & Pembayaran */}
      <div className="pos-sidebar card">
        <div className="cart-header">
          <ShoppingCart size={20} />
          <h3>Keranjang ({cart.length})</h3>
        </div>

        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="empty-cart">Keranjang masih kosong</div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-info">
                  <span className="cart-item-name">{item.name}</span>
                  <span className="cart-item-price">{formatRupiah(item.price)}</span>
                </div>
                <div className="cart-item-actions">
                  <div className="qty-control">
                    <button onClick={() => updateQty(item.id, item.qty - 1)}>-</button>
                    <span>{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)}>+</button>
                  </div>
                  <button className="remove-btn" onClick={() => removeFromCart(item.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="checkout-panel">
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatRupiah(subtotal)}</span>
          </div>
          {taxConfig.isActive && (
            <div className="summary-row">
              <span>PPN ({taxConfig.rate * 100}%)</span>
              <span>{formatRupiah(tax)}</span>
            </div>
          )}
          <div className="summary-row total-row">
            <span>Total Bayar</span>
            <span>{formatRupiah(total)}</span>
          </div>

          <div className="payment-form">
            <label>Metode Pembayaran</label>
            <div className="payment-methods-grid">
              {paymentTypes.map(type => (
                <div 
                  key={type.id} 
                  className={`payment-method-box ${selectedPayment === type.id ? 'active' : ''}`}
                  onClick={() => setSelectedPayment(type.id)}
                >
                  {type.name}
                </div>
              ))}
            </div>

            <label>Jumlah Uang (Rp)</label>
            <input 
              type="text" 
              value={formatInputNumber(paymentAmount)}
              onChange={e => handlePaymentChange(e.target.value)}
              placeholder="0"
            />
          </div>

          <button 
            className="btn btn-primary checkout-btn"
            onClick={handleCheckout}
            disabled={cart.length === 0}
          >
            Proses Pembayaran
          </button>
        </div>
      </div>
    </div>
  );
};

export default POSInterface;
