import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Calendar, Search, ChevronDown } from 'lucide-react';
import { DateRangePicker } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import './SalesHistory.css';

const SalesHistory = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('success');
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ total_transactions: 0, total_collected: 0, net_sales: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const defaultDate = new Date();
  const [startDate, setStartDate] = useState(defaultDate.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(defaultDate.toISOString().split('T')[0]);
  const [selectedTrx, setSelectedTrx] = useState(null);
  const [voidItemsData, setVoidItemsData] = useState([]);
  
  const [isVoiding, setIsVoiding] = useState(false);
  const [voidItems, setVoidItems] = useState({});
  const [voidReason, setVoidReason] = useState('Returned Goods');

  const refundAmount = Object.values(voidItems).reduce((sum, item) => {
    return sum + (item.selected ? item.qty * item.price : 0);
  }, 0);

  const toggleSelectAll = () => {
    const allSelected = Object.values(voidItems).every(item => item.selected);
    const newState = { ...voidItems };
    Object.keys(newState).forEach(key => {
      newState[key].selected = !allSelected;
    });
    setVoidItems(newState);
  };

  const toggleItemSelection = (idx) => {
    setVoidItems(prev => ({
      ...prev,
      [idx]: { ...prev[idx], selected: !prev[idx].selected }
    }));
  };

  const updateItemQty = (idx, delta) => {
    setVoidItems(prev => {
      const current = prev[idx];
      let newQty = current.qty + delta;
      if (newQty < 1) newQty = 1;
      if (newQty > current.maxQty) newQty = current.maxQty;
      return { ...prev, [idx]: { ...current, qty: newQty } };
    });
  };

  const handleOpenVoid = () => {
    setIsVoiding(true);
    const initialVoidState = {};
    (selectedTrx.items_detail || []).forEach((item, idx) => {
      initialVoidState[idx] = {
        selected: false,
        qty: 1,
        maxQty: parseInt(item.qty, 10) || 1,
        price: parseFloat(item.price) || 0,
        name: item.item_name
      };
    });
    setVoidItems(initialVoidState);
  };
  
  const submitRefund = async () => {
    try {
      const token = localStorage.getItem('token');
      const refundItemsPayload = [];
      Object.keys(voidItems).forEach(idx => {
        const item = voidItems[idx];
        const detail = selectedTrx.items_detail[idx];
        if (item.selected && item.qty > 0) {
          refundItemsPayload.push({
            item_id: detail.item_id,
            qty: item.qty,
            refund_amount: item.qty * item.price
          });
        }
      });

      if (refundItemsPayload.length === 0) {
        alert("Please select at least one item to refund.");
        return;
      }

      const response = await fetch(`/api/sales/transactions/${selectedTrx.id}/void`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items: refundItemsPayload,
          reason: voidReason
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to void items');
      }

      alert("Refund processed successfully!");
      setIsVoiding(false);
      setSelectedTrx(null);
      fetchHistory();
    } catch (error) {
      alert("Error: " + error.message);
    }
  };
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState([
    {
      startDate: defaultDate,
      endDate: defaultDate,
      key: 'selection'
    }
  ]);

  const datePickerRef = React.useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Sync dateRange object to string states
    const startStr = format(dateRange[0].startDate, 'yyyy-MM-dd');
    const endStr = format(dateRange[0].endDate, 'yyyy-MM-dd');
    if (startDate !== startStr || endDate !== endStr) {
      setStartDate(startStr);
      setEndDate(endStr);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchHistory();
  }, [activeTab, startDate, endDate]);

  const fetchHistory = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/sales/transactions?status=${activeTab}&search=${searchQuery}&startDate=${startDate}&endDate=${endDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setTransactions(data.data || []);
      setSummary(data.summary || { total_transactions: 0, total_collected: 0, net_sales: 0 });

      const resVoid = await fetch(`/api/sales/void-items?startDate=${startDate}&endDate=${endDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataVoid = await resVoid.json();
      setVoidItemsData(dataVoid.data || []);
    } catch (error) {
      console.error('Failed to load sales history', error);
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(value).replace('Rp', 'Rp.');
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
  };

  const getOrdinalSuffix = (i) => {
    const j = i % 10, k = i % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
  };

  // Group transactions by Date
  const groupedTransactions = transactions.reduce((groups, trx) => {
    const dateObj = new Date(trx.created_at);
    const day = dateObj.getDate();
    const formattedDate = `${dateObj.toLocaleDateString('en-US', { weekday: 'long' })}, ${dateObj.toLocaleDateString('en-US', { month: 'long' })} ${day}${getOrdinalSuffix(day)}, ${dateObj.getFullYear()}`;
    
    if (!groups[formattedDate]) {
      groups[formattedDate] = {
        dateString: formattedDate,
        total: 0,
        transactions: []
      };
    }
    groups[formattedDate].transactions.push(trx);
    groups[formattedDate].total += (parseFloat(trx.total || 0) - parseFloat(trx.refunds || 0));
    return groups;
  }, {});

  return (
    <div className="transactions-page">
      <h1>{t('Transactions', 'Transactions')}</h1>

      <div className="trx-tabs">
        {['success', 'cancelled', 'void'].map(tab => (
          <button 
            key={tab} 
            className={`trx-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'success' ? t('Success Orders', 'Success Orders') : tab === 'cancelled' ? t('Cancelled Orders', 'Cancelled Orders') : t('Void Items', 'Void Items')}
          </button>
        ))}
      </div>

      <div className="trx-filters">
        <div className="filter-group">
          <div className="trx-date-range" style={{ position: 'relative' }} ref={datePickerRef}>
            <div 
              className="trx-input" 
              style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'white'}}
              onClick={() => setShowDatePicker(!showDatePicker)}
            >
              {format(dateRange[0].startDate, 'MM/dd/yyyy')} – {format(dateRange[0].endDate, 'MM/dd/yyyy')}
              <Calendar size={14} />
            </div>
            
            {showDatePicker && (
              <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, marginTop: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                <DateRangePicker
                  onChange={item => setDateRange([item.selection])}
                  showSelectionPreview={true}
                  moveRangeOnFirstSelection={false}
                  months={1}
                  ranges={dateRange}
                  direction="horizontal"
                  maxDate={new Date()}
                />
              </div>
            )}
          </div>
          
          <div className="search-container">
            <input 
              type="text" 
              className="trx-input" 
              placeholder={t('Receipt Number', 'Receipt Number')} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') fetchHistory(); }}
            />
            <Search className="search-icon" />
          </div>
        </div>

        <button className="trx-export-btn">
          Export <ChevronDown size={16} />
        </button>
      </div>

      <div className="trx-summary">
        <div className="summary-item">
          <h3>{summary.total_transactions}</h3>
          <span>{t('Transactions', 'TRANSACTIONS').toUpperCase()}</span>
        </div>
        <div className="summary-item">
          <h3>{formatRupiah(summary.total_collected)}</h3>
          <span>{t('Total Collected', 'TOTAL COLLECTED').toUpperCase()}</span>
        </div>
        <div className="summary-item">
          <h3>{formatRupiah(summary.net_sales)}</h3>
          <span>{t('Net Sales', 'NET SALES').toUpperCase()}</span>
        </div>
      </div>

      {loading ? (
        <div style={{textAlign: 'center', padding: '40px', color: '#64748B'}}>Memuat riwayat transaksi...</div>
      ) : (
        <div className="sh-table-section">
          <div className="sh-table-container">
            {activeTab === 'void' ? (
              <div className="table-responsive">
                <table className="sh-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>{t('Receipt Number', 'Receipt No')}</th>
                      <th>{t('Product Name', 'Item Name')}</th>
                      <th>{t('Qty', 'Qty')}</th>
                      <th>{t('Amount to refund', 'Refund Amount')}</th>
                      <th>{t('Reason for Refund', 'Reason')}</th>
                      <th>{t('Executed By', 'Executed By')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voidItemsData.length > 0 ? voidItemsData.map((v) => (
                      <tr key={v.id}>
                        <td>{new Date(v.created_at).toLocaleString('id-ID')}</td>
                        <td>{v.transaction_id}</td>
                        <td>{v.item_name}</td>
                        <td>{v.qty}</td>
                        <td>{formatRupiah(v.refund_amount)}</td>
                        <td>{v.reason}</td>
                        <td>{v.executed_by_name}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="7" style={{textAlign: 'center', padding: '20px', color: '#94a3b8'}}>No void items found in this period.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="trx-table-container">
                <div className="trx-table-header">
                  <div>Outlet</div>
                  <div>Time</div>
                  <div>Collected By</div>
                  <div>{t('Products', 'Items')}</div>
                  <div className="col-right">Total Price</div>
                </div>

                {Object.keys(groupedTransactions).length === 0 ? (
                  <div style={{textAlign: 'center', padding: '40px', color: '#64748B', background: 'white', borderBottom: '1px solid #E2E8F0'}}>
                    Tidak ada transaksi pada periode ini.
                  </div>
                ) : (
                  Object.values(groupedTransactions).map((group, idx) => (
                    <div className="trx-group" key={idx}>
                      <div className="trx-group-header">
                        <div>{group.dateString}</div>
                        <div>{formatRupiah(group.total)}</div>
                      </div>
                      {group.transactions.map((trx) => (
                        <div className="trx-row" key={trx.id} onClick={() => { setSelectedTrx(trx); setIsVoiding(false); }} style={{ cursor: 'pointer' }}>
                          <div>{trx.outlet || 'Vapescrew Depok'}</div>
                          <div>{formatTime(trx.created_at)}</div>
                          <div>{trx.cashier_name}</div>
                          <div className="item-text" title={trx.items_summary}>
                            {trx.items_summary || '-'}
                          </div>
                          <div className="col-right">{formatRupiah(trx.total - (trx.refunds || 0))}</div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {selectedTrx && (
        <div className="trx-modal-overlay" onClick={() => { setSelectedTrx(null); setIsVoiding(false); }}>
          <div className="trx-modal" onClick={e => e.stopPropagation()}>
            {!isVoiding ? (
              <>
                <div className="trx-modal-header">
                  <h2>{t('Transactions', 'Transaction Details')}</h2>
                  <button onClick={() => { setSelectedTrx(null); setIsVoiding(false); }} className="close-btn">&times;</button>
                </div>
                <div className="trx-modal-body">
                  <div className="trx-info-grid">
                    <div>
                      <label>Receipt Number</label>
                      <div>{selectedTrx.id}</div>
                    </div>
                    <div>
                      <label>Date & Time</label>
                      <div>{new Date(selectedTrx.created_at).toLocaleString('id-ID')}</div>
                    </div>
                    <div>
                      <label>Cashier</label>
                      <div>{selectedTrx.cashier_name}</div>
                    </div>
                    <div>
                      <label>Payment Method</label>
                      <div>{selectedTrx.payment_method || '-'}</div>
                    </div>
                  </div>
                  
                  <h3 style={{ marginTop: '20px', marginBottom: '10px' }}>Items</h3>
                  <table className="trx-items-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th style={{textAlign: 'right'}}>Price</th>
                        <th style={{textAlign: 'right'}}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedTrx.items_detail || []).map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.item_name}</td>
                          <td>{item.qty}</td>
                          <td style={{textAlign: 'right'}}>{formatRupiah(item.price)}</td>
                          <td style={{textAlign: 'right'}}>{formatRupiah(item.qty * item.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {selectedTrx.void_items && selectedTrx.void_items.length > 0 && (
                    <>
                      <h4 style={{marginTop: '24px', marginBottom: '12px', color: '#0F172A', fontSize: '15px', textTransform: 'uppercase'}}>VOIDED ITEMS</h4>
                      <table className="trx-items-table">
                        <thead>
                          <tr>
                            <th>Items</th>
                            <th>Qty</th>
                            <th>Reason</th>
                            <th>Executed by</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTrx.void_items.map((vi, idx) => (
                            <tr key={idx}>
                              <td>{vi.item_name}</td>
                              <td>{vi.qty}</td>
                              <td>{vi.reason}</td>
                              <td>{vi.executed_by}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                  
                  <div className="trx-modal-totals">
                    <div className="total-row">
                      <span>Subtotal</span>
                      <span>{formatRupiah(selectedTrx.subtotal)}</span>
                    </div>
                    {selectedTrx.refunds > 0 && (
                      <div className="total-row" style={{ color: '#E11D48' }}>
                        <span>Voided</span>
                        <span>-{formatRupiah(selectedTrx.refunds)}</span>
                      </div>
                    )}
                    <div className="total-row">
                      <span>Tax Amount</span>
                      <span>{formatRupiah(selectedTrx.tax_amount)}</span>
                    </div>
                    <div className="total-row grand-total">
                      <span>Total</span>
                      <span>{formatRupiah(selectedTrx.total - (selectedTrx.refunds || 0))}</span>
                    </div>
                  </div>
                </div>
                
                <div className="trx-modal-footer" style={{ justifyContent: 'flex-end' }}>
                  <div className="footer-actions">
                    <button className="btn-outline" onClick={handleOpenVoid}>Void Items</button>
                    <button className="btn-outline">Show Receipt</button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="trx-modal-header" style={{borderBottom: 'none'}}>
                  <h2 style={{fontSize: '20px'}}>Void Items</h2>
                  <button onClick={() => setIsVoiding(false)} className="close-btn">&times;</button>
                </div>
                <div className="trx-modal-body" style={{paddingTop: '0'}}>
                  
                  <div className="refund-banner">
                    <span>Amount to refund</span>
                    <strong>{formatRupiah(refundAmount)}</strong>
                  </div>

                  <div className="refund-section-header">
                    <h3>Item to Refund</h3>
                    <button className="btn-link" onClick={toggleSelectAll}>Select All</button>
                  </div>
                  
                  <div className="refund-sales-type">No Sales Type</div>
                  
                  <div className="refund-items-list">
                    {(selectedTrx.items_detail || []).map((item, idx) => {
                      const state = voidItems[idx] || {};
                      return (
                        <div className="refund-item-row" key={idx}>
                          <div style={{ flex: 1 }}>
                            <div className="refund-item-name">{item.item_name}</div>
                            <div className="refund-item-price">{formatRupiah(item.price)}</div>
                          </div>
                          <div className="refund-item-actions">
                            <div className={`qty-selector ${!state.selected ? 'disabled' : ''}`}>
                              <button onClick={() => updateItemQty(idx, -1)} disabled={!state.selected}>-</button>
                              <input type="text" value={state.qty || 1} readOnly />
                              <button onClick={() => updateItemQty(idx, 1)} disabled={!state.selected}>+</button>
                            </div>
                            <input 
                              type="checkbox" 
                              className="refund-checkbox" 
                              checked={state.selected || false} 
                              onChange={() => toggleItemSelection(idx)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="refund-reason-section">
                    <h3>Reason for Refund</h3>
                    <select className="refund-reason-select" value={voidReason} onChange={e => setVoidReason(e.target.value)}>
                      <option value="Returned Goods">Returned Goods</option>
                      <option value="Accidental Charge">Accidental Charge</option>
                      <option value="Canceled Order">Canceled Order</option>
                    </select>
                  </div>

                </div>
                <div className="trx-modal-footer" style={{ justifyContent: 'flex-end', borderTop: 'none', background: 'white' }}>
                  <div className="footer-actions">
                    <button className="btn-outline" onClick={() => setIsVoiding(false)}>{t('Cancel', 'Cancel')}</button>
                    <button className="btn-solid" onClick={submitRefund}>{t('Issue Refund', 'Issue Refund')}</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;
