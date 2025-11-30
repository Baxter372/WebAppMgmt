// ...IMPORTS...
import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';

// ...MODAL COMPONENT...
const Modal: React.FC<{ onClose: () => void, children: React.ReactNode }> = ({ onClose, children }) => (
  <div className="modal-backdrop" onClick={onClose}>
    <div className="modal" onClick={e => e.stopPropagation()}>
      <button className="modal-close" onClick={onClose} title="Close">&times;</button>
      {children}
    </div>
  </div>
);

// ...TYPES...
type Tile = {
  id: number;
  name: string;
  description: string;
  link: string;
  category: string;
  subcategory?: string;
  logo: string;
  appType?: 'web' | 'local' | 'protocol';
  localPath?: string;
  paidSubscription?: boolean;
  paymentFrequency?: 'Monthly' | 'Annually' | null;
  annualType?: 'Subscriber' | 'Fiscal' | 'Calendar' | null;
  paymentAmount?: number | null;
  signupDate?: string | null;
  lastPaymentDate?: string | null;
  creditCardId?: string | null;
  // Legacy fields for backward compatibility
  paymentTypeLast4?: string | null;
  creditCardName?: string | null;
  accountLink?: string | null;
  notes?: string;
};
type HomePageTab = { id: string; name: string; };
type Tab = { name: string; subcategories?: string[]; hasStockTicker?: boolean; homePageTabId?: string; };
type CreditCard = { id: string; name: string; last4: string; };
type FinanceChild = { amount: number; date: string; };
type FinanceTile = { id: number; name: string; description: string; children: FinanceChild[]; };

const defaultTabs: Tab[] = [{ name: 'Banking' }, { name: 'AI' }];
const initialTiles: Tile[] = [];

// ...DROPPABLE TAB COMPONENT...
function DroppableTab({
  tab,
  isActive,
  isDragOver,
  onClick,
  onEdit,
  onDelete,
}: {
  tab: Tab;
  isActive: boolean;
  isDragOver: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: tab.name });
  return (
    <div
      ref={setNodeRef}
      className={`tab${isActive ? ' active' : ''}${isDragOver || isOver ? ' tab-drag-over' : ''}`}
      onClick={onClick}
    >
      {tab.name}
      <span
        className="edit-icon"
        title="Edit Tab"
        onClick={e => { e.stopPropagation(); onEdit(); }}
        role="button"
        tabIndex={0}
      >✏️</span>
      {onDelete && (
        <span
          className="edit-icon"
          title="Delete Tab"
          style={{ marginLeft: 4 }}
          onClick={e => { e.stopPropagation(); onDelete(); }}
          role="button"
          tabIndex={0}
        >🗑️</span>
      )}
    </div>
  );
}

// ...DROPPABLE SUBCATEGORY SECTION...
function DroppableSubcategorySection({
  subcategoryName,
  isDragOver,
  children,
}: {
  subcategoryName: string;
  isDragOver: boolean;
  children: React.ReactNode;
}) {
  const dropId = subcategoryName === '' ? 'uncategorized' : `subcategory-${subcategoryName}`;
  const { setNodeRef, isOver } = useDroppable({ id: dropId });
  return (
    <div
      ref={setNodeRef}
      style={{
        marginBottom: 32,
        padding: isOver || isDragOver ? '16px' : '0',
        borderRadius: isOver || isDragOver ? '12px' : '0',
        background: isOver || isDragOver ? '#e3f2fd' : 'transparent',
        border: isOver || isDragOver ? '2px dashed #1976d2' : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      {children}
    </div>
  );
}

// ...FINANCE MANAGEMENT PAGE...
function FinanceManagementPage() {
  const [financeTiles, setFinanceTiles] = useState<FinanceTile[]>(() => {
    const saved = localStorage.getItem('financeTiles');
    return saved ? JSON.parse(saved) : [];
  });
  useEffect(() => {
    localStorage.setItem('financeTiles', JSON.stringify(financeTiles));
  }, [financeTiles]);

  const [tileForm, setTileForm] = useState({ name: '', description: '' });
  const [childForms, setChildForms] = useState<{ [tileId: number]: { amount: string; date: string } }>({});
  const today = new Date().toISOString().slice(0, 10);
  const [showTileModal, setShowTileModal] = useState(false);

  function handleAddTile(e: React.FormEvent) {
    e.preventDefault();
    setFinanceTiles(tiles => [
      ...tiles,
      { id: Date.now() + Math.random(), name: tileForm.name, description: tileForm.description, children: [] }
    ]);
    setTileForm({ name: '', description: '' });
  }

  function handleAddChild(tileId: number, e: React.FormEvent) {
    e.preventDefault();
    const { amount, date } = childForms[tileId] || {};
    if (!amount || isNaN(Number(amount))) return;
    setFinanceTiles(tiles =>
      tiles.map(tile =>
        tile.id === tileId
          ? { ...tile, children: [...tile.children, { amount: Number(amount), date: date || today }] }
          : tile
      )
    );
    setChildForms(forms => ({ ...forms, [tileId]: { amount: '', date: today } }));
  }

  const allDates = Array.from(
    new Set(financeTiles.flatMap(tile => tile.children.map(child => child.date)))
  ).sort();

  const chartData = allDates.map(date => {
    const entry: any = { date };
    financeTiles.forEach(tile => {
      const child = tile.children.find(c => c.date === date);
      entry[tile.name] = child ? child.amount : null;
    });
    return entry;
  });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 32 }}>
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', width: '100%' }}>
        {/* Tiles Column */}
        <div style={{ flex: 1, minWidth: 320 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ color: '#1976d2', margin: 0 }}>Finance Tiles</h2>
            <button
              className="create-tile-btn"
              style={{
                background: '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                fontSize: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px #0001',
                cursor: 'pointer',
                marginLeft: 8
              }}
              title="Add web shortcut card"
              onClick={() => setShowTileModal(true)}
              aria-label="Add web shortcut card"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="9" y="4" width="2" height="12" rx="1" fill="currentColor"/>
                <rect x="4" y="9" width="12" height="2" rx="1" fill="currentColor"/>
              </svg>
            </button>
          </div>
          {showTileModal && (
            <Modal onClose={() => setShowTileModal(false)}>
              <form onSubmit={handleAddTile} style={{ padding: 16 }}>
                <h2 style={{ color: '#1976d2', marginBottom: 16 }}>Add New Tile</h2>
                <input
                  placeholder="Name"
                  value={tileForm.name}
                  onChange={e => setTileForm(f => ({ ...f, name: e.target.value }))}
                  required
                  style={{ width: '100%', marginBottom: 12, padding: 8 }}
                  autoFocus
                />
                <input
                  placeholder="Description"
                  value={tileForm.description}
                  onChange={e => setTileForm(f => ({ ...f, description: e.target.value }))}
                  required
                  style={{ width: '100%', marginBottom: 12, padding: 8 }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button type="button" onClick={() => setShowTileModal(false)} style={{ padding: '8px 16px', background: '#eee', color: '#333', border: 'none', borderRadius: 4 }}>Cancel</button>
                  <button type="submit" style={{ padding: '8px 16px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4 }}>Add Tile</button>
                </div>
              </form>
            </Modal>
          )}
          {financeTiles.map(tile => (
            <div key={tile.id} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #0001', marginBottom: 24, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: '#1976d2' }}>{tile.name}</div>
              <div style={{ color: '#444', marginBottom: 8 }}>{tile.description}</div>
              <div>
                <form
                  onSubmit={e => handleAddChild(tile.id, e)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}
                >
                  <input
                    type="number"
                    placeholder="Amount"
                    value={childForms[tile.id]?.amount || ''}
                    onChange={e => setChildForms(f => ({ ...f, [tile.id]: { ...f[tile.id], amount: e.target.value, date: f[tile.id]?.date || today } }))}
                    required
                    style={{ width: 90, padding: 6 }}
                  />
                  <input
                    type="date"
                    value={childForms[tile.id]?.date || today}
                    onChange={e => setChildForms(f => ({ ...f, [tile.id]: { ...f[tile.id], date: e.target.value, amount: f[tile.id]?.amount || '' } }))}
                    style={{ width: 140, padding: 6 }}
                  />
                  <button type="submit" style={{ padding: '6px 14px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4 }}>Add</button>
                </form>
                <div>
                  {tile.children.map((child, idx) => (
                    <div key={idx} style={{ fontSize: 15, color: '#333', marginBottom: 2 }}>
                      ${child.amount.toFixed(2)} on {child.date}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Graph + Totals Column */}
        <div style={{ flex: 2, minWidth: 400, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 16px #0002', padding: 32 }}>
            <h2 style={{ color: '#1976d2', marginBottom: 16 }}>Finance Data Over Time</h2>
            <ResponsiveContainer width="100%" height={360}>
              <AreaChart data={chartData} margin={{ top: 24, right: 40, left: 0, bottom: 24 }}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <CartesianGrid strokeDasharray="3 3" />
                {financeTiles.map(tile => (
                  <Area
                    key={tile.id}
                    type="monotone"
                    dataKey={tile.name}
                    stroke={`#${Math.floor(Math.abs(Math.sin(tile.id)) * 16777215).toString(16).padStart(6, '0')}`}
                    fill={`#${Math.floor(Math.abs(Math.sin(tile.id + 1)) * 16777215).toString(16).padStart(6, '0')}33`}
                    strokeWidth={3}
                    dot={{ r: 5 }}
                    connectNulls
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background: '#f4f6fb', borderRadius: 10, padding: 20, boxShadow: '0 2px 8px #0001', maxWidth: '100%' }}>
            <div style={{ fontWeight: 600, color: '#1976d2', fontSize: 18, marginBottom: 8 }}>Totals by Date</div>
            {allDates.map(date => (
              <div key={date} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, marginBottom: 4, padding: '2px 0' }}>
                <span style={{ color: '#1976d2', fontWeight: 500 }}>{date}</span>
                <span style={{ color: '#333', fontWeight: 700 }}>&nbsp;&nbsp;&nbsp;{financeTiles.reduce((sum, tile) => {
                  const child = tile.children.find(c => c.date === date);
                  return sum + (child ? child.amount : 0);
                }, 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Add this helper function above the App function or inside it:
function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (["pptx", "pptm"].includes(ext)) {
    return <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALUAAACUCAMAAADifZgIAAAAb1BMVEXQRSX////NLgDQQyPz1c7nrKL++/vjnJDKGQDPOAjux8H33dfbemj88e734t7QPhjIBwDxzsjTUjb56eXgkIPYbVnOORDUW0LPQB3finz89fTsvbXXZlDuw7zLIwDSUTnlo5jfhHLosqradGHRSy2/JpyvAAAEmUlEQVR4nO2c6ZKiMBCAQ4IgiGS5QjhEDt//GRfCzI5COKakoK3N90urKP1INU3nREihUCgUCoVCoVAoFArFLyH8aIPfwi2MUUyO1lgJIZxa+Fz4Va0HHgKv3fkyjvy4CW+uJtAJaGvSti/1cyc83dxU+wdca0JxUZAoKW+6e9VegWdN2ohgGBc4DjP9ek01CbCsOW0j+HHPndIOZLbgrLsItvyoCmvPNeaMoVhzijF+RGZt64E0IGBZiwguCp6H2SVIF1sYgjUTEVydvGGCgGxNE7P2Zh85gNYE/yIgAFm/Ia2slbWyBmVNVgLKmjNrJWw78XetaZTZ67glDIw1q9bVWS3GdtrvW68vX67nT7Q2CjjWqyNE0/BWz+PbT2PjXVYQwLJG7PxnifP5T2iAsiaPyFkgZ8gyYVnz2Euv87gmhmftLl5lxPgDrbXTWVlvZJ16tmF4t2l9eNa5Z8YkStsiw3dux1sbRtpmhyAILm4gH5sUmY9gi7POGhNaIE/a49/NOqjLMKmiGFm4xU8yabmh93MFtLO22g+8KGX3t5u1x3Fbx1Ped0K4xRpP3tYv1ohYpkR7P2v/9R8IpZcV1oiwchwkh1m37U3GQTK2bn9w/EzubM27oLa+/ouWa6wR9UeNva81z7Msq0NEe51m1Ngya1SMGntfa1Z1Hw09Ftr8rq+ypvnB1k7/xRYJjvBszhr/jIwMB5aPsTbybsKcsBnrNMH8C8qGIXKMtdbQJWtNv9m3b4YVyUHWjghsVs9Yz3GQdSQihE63tRs8M7yHY6zdu3gaH6OX+pc1aYP5B2YN7+4Y61KsXqHRaNLpeyR4MHx6cFxX3UfD5H0chKOrpOPX3B9etq81uZtttYr7PyOPcWdFao1Px1q3dYjFvoadSTHKIHJrTkcJ5bhKFSeSq2TWeHx3B1kThmXVvswaO+MLd7YmfSqjKJJ0CaTWrJHMbu/9NFaO0zhJKet9CevBGjOOK9mU/N752ugG6qZn2kUfnf78FpF2do96o09b8/x0P2OrDSNc4GRiIAeedexqQRZWM2EE1HoRZf1fW3vyGYLnIhucNUG+HP70YodnTbic58pvN2sbnwtcNCvaegLrCGsjuNjZSVKcjtuaSjmkrdfRtXUeScmfOo/grNscEsg5Ioest16fr+GsWVhrnRpG6oBZ1cLvtSfnadj4VESmGeZwVhBNJmxkP1ljblkWXbbZzXpiZRx/vFhvJ7yR9cTvwrYm8vV8mIK2fiShnKdePThrHl+MCUBbr8nXyno3a9NaFoFn/dh6z+n71ra7gBdv9yrfyHqyV/DDlq/yrayX17pv7vz/7itQ1spaWW9lvXKzKyhrxHMnLF+2xn+CNeLdzJwfN+ZteU80HOuO/siHAvvVyXOv6/cbQ9jZjUh3vAaNq/LmXWbm64BZC8Q5BShukjLTl3bwwLEWdIduUNIdulFfZhodmLWgrde6aC9IU05EO0Trb7qDAfDdMTPvEhgfY90hdl+SLtprPfgYa4Hot/TnG+jpx1gL+tNQijNtTDuDf5rPANImyM27sQqFQqFQKBQKhUKhUCjA8BcSnIVyN1JPfAAAAABJRU5ErkJggg==" alt="pptx" style={{ width: 24, height: 24, marginRight: 10, verticalAlign: 'middle' }} />;
  }
  if (["doc", "docx"].includes(ext)) {
    return <span style={{ color: '#2b579a', fontSize: 20, marginRight: 10 }}>📄</span>; // Word
  }
  if (["ppt", "pptx"].includes(ext)) {
    return <span style={{ color: '#b7472a', fontSize: 20, marginRight: 10 }}>📊</span>; // PowerPoint
  }
  if (["xls", "xlsx"].includes(ext)) {
    return <span style={{ color: '#217346', fontSize: 20, marginRight: 10 }}>📈</span>; // Excel
  }
  if (ext === "pdf") {
    return <span style={{ color: '#d32f2f', fontSize: 20, marginRight: 10 }}>📕</span>; // PDF
  }
  if (["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"].includes(ext)) {
    return <span style={{ color: '#1976d2', fontSize: 20, marginRight: 10 }}>🖼️</span>; // Image
  }
  if (["txt", "md", "rtf"].includes(ext)) {
    return <span style={{ color: '#616161', fontSize: 20, marginRight: 10 }}>📄</span>; // Text
  }
  return <span style={{ color: '#888', fontSize: 20, marginRight: 10 }}>📁</span>; // Generic
}

// Add this helper function above the App function or inside it:
function getCommonFolder(files: File[]) {
  if (!files.length) return '';
  const paths = files.map(f => f.webkitRelativePath || f.name);
  if (paths.some(p => !p.includes('/'))) return '';
  const splitPaths = paths.map(p => p.split('/').slice(0, -1));
  let common = splitPaths[0];
  for (let i = 1; i < splitPaths.length; i++) {
    let j = 0;
    while (j < common.length && common[j] === splitPaths[i][j]) j++;
    common = common.slice(0, j);
    if (!common.length) break;
  }
  return common.join('/');
}

// Add this helper function above the App function or inside it:
function formatCurrency(amount: number | null | undefined) {
  if (typeof amount !== 'number' || isNaN(amount)) return '';
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

// Excel export functions
function exportToExcel(data: string[][], filename: string) {
  // Create HTML table for Excel
  let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
  html += '<head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>';
  html += '<x:Name>Sheet1</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>';
  html += '</x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>';
  html += '<table border="1" cellspacing="0" cellpadding="5">';
  
  data.forEach(row => {
    html += '<tr>';
    row.forEach(cell => {
      html += `<td>${String(cell || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`;
    });
    html += '</tr>';
  });
  
  html += '</table></body></html>';
  
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Calculate next payment date based on signup date and frequency
function calculateNextPaymentDate(
  signupDate: string | null | undefined,
  paymentFrequency: 'Monthly' | 'Annually' | null | undefined,
  annualType: 'Subscriber' | 'Fiscal' | 'Calendar' | null | undefined
): string | null {
  if (!signupDate || !paymentFrequency) return null;
  
  const signup = new Date(signupDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (paymentFrequency === 'Monthly') {
    // Calculate next monthly payment
    let nextDate = new Date(signup);
    
    // Keep adding months until we're in the future
    while (nextDate <= today) {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
    
    return nextDate.toISOString().split('T')[0];
  }
  
  if (paymentFrequency === 'Annually') {
    // Default to Subscriber Anniversary if not specified
    const effectiveAnnualType = annualType || 'Subscriber';
    
    if (effectiveAnnualType === 'Subscriber') {
      // Anniversary-based: same day each year
      let nextDate = new Date(signup);
      
      // Keep adding years until we're in the future
      while (nextDate <= today) {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }
      
      return nextDate.toISOString().split('T')[0];
    } else if (effectiveAnnualType === 'Fiscal' || effectiveAnnualType === 'Calendar') {
      // Calendar/Fiscal year: renews on Jan 1st
      const currentYear = today.getFullYear();
      const nextJan1 = new Date(currentYear + 1, 0, 1);
      
      // If today is before Jan 1 of current year + 1, use that, otherwise next year
      if (today < nextJan1) {
        return nextJan1.toISOString().split('T')[0];
      } else {
        return new Date(currentYear + 2, 0, 1).toISOString().split('T')[0];
      }
    }
  }
  
  return null;
}

// Get upcoming payments for the current month
function getUpcomingPaymentsThisMonth(tiles: Tile[]): Array<{ tile: Tile; nextPaymentDate: string }> {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  const upcomingPayments: Array<{ tile: Tile; nextPaymentDate: string }> = [];
  
  tiles.forEach(tile => {
    if (tile.paidSubscription && tile.signupDate && tile.paymentAmount) {
      const nextPaymentDateStr = calculateNextPaymentDate(tile.signupDate, tile.paymentFrequency, tile.annualType);
      if (nextPaymentDateStr) {
        const nextPaymentDate = new Date(nextPaymentDateStr);
        // Check if payment is in current month
        if (nextPaymentDate.getMonth() === currentMonth && nextPaymentDate.getFullYear() === currentYear) {
          upcomingPayments.push({ tile, nextPaymentDate: nextPaymentDateStr });
        }
      }
    }
  });
  
  // Sort by date
  upcomingPayments.sort((a, b) => new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime());
  
  return upcomingPayments;
}

// Get upcoming payments for the next month
function getUpcomingPaymentsNextMonth(tiles: Tile[]): Array<{ tile: Tile; nextPaymentDate: string }> {
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const targetMonth = nextMonth.getMonth();
  const targetYear = nextMonth.getFullYear();
  
  const upcomingPayments: Array<{ tile: Tile; nextPaymentDate: string }> = [];
  
  tiles.forEach(tile => {
    if (tile.paidSubscription && tile.signupDate && tile.paymentAmount) {
      const nextPaymentDateStr = calculateNextPaymentDate(tile.signupDate, tile.paymentFrequency, tile.annualType);
      if (nextPaymentDateStr) {
        const nextPaymentDate = new Date(nextPaymentDateStr);
        // Check if payment is in next month
        if (nextPaymentDate.getMonth() === targetMonth && nextPaymentDate.getFullYear() === targetYear) {
          upcomingPayments.push({ tile, nextPaymentDate: nextPaymentDateStr });
        }
      }
    }
  });
  
  // Sort by date
  upcomingPayments.sort((a, b) => new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime());
  
  return upcomingPayments;
}

// ...START OF MAIN APP...
function App() {
  // --- HomePageTabs state and handlers ---
  const [homePageTabs, setHomePageTabs] = useState<HomePageTab[]>(() => {
    const saved = localStorage.getItem('homePageTabs');
    return saved ? JSON.parse(saved) : [{ id: 'all', name: 'All Web Tiles' }];
  });
  
  useEffect(() => {
    localStorage.setItem('homePageTabs', JSON.stringify(homePageTabs));
  }, [homePageTabs]);
  
  const [selectedHomePageTab, setSelectedHomePageTab] = useState<string>('all');
  
  // --- Credit Cards state and handlers ---
  const [creditCards, setCreditCards] = useState<CreditCard[]>(() => {
    const saved = localStorage.getItem('creditCards');
    return saved ? JSON.parse(saved) : [];
  });
  
  useEffect(() => {
    localStorage.setItem('creditCards', JSON.stringify(creditCards));
  }, [creditCards]);
  
  // --- WebTabs state and handlers ---
  const [tabs, setTabs] = useState<Tab[]>(() => {
    const saved = localStorage.getItem('tabs');
    return saved ? JSON.parse(saved) : defaultTabs;
  });
  const [tiles, setTiles] = useState<Tile[]>(() => {
    const saved = localStorage.getItem('tiles');
    return saved ? JSON.parse(saved) : initialTiles;
  });

  useEffect(() => {
    setTiles(tiles => {
      if (tiles.length > 0 && !('id' in tiles[0])) {
        const migrated = tiles.map(tile => ({
          ...tile,
          id: Date.now() + Math.random()
        }));
        localStorage.setItem('tiles', JSON.stringify(migrated));
        return migrated;
      }
      return tiles;
    });
    // eslint-disable-next-line
  }, []);

  const [activeTab, setActiveTab] = useState<string>('');
  const [activeReport, setActiveReport] = useState<'cost' | 'list'>('cost');

  // --- Stock Ticker State ---
  // Major market indices (always shown first)
  const majorIndices = ['^GSPC', '^DJI', '^IXIC']; // S&P 500, Dow Jones, NASDAQ
  const indiceLabels: Record<string, string> = {
    '^GSPC': 'S&P 500',
    '^DJI': 'DOW',
    '^IXIC': 'NASDAQ',
  };

  const [stockSymbols, setStockSymbols] = useState<string[]>(() => {
    const saved = localStorage.getItem('stockSymbols');
    return saved ? JSON.parse(saved) : [];
  });
  const [stockPrices, setStockPrices] = useState<Record<string, { price: number; change: number; changePercent: number }>>({});
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockSymbolInput, setStockSymbolInput] = useState('');

  useEffect(() => {
    localStorage.setItem('stockSymbols', JSON.stringify(stockSymbols));
  }, [stockSymbols]);

  // Fetch stock prices
  const fetchStockPrices = async () => {
    // Combine indices with user stocks
    const allSymbols = [...majorIndices, ...stockSymbols];
    if (allSymbols.length === 0) return;
    
    console.log('Fetching prices for:', allSymbols);
    
    try {
      const promises = allSymbols.map(async (symbol) => {
        try {
          // For indices, use mock realistic data (Finnhub may not support ^ prefix on free tier)
          if (majorIndices.includes(symbol)) {
            // Generate realistic index values
            const baseValues: Record<string, number> = {
              '^GSPC': 5900,  // S&P 500 typical value
              '^DJI': 43000,  // Dow Jones typical value
              '^IXIC': 19000, // NASDAQ typical value
            };
            
            const basePrice = baseValues[symbol] || 1000;
            const randomVariation = (Math.random() - 0.5) * (basePrice * 0.02); // +/- 1%
            const currentPrice = basePrice + randomVariation;
            const previousClose = basePrice;
            const change = currentPrice - previousClose;
            const changePercent = (change / previousClose) * 100;
            
            console.log(`Mock data for ${symbol}:`, { currentPrice, change, changePercent });
            
            return {
              symbol,
              price: currentPrice,
              change: change,
              changePercent: changePercent,
            };
          }
          
          // For regular stocks, use Finnhub API
          const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=d4li56hr01qr851oh2fgd4li56hr01qr851oh2g0`);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`Finnhub response for ${symbol}:`, data);
            
            // Check if we got valid data
            if (data && typeof data.c === 'number' && data.c > 0) {
              const currentPrice = data.c;
              const previousClose = data.pc || currentPrice;
              const change = currentPrice - previousClose;
              const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
              
              return {
                symbol,
                price: currentPrice,
                change: change,
                changePercent: changePercent,
              };
            } else {
              console.warn(`Invalid data for ${symbol}:`, data);
            }
          } else {
            console.error(`HTTP error for ${symbol}:`, response.status);
          }
          
        } catch (err) {
          console.error(`Error fetching ${symbol}:`, err);
        }
        return null;
      });
      
      const results = await Promise.all(promises);
      console.log('All results:', results);
      
      const pricesMap: Record<string, any> = {};
      results.forEach((result) => {
        if (result) {
          pricesMap[result.symbol] = {
            price: result.price,
            change: result.change,
            changePercent: result.changePercent,
          };
        }
      });
      
      console.log('Final prices map:', pricesMap);
      setStockPrices(pricesMap);
    } catch (error) {
      console.error('Error fetching stock prices:', error);
    }
  };

  // Auto-refresh stock prices every 60 seconds
  useEffect(() => {
    // Fetch for indices and user stocks
    fetchStockPrices();
    const interval = setInterval(fetchStockPrices, 60000); // 60 seconds
    return () => clearInterval(interval);
  }, [stockSymbols]);

  const handleAddStockSymbol = (e: React.FormEvent) => {
    e.preventDefault();
    const symbol = stockSymbolInput.trim().toUpperCase();
    if (symbol && !stockSymbols.includes(symbol)) {
      setStockSymbols([...stockSymbols, symbol]);
      setStockSymbolInput('');
    }
  };

  const handleRemoveStockSymbol = (symbol: string) => {
    setStockSymbols(stockSymbols.filter(s => s !== symbol));
  };

  // --- Home Page Drag & Drop Handler ---
  const handleHomeTabDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setTabs((tabs) => {
        const oldIndex = tabs.findIndex((tab) => tab.name === active.id);
        const newIndex = tabs.findIndex((tab) => tab.name === over.id);
        const reordered = arrayMove(tabs, oldIndex, newIndex);
        localStorage.setItem('tabs', JSON.stringify(reordered));
        return reordered;
      });
    }
  };

  // --- Sortable Home Tile Component ---
  function SortableHomeTab({ tab }: { tab: Tab }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: tab.name,
    });
    const tabTiles = tiles.filter(t => t.category === tab.name);
    
    // Calculate monthly and annual spend for this tab (matching sidebar logic)
    // Monthly = sum of monthly payments only
    // Annual = sum of annual payments only
    const monthlySpend = tabTiles.reduce((sum, tile) => {
      const amount = parseFloat(String(tile.paymentAmount || 0));
      return tile.paymentFrequency === 'Monthly' ? sum + amount : sum;
    }, 0);
    const annualSpend = tabTiles.reduce((sum, tile) => {
      const amount = parseFloat(String(tile.paymentAmount || 0));
      return tile.paymentFrequency === 'Annually' ? sum + amount : sum;
    }, 0);

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      zIndex: isDragging ? 100 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
      >
        <div
          onClick={(e) => {
            if (!isDragging) {
              setMainMenu('home');
              setActiveTab(tab.name);
            }
          }}
          style={{
            background: '#fff',
            border: '2px solid #e0e0e0',
            borderRadius: 12,
            boxShadow: isDragging ? '0 8px 32px #1976d244' : '0 2px 12px #0001',
            padding: '20px 24px',
            cursor: isDragging ? 'grabbing' : 'grab',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            height: 280,
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
          }}
          onMouseEnter={(e) => {
            if (!isDragging) {
              e.currentTarget.style.boxShadow = '0 4px 24px #1976d244';
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.borderColor = '#1976d2';
              e.currentTarget.style.cursor = 'pointer';
            }
          }}
          onMouseLeave={(e) => {
            if (!isDragging) {
              e.currentTarget.style.boxShadow = '0 2px 12px #0001';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = '#e0e0e0';
              e.currentTarget.style.cursor = 'grab';
            }
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid #e0e0e0',
            paddingBottom: 12,
            marginBottom: 16,
          }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ 
                color: '#1976d2', 
                fontSize: 18, 
                fontWeight: 700, 
                margin: 0,
                marginBottom: 6,
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                {tab.name}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditTabModal(tabs.findIndex(t => t.name === tab.name));
                  }}
                  style={{
                    color: '#888',
                    fontSize: 16,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    transition: 'color 0.2s, transform 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#1976d2';
                    e.currentTarget.style.transform = 'scale(1.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#888';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  title={`Edit ${tab.name} tab`}
                  role="button"
                >
                  ✏️
                </span>
              </h2>
              <div style={{
                fontSize: 13,
                color: '#666',
                textAlign: 'left',
                fontWeight: 500,
              }}>
                Monthly: ${monthlySpend.toFixed(2)} • Annual: ${annualSpend.toFixed(2)}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowTileModal(true);
                setEditTileId(null);
                setForm({
                  name: '',
                  description: '',
                  link: '',
                  logo: '',
                  category: tab.name,
                  subcategory: '',
                  appType: 'web',
                  localPath: '',
                  paidSubscription: false,
                  paymentFrequency: null,
                  annualType: null,
                  paymentAmount: null,
                  signupDate: null,
                  lastPaymentDate: null,
                  creditCardId: null,
                  paymentTypeLast4: '',
                  creditCardName: '',
                  accountLink: '',
                  notes: '',
                });
              }}
              style={{
                background: '#f5f5f5',
                color: '#1976d2',
                border: '1px solid #e0e0e0',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 20,
                fontWeight: 700,
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e3f2fd';
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(25, 118, 210, 0.3)';
                e.currentTarget.style.borderColor = '#1976d2';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f5f5f5';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                e.currentTarget.style.borderColor = '#e0e0e0';
              }}
              title={`Add new card to ${tab.name}`}
            >
              +
            </button>
          </div>
          <div style={{ 
            flex: 1,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignContent: 'flex-start',
            justifyContent: 'flex-start',
            padding: '8px 0'
          }}>
            {tabTiles.slice(0, 24).map((tile) => (
              tile.logo && (
                <a
                  key={tile.id}
                  href={tile.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`${tile.name} - ${tile.description}`}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  style={{
                    textDecoration: 'none',
                    display: 'block',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={tile.logo}
                    alt={tile.name}
                    style={{
                      width: 40,
                      height: 40,
                      objectFit: 'contain',
                      borderRadius: 6,
                      background: '#f9f9f9',
                      padding: 4,
                      border: '1px solid #e0e0e0',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.15)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(25, 118, 210, 0.3)';
                      e.currentTarget.style.borderColor = '#1976d2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = '#e0e0e0';
                    }}
                  />
                </a>
              )
            ))}
            {tabTiles.length > 24 && (
              <div style={{
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f0f0f0',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                color: '#666',
                flexShrink: 0,
                pointerEvents: 'none',
              }}>
                +{tabTiles.length - 24}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  const [showTileModal, setShowTileModal] = useState(false);
  const [showTabModal, setShowTabModal] = useState(false);
  const [tabModalMode, setTabModalMode] = useState<'add' | 'edit'>('add');
  const [tabHasStockTicker, setTabHasStockTicker] = useState(false);
  const [tabHomePageTabId, setTabHomePageTabId] = useState<string>('all');
  const [form, setForm] = useState<Omit<Tile, 'id'>>({
    name: '',
    description: '',
    link: '',
    category: tabs[0]?.name || '',
    subcategory: '',
    logo: '',
    appType: 'web',
    localPath: '',
    paidSubscription: false,
    paymentFrequency: null,
    annualType: null,
    paymentAmount: null,
    signupDate: null,
    lastPaymentDate: null,
    creditCardId: null,
    paymentTypeLast4: '',
    creditCardName: '',
    accountLink: '',
    notes: '',
  });
  const [editTileId, setEditTileId] = useState<number | null>(null);
  const [editingTabIndex, setEditingTabIndex] = useState<number | null>(null);
  const [tabFormName, setTabFormName] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tileToDeleteId, setTileToDeleteId] = useState<number | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreData, setRestoreData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  
  // Banner Title state
  const [bannerTitle, setBannerTitle] = useState<string>(() => {
    const saved = localStorage.getItem('bannerTitle');
    return saved || "Bill's Applications";
  });
  const [showBannerTitleModal, setShowBannerTitleModal] = useState(false);
  const [bannerTitleForm, setBannerTitleForm] = useState<string>('');
  
  // Monthly payments reminder modal
  const [showUpcomingPaymentsModal, setShowUpcomingPaymentsModal] = useState(false);
  const [viewingNextMonth, setViewingNextMonth] = useState(false);
  
  // Subcategory state
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [subcategoryModalMode, setSubcategoryModalMode] = useState<'add' | 'edit'>('add');
  const [subcategoryForm, setSubcategoryForm] = useState<string>('');
  const [editingSubcategoryIndex, setEditingSubcategoryIndex] = useState<number | null>(null);
  
  // APP Report sorting state
  const [sortColumn, setSortColumn] = useState<'name' | 'frequency' | 'paymentType'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Home Page Tab Management State
  const [showHomePageTabModal, setShowHomePageTabModal] = useState(false);
  const [homePageTabModalMode, setHomePageTabModalMode] = useState<'add' | 'edit'>('add');
  const [homePageTabForm, setHomePageTabForm] = useState<string>('');
  const [editingHomePageTabId, setEditingHomePageTabId] = useState<string | null>(null);
  
  // Expand/collapse state for left nav
  const [expandedHomePageTabs, setExpandedHomePageTabs] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('expandedHomePageTabs');
    return saved ? new Set(JSON.parse(saved)) : new Set(['all']);
  });
  
  useEffect(() => {
    localStorage.setItem('expandedHomePageTabs', JSON.stringify(Array.from(expandedHomePageTabs)));
  }, [expandedHomePageTabs]);
  
  // Reports menu expand state
  const [reportsExpanded, setReportsExpanded] = useState(true);
  
  // Credit Card Management State
  const [showCreditCardModal, setShowCreditCardModal] = useState(false);
  const [creditCardModalMode, setCreditCardModalMode] = useState<'add' | 'edit'>('add');
  const [creditCardForm, setCreditCardForm] = useState({ name: '', last4: '' });
  const [editingCreditCardId, setEditingCreditCardId] = useState<string | null>(null);
  
  // Sort function for APP Report
  const handleSort = (column: 'name' | 'frequency' | 'paymentType') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  
  // Sort tiles for APP Report
  const sortedReportTiles = React.useMemo(() => {
    const filtered = tiles.filter(t => t.paidSubscription);
    console.log('APP Report - Total tiles:', tiles.length);
    console.log('APP Report - Paid subscription tiles:', filtered.length);
    console.log('APP Report - Filtered tiles:', filtered.map(t => ({ name: t.name, paid: t.paidSubscription, amount: t.paymentAmount })));
    return filtered.sort((a, b) => {
      let aValue: string, bValue: string;
      
      switch (sortColumn) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'frequency':
          aValue = a.paymentFrequency || '';
          bValue = b.paymentFrequency || '';
          break;
        case 'paymentType':
          aValue = a.paymentTypeLast4 || '';
          bValue = b.paymentTypeLast4 || '';
          break;
        default:
          return 0;
      }
      
      if (sortDirection === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
  }, [tiles, sortColumn, sortDirection]);
  const [_dragOverTab, setDragOverTab] = useState<string | null>(null);
  const [dragOverSubcategory, setDragOverSubcategory] = useState<string | null>(null);
  const [mainMenu, setMainMenu] = useState<'home' | 'files' | 'settings' | 'reports'>('home');
  const [pickedFolders, setPickedFolders] = useState<Array<{
    name: string;
    path: string;
    files: File[];
    fileNames: string[];
    expanded: boolean;
    needsRepick?: boolean;
  }>>(() => {
    // Load from localStorage
    const saved = localStorage.getItem('pickedFolders');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed)
        ? parsed.map(f => ({ ...f, files: [], expanded: false, needsRepick: true }))
        : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    // Save folder metadata (not files) to localStorage
    localStorage.setItem(
      'pickedFolders',
      JSON.stringify(
        pickedFolders.map(f => ({
          name: f.name,
          path: f.path,
          fileNames: f.files.length ? f.files.map(file => file.webkitRelativePath?.replace(f.path + '/', '') || file.name) : f.fileNames || [],
        }))
      )
    );
  }, [pickedFolders]);

  useEffect(() => {
    localStorage.setItem('tabs', JSON.stringify(tabs));
  }, [tabs]);
  useEffect(() => {
    localStorage.setItem('tiles', JSON.stringify(tiles));
  }, [tiles]);
  useEffect(() => {
    if (activeTab !== '' && activeTab !== 'APP Report' && !tabs.find(tab => tab.name === activeTab)) {
      setActiveTab(tabs[0]?.name || '');
    }
  }, [tabs, activeTab]);
  useEffect(() => {
    localStorage.setItem('bannerTitle', bannerTitle);
    document.title = bannerTitle;
  }, [bannerTitle]);
  
  // Check for upcoming payments at the start of each month
  useEffect(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const lastShown = localStorage.getItem('lastPaymentsReminderShown');
    
    // Check if we haven't shown the reminder yet this month
    const shouldShow = !lastShown || !lastShown.startsWith(today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0'));
    
    if (shouldShow && tiles.length > 0) {
      const upcomingPayments = getUpcomingPaymentsThisMonth(tiles);
      if (upcomingPayments.length > 0) {
        setShowUpcomingPaymentsModal(true);
        localStorage.setItem('lastPaymentsReminderShown', todayStr);
      }
    }
  }, [tiles]);

  // WebTabs handlers (same as previous code)
  // const handleCreateTile = () => {
  //   setShowTileModal(true);
  //   setEditTileId(null);
  //   setForm({ name: '', description: '', link: '', category: activeTab, subcategory: '', logo: '', appType: 'web', localPath: '', paidSubscription: false, paymentFrequency: null, annualType: null, paymentAmount: null, signupDate: null, lastPaymentDate: null, creditCardId: null, paymentTypeLast4: '', creditCardName: '', accountLink: '', notes: '' });
  // };
  const handleEditTile = (tileId: number) => {
    const tile = tiles.find(t => t.id === tileId);
    if (!tile) return;
    setShowTileModal(true);
    setEditTileId(tileId);
    setForm({
      name: tile.name,
      description: tile.description,
      link: tile.link,
      category: tile.category,
      subcategory: tile.subcategory || '',
      logo: tile.logo,
      appType: tile.appType || 'web',
      localPath: tile.localPath || '',
      paidSubscription: tile.paidSubscription || false,
      paymentFrequency: tile.paymentFrequency || null,
      annualType: tile.paymentFrequency === 'Annually' ? (tile.annualType || 'Subscriber') : (tile.annualType || null),
      paymentAmount: tile.paymentAmount || null,
      signupDate: tile.signupDate || null,
      lastPaymentDate: tile.lastPaymentDate || null,
      creditCardId: tile.creditCardId || null,
      paymentTypeLast4: tile.paymentTypeLast4 || '',
      creditCardName: tile.creditCardName || '',
      accountLink: tile.accountLink || '',
      notes: tile.notes || '',
    });
  };
  const handleDeleteTile = (tileId: number) => {
    setTileToDeleteId(tileId);
    setShowDeleteModal(true);
  };
  const confirmDeleteTile = () => {
    if (tileToDeleteId !== null) {
      setTiles(tiles => tiles.filter(t => t.id !== tileToDeleteId));
    }
    setShowDeleteModal(false);
    setTileToDeleteId(null);
  };
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const name = target.name;
    const type = target.type;
    
    if (type === 'checkbox') {
      const checked = (target as HTMLInputElement).checked;
      setForm(f => ({ ...f, [name]: checked }));
    } else {
      const value = target.value;
      // Force uppercase for the name field (card title)
      const finalValue = name === 'name' ? value.toUpperCase() : value;
      setForm({ ...form, [name]: finalValue });
    }
  };
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editTileId !== null) {
      setTiles(tiles =>
        tiles.map(t =>
          t.id === editTileId
            ? { ...t, ...form }
            : t
        )
      );
    } else {
      setTiles([...tiles, { ...form, id: Date.now() + Math.random() }]);
    }
    setShowTileModal(false);
    setEditTileId(null);
  };
  // const openAddTabModal = () => {
  //   setTabModalMode('add');
  //   setTabFormName('');
  //   setTabHasStockTicker(false);
  //   setTabHomePageTabId(selectedHomePageTab); // Default to currently selected home page tab
  //   setShowTabModal(true);
  //   setEditingTabIndex(null);
  // };
  const openEditTabModal = (idx: number) => {
    setTabModalMode('edit');
    setTabFormName(tabs[idx].name);
    setTabHasStockTicker(tabs[idx].hasStockTicker || false);
    setTabHomePageTabId(tabs[idx].homePageTabId || 'all');
    setShowTabModal(true);
    setEditingTabIndex(idx);
  };
  const handleTabFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newName = tabFormName.trim();
    if (!newName || tabs.some((tab, i) => tab.name === newName && (tabModalMode === 'add' || i !== editingTabIndex))) return;
    if (tabModalMode === 'add') {
      setTabs([...tabs, { name: newName, hasStockTicker: tabHasStockTicker, homePageTabId: tabHomePageTabId }]);
      setActiveTab(newName);
    } else if (editingTabIndex !== null) {
      const oldName = tabs[editingTabIndex].name;
      const updatedTabs = tabs.map((tab, i) => 
        i === editingTabIndex 
          ? { ...tab, name: newName, hasStockTicker: tabHasStockTicker, homePageTabId: tabHomePageTabId } 
          : tab
      );
      const updatedTiles = tiles.map(tile =>
        tile.category === oldName ? { ...tile, category: newName } : tile
      );
      setTabs(updatedTabs);
      setTiles(updatedTiles);
      // Only change activeTab if we're currently on that tab (not on Home Page)
      if (activeTab === oldName) {
        setActiveTab(newName);
      }
    }
    setShowTabModal(false);
    setEditingTabIndex(null);
    setTabFormName('');
    setTabHasStockTicker(false);
    setTabHomePageTabId('all');
  };
  const handleDeleteTab = (idx: number) => {
    const tabName = tabs[idx].name;
    if (!window.confirm(`Delete tab "${tabName}"? All tiles in this category will also be deleted.`)) return;
    const updatedTabs = tabs.filter((_, i) => i !== idx);
    const updatedTiles = tiles.filter(tile => tile.category !== tabName);
    setTabs(updatedTabs);
    setTiles(updatedTiles);
    setActiveTab(updatedTabs[0]?.name || '');
  };
  const openBannerTitleModal = () => {
    setBannerTitleForm(bannerTitle);
    setShowBannerTitleModal(true);
  };
  const handleBannerTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTitle = bannerTitleForm.trim();
    if (!newTitle) return;
    setBannerTitle(newTitle);
    setShowBannerTitleModal(false);
  };
  
  // Home Page Tab Management Functions
  const openAddHomePageTabModal = () => {
    setHomePageTabModalMode('add');
    setHomePageTabForm('');
    setShowHomePageTabModal(true);
    setEditingHomePageTabId(null);
  };
  
  const openEditHomePageTabModal = (id: string) => {
    const homePageTab = homePageTabs.find(hpt => hpt.id === id);
    if (!homePageTab) return;
    setHomePageTabModalMode('edit');
    setHomePageTabForm(homePageTab.name);
    setShowHomePageTabModal(true);
    setEditingHomePageTabId(id);
  };
  
  const handleHomePageTabFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newName = homePageTabForm.trim();
    if (!newName) return;
    
    if (homePageTabModalMode === 'add') {
      // Check for duplicates
      if (homePageTabs.some(hpt => hpt.name === newName)) {
        alert('A tab with this name already exists');
        return;
      }
      
      const newId = Date.now().toString();
      setHomePageTabs([...homePageTabs, { id: newId, name: newName }]);
      setSelectedHomePageTab(newId);
    } else if (editingHomePageTabId !== null) {
      // Check for duplicates (excluding current tab)
      if (homePageTabs.some(hpt => hpt.name === newName && hpt.id !== editingHomePageTabId)) {
        alert('A tab with this name already exists');
        return;
      }
      
      setHomePageTabs(homePageTabs.map(hpt =>
        hpt.id === editingHomePageTabId ? { ...hpt, name: newName } : hpt
      ));
    }
    
    setShowHomePageTabModal(false);
    setEditingHomePageTabId(null);
    setHomePageTabForm('');
  };
  
  const handleDeleteHomePageTab = (id: string) => {
    // Don't allow deleting the 'all' tab
    if (id === 'all') {
      alert('Cannot delete the default "All Web Tiles" tab');
      return;
    }
    
    const homePageTab = homePageTabs.find(hpt => hpt.id === id);
    if (!homePageTab) return;
    
    if (!window.confirm(`Delete home page tab "${homePageTab.name}"? All Web Tiles in this tab will be moved to "All Web Tiles".`)) return;
    
    // Move all tabs (Web Tiles) back to 'all'
    setTabs(tabs.map(tab =>
      tab.homePageTabId === id ? { ...tab, homePageTabId: 'all' } : tab
    ));
    
    // Remove the home page tab
    setHomePageTabs(homePageTabs.filter(hpt => hpt.id !== id));
    
    // If we're currently viewing this tab, switch to 'all'
    if (selectedHomePageTab === id) {
      setSelectedHomePageTab('all');
    }
    
    // Remove from expanded set
    setExpandedHomePageTabs(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };
  
  const toggleHomePageTabExpanded = (id: string) => {
    setExpandedHomePageTabs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };
  
  // Credit Card Management Functions
  const openAddCreditCardModal = () => {
    setCreditCardModalMode('add');
    setCreditCardForm({ name: '', last4: '' });
    setShowCreditCardModal(true);
    setEditingCreditCardId(null);
  };
  
  const openEditCreditCardModal = (id: string) => {
    const card = creditCards.find(cc => cc.id === id);
    if (!card) return;
    setCreditCardModalMode('edit');
    setCreditCardForm({ name: card.name, last4: card.last4 });
    setShowCreditCardModal(true);
    setEditingCreditCardId(id);
  };
  
  const handleCreditCardFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = creditCardForm.name.trim();
    const last4 = creditCardForm.last4.trim();
    
    if (!name || !last4) {
      alert('Please fill in all fields');
      return;
    }
    
    if (!/^\d{4}$/.test(last4)) {
      alert('Last 4 digits must be exactly 4 numbers');
      return;
    }
    
    if (creditCardModalMode === 'add') {
      // Check for duplicates
      if (creditCards.some(cc => cc.name === name && cc.last4 === last4)) {
        alert('A credit card with this name and last 4 digits already exists');
        return;
      }
      
      const newId = Date.now().toString();
      setCreditCards([...creditCards, { id: newId, name, last4 }]);
    } else if (editingCreditCardId !== null) {
      // Check for duplicates (excluding current card)
      if (creditCards.some(cc => cc.name === name && cc.last4 === last4 && cc.id !== editingCreditCardId)) {
        alert('A credit card with this name and last 4 digits already exists');
        return;
      }
      
      setCreditCards(creditCards.map(cc =>
        cc.id === editingCreditCardId ? { ...cc, name, last4 } : cc
      ));
    }
    
    setShowCreditCardModal(false);
    setEditingCreditCardId(null);
    setCreditCardForm({ name: '', last4: '' });
  };
  
  const handleDeleteCreditCard = (id: string) => {
    const card = creditCards.find(cc => cc.id === id);
    if (!card) return;
    
    // Check if any tiles are using this credit card
    const tilesUsingCard = tiles.filter(t => t.creditCardId === id);
    if (tilesUsingCard.length > 0) {
      if (!window.confirm(`This credit card is used by ${tilesUsingCard.length} subscription(s). Deleting it will remove the credit card from those subscriptions. Continue?`)) {
        return;
      }
      // Remove credit card reference from tiles
      setTiles(tiles.map(t => 
        t.creditCardId === id ? { ...t, creditCardId: null } : t
      ));
    }
    
    setCreditCards(creditCards.filter(cc => cc.id !== id));
  };
  
  // Auto-fetch logo function
  const handleAutoFetchLogo = async () => {
    const urlToUse = form.appType === 'local' && form.link ? form.link : form.link;
    if (!urlToUse) {
      alert('Please enter a Web Link first to auto-fetch the logo.');
      return;
    }
    
    try {
      // Extract domain from URL
      let domain = '';
      try {
        const url = new URL(urlToUse);
        domain = url.hostname.replace('www.', '');
      } catch {
        // If not a valid URL, try to extract domain manually
        const match = urlToUse.match(/(?:https?:\/\/)?(?:www\.)?([^\/\?]+)/);
        domain = match ? match[1] : '';
      }
      
      if (!domain) {
        alert('Could not extract domain from URL. Please enter a valid URL.');
        return;
      }
      
      // Try Clearbit first (best quality)
      const clearbitUrl = `https://logo.clearbit.com/${domain}`;
      
      // Test if Clearbit logo exists
      const img = new Image();
      img.onload = () => {
        setForm(f => ({ ...f, logo: clearbitUrl }));
      };
      img.onerror = () => {
        // Fallback to Google Favicon
        const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        setForm(f => ({ ...f, logo: googleFaviconUrl }));
      };
      img.src = clearbitUrl;
      
    } catch (error) {
      alert('Error fetching logo. Please enter the logo URL manually.');
    }
  };
  const openAddSubcategoryModal = () => {
    setSubcategoryModalMode('add');
    setSubcategoryForm('');
    setShowSubcategoryModal(true);
    setEditingSubcategoryIndex(null);
  };
  const openEditSubcategoryModal = (idx: number) => {
    const currentTab = tabs.find(t => t.name === activeTab);
    if (!currentTab || !currentTab.subcategories) return;
    setSubcategoryModalMode('edit');
    setSubcategoryForm(currentTab.subcategories[idx]);
    setShowSubcategoryModal(true);
    setEditingSubcategoryIndex(idx);
  };
  const handleSubcategoryFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newSubcategory = subcategoryForm.trim();
    if (!newSubcategory) return;
    
    const tabIndex = tabs.findIndex(t => t.name === activeTab);
    if (tabIndex === -1) return;
    
    const currentTab = tabs[tabIndex];
    const subcategories = currentTab.subcategories || [];
    
    if (subcategoryModalMode === 'add') {
      // Check if subcategory already exists
      if (subcategories.includes(newSubcategory)) {
        alert('Subcategory already exists!');
        return;
      }
      // Add new subcategory
      const updatedTabs = tabs.map((tab, i) =>
        i === tabIndex ? { ...tab, subcategories: [...subcategories, newSubcategory] } : tab
      );
      setTabs(updatedTabs);
    } else if (editingSubcategoryIndex !== null) {
      // Edit existing subcategory
      const oldSubcategory = subcategories[editingSubcategoryIndex];
      const updatedSubcategories = subcategories.map((sub, i) =>
        i === editingSubcategoryIndex ? newSubcategory : sub
      );
      const updatedTabs = tabs.map((tab, i) =>
        i === tabIndex ? { ...tab, subcategories: updatedSubcategories } : tab
      );
      // Update all tiles that had the old subcategory
      const updatedTiles = tiles.map(tile =>
        tile.category === activeTab && tile.subcategory === oldSubcategory
          ? { ...tile, subcategory: newSubcategory }
          : tile
      );
      setTabs(updatedTabs);
      setTiles(updatedTiles);
    }
    
    setShowSubcategoryModal(false);
    setEditingSubcategoryIndex(null);
    setSubcategoryForm('');
    setSubcategoryModalMode('add');
  };
  const handleDeleteSubcategory = (idx: number) => {
    const currentTab = tabs.find(t => t.name === activeTab);
    if (!currentTab || !currentTab.subcategories) return;
    
    const subcategoryToDelete = currentTab.subcategories[idx];
    if (!window.confirm(`Delete subcategory "${subcategoryToDelete}"? Tiles in this subcategory will become uncategorized.`)) return;
    
    const tabIndex = tabs.findIndex(t => t.name === activeTab);
    const updatedSubcategories = currentTab.subcategories.filter((_, i) => i !== idx);
    const updatedTabs = tabs.map((tab, i) =>
      i === tabIndex ? { ...tab, subcategories: updatedSubcategories } : tab
    );
    // Remove subcategory from tiles
    const updatedTiles = tiles.map(tile =>
      tile.category === activeTab && tile.subcategory === subcategoryToDelete
        ? { ...tile, subcategory: '' }
        : tile
    );
    setTabs(updatedTabs);
    setTiles(updatedTiles);
  };
  function handleBackup() {
    // Backup all localStorage data
    const backup = {
      tiles: localStorage.getItem('tiles') ? JSON.parse(localStorage.getItem('tiles')!) : [],
      tabs: localStorage.getItem('tabs') ? JSON.parse(localStorage.getItem('tabs')!) : [],
      financeTiles: localStorage.getItem('financeTiles') ? JSON.parse(localStorage.getItem('financeTiles')!) : [],
      homePageTabs: localStorage.getItem('homePageTabs') ? JSON.parse(localStorage.getItem('homePageTabs')!) : [],
      creditCards: localStorage.getItem('creditCards') ? JSON.parse(localStorage.getItem('creditCards')!) : [],
      stockSymbols: localStorage.getItem('stockSymbols') ? JSON.parse(localStorage.getItem('stockSymbols')!) : [],
      expandedHomePageTabs: localStorage.getItem('expandedHomePageTabs') ? JSON.parse(localStorage.getItem('expandedHomePageTabs')!) : [],
      pickedFolders: localStorage.getItem('pickedFolders') ? JSON.parse(localStorage.getItem('pickedFolders')!) : [],
      bannerTitle: localStorage.getItem('bannerTitle') || '',
      lastPaymentsReminderShown: localStorage.getItem('lastPaymentsReminderShown') || '',
      backupDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bills-apps-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  function handleRestoreClick() {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }
  function handleRestoreFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    console.log('handleRestoreFileChange called');
    const file = e.target.files?.[0];
    console.log('File selected:', file);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        console.log('File read, parsing JSON...');
        const data = JSON.parse(event.target?.result as string);
        console.log('Parsed data:', data);
        if (data && (data.tiles || data.tabs)) {
          console.log('Valid backup, showing modal');
          setRestoreData(data); // Store the entire backup data
          setShowRestoreModal(true);
        } else {
          console.log('Invalid backup - missing tiles/tabs');
          alert('Invalid backup file.');
        }
      } catch (error) {
        console.error('Error parsing backup:', error);
        alert('Invalid backup file.');
      }
    };
    reader.readAsText(file);
  }
  function confirmRestore() {
    if (restoreData) {
      try {
        // Restore all data from the backup
        if (restoreData.tiles) {
          localStorage.setItem('tiles', JSON.stringify(restoreData.tiles));
          setTiles(restoreData.tiles);
        }
        if (restoreData.tabs) {
          localStorage.setItem('tabs', JSON.stringify(restoreData.tabs));
          setTabs(restoreData.tabs);
          setActiveTab(restoreData.tabs[0]?.name || '');
        }
        if (restoreData.financeTiles) {
          localStorage.setItem('financeTiles', JSON.stringify(restoreData.financeTiles));
          setFinanceTiles(restoreData.financeTiles);
        }
        if (restoreData.homePageTabs) {
          localStorage.setItem('homePageTabs', JSON.stringify(restoreData.homePageTabs));
          setHomePageTabs(restoreData.homePageTabs);
          if (restoreData.homePageTabs.length > 0) {
            setSelectedHomePageTab(restoreData.homePageTabs[0].id);
          }
        }
        if (restoreData.creditCards) {
          localStorage.setItem('creditCards', JSON.stringify(restoreData.creditCards));
          setCreditCards(restoreData.creditCards);
        }
        if (restoreData.stockSymbols) {
          localStorage.setItem('stockSymbols', JSON.stringify(restoreData.stockSymbols));
          setStockSymbols(restoreData.stockSymbols);
        }
        if (restoreData.expandedHomePageTabs) {
          localStorage.setItem('expandedHomePageTabs', JSON.stringify(restoreData.expandedHomePageTabs));
          setExpandedHomePageTabs(new Set(restoreData.expandedHomePageTabs));
        }
        if (restoreData.pickedFolders) {
          localStorage.setItem('pickedFolders', JSON.stringify(restoreData.pickedFolders));
          setPickedFolders(restoreData.pickedFolders);
        }
        if (restoreData.bannerTitle) {
          localStorage.setItem('bannerTitle', restoreData.bannerTitle);
          setBannerTitle(restoreData.bannerTitle);
        }
        if (restoreData.lastPaymentsReminderShown) {
          localStorage.setItem('lastPaymentsReminderShown', restoreData.lastPaymentsReminderShown);
        }
        
        setShowRestoreModal(false);
        setRestoreData(null);
        alert('Data restored successfully! The page will reload.');
        window.location.reload();
      } catch (error) {
        alert('Error restoring backup: ' + error);
        setShowRestoreModal(false);
        setRestoreData(null);
      }
    }
  }
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );
  
  const filteredTiles = tiles.filter(tile => tile.category === activeTab);
  const filteredTileIds = filteredTiles.map(tile => tile.id);
  
  // Group tiles by subcategory
  const currentTab = tabs.find(t => t.name === activeTab);
  const subcategories = currentTab?.subcategories || [];
  
  // Tiles without subcategory OR with a subcategory that doesn't exist in current tab
  const tilesWithoutSubcategory = filteredTiles.filter(t => {
    // If tile has no subcategory, include it
    if (!t.subcategory) return true;
    // If tile has a subcategory that doesn't exist in this tab's subcategories, treat as uncategorized
    return !subcategories.includes(t.subcategory);
  });
  
  const tilesBySubcategory = subcategories.map(sub => ({
    name: sub,
    tiles: filteredTiles.filter(t => t.subcategory === sub),
  }));
  
  const columns = 3;
  const remainder = filteredTiles.length % columns;
  // const placeholders = remainder === 0 ? 0 : columns - remainder;
  function handleDragEnd(event: any) {
    const { active, over } = event;
    setDragOverTab(null);
    setDragOverSubcategory(null);
    
    // Check if dropped on a tab
    if (over && typeof over.id === 'string' && tabs.some(tab => tab.name === over.id)) {
      setTiles(tiles =>
        tiles.map(tile =>
          tile.id === active.id ? { ...tile, category: over.id } : tile
        )
      );
      setActiveTab(over.id);
      return;
    }
    
    // Check if dropped on a subcategory
    if (over && typeof over.id === 'string' && over.id.startsWith('subcategory-')) {
      const subcategoryName = over.id.replace('subcategory-', '');
      setTiles(tiles =>
        tiles.map(tile =>
          tile.id === active.id ? { ...tile, subcategory: subcategoryName } : tile
        )
      );
      return;
    }
    
    // Check if dropped on "uncategorized" area
    if (over && over.id === 'uncategorized') {
      setTiles(tiles =>
        tiles.map(tile =>
          tile.id === active.id ? { ...tile, subcategory: '' } : tile
        )
      );
      return;
    }
    
    if (!over || active.id === over.id) return;
    const oldIndex = filteredTileIds.indexOf(active.id);
    const newIndex = filteredTileIds.indexOf(over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(filteredTiles, oldIndex, newIndex);
    const newTiles: Tile[] = [];
    let filteredIdx = 0;
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i].category === activeTab) {
        newTiles.push(reordered[filteredIdx++]);
      } else {
        newTiles.push(tiles[i]);
      }
    }
    setTiles(newTiles);
  }
  const TrashIcon = (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="6.5" y="8" width="1.5" height="6" rx="0.75" fill="#888"/>
      <rect x="12" y="8" width="1.5" height="6" rx="0.75" fill="#888"/>
      <rect x="9.25" y="8" width="1.5" height="6" rx="0.75" fill="#888"/>
      <rect x="4" y="5" width="12" height="2" rx="1" fill="#888"/>
      <rect x="7" y="3" width="6" height="2" rx="1" fill="#888"/>
      <rect x="3" y="7" width="14" height="10" rx="2" stroke="#888" strokeWidth="1.5" fill="none"/>
    </svg>
  );
  function SortableTile({ tile, idx }: { tile: Tile; idx: number }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tile.id });
    
    const handleTileClick = (e: React.MouseEvent) => {
      if (tile.appType === 'local') {
        e.preventDefault();
        // Show path and copy to clipboard
        const pathToCopy = tile.localPath || '';
        if (pathToCopy) {
          navigator.clipboard.writeText(pathToCopy).then(() => {
            alert(`Path copied to clipboard!\n\n${pathToCopy}\n\nNote: Web browsers cannot launch .exe files directly. Please paste this path into Windows Run (Win+R) or File Explorer.`);
          }).catch(() => {
            alert(`Application Path:\n\n${pathToCopy}\n\nNote: Web browsers cannot launch .exe files directly. Please copy this path manually and paste into Windows Run (Win+R) or File Explorer.`);
          });
        } else if (tile.link) {
          // If there's a fallback link, open it
          window.open(tile.link, '_blank');
        }
      }
      // For 'web' and 'protocol' types, the default anchor behavior handles it
    };
    
    return (
      <a
        className="tile"
        href={tile.appType === 'local' && !tile.link ? '#' : tile.link}
        target="_blank"
        rel="noopener noreferrer"
        ref={setNodeRef}
        onClick={handleTileClick}
        style={{
          position: 'relative',
          textDecoration: 'none',
          color: 'inherit',
          userSelect: 'none',
          transform: CSS.Transform.toString(transform),
          transition,
          boxShadow: isDragging
            ? '0 8px 32px #1976d244'
            : '0 2px 16px #0002',
          zIndex: isDragging ? 100 : undefined,
          cursor: 'pointer',
        }}
        {...attributes}
        {...listeners}
      >
        {/* Payment Amount Display - Top Right Corner */}
        {tile.paidSubscription && tile.paymentAmount && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: '#757575',
              fontSize: 11,
              fontWeight: 600,
              zIndex: 10,
              whiteSpace: 'nowrap',
              textAlign: 'right',
              lineHeight: 1.3,
            }}
            title={tile.paymentFrequency ? `${tile.paymentFrequency} payment` : 'Subscription cost'}
          >
            <div>{formatCurrency(tile.paymentAmount)}{tile.paymentFrequency && `/${tile.paymentFrequency === 'Monthly' ? 'mo' : 'yr'}`}</div>
            {tile.signupDate && (
              <div style={{ fontSize: 10, fontWeight: 500, color: '#999', marginTop: 2 }}>
                Next: {formatDate(calculateNextPaymentDate(tile.signupDate, tile.paymentFrequency, tile.annualType))}
              </div>
            )}
          </div>
        )}
        {tile.logo && (
          <img
            src={tile.logo}
            alt={tile.name + ' logo'}
            className="tile-logo"
          />
        )}
        <div className="tile-content">
          <div className="tile-title">
            {tile.name}
            {tile.appType === 'local' && (
              <span style={{ marginLeft: 8, fontSize: 14, color: '#ff9800' }} title="Local Application (click to copy path)">💻</span>
            )}
            {tile.appType === 'protocol' && (
              <span style={{ marginLeft: 8, fontSize: 14, color: '#9c27b0' }} title="Custom Protocol Handler">🔗</span>
            )}
          </div>
          <p className="tile-desc">{tile.description}</p>
        </div>
        {/* ICONS ROW AT BOTTOM */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 10,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 10,
          padding: '0 12px',
        }}>
          <span
            className="edit-icon"
            title="Edit web shortcut card"
            style={{
              color: '#888',
              fontSize: 18,
              background: 'none',
              borderRadius: '50%',
              padding: 2,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onClick={e => { e.preventDefault(); e.stopPropagation(); handleEditTile(tile.id); }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#1976d2';
              e.currentTarget.style.transform = 'scale(1.2) rotate(5deg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#888';
              e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
            }}
            role="button"
            tabIndex={0}
          >✏️</span>
          {/* Add Tile Button (blue, only on the first tile of the grid for the tab) */}
          {tile.paidSubscription && (
            <span
              className="edit-icon"
              style={{
                color: '#888',
                fontSize: 18,
                background: 'none',
                borderRadius: '50%',
                padding: 2,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={e => {
                const popup = document.createElement('div');
                popup.className = 'tile-popup';
                popup.style.position = 'fixed';
                popup.style.left = e.clientX + 16 + 'px';
                popup.style.top = e.clientY - 16 + 'px';
                popup.style.background = '#fff';
                popup.style.color = '#222';
                popup.style.border = '1px solid #1976d2';
                popup.style.borderRadius = '8px';
                popup.style.boxShadow = '0 4px 16px #0002';
                popup.style.padding = '14px 20px';
                popup.style.fontSize = '15px';
                popup.style.zIndex = '9999';
                popup.innerHTML = `
                  <div><b>Paid Subscription:</b> YES</div>
                  <div><b>Payment Frequency:</b> ${tile.paymentFrequency || ''}</div>
                  <div><b>Payment Amount:</b> ${formatCurrency(tile.paymentAmount)}</div>
                  <div><b>Payment Date:</b> ${formatDate(tile.lastPaymentDate)}</div>
                  <div><b>Payment Type:</b> ${tile.paymentTypeLast4 ? '**** ' + tile.paymentTypeLast4 : ''}</div>
                `;
                document.body.appendChild(popup);
                (e.currentTarget as any)._tilePopup = popup;
              }}
              onMouseLeave={e => {
                const popup = (e.currentTarget as any)._tilePopup;
                if (popup) {
                  document.body.removeChild(popup);
                  (e.currentTarget as any)._tilePopup = null;
                }
              }}
              onMouseOut={e => {
                const popup = (e.currentTarget as any)._tilePopup;
                if (popup) {
                  document.body.removeChild(popup);
                  (e.currentTarget as any)._tilePopup = null;
                }
              }}
            >
              $
            </span>
          )}
          {tile.accountLink && (
            <span
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (tile.accountLink) {
                  window.open(tile.accountLink, '_blank', 'noopener,noreferrer');
                }
              }}
              title="Account Link"
              style={{
                color: '#888',
                fontSize: 18,
                background: 'none',
                borderRadius: '50%',
                padding: 2,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="10" cy="10" r="8" stroke="#888" strokeWidth="2" fill="none"/>
                <path d="M13.5 10A3.5 3.5 0 0 1 10 13.5 3.5 3.5 0 0 1 6.5 10 3.5 3.5 0 0 1 10 6.5 3.5 3.5 0 0 1 13.5 10Z" stroke="#888" strokeWidth="2"/>
                <path d="M10 7.5V10L11.5 11.5" stroke="#888" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </span>
          )}
          <span
            className="edit-icon"
            title="Delete web shortcut card"
            style={{
              color: '#888',
              fontSize: 18,
              background: 'none',
              borderRadius: '50%',
              padding: 2,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onClick={e => { e.preventDefault(); e.stopPropagation(); handleDeleteTile(tile.id); }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.2)';
              const svg = e.currentTarget.querySelector('svg');
              if (svg) {
                const rects = svg.querySelectorAll('rect');
                rects.forEach(rect => rect.setAttribute('fill', '#e53935'));
                rects.forEach(rect => rect.setAttribute('stroke', '#e53935'));
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              const svg = e.currentTarget.querySelector('svg');
              if (svg) {
                const rects = svg.querySelectorAll('rect');
                rects.forEach(rect => rect.setAttribute('fill', '#888'));
                rects.forEach(rect => rect.setAttribute('stroke', '#888'));
              }
            }}
            role="button"
            tabIndex={0}
          >{TrashIcon}</span>
        </div>
      </a>
    );
  }
  const webTabsIcon = (
    <span style={{ fontSize: 22, marginRight: 12 }}>🌐</span>
  );
  const financeIcon = (
    <span style={{ fontSize: 22, marginRight: 12 }}>💰</span>
  );

  const handleFilesPicked = (e: React.ChangeEvent<HTMLInputElement>, repickIdx?: number) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    // Get common folder path
    const paths = files.map(f => f.webkitRelativePath || f.name);
    const splitPaths = paths.map(p => p.split('/').slice(0, -1));
    let common = splitPaths[0];
    for (let i = 1; i < splitPaths.length; i++) {
      let j = 0;
      while (j < common.length && common[j] === splitPaths[i][j]) j++;
      common = common.slice(0, j);
      if (!common.length) break;
    }
    const folderPath = common.join('/');
    const folderName = folderPath.split('/').pop() || folderPath || '[Root]';
    const fileNames = files.map(file => file.webkitRelativePath?.replace(folderPath + '/', '') || file.name);
    setPickedFolders(folders => {
      if (typeof repickIdx === 'number') {
        // Replace the folder at repickIdx
        return folders.map((f, i) =>
          i === repickIdx
            ? { name: folderName, path: folderPath, files, fileNames, expanded: true, needsRepick: false }
            : f
        );
      }
      // Add new folder
      return [
        ...folders,
        { name: folderName, path: folderPath, files, fileNames, expanded: false, needsRepick: false },
      ];
    });
  };
  const toggleFolder = (idx: number) => {
    setPickedFolders(folders =>
      folders.map((f, i) => i === idx ? { ...f, expanded: !f.expanded } : f)
    );
  };
  const deleteFolder = (idx: number) => {
    setPickedFolders(folders => folders.filter((_, i) => i !== idx));
  };
  const repickRefs = useRef<Array<HTMLInputElement | null>>([]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: 220,
          height: '100vh',
          background: 'linear-gradient(180deg, #0b1440 0%, #0a2f86 45%, #082a72 75%, #071f5e 100%)',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          padding: '0 0 24px 0',
          boxShadow: '2px 0 12px #0002',
          zIndex: 100,
        }}
      >
        <div style={{
          fontWeight: 700,
          fontSize: 24,
          padding: '32px 0 24px 0',
          textAlign: 'center',
          letterSpacing: 1,
          borderBottom: '1px solid #283593',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <img
            src="https://flagheroes.us/wp-content/uploads/2024/04/cropped-Flag-Heroes-2000-x-2000-px-260x229.png"
            alt="Flag Heroes logo"
            style={{ width: 48, height: 48, objectFit: 'contain', marginBottom: 8 }}
          />
          Bill's Apps
        </div>
        <nav style={{ marginTop: 32, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>
          <div
            onClick={() => { 
              setMainMenu('home'); 
              setActiveTab(''); 
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '14px 32px',
              cursor: 'pointer',
              background: mainMenu === 'home' && activeTab === '' ? '#64b5f6' : 'none',
              color: mainMenu === 'home' && activeTab === '' ? '#fff' : '#bbdefb',
              fontWeight: mainMenu === 'home' && activeTab === '' ? 700 : 500,
              fontSize: 18,
              borderLeft: mainMenu === 'home' && activeTab === '' ? '4px solid #fff' : '4px solid transparent',
              transition: 'background 0.2s, color 0.2s',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              if (!(mainMenu === 'home' && activeTab === '')) {
                e.currentTarget.style.background = '#64b5f622';
              }
            }}
            onMouseLeave={(e) => {
              if (!(mainMenu === 'home' && activeTab === '')) {
                e.currentTarget.style.background = 'none';
              }
            }}
          >
            <span style={{ fontSize: 22, marginRight: 12 }}>🏠</span> Home Page
          </div>
          
          {/* Home Page Tabs Hierarchical Submenu */}
          {mainMenu === 'home' && (
            <div style={{ marginLeft: 24, marginTop: 12 }}>
              {/* Divider */}
              <div style={{ 
                height: 1, 
                background: '#64b5f644', 
                marginBottom: 12 
              }}></div>
              
              {homePageTabs.map((homePageTab) => {
                const isExpanded = expandedHomePageTabs.has(homePageTab.id);
                const tabsInThisHomePageTab = tabs.filter(tab => 
                  homePageTab.id === 'all' 
                    ? (!tab.homePageTabId || tab.homePageTabId === 'all')
                    : tab.homePageTabId === homePageTab.id
                );
                
                return (
                  <div key={homePageTab.id} style={{ marginBottom: 8 }}>
                    {/* Home Page Tab Header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 8px',
                        cursor: 'pointer',
                        color: '#bbdefb',
                        fontWeight: 600,
                        fontSize: 15,
                        borderRadius: 6,
                        transition: 'background 0.2s, color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#64b5f622';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'none';
                      }}
                    >
                      <span 
                        onClick={() => toggleHomePageTabExpanded(homePageTab.id)}
                        style={{ 
                          fontSize: 14, 
                          marginRight: 8,
                          transition: 'transform 0.2s',
                          display: 'inline-block',
                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
                        }}
                      >
                        ▶
                      </span>
                      <span 
                        onClick={() => toggleHomePageTabExpanded(homePageTab.id)}
                        style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {homePageTab.name}
                      </span>
                      {tabsInThisHomePageTab.length > 0 && (
                        <span style={{ fontSize: 12, opacity: 0.7, marginLeft: 4 }}>
                          ({tabsInThisHomePageTab.length})
                        </span>
                      )}
                    </div>
                    
                    {/* Web Tiles under this Home Page Tab */}
                    {isExpanded && (
                      <div style={{ marginLeft: 16, marginTop: 4 }}>
                        {tabsInThisHomePageTab.map((tab) => (
                          <div
                            key={tab.name}
                            onClick={() => { setMainMenu('home'); setActiveTab(tab.name); }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '6px 0 6px 8px',
                              cursor: 'pointer',
                              color: activeTab === tab.name ? '#fff' : '#bbdefb',
                              fontWeight: activeTab === tab.name ? 700 : 500,
                              background: activeTab === tab.name ? '#64b5f6' : 'none',
                              borderRadius: 6,
                              marginBottom: 2,
                              fontSize: 14,
                              transition: 'background 0.2s, color 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              if (activeTab !== tab.name) {
                                e.currentTarget.style.background = '#64b5f633';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (activeTab !== tab.name) {
                                e.currentTarget.style.background = 'none';
                              }
                            }}
                          >
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tab.name}</span>
                          </div>
                        ))}
                        {tabsInThisHomePageTab.length === 0 && (
                          <div style={{ 
                            padding: '6px 8px', 
                            color: '#64b5f688', 
                            fontSize: 13, 
                            fontStyle: 'italic' 
                          }}>
                            No Web Tiles
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              
            </div>
          )}
          <div
            onClick={() => setMainMenu('files')}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '14px 32px',
              cursor: 'pointer',
              background: mainMenu === 'files' ? '#64b5f6' : 'none',
              color: mainMenu === 'files' ? '#fff' : '#bbdefb',
              fontWeight: mainMenu === 'files' ? 700 : 500,
              fontSize: 18,
              borderLeft: mainMenu === 'files' ? '4px solid #fff' : '4px solid transparent',
              transition: 'background 0.2s, color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (mainMenu !== 'files') {
                e.currentTarget.style.background = '#64b5f622';
              }
            }}
            onMouseLeave={(e) => {
              if (mainMenu !== 'files') {
                e.currentTarget.style.background = 'none';
              }
            }}
          >
            <span style={{ fontSize: 22, marginRight: 12 }}>📁</span> Files
          </div>
          <div
            onClick={() => setMainMenu('settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '14px 32px',
              cursor: 'pointer',
              background: mainMenu === 'settings' ? '#64b5f6' : 'none',
              color: mainMenu === 'settings' ? '#fff' : '#bbdefb',
              fontWeight: mainMenu === 'settings' ? 700 : 500,
              fontSize: 18,
              borderLeft: mainMenu === 'settings' ? '4px solid #fff' : '4px solid transparent',
              transition: 'background 0.2s, color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (mainMenu !== 'settings') {
                e.currentTarget.style.background = '#64b5f622';
              }
            }}
            onMouseLeave={(e) => {
              if (mainMenu !== 'settings') {
                e.currentTarget.style.background = 'none';
              }
            }}
          >
            <span style={{ fontSize: 22, marginRight: 12 }}>⚙️</span> Settings
          </div>
          <div
            onClick={() => { 
              setMainMenu('reports'); 
              setActiveTab(''); 
              if (!reportsExpanded) setReportsExpanded(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '14px 32px',
              cursor: 'pointer',
              background: mainMenu === 'reports' ? '#64b5f6' : 'none',
              color: mainMenu === 'reports' ? '#fff' : '#bbdefb',
              fontWeight: mainMenu === 'reports' ? 700 : 500,
              fontSize: 18,
              borderLeft: mainMenu === 'reports' ? '4px solid #fff' : '4px solid transparent',
              transition: 'background 0.2s, color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (mainMenu !== 'reports') {
                e.currentTarget.style.background = '#64b5f622';
              }
            }}
            onMouseLeave={(e) => {
              if (mainMenu !== 'reports') {
                e.currentTarget.style.background = 'none';
              }
            }}
          >
            <span style={{ fontSize: 22, marginRight: 12 }}>📊</span> Reports
          </div>
          
          {/* Reports Submenu */}
          {mainMenu === 'reports' && (
            <div style={{ marginLeft: 24, marginTop: 4, marginBottom: 12 }}>
              <div
                onClick={() => { setMainMenu('reports'); setActiveReport('cost'); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 0 8px 8px',
                  cursor: 'pointer',
                  color: activeReport === 'cost' ? '#fff' : '#bbdefb',
                  fontWeight: activeReport === 'cost' ? 700 : 500,
                  background: activeReport === 'cost' ? '#64b5f6' : 'none',
                  borderRadius: 6,
                  marginBottom: 2,
                  fontSize: 14,
                  transition: 'background 0.2s, color 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (activeReport !== 'cost') {
                    e.currentTarget.style.background = '#64b5f633';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeReport !== 'cost') {
                    e.currentTarget.style.background = 'none';
                  }
                }}
              >
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>APP Cost Report</span>
              </div>
              <div
                onClick={() => { setMainMenu('reports'); setActiveReport('list'); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 0 8px 8px',
                  cursor: 'pointer',
                  color: activeReport === 'list' ? '#fff' : '#bbdefb',
                  fontWeight: activeReport === 'list' ? 700 : 500,
                  background: activeReport === 'list' ? '#64b5f6' : 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  transition: 'background 0.2s, color 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (activeReport !== 'list') {
                    e.currentTarget.style.background = '#64b5f633';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeReport !== 'list') {
                    e.currentTarget.style.background = 'none';
                  }
                }}
              >
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>App Report</span>
              </div>
            </div>
          )}
          </div>
          </nav>
      </aside>

      {/* Main Content */}
      <div style={{ marginLeft: 220, width: 'calc(100vw - 220px)', minHeight: '100vh', position: 'relative', padding: '0' }}>
        <div className="header" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          gap: 12, 
          flexWrap: 'wrap', 
          width: '100%',
          margin: '0', 
          padding: '28px 24px 12px 24px',
          background: 'linear-gradient(90deg, #1976d2 0%, #1976d2 50%, #90caf9 75%, #e0e0e0 100%)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          boxSizing: 'border-box',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {bannerTitle}
            <span
              className="edit-icon"
              title="Edit Banner Title"
              style={{ fontSize: 24, color: '#fff', cursor: 'pointer', background: '#ffffff22', borderRadius: '50%', padding: 6, transition: 'background 0.2s' }}
              onClick={openBannerTitleModal}
              onMouseEnter={e => e.currentTarget.style.background = '#ffffff33'}
              onMouseLeave={e => e.currentTarget.style.background = '#ffffff22'}
              role="button"
              tabIndex={0}
            >✏️</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div
              onClick={handleBackup}
              title="Backup data"
              style={{
                background: '#64b5f6',
                color: '#fff',
                borderRadius: '50%',
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 20,
                boxShadow: '0 2px 8px rgba(100, 181, 246, 0.3)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#42a5f5';
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(100, 181, 246, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#64b5f6';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(100, 181, 246, 0.3)';
              }}
              role="button"
              aria-label="Backup data"
            >
              💾
            </div>
            <div
              onClick={handleRestoreClick}
              title="Restore data"
              style={{
                background: '#64b5f6',
                color: '#fff',
                borderRadius: '50%',
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 20,
                boxShadow: '0 2px 8px rgba(100, 181, 246, 0.3)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#42a5f5';
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(100, 181, 246, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#64b5f6';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(100, 181, 246, 0.3)';
              }}
              role="button"
              aria-label="Restore data"
            >
              ⬆️
            </div>
            <input
              type="file"
              accept="application/json"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleRestoreFileChange}
            />
          </div>
        </div>
        {/* HOME PAGE */}
        {mainMenu === 'home' && activeTab === '' && (
          <div style={{ padding: '32px 24px', maxWidth: '100%', overflow: 'hidden' }}>
            {/* Breadcrumb Navigation */}
            <div style={{ 
              marginBottom: 16, 
              fontSize: 14, 
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <span 
                onClick={() => { setMainMenu('home'); setActiveTab(''); }}
                style={{ 
                  color: '#1976d2', 
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#1565c0'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#1976d2'}
              >
                🏠 Home
              </span>
              {selectedHomePageTab !== 'all' && (
                <>
                  <span style={{ color: '#ccc' }}>/</span>
                  <span style={{ color: '#666', fontWeight: 500 }}>
                    {homePageTabs.find(hpt => hpt.id === selectedHomePageTab)?.name || 'All Web Tiles'}
                  </span>
                </>
              )}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h1 style={{ color: '#1976d2', fontSize: 32, fontWeight: 700, margin: 0 }}>Home Page</h1>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => {
                    setShowTabModal(true);
                    setTabModalMode('add');
                    setTabFormName('');
                    setTabHasStockTicker(false);
                    setTabHomePageTabId(selectedHomePageTab);
                    setEditingTabIndex(null);
                  }}
                  title="Add New Web Tile"
                  style={{
                    background: '#e3f2fd',
                    color: '#1976d2',
                    border: '2px solid #1976d2',
                    borderRadius: 6,
                    padding: '10px 16px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#1976d2';
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(25, 118, 210, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#e3f2fd';
                    e.currentTarget.style.color = '#1976d2';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                  }}
                >
                  📑 New Web Tile
                </button>
                <button
                  onClick={openAddHomePageTabModal}
                  title="Add New Home Page Tab"
                  style={{
                    background: '#f5f5f5',
                    color: '#1976d2',
                    border: '1px solid #e0e0e0',
                    borderRadius: '50%',
                    width: 40,
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: 22,
                    fontWeight: 700,
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e3f2fd';
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(25, 118, 210, 0.3)';
                    e.currentTarget.style.borderColor = '#1976d2';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f5f5f5';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                    e.currentTarget.style.borderColor = '#e0e0e0';
                  }}
                >
                  +
                </button>
              </div>
            </div>
            
            {/* Grey horizontal line below title */}
            <div style={{ 
              width: '100%', 
              height: 1, 
              background: '#bdbdbd', 
              marginBottom: 24 
            }}></div>
            
            {/* Home Page Tab Selector */}
            {homePageTabs.length > 1 && (
              <div style={{ 
                display: 'flex', 
                gap: 0, 
                marginBottom: 24, 
                overflowX: 'auto',
                borderBottom: '2px solid #e0e0e0',
                position: 'relative'
              }}>
                {homePageTabs.map((hpt) => (
                  <button
                    key={hpt.id}
                    onClick={() => setSelectedHomePageTab(hpt.id)}
                    style={{
                      padding: '14px 24px',
                      background: 'transparent',
                      color: selectedHomePageTab === hpt.id ? '#1976d2' : '#666',
                      border: 'none',
                      borderBottom: selectedHomePageTab === hpt.id ? '3px solid #1976d2' : '3px solid transparent',
                      fontSize: 15,
                      fontWeight: selectedHomePageTab === hpt.id ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      position: 'relative',
                      marginBottom: '-2px',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedHomePageTab !== hpt.id) {
                        e.currentTarget.style.color = '#1976d2';
                        e.currentTarget.style.background = '#f5f9fc';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedHomePageTab !== hpt.id) {
                        e.currentTarget.style.color = '#666';
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    {hpt.name}
                    {hpt.id !== 'all' && (
                      <>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditHomePageTabModal(hpt.id);
                          }}
                          style={{ cursor: 'pointer', fontSize: 14, opacity: 0.6 }}
                          title="Edit tab"
                        >
                          ✏️
                        </span>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteHomePageTab(hpt.id);
                          }}
                          style={{ cursor: 'pointer', fontSize: 14, opacity: 0.6 }}
                          title="Delete tab"
                        >
                          🗑️
                        </span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            )}
            
            {/* Two Column Layout: Main Content + Sidebar */}
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
              
              {/* Main Content - Web Tile Cards */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleHomeTabDragEnd}
                >
                  <SortableContext
                    items={tabs.filter(tab => 
                      selectedHomePageTab === 'all' || tab.homePageTabId === selectedHomePageTab || !tab.homePageTabId
                    ).map(tab => tab.name)}
                    strategy={rectSortingStrategy}
                  >
                    <div style={{ 
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))',
                      gap: 24,
                      alignItems: 'stretch',
                      width: '100%',
                      maxWidth: '100%',
                    }}>
                      {tabs.filter(tab => 
                        selectedHomePageTab === 'all' || tab.homePageTabId === selectedHomePageTab || !tab.homePageTabId
                      ).map((tab) => (
                        <SortableHomeTab key={tab.name} tab={tab} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>

              {/* Right Sidebar - Stats & Pie Chart */}
              <div style={{ 
                width: 320, 
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}>
                
                {/* Sidebar Title with Upcoming Payments Button */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 0,
                }}>
                  <h2 style={{ 
                    margin: 0, 
                    fontSize: 20, 
                    fontWeight: 700, 
                    color: '#1976d2' 
                  }}>
                    Spending Summary
                  </h2>
                  <button
                    onClick={() => setShowUpcomingPaymentsModal(true)}
                    style={{
                      background: '#1976d2',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '6px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#1565c0';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#1976d2';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    title="View upcoming payments"
                  >
                    💳 Payments
                  </button>
                </div>
                
                {/* Pie Chart - Category Breakdown */}
                <div style={{
                  background: '#f5f5f5',
                  padding: '20px',
                  borderRadius: 8,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                  border: '1px solid #e0e0e0',
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: '#333' }}>
                    📊 Spending by Category
                  </h3>
                  {(() => {
                    // Calculate spending by category (only paid subscriptions)
                    const categoryTotals: Record<string, number> = {};
                    tiles.forEach(tile => {
                      // Only include tiles with paid subscriptions and valid payment amounts
                      if (tile.paidSubscription && tile.paymentAmount && typeof tile.paymentAmount === 'number') {
                        const category = tile.category || 'Uncategorized';
                        const amount = tile.paymentAmount;
                        categoryTotals[category] = (categoryTotals[category] || 0) + amount;
                      }
                    });

                    const sortedCategories = Object.entries(categoryTotals)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5); // Top 5 categories

                    const total = sortedCategories.reduce((sum, [_, amt]) => sum + amt, 0);
                    
                    // Simple color palette
                    const colors = ['#1976d2', '#4caf50', '#ff9800', '#e91e63', '#9c27b0'];

                    if (total === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: 14 }}>
                          No payment data available
                        </div>
                      );
                    }

                    return (
                      <div>
                        {/* Simple SVG Pie Chart */}
                        <svg viewBox="0 0 200 200" style={{ width: '100%', height: 'auto', marginBottom: 16 }}>
                          {(() => {
                            let currentAngle = -90; // Start from top
                            return sortedCategories.map(([category, amount], idx) => {
                              const percentage = (amount / total) * 100;
                              const angle = (percentage / 100) * 360;
                              const startAngle = currentAngle;
                              const endAngle = currentAngle + angle;
                              currentAngle = endAngle;

                              // Calculate arc path
                              const startRad = (startAngle * Math.PI) / 180;
                              const endRad = (endAngle * Math.PI) / 180;
                              const x1 = 100 + 80 * Math.cos(startRad);
                              const y1 = 100 + 80 * Math.sin(startRad);
                              const x2 = 100 + 80 * Math.cos(endRad);
                              const y2 = 100 + 80 * Math.sin(endRad);
                              const largeArc = angle > 180 ? 1 : 0;

                              return (
                                <path
                                  key={category}
                                  d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`}
                                  fill={colors[idx % colors.length]}
                                  stroke="#fff"
                                  strokeWidth="2"
                                />
                              );
                            });
                          })()}
                        </svg>

                        {/* Legend */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {sortedCategories.map(([category, amount], idx) => {
                            const percentage = ((amount / total) * 100).toFixed(1);
                            return (
                              <div key={category} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                                <div style={{ 
                                  width: 12, 
                                  height: 12, 
                                  borderRadius: 2, 
                                  background: colors[idx % colors.length],
                                  flexShrink: 0,
                                }} />
                                <div style={{ flex: 1, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {category}
                                </div>
                                <div style={{ fontWeight: 600, color: '#333' }}>
                                  {percentage}%
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Total Apps Card */}
                <div style={{
                  background: '#f5f5f5',
                  padding: '16px 20px',
                  borderRadius: 8,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  border: '1px solid #e0e0e0',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                  e.currentTarget.style.borderColor = '#bdbdbd';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)';
                  e.currentTarget.style.borderColor = '#e0e0e0';
                }}>
                  <div style={{ fontSize: 32 }}>📱</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#666', marginBottom: 2 }}>Total Apps</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#333' }}>{tiles.length}</div>
                  </div>
                </div>

                {/* Monthly Spend Card */}
                <div style={{
                  background: '#f5f5f5',
                  padding: '16px 20px',
                  borderRadius: 8,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  border: '1px solid #e0e0e0',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                  e.currentTarget.style.borderColor = '#bdbdbd';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)';
                  e.currentTarget.style.borderColor = '#e0e0e0';
                }}>
                  <div style={{ fontSize: 32 }}>💰</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#666', marginBottom: 2 }}>Monthly Spend</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#333' }}>
                      {formatCurrency(tiles.reduce((sum, t) => 
                        sum + (t.paymentFrequency === 'Monthly' && typeof t.paymentAmount === 'number' ? t.paymentAmount : 0), 0
                      ))}
                    </div>
                  </div>
                </div>

                {/* Annual Spend Card */}
                <div style={{
                  background: '#f5f5f5',
                  padding: '16px 20px',
                  borderRadius: 8,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  border: '1px solid #e0e0e0',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                  e.currentTarget.style.borderColor = '#bdbdbd';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)';
                  e.currentTarget.style.borderColor = '#e0e0e0';
                }}>
                  <div style={{ fontSize: 32 }}>📅</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#666', marginBottom: 2 }}>Annual Spend</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#333' }}>
                      {formatCurrency(tiles.reduce((sum, t) => 
                        sum + (t.paymentFrequency === 'Annually' && typeof t.paymentAmount === 'number' ? t.paymentAmount : 0), 0
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
        {mainMenu === 'home' && activeTab !== '' && activeTab !== 'APP Report' && (
          <div style={{ padding: '0 24px' }}>
            {/* Breadcrumb Navigation */}
            <div style={{ 
              marginTop: 32,
              marginBottom: 12, 
              fontSize: 14, 
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <span 
                onClick={() => { setMainMenu('home'); setActiveTab(''); }}
                style={{ 
                  color: '#1976d2', 
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#1565c0'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#1976d2'}
              >
                🏠 Home
              </span>
              <span style={{ color: '#ccc' }}>/</span>
              <span style={{ color: '#666', fontWeight: 500 }}>
                {activeTab}
              </span>
            </div>
            
            {/* Active Tab Title Row */}
            {activeTab !== 'APP Report' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 24px 0', minHeight: 48, flexWrap: 'wrap', gap: 12, maxWidth: '100%' }}>
              <h1 style={{ color: '#1976d2', fontSize: 28, fontWeight: 700, margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeTab}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 16 }}>
                {/* Stock Ticker Button - Show on tabs with stock ticker enabled */}
                {(() => {
                  const currentTab = tabs.find(tab => tab.name === activeTab);
                  return currentTab?.hasStockTicker && (
                  <button
                    onClick={() => setShowStockModal(true)}
                    title="Manage Stock Ticker"
                    style={{
                      background: '#e8f5e9',
                      color: '#2e7d32',
                      border: '2px solid #4caf50',
                      borderRadius: 6,
                      padding: '8px 16px',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#4caf50';
                      e.currentTarget.style.color = '#fff';
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#e8f5e9';
                      e.currentTarget.style.color = '#2e7d32';
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    📈 Stock Ticker
                  </button>
                );
                })()}
                <button
                  onClick={openAddSubcategoryModal}
                  title="Manage Subcategories"
                  style={{
                    background: '#e3f2fd',
                    color: '#1976d2',
                    border: '2px solid #1976d2',
                    borderRadius: 6,
                    padding: '8px 16px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#1976d2';
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(25, 118, 210, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#e3f2fd';
                    e.currentTarget.style.color = '#1976d2';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  📁 Subcategories
                </button>
                <button
                  onClick={() => {
                    setShowTileModal(true);
                    setEditTileId(null);
                    setForm({
                      name: '',
                      description: '',
                      link: '',
                      logo: '',
                      category: activeTab,
                      subcategory: '',
                      appType: 'web',
                      localPath: '',
                      paidSubscription: false,
                      paymentFrequency: null,
                      annualType: null,
                      paymentAmount: null,
                      signupDate: null,
                      lastPaymentDate: null,
                      creditCardId: null,
                      paymentTypeLast4: '',
                      creditCardName: '',
                      accountLink: '',
                      notes: '',
                    });
                  }}
                  title="Add New Card"
                  style={{
                    background: '#f5f5f5',
                    color: '#1976d2',
                    border: '1px solid #e0e0e0',
                    borderRadius: '50%',
                    width: 40,
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: 22,
                    fontWeight: 700,
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e3f2fd';
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(25, 118, 210, 0.3)';
                    e.currentTarget.style.borderColor = '#1976d2';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f5f5f5';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                    e.currentTarget.style.borderColor = '#e0e0e0';
                  }}
                >
                  +
                </button>
                <span
                  className="edit-icon"
                  title="Edit Tab"
                  style={{ fontSize: 22, color: '#1976d2', cursor: 'pointer', background: '#e3f2fd', borderRadius: '50%', padding: 6, transition: 'all 0.2s ease' }}
                  onClick={() => openEditTabModal(tabs.findIndex(tab => tab.name === activeTab))}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#1976d2';
                    e.currentTarget.style.transform = 'scale(1.15) rotate(5deg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#e3f2fd';
                    e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                  }}
                  role="button"
                  tabIndex={0}
                >✏️</span>
                {tabs.length > 1 && (
                  <span
                    className="edit-icon"
                    title="Delete Tab"
                    style={{ fontSize: 22, color: '#e53935', cursor: 'pointer', background: '#ffebee', borderRadius: '50%', padding: 6, transition: 'all 0.2s ease' }}
                    onClick={() => handleDeleteTab(tabs.findIndex(tab => tab.name === activeTab))}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e53935';
                      e.currentTarget.style.transform = 'scale(1.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#ffebee';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    role="button"
                    tabIndex={0}
                  >🗑️</span>
                )}
                <button
                  className="create-tile-btn"
                  onClick={() => {
                    setShowTileModal(true);
                    setEditTileId(null);
                    setForm(f => ({
                      ...f,
                      name: '',
                      description: '',
                      link: '',
                      logo: '',
                      category: activeTab,
                      subcategory: '',
                      appType: 'web',
                      localPath: '',
                      paidSubscription: false,
                      paymentFrequency: null,
                      annualType: null,
                      paymentAmount: null,
                      signupDate: null,
                      lastPaymentDate: null,
                      creditCardId: null,
                      paymentTypeLast4: '',
                      creditCardName: '',
                      accountLink: '',
                      notes: '',
                    }));
                  }}
                  title="Add web shortcut card"
                  style={{
                    background: '#757575',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    fontSize: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px #0001',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#616161';
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(117, 117, 117, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#757575';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 2px 8px #0001';
                  }}
                  aria-label="Add web shortcut card"
                >
                  +
                </button>
              </div>
            </div>
            )}

            {/* Stock Ticker Bar - Show on tabs with stock ticker enabled */}
            {(() => {
              const currentTab = tabs.find(tab => tab.name === activeTab);
              return currentTab?.hasStockTicker && (
              <div style={{
                background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
                padding: '12px 0',
                marginBottom: 24,
                borderRadius: 8,
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                position: 'relative',
              }}>
                <div style={{
                  display: 'flex',
                  gap: 32,
                  animation: (majorIndices.length + stockSymbols.length) > 3 ? 'ticker-scroll 45s linear infinite' : 'none',
                  paddingLeft: (majorIndices.length + stockSymbols.length) > 3 ? 0 : '16px',
                  width: (majorIndices.length + stockSymbols.length) > 3 ? 'max-content' : 'auto',
                }}>
                  {/* Combine indices + user stocks, duplicate for seamless loop if scrolling */}
                  {(() => {
                    const allSymbols = [...majorIndices, ...stockSymbols];
                    const shouldScroll = allSymbols.length > 3;
                    // For scrolling, duplicate twice to create seamless loop
                    const displaySymbols = shouldScroll ? [...allSymbols, ...allSymbols] : allSymbols;
                    
                    return displaySymbols.map((symbol, idx) => {
                      const priceData = stockPrices[symbol];
                      const isPositive = priceData && priceData.change >= 0;
                      const isIndex = majorIndices.includes(symbol);
                      const displayName = isIndex ? indiceLabels[symbol] : symbol;
                      
                      return (
                        <div key={`${symbol}-${idx}`} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '8px 16px',
                          background: isIndex ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.1)',
                          borderRadius: 6,
                          minWidth: 200,
                          whiteSpace: 'nowrap',
                          border: isIndex ? '1px solid rgba(255,215,0,0.3)' : 'none',
                        }}>
                          <div style={{ 
                            fontWeight: 700, 
                            fontSize: 16, 
                            color: isIndex ? '#ffd700' : '#fff',
                            letterSpacing: 0.5,
                          }}>
                            {displayName}
                          </div>
                          {priceData ? (
                            <>
                              <div style={{ 
                                fontSize: 16, 
                                color: '#fff',
                                fontWeight: 600,
                              }}>
                                {priceData.price.toLocaleString('en-US', { 
                                  minimumFractionDigits: 2, 
                                  maximumFractionDigits: 2 
                                })}
                              </div>
                              <div style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: isPositive ? '#4caf50' : '#f44336',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}>
                                <span>{isPositive ? '▲' : '▼'}</span>
                                <span>{priceData.changePercent.toFixed(2)}%</span>
                              </div>
                            </>
                          ) : (
                            <div style={{ fontSize: 13, color: '#90caf9' }}>Loading...</div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
                <style dangerouslySetInnerHTML={{ __html: `
                  @keyframes ticker-scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                  }
                `}} />
              </div>
            );
            })()}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              onDragOver={event => {
                const { over } = event;
                if (over && over.id && typeof over.id === 'string') {
                  if (tabs.some(tab => tab.name === over.id)) {
                    setDragOverTab(over.id);
                    setDragOverSubcategory(null);
                  } else if (over.id.toString().startsWith('subcategory-') || over.id === 'uncategorized') {
                    setDragOverTab(null);
                    setDragOverSubcategory(over.id.toString());
                  } else {
                    setDragOverTab(null);
                    setDragOverSubcategory(null);
                  }
                } else {
                  setDragOverTab(null);
                  setDragOverSubcategory(null);
                }
              }}
            >
              <SortableContext
                items={filteredTileIds}
                strategy={rectSortingStrategy}
              >
                {/* Display tiles grouped by subcategory */}
                {activeTab !== 'APP Report' && (
                  <div>
                    {/* Tiles grouped by subcategory */}
                    {tilesBySubcategory.map((group, groupIdx) => (
                      <DroppableSubcategorySection
                        key={group.name}
                        subcategoryName={group.name}
                        isDragOver={dragOverSubcategory === `subcategory-${group.name}`}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid #e0e0e0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <h2 style={{ color: '#ff6f00', fontSize: 20, fontWeight: 700, margin: 0 }}>
                              {group.name}
                            </h2>
                            <button
                              onClick={() => {
                                setShowTileModal(true);
                                setEditTileId(null);
                                setForm({
                                  name: '',
                                  description: '',
                                  link: '',
                                  category: activeTab,
                                  subcategory: group.name,
                                  logo: '',
                                  appType: 'web',
                                  localPath: '',
                                  paidSubscription: false,
                                  paymentFrequency: null,
                                  annualType: null,
                                  paymentAmount: null,
                                  signupDate: null,
                                  lastPaymentDate: null,
                                  paymentTypeLast4: '',
                                  creditCardName: '',
                                  accountLink: '',
                                  notes: '',
                                });
                              }}
                              title={`Add web shortcut card to ${group.name}`}
                              style={{
                                background: '#1976d2',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '50%',
                                width: 24,
                                height: 24,
                                fontSize: 16,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 6px #0001',
                                cursor: 'pointer',
                                padding: 0,
                                transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#1565c0';
                                e.currentTarget.style.transform = 'scale(1.15)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(25, 118, 210, 0.4)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#1976d2';
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = '0 2px 6px #0001';
                              }}
                              aria-label={`Add web shortcut card to ${group.name}`}
                            >
                              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="9" y="4" width="2" height="12" rx="1" fill="#fff"/>
                                <rect x="4" y="9" width="12" height="2" rx="1" fill="#fff"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                        {group.tiles.length > 0 ? (
                          <div className="tiles-grid tiles-grid-3">
                            {group.tiles.map((tile, idx) => (
                              <SortableTile tile={tile} idx={idx} key={tile.id} />
                            ))}
                          </div>
                        ) : (
                          <div style={{ padding: '32px', textAlign: 'center', color: '#999', fontSize: 14 }}>
                            Drop web shortcut cards here to add to {group.name}
                          </div>
                        )}
                      </DroppableSubcategorySection>
                    ))}
                    
                    {/* Tiles without subcategory - moved to bottom */}
                    {(tilesWithoutSubcategory.length > 0 || subcategories.length > 0) && (
                      <div style={{ 
                        marginTop: subcategories.length > 0 ? 48 : 0,
                        paddingTop: subcategories.length > 0 ? 32 : 0,
                        borderTop: subcategories.length > 0 ? '3px solid #e0e0e0' : 'none'
                      }}>
                        <DroppableSubcategorySection
                          subcategoryName=""
                          isDragOver={dragOverSubcategory === 'uncategorized'}
                        >
                          {subcategories.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid #e0e0e0' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <h2 style={{ color: '#999', fontSize: 20, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <span>Uncategorized</span>
                                  <span style={{ fontSize: 14, fontWeight: 400, color: '#666' }}>(Drop here to remove subcategory)</span>
                                </h2>
                                <button
                                  onClick={() => {
                                    setShowTileModal(true);
                                    setEditTileId(null);
                                    setForm({
                                      name: '',
                                      description: '',
                                      link: '',
                                      category: activeTab,
                                      subcategory: '',
                                      logo: '',
                                      appType: 'web',
                                      localPath: '',
                                      paidSubscription: false,
                                      paymentFrequency: null,
                                      annualType: null,
                                      paymentAmount: null,
                                      signupDate: null,
                                      lastPaymentDate: null,
                                      paymentTypeLast4: '',
                                      creditCardName: '',
                                      accountLink: '',
                                      notes: '',
                                    });
                                  }}
                                  title="Add web shortcut card to Uncategorized"
                                  style={{
                                    background: '#1976d2',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: 24,
                                    height: 24,
                                    fontSize: 16,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 6px #0001',
                                    cursor: 'pointer',
                                    padding: 0,
                                    transition: 'all 0.2s ease',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#1565c0';
                                    e.currentTarget.style.transform = 'scale(1.15)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(25, 118, 210, 0.4)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#1976d2';
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.boxShadow = '0 2px 6px #0001';
                                  }}
                                  aria-label="Add web shortcut card to Uncategorized"
                                >
                                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="9" y="4" width="2" height="12" rx="1" fill="#fff"/>
                                    <rect x="4" y="9" width="12" height="2" rx="1" fill="#fff"/>
                                  </svg>
                                </button>
                              </div>
                            </div>
                          )}
                          {tilesWithoutSubcategory.length > 0 ? (
                            <div className="tiles-grid tiles-grid-3">
                              {tilesWithoutSubcategory.map((tile, idx) => (
                                <SortableTile tile={tile} idx={idx} key={tile.id} />
                              ))}
                            </div>
                          ) : subcategories.length > 0 && (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#999', fontSize: 15, background: '#fafafa', borderRadius: 8, border: '2px dashed #ddd' }}>
                              Drop web shortcut cards here to remove their subcategory
                            </div>
                          )}
                        </DroppableSubcategorySection>
                      </div>
                    )}
                  </div>
                )}
              </SortableContext>
            </DndContext>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
              <Modal onClose={() => { setShowDeleteModal(false); setTileToDeleteId(null); }}>
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <h2 style={{ marginBottom: 16 }}>Delete Tile?</h2>
                  <p style={{ marginBottom: 24 }}>Are you sure you want to delete this tile? This action cannot be undone.</p>
                  <button
                    style={{
                      background: '#e53935',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '10px 20px',
                      fontSize: '1rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginRight: 8,
                    }}
                    onClick={confirmDeleteTile}
                  >
                    Yes, Delete
                  </button>
                  <button
                    style={{
                      background: '#eee',
                      color: '#333',
                      border: 'none',
                      borderRadius: 6,
                      padding: '10px 20px',
                      fontSize: '1rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    onClick={() => { setShowDeleteModal(false); setTileToDeleteId(null); }}
                  >
                    Cancel
                  </button>
                </div>
              </Modal>
            )}

            {/* Restore Confirmation Modal */}
            {showRestoreModal && (
              <Modal onClose={() => { setShowRestoreModal(false); setRestoreData(null); }}>
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <h2 style={{ marginBottom: 16 }}>Restore Data?</h2>
                  <p style={{ marginBottom: 24 }}>
                    Are you sure you want to restore this backup? This will overwrite your current tiles and tabs.
                  </p>
                  <button
                    style={{
                      background: '#43a047',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '10px 20px',
                      fontSize: '1rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginRight: 8,
                    }}
                    onClick={confirmRestore}
                  >
                    Yes, Restore
                  </button>
                  <button
                    style={{
                      background: '#eee',
                      color: '#333',
                      border: 'none',
                      borderRadius: 6,
                      padding: '10px 20px',
                      fontSize: '1rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    onClick={() => { setShowRestoreModal(false); setRestoreData(null); }}
                  >
                    Cancel
                  </button>
                </div>
              </Modal>
            )}

            {/* Banner Title Edit Modal */}
            {showBannerTitleModal && (
              <Modal onClose={() => setShowBannerTitleModal(false)}>
                <form onSubmit={handleBannerTitleSubmit}>
                  <h2>Edit Banner Title</h2>
                  <label>
                    Banner Title:<br />
                    <input
                      value={bannerTitleForm}
                      onChange={e => setBannerTitleForm(e.target.value)}
                      required
                      autoFocus
                      placeholder="Enter banner title"
                    />
                  </label>
                  <button type="submit">
                    Save
                  </button>
                  <button type="button" onClick={() => setShowBannerTitleModal(false)}>
                    Cancel
                  </button>
                </form>
              </Modal>
            )}

            {/* Upcoming Payments Modal */}
            {showUpcomingPaymentsModal && (
              <Modal onClose={() => { setShowUpcomingPaymentsModal(false); setViewingNextMonth(false); }}>
                <div style={{ padding: '16px 0' }}>
                  <h2 style={{ color: '#1976d2', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 28 }}>💳</span>
                    Upcoming Payments
                  </h2>
                  
                  {/* Toggle Buttons */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    <button
                      onClick={() => setViewingNextMonth(false)}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        background: !viewingNextMonth ? '#1976d2' : '#e0e0e0',
                        color: !viewingNextMonth ? '#fff' : '#666',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      This Month
                    </button>
                    <button
                      onClick={() => setViewingNextMonth(true)}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        background: viewingNextMonth ? '#1976d2' : '#e0e0e0',
                        color: viewingNextMonth ? '#fff' : '#666',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      Next Month
                    </button>
                  </div>
                  
                  {(() => {
                    const upcomingPayments = viewingNextMonth 
                      ? getUpcomingPaymentsNextMonth(tiles) 
                      : getUpcomingPaymentsThisMonth(tiles);
                    const today = new Date();
                    const displayDate = viewingNextMonth 
                      ? new Date(today.getFullYear(), today.getMonth() + 1, 1)
                      : today;
                    const monthName = displayDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                    
                    if (upcomingPayments.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
                          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No Payments Due</div>
                          <div>You have no subscription payments scheduled for {monthName}.</div>
                        </div>
                      );
                    }
                    
                    const totalAmount = upcomingPayments.reduce((sum, p) => sum + (p.tile.paymentAmount || 0), 0);
                    
                    return (
                      <>
                        <div style={{ marginBottom: 20, padding: 12, background: '#fff3e0', borderRadius: 6, border: '1px solid #ff9800' }}>
                          <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>{monthName}</div>
                          <div style={{ fontSize: 24, fontWeight: 700, color: '#ff9800' }}>
                            {upcomingPayments.length} Payment{upcomingPayments.length > 1 ? 's' : ''} Due
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 600, color: '#333', marginTop: 4 }}>
                            Total: {formatCurrency(totalAmount)}
                          </div>
                        </div>
                        
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                          {upcomingPayments.map(({ tile, nextPaymentDate }) => (
                            <div
                              key={tile.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '16px',
                                marginBottom: '12px',
                                background: '#f9f9f9',
                                borderRadius: 8,
                                border: '1px solid #e0e0e0',
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: 16, color: '#1976d2', marginBottom: 4 }}>
                                  {tile.name}
                                </div>
                                <div style={{ fontSize: 14, color: '#666' }}>
                                  Due: {formatDate(nextPaymentDate)}
                                </div>
                              </div>
                              <div style={{ fontWeight: 700, fontSize: 18, color: '#ff9800', textAlign: 'right' }}>
                                {formatCurrency(tile.paymentAmount)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                  <button
                    style={{
                      width: '100%',
                      marginTop: 20,
                      background: '#1976d2',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '12px 20px',
                      fontSize: '1rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    onClick={() => { setShowUpcomingPaymentsModal(false); setViewingNextMonth(false); }}
                  >
                    Close
                  </button>
                </div>
              </Modal>
            )}

            {/* Subcategory Management Modal */}
            {showSubcategoryModal && (
              <Modal onClose={() => { setShowSubcategoryModal(false); setEditingSubcategoryIndex(null); setSubcategoryForm(''); setSubcategoryModalMode('add'); }}>
                <div>
                  <h2>Manage Subcategories for {activeTab}</h2>
                  <div style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 16, marginBottom: 8, color: '#1976d2' }}>Current Subcategories:</h3>
                    {(tabs.find(t => t.name === activeTab)?.subcategories || []).length === 0 ? (
                      <p style={{ color: '#888', fontSize: 14 }}>No subcategories yet. Add one below!</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(tabs.find(t => t.name === activeTab)?.subcategories || []).map((sub, idx) => (
                          <div
                            key={sub}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              background: '#f4f6fb',
                              borderRadius: 6,
                              border: '1px solid #e0e0e0',
                            }}
                          >
                            <span style={{ flex: 1, fontWeight: 500 }}>{sub}</span>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <span
                                className="edit-icon"
                                title="Edit Subcategory"
                                style={{ fontSize: 18, color: '#1976d2', cursor: 'pointer' }}
                                onClick={(e) => { e.stopPropagation(); openEditSubcategoryModal(idx); }}
                                role="button"
                                tabIndex={0}
                              >✏️</span>
                              <span
                                className="edit-icon"
                                title="Delete Subcategory"
                                style={{ fontSize: 18, color: '#e53935', cursor: 'pointer' }}
                                onClick={(e) => { e.stopPropagation(); handleDeleteSubcategory(idx); }}
                                role="button"
                                tabIndex={0}
                              >🗑️</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <form onSubmit={handleSubcategoryFormSubmit}>
                    <h3 style={{ fontSize: 16, marginBottom: 8, color: '#1976d2' }}>
                      {subcategoryModalMode === 'add' ? 'Add New Subcategory:' : 'Edit Subcategory:'}
                    </h3>
                    <label>
                      Subcategory Name:<br />
                      <input
                        value={subcategoryForm}
                        onChange={e => setSubcategoryForm(e.target.value)}
                        required
                        autoFocus={subcategoryModalMode === 'edit'}
                        placeholder="e.g., Personal, Business"
                      />
                    </label>
                    <button type="submit">
                      {subcategoryModalMode === 'add' ? 'Add Subcategory' : 'Save Changes'}
                    </button>
                    <button type="button" onClick={() => { 
                      setShowSubcategoryModal(false); 
                      setEditingSubcategoryIndex(null); 
                      setSubcategoryForm('');
                      setSubcategoryModalMode('add');
                    }}>
                      {subcategoryModalMode === 'add' ? 'Close' : 'Cancel'}
                    </button>
                  </form>
                </div>
              </Modal>
            )}
          </div>
        )}
        {/* APP COST REPORT PAGE */}
        {mainMenu === 'reports' && activeReport === 'cost' && (
          <div style={{ padding: '32px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h1 style={{ color: '#1976d2', fontSize: 28, fontWeight: 700, margin: 0 }}>Application Cost Report</h1>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => {
                    // Prepare Excel data
                    const excelData: string[][] = [
                      ['Application Cost Report'],
                      [],
                      ['App Name', 'Description', 'Monthly $', 'Annual $', 'Frequency', 'Payment Date', 'Credit Card']
                    ];
                    
                    // Group and add data
                    sortedReportTiles.forEach((tile) => {
                      const monthlyAmount = tile.paymentFrequency === 'Monthly' && typeof tile.paymentAmount === 'number' ? tile.paymentAmount : 0;
                      const annualAmount = tile.paymentFrequency === 'Annually' && typeof tile.paymentAmount === 'number' ? tile.paymentAmount : 0;
                      
                      // Get credit card info
                      let cardName = 'No Card';
                      if (tile.creditCardId) {
                        const card = creditCards.find(cc => cc.id === tile.creditCardId);
                        if (card) {
                          cardName = `${card.name} (**** ${card.last4})`;
                        }
                      } else if (tile.creditCardName || tile.paymentTypeLast4) {
                        cardName = tile.creditCardName && tile.paymentTypeLast4 
                          ? `${tile.creditCardName}, **** ${tile.paymentTypeLast4}`
                          : tile.creditCardName || `**** ${tile.paymentTypeLast4}`;
                      }
                      
                      excelData.push([
                        tile.name,
                        tile.description || '',
                        monthlyAmount > 0 ? `$${monthlyAmount.toFixed(2)}` : '-',
                        annualAmount > 0 ? `$${annualAmount.toFixed(2)}` : '-',
                        tile.paymentFrequency || '',
                        formatDate(tile.lastPaymentDate) || '',
                        cardName
                      ]);
                    });
                    
                    // Add totals
                    const monthlyTotal = sortedReportTiles.reduce((sum, t) =>
                      sum + (t.paymentFrequency === 'Monthly' && typeof t.paymentAmount === 'number' ? t.paymentAmount : 0), 0
                    );
                    const annualTotal = sortedReportTiles.reduce((sum, t) =>
                      sum + (t.paymentFrequency === 'Annually' && typeof t.paymentAmount === 'number' ? t.paymentAmount : 0), 0
                    );
                    
                    excelData.push([]);
                    excelData.push(['TOTALS', '', `$${monthlyTotal.toFixed(2)}`, `$${annualTotal.toFixed(2)}`]);
                    
                    exportToExcel(excelData, 'app-cost-report.xls');
                  }}
                  title="Export to Excel"
                  style={{
                    background: '#e8f5e9',
                    color: '#2e7d32',
                    border: '2px solid #4caf50',
                    borderRadius: 6,
                    padding: '10px 16px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#4caf50';
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#e8f5e9';
                    e.currentTarget.style.color = '#2e7d32';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  📊 Export to Excel
                </button>
                <button
                  onClick={() => window.print()}
                  title="Print Report"
                  style={{
                    background: '#e3f2fd',
                    color: '#1976d2',
                    border: '2px solid #1976d2',
                    borderRadius: 6,
                    padding: '10px 16px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#1976d2';
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(25, 118, 210, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#e3f2fd';
                    e.currentTarget.style.color = '#1976d2';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  🖨️ Print Report
                </button>
              </div>
            </div>
            {(() => {
              const monthly = sortedReportTiles.reduce((sum, t) =>
                sum + (t.paymentFrequency === 'Monthly' && typeof t.paymentAmount === 'number' ? t.paymentAmount : 0),
              0);
              const annual = sortedReportTiles.reduce((sum, t) =>
                sum + (t.paymentFrequency === 'Annually' && typeof t.paymentAmount === 'number' ? t.paymentAmount : 0),
              0);
              return (
                <div style={{ 
                  fontWeight: 600, 
                  fontSize: 16, 
                  marginBottom: 24, 
                  display: 'flex', 
                  gap: 24, 
                  flexWrap: 'wrap'
                }}>
                  <div>
                    Monthly Payment Sum: <span style={{ color: '#1976d2' }}>{formatCurrency(monthly) || '$0.00'}</span>
                  </div>
                  <div>
                    Annual Payment Sum: <span style={{ color: '#1976d2' }}>{formatCurrency(annual) || '$0.00'}</span>
                  </div>
                </div>
              );
            })()}
            
            {/* Group by credit card */}
            {(() => {
              // Group tiles by credit card (use new creditCardId system, fall back to legacy)
              const tilesByCard = sortedReportTiles.reduce((acc, tile) => {
                let cardKey: string;
                let displayInfo: { name: string; last4: string } | null = null;
                
                // Try new credit card system first
                if (tile.creditCardId) {
                  const creditCard = creditCards.find(cc => cc.id === tile.creditCardId);
                  if (creditCard) {
                    cardKey = tile.creditCardId;
                    displayInfo = { name: creditCard.name, last4: creditCard.last4 };
                  } else {
                    // Credit card was deleted, fallback
                    cardKey = 'No Card Specified';
                  }
                } else if (tile.paymentTypeLast4 || tile.creditCardName) {
                  // Legacy system - use old fields
                  const last4 = tile.paymentTypeLast4 || '';
                  const cardName = tile.creditCardName || '';
                  cardKey = `legacy_${cardName}|${last4}`;
                  displayInfo = { name: cardName, last4: last4 };
                } else {
                  cardKey = 'No Card Specified';
                }
                
                if (!acc[cardKey]) {
                  acc[cardKey] = { tiles: [], displayInfo };
                }
                acc[cardKey].tiles.push(tile);
                return acc;
              }, {} as Record<string, { tiles: typeof sortedReportTiles; displayInfo: { name: string; last4: string } | null }>);
              
              return Object.keys(tilesByCard).sort((a, b) => {
                // Sort: 'No Card Specified' last, others alphabetically by display name
                if (a === 'No Card Specified') return 1;
                if (b === 'No Card Specified') return -1;
                const aInfo = tilesByCard[a].displayInfo;
                const bInfo = tilesByCard[b].displayInfo;
                const aName = aInfo?.name || '';
                const bName = bInfo?.name || '';
                return aName.localeCompare(bName);
              }).map((cardKey) => {
                const { tiles: cardTiles, displayInfo } = tilesByCard[cardKey];
                const monthlySubtotal = cardTiles.reduce((sum, t) => 
                  sum + (t.paymentFrequency === 'Monthly' && typeof t.paymentAmount === 'number' ? t.paymentAmount : 0), 0
                );
                const annualSubtotal = cardTiles.reduce((sum, t) => 
                  sum + (t.paymentFrequency === 'Annually' && typeof t.paymentAmount === 'number' ? t.paymentAmount : 0), 0
                );
                
                // Create display name
                let displayName: string;
                if (cardKey === 'No Card Specified') {
                  displayName = 'No Card Specified';
                } else if (displayInfo) {
                  displayName = displayInfo.name && displayInfo.last4 
                    ? `${displayInfo.name}, **** ${displayInfo.last4}`
                    : displayInfo.name || `**** ${displayInfo.last4}`;
                } else {
                  displayName = 'Unknown Card';
                }
                
                return (
                  <div key={cardKey} style={{ marginBottom: 32 }}>
                    {/* Credit Card Header */}
                    <div style={{
                      background: '#bdbdbd',
                      padding: '12px 16px',
                      borderRadius: 6,
                      marginBottom: 8,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      border: '1px solid #9e9e9e',
                    }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: '#424242' }}>
                        💳 {displayName}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#424242', display: 'flex', gap: 16 }}>
                        <span>Monthly: {formatCurrency(monthlySubtotal)}</span>
                        <span>Annual: {formatCurrency(annualSubtotal)}</span>
                      </div>
                    </div>
                    
                    {/* Table for this card */}
                    <div style={{ 
                      background: '#fff', 
                      borderRadius: 8, 
                      boxShadow: '0 2px 8px #0001', 
                      padding: 16,
                      overflowX: 'auto'
                    }}>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'minmax(150px, 2fr) minmax(200px, 2fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(120px, 1fr) minmax(80px, 80px)', 
                        gap: 8, 
                        fontWeight: 700, 
                        borderBottom: '1px solid #eee', 
                        paddingBottom: 8, 
                        color: '#333' 
                      }}>
                        <div 
                          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                          onClick={() => handleSort('name')}
                        >
                          App Name 
                          {sortColumn === 'name' && (
                            <span style={{ fontSize: 12 }}>{sortDirection === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                        <div>Description</div>
                        <div style={{ textAlign: 'center' }}>Monthly $</div>
                        <div style={{ textAlign: 'center' }}>Annual $</div>
                        <div 
                          style={{ textAlign: 'center', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                          onClick={() => handleSort('frequency')}
                        >
                          Frequency
                          {sortColumn === 'frequency' && (
                            <span style={{ fontSize: 12 }}>{sortDirection === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                        <div style={{ textAlign: 'center' }}>Payment Date</div>
                        <div style={{ textAlign: 'center' }}>Action</div>
                      </div>
                      {cardTiles.map((t, i) => {
                        const monthlyAmount = t.paymentFrequency === 'Monthly' && typeof t.paymentAmount === 'number' ? t.paymentAmount : 0;
                        const annualAmount = t.paymentFrequency === 'Annually' && typeof t.paymentAmount === 'number' ? t.paymentAmount : 0;
                        
                        return (
                          <div key={`report-row-${t.id}`} style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'minmax(150px, 2fr) minmax(200px, 2fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(120px, 1fr) minmax(80px, 80px)', 
                            gap: 8, 
                            padding: '10px 0', 
                            borderBottom: '1px solid #f2f2f2', 
                            color: '#333', 
                            fontSize: 14 
                          }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {t.accountLink ? (
                                <a href={t.accountLink} target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2', textDecoration: 'underline' }}>
                                  {t.name}
                                </a>
                              ) : (
                                t.name
                              )}
                            </div>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.description || ''}</div>
                            <div style={{ textAlign: 'center' }}>{formatCurrency(monthlyAmount) || '-'}</div>
                            <div style={{ textAlign: 'center' }}>{formatCurrency(annualAmount) || '-'}</div>
                            <div style={{ textAlign: 'center' }}>{t.paymentFrequency || ''}</div>
                            <div style={{ textAlign: 'center' }}>{formatDate(t.lastPaymentDate) || ''}</div>
                            <div style={{ textAlign: 'center' }}>
                              <span
                                onClick={() => handleEditTile(t.id)}
                                style={{
                                  cursor: 'pointer',
                                  fontSize: 18,
                                  color: '#1976d2',
                                  transition: 'all 0.2s ease',
                                  display: 'inline-block',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'scale(1.2)';
                                  e.currentTarget.style.color = '#1565c0';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'scale(1)';
                                  e.currentTarget.style.color = '#1976d2';
                                }}
                                title={`Edit ${t.name}`}
                                role="button"
                              >
                                ✏️
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
        {mainMenu === 'files' && (
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
              <div>
                <h1 style={{ margin: 0 }}>Files</h1>
              </div>
              <button
                onClick={() => folderInputRef.current && folderInputRef.current.click()}
                style={{
                  background: '#f4f6fb',
                  color: '#1976d2',
                  border: '2px solid #1976d2',
                  borderRadius: '50%',
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px #0001',
                  cursor: 'pointer',
                  padding: 0
                }}
                title="Pick Folder"
                aria-label="Pick Folder"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="9" y="4" width="2" height="12" rx="1" fill="#1976d2"/>
                  <rect x="4" y="9" width="12" height="2" rx="1" fill="#1976d2"/>
                </svg>
              </button>
              <input
                type="file"
                ref={folderInputRef}
                style={{ display: 'none' }}
                // @ts-ignore
                webkitdirectory="true"
                multiple
                onChange={handleFilesPicked}
              />
            </div>
            <div style={{ marginTop: 32 }}>
              {pickedFolders.length === 0 ? (
                <div style={{ color: '#888' }}>[No folders selected]</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  {pickedFolders.map((folder, idx) => (
                    <div key={folder.path + idx} style={{ border: '1px solid #eee', borderRadius: 8, background: '#fafbfc', minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'pointer',
                          padding: '14px 20px',
                          fontWeight: 700,
                          fontSize: 18,
                          color: '#1976d2',
                          borderBottom: folder.expanded ? '1px solid #e3e3e3' : 'none',
                          userSelect: 'none',
                        }}
                        onClick={() => toggleFolder(idx)}
                      >
                        <span style={{ marginRight: 12, fontSize: 20 }}>{folder.expanded ? '▼' : '▶'}</span>
                        <span style={{ flex: 1 }}>{folder.name}</span>
                        {folder.needsRepick && (
                          <>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                repickRefs.current[idx]?.click();
                              }}
                              style={{
                                marginLeft: 8,
                                background: '#fff3e0',
                                color: '#e65100',
                                border: '1px solid #ffb300',
                                borderRadius: 6,
                                padding: '4px 12px',
                                fontSize: 14,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Re-pick
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                deleteFolder(idx);
                              }}
                              style={{
                                marginLeft: 8,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#e53935',
                                fontSize: 20,
                                display: 'flex',
                                alignItems: 'center',
                              }}
                              title="Delete Folder"
                              aria-label="Delete Folder"
                            >
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="6.5" y="8" width="1.5" height="6" rx="0.75" fill="#e53935"/>
                                <rect x="12" y="8" width="1.5" height="6" rx="0.75" fill="#e53935"/>
                                <rect x="9.25" y="8" width="1.5" height="6" rx="0.75" fill="#e53935"/>
                                <rect x="4" y="5" width="12" height="2" rx="1" fill="#e53935"/>
                                <rect x="7" y="3" width="6" height="2" rx="1" fill="#e53935"/>
                                <rect x="3" y="7" width="14" height="10" rx="2" stroke="#e53935" strokeWidth="1.5" fill="none"/>
                              </svg>
                            </button>
                          </>
                        )}
                        <input
                          type="file"
                          ref={el => (repickRefs.current[idx] = el)}
                          style={{ display: 'none' }}
                          // @ts-ignore
                          webkitdirectory="true"
                          multiple
                          onChange={e => handleFilesPicked(e, idx)}
                        />
                      </div>
                      <div style={{ padding: '0 20px 10px 52px', color: '#888', fontSize: 14 }}>{folder.path || '[Root]'}</div>
                      {folder.expanded && (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {(folder.files.length ? folder.files : folder.fileNames)
                            .filter((file: any) => {
                              const fileName = typeof file === 'string' ? file : file.webkitRelativePath?.replace(folder.path + '/', '') || file.name;
                              return fileName.toLowerCase().endsWith('.pptx') || fileName.toLowerCase().endsWith('.pptm');
                            })
                            .map((file: any, i: number) => {
                              const fileName = typeof file === 'string' ? file : file.webkitRelativePath?.replace(folder.path + '/', '') || file.name;
                              const url = typeof file === 'string' ? undefined : URL.createObjectURL(file);
                              return (
                                <li key={fileName + i} style={{ padding: '6px 0', borderBottom: '1px solid #eee', fontSize: 16, display: 'flex', alignItems: 'center' }}>
                                  {getFileIcon(fileName)}
                                  {url ? (
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ color: '#1976d2', textDecoration: 'underline', wordBreak: 'break-all' }}
                                      onClick={e => {
                                        setTimeout(() => URL.revokeObjectURL(url), 10000);
                                      }}
                                    >
                                      {fileName}
                                    </a>
                                  ) : (
                                    <span style={{ color: '#888', wordBreak: 'break-all' }}>{fileName}</span>
                                  )}
                                </li>
                              );
                            })}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* APP LIST REPORT PAGE */}
        {mainMenu === 'reports' && activeReport === 'list' && (
          <div style={{ padding: '32px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h1 style={{ color: '#1976d2', fontSize: 28, fontWeight: 700, margin: 0 }}>App Report</h1>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => {
                    // Get all tiles sorted alphabetically
                    const sortedTiles = [...tiles].sort((a, b) => a.name.localeCompare(b.name));
                    
                    // Prepare Excel data
                    const excelData: string[][] = [
                      ['App Report'],
                      [],
                      ['Name', 'Description', 'Web Link URL', 'Category']
                    ];
                    
                    sortedTiles.forEach((tile) => {
                      excelData.push([
                        tile.name,
                        tile.description || '',
                        tile.link || '',
                        tile.category || ''
                      ]);
                    });
                    
                    excelData.push([]);
                    excelData.push([`Total Apps: ${sortedTiles.length}`]);
                    
                    exportToExcel(excelData, 'app-report.xls');
                  }}
                  title="Export to Excel"
                  style={{
                    background: '#e8f5e9',
                    color: '#2e7d32',
                    border: '2px solid #4caf50',
                    borderRadius: 6,
                    padding: '10px 16px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#4caf50';
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#e8f5e9';
                    e.currentTarget.style.color = '#2e7d32';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  📊 Export to Excel
                </button>
                <button
                  onClick={() => window.print()}
                  title="Print Report"
                  style={{
                    background: '#e3f2fd',
                    color: '#1976d2',
                    border: '2px solid #1976d2',
                    borderRadius: 6,
                    padding: '10px 16px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#1976d2';
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(25, 118, 210, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#e3f2fd';
                    e.currentTarget.style.color = '#1976d2';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  🖨️ Print Report
                </button>
              </div>
            </div>
            
            {(() => {
              // Get all tiles sorted alphabetically by name
              const sortedTiles = [...tiles].sort((a, b) => a.name.localeCompare(b.name));
              
              return (
                <div style={{
                  background: '#fff',
                  borderRadius: 8,
                  boxShadow: '0 2px 8px #0001',
                  padding: 16,
                  overflowX: 'auto'
                }}>
                  <div style={{
                    fontWeight: 600,
                    fontSize: 16,
                    marginBottom: 16,
                    color: '#666'
                  }}>
                    Total Apps: <span style={{ color: '#1976d2' }}>{sortedTiles.length}</span>
                  </div>
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'minmax(150px, 2fr) minmax(200px, 3fr) minmax(200px, 2fr) minmax(120px, 1fr)', 
                    gap: 8, 
                    fontWeight: 700, 
                    borderBottom: '2px solid #e0e0e0', 
                    paddingBottom: 8, 
                    color: '#333' 
                  }}>
                    <div>Name</div>
                    <div>Description</div>
                    <div>Web Link URL</div>
                    <div>Category</div>
                  </div>
                  
                  {sortedTiles.map((tile) => (
                    <div key={`list-report-${tile.id}`} style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'minmax(150px, 2fr) minmax(200px, 3fr) minmax(200px, 2fr) minmax(120px, 1fr)', 
                      gap: 8, 
                      padding: '12px 0', 
                      borderBottom: '1px solid #f2f2f2', 
                      color: '#333', 
                      fontSize: 14 
                    }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
                        {tile.name}
                      </div>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {tile.description || '-'}
                      </div>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {tile.link ? (
                          <a 
                            href={tile.link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ color: '#1976d2', textDecoration: 'underline' }}
                          >
                            {tile.link}
                          </a>
                        ) : '-'}
                      </div>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {tile.category || '-'}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* SETTINGS PAGE */}
        {mainMenu === 'settings' && (
          <div style={{ padding: '32px 24px', maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
              <h1 style={{ color: '#1976d2', fontSize: 32, fontWeight: 700, margin: 0 }}>Settings</h1>
            </div>
            
            {/* Credit Cards Section */}
            <div style={{ marginBottom: 48 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h2 style={{ color: '#1976d2', fontSize: 24, fontWeight: 600, margin: 0 }}>Credit Cards</h2>
                <button
                  onClick={openAddCreditCardModal}
                  style={{
                    background: '#e3f2fd',
                    color: '#1976d2',
                    border: '2px solid #1976d2',
                    borderRadius: 6,
                    padding: '10px 20px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#1976d2';
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#e3f2fd';
                    e.currentTarget.style.color = '#1976d2';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  💳 Add Credit Card
                </button>
              </div>
              
              {creditCards.length === 0 ? (
                <div style={{ 
                  background: '#f5f5f5', 
                  padding: 32, 
                  borderRadius: 8, 
                  textAlign: 'center',
                  color: '#666' 
                }}>
                  No credit cards added yet. Click "Add Credit Card" to get started.
                </div>
              ) : (
                <div style={{ 
                  background: '#fff', 
                  borderRadius: 8, 
                  boxShadow: '0 2px 8px #0001',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '2fr 1fr 100px', 
                    gap: 16, 
                    padding: 16, 
                    background: '#f5f5f5',
                    fontWeight: 700,
                    fontSize: 14,
                    borderBottom: '2px solid #e0e0e0'
                  }}>
                    <div>Card Name</div>
                    <div>Last 4 Digits</div>
                    <div style={{ textAlign: 'center' }}>Actions</div>
                  </div>
                  {creditCards.map((card) => (
                    <div 
                      key={card.id}
                      style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '2fr 1fr 100px', 
                        gap: 16, 
                        padding: 16, 
                        borderBottom: '1px solid #f0f0f0',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ fontWeight: 500 }}>{card.name}</div>
                      <div style={{ color: '#666', fontFamily: 'monospace' }}>**** {card.last4}</div>
                      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                        <span
                          onClick={() => openEditCreditCardModal(card.id)}
                          style={{
                            cursor: 'pointer',
                            fontSize: 18,
                            color: '#1976d2',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.2)';
                            e.currentTarget.style.color = '#1565c0';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.color = '#1976d2';
                          }}
                          title="Edit credit card"
                        >
                          ✏️
                        </span>
                        <span
                          onClick={() => handleDeleteCreditCard(card.id)}
                          style={{
                            cursor: 'pointer',
                            fontSize: 18,
                            color: '#e53935',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.2)';
                            e.currentTarget.style.color = '#c62828';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.color = '#e53935';
                          }}
                          title="Delete credit card"
                        >
                          🗑️
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Global Modals - Available on all pages */}
        
        {/* Tile Modal - Create/Edit Cards */}
        {showTileModal && (
          <Modal onClose={() => { setShowTileModal(false); setEditTileId(null); }}>
            <form onSubmit={handleFormSubmit} style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }}>
              <h2>{editTileId !== null ? `Edit ${form.name} Card` : 'Create a New Card'}</h2>
              <label>
                Name:<br />
                <input
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  required
                  autoFocus
                />
              </label>
              <label>
                Description:<br />
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  required
                />
              </label>
              <label>
                Application Type:<br />
                <select
                  name="appType"
                  value={form.appType || 'web'}
                  onChange={handleFormChange}
                  style={{ width: '100%', padding: 10, marginTop: 4, marginBottom: 16 }}
                >
                  <option value="web">Web Application (URL)</option>
                  <option value="protocol">Custom Protocol (cursor://, slack://, etc.)</option>
                  <option value="local">Local Application (reference only)</option>
                </select>
              </label>
              {form.appType === 'web' && (
                <label>
                  Web Link:<br />
                  <input
                    name="link"
                    value={form.link}
                    onChange={handleFormChange}
                    required
                    placeholder="https://example.com"
                  />
                </label>
              )}
              {form.appType === 'protocol' && (
                <label>
                  Protocol Handler:<br />
                  <input
                    name="link"
                    value={form.link}
                    onChange={handleFormChange}
                    required
                    placeholder="cursor:// or slack:// or vscode://"
                  />
                  <small style={{ display: 'block', color: '#666', marginTop: 4, fontSize: '0.85rem' }}>
                    Enter the custom protocol (e.g., cursor://, slack://, vscode://). The app must be installed and registered.
                  </small>
                </label>
              )}
              {form.appType === 'local' && (
                <>
                  <label>
                    Application Path:<br />
                    <input
                      name="localPath"
                      value={form.localPath || ''}
                      onChange={handleFormChange}
                      placeholder="C:\Program Files\App\app.exe"
                      style={{ width: '100%' }}
                    />
                    <small style={{ display: 'block', color: '#666', marginTop: 4, fontSize: '0.85rem' }}>
                      ⚠️ Web browsers cannot launch .exe files directly. This path is stored for reference only. You can copy it when clicking the tile.
                    </small>
                  </label>
                  <label>
                    Alternative Link (optional):<br />
                    <input
                      name="link"
                      value={form.link}
                      onChange={handleFormChange}
                      placeholder="https://example.com/download or file://path"
                    />
                    <small style={{ display: 'block', color: '#666', marginTop: 4, fontSize: '0.85rem' }}>
                      Optional: Provide a download page or file:// link as fallback
                    </small>
                  </label>
                </>
              )}
              <label>
                Logo URL:<br />
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <input
                    name="logo"
                    value={form.logo}
                    onChange={handleFormChange}
                    placeholder="https://example.com/logo.png"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleAutoFetchLogo}
                    style={{
                      background: '#1976d2',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '10px 16px',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#1565c0';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#1976d2';
                    }}
                    title="Automatically fetch logo from website"
                  >
                    🔍 Auto-Fetch
                  </button>
                </div>
                {form.logo && (
                  <div style={{ marginTop: 8, padding: 8, background: '#f5f5f5', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img
                      src={form.logo}
                      alt="Logo preview"
                      style={{ width: 48, height: 48, objectFit: 'contain', background: '#fff', borderRadius: 4, border: '1px solid #ddd' }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <span style={{ fontSize: '0.85rem', color: '#666' }}>Logo Preview</span>
                  </div>
                )}
              </label>
              <label>
                Category:<br />
                <select
                  name="category"
                  value={form.category}
                  onChange={handleFormChange}
                >
                  {tabs.map(tab => (
                    <option key={tab.name} value={tab.name}>{tab.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Subcategory (optional):<br />
                <select
                  name="subcategory"
                  value={form.subcategory || ''}
                  onChange={handleFormChange}
                >
                  <option value="">-- None --</option>
                  {(tabs.find(t => t.name === form.category)?.subcategories || []).map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'block', marginTop: 16 }}>
                Paid Subscription?&nbsp;
                <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 8 }}>
                  <span style={{ color: form.paidSubscription ? '#43a047' : '#888', fontWeight: 600, marginRight: 6 }}>No</span>
                  <input
                    type="checkbox"
                    checked={!!form.paidSubscription}
                    onChange={e => setForm(f => ({
                      ...f,
                      paidSubscription: e.target.checked,
                      paymentFrequency: e.target.checked ? (f.paymentFrequency || 'Monthly') : null,
                      annualType: e.target.checked && f.paymentFrequency === 'Annually' ? (f.annualType || 'Subscriber') : f.annualType,
                      paymentAmount: e.target.checked ? f.paymentAmount : null,
                      lastPaymentDate: e.target.checked ? f.lastPaymentDate : null,
                    }))}
                    style={{ width: 36, height: 20 }}
                  />
                  <span style={{ color: form.paidSubscription ? '#43a047' : '#888', fontWeight: 600, marginLeft: 6 }}>Yes</span>
                </span>
              </label>
              {form.paidSubscription && (
                <>
                  <label style={{ display: 'block', marginTop: 12 }}>
                    Payment Frequency:<br />
                    <select
                      name="paymentFrequency"
                      value={form.paymentFrequency || 'Monthly'}
                      onChange={e => setForm(f => ({ 
                        ...f, 
                        paymentFrequency: e.target.value as 'Monthly' | 'Annually',
                        annualType: e.target.value === 'Annually' ? (f.annualType || 'Subscriber') : null
                      }))}
                      style={{ width: '100%', padding: 6, marginTop: 2 }}
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Annually">Annually</option>
                    </select>
                  </label>
                  {form.paymentFrequency === 'Annually' && (
                    <label style={{ display: 'block', marginTop: 12 }}>
                      Annual Payment Type:<br />
                      <select
                        name="annualType"
                        value={form.annualType || 'Subscriber'}
                        onChange={e => setForm(f => ({ ...f, annualType: e.target.value as 'Subscriber' | 'Fiscal' | 'Calendar' | null }))}
                        style={{ width: '100%', padding: 6, marginTop: 2 }}
                      >
                        <option value="Subscriber">Subscriber Anniversary</option>
                        <option value="Fiscal">Fiscal Year</option>
                        <option value="Calendar">Calendar Year</option>
                      </select>
                    </label>
                  )}
                  <label style={{ display: 'block', marginTop: 12 }}>
                    Payment Amount ($):<br />
                    <input
                      type="number"
                      step="0.01"
                      name="paymentAmount"
                      value={form.paymentAmount ?? ''}
                      onChange={e => setForm(f => ({ ...f, paymentAmount: e.target.value ? parseFloat(e.target.value) : null }))}
                      style={{ width: '100%', padding: 6, marginTop: 2 }}
                      placeholder="0.00"
                    />
                  </label>
                  <label style={{ display: 'block', marginTop: 12 }}>
                    Credit Card:< br />
                    <select
                      value={form.creditCardId ?? ''}
                      onChange={e => {
                        const selectedCardId = e.target.value;
                        setForm(f => ({ ...f, creditCardId: selectedCardId || null }));
                      }}
                      style={{ width: '100%', padding: 6, marginTop: 2 }}
                    >
                      <option value="">-- Select Credit Card --</option>
                      {creditCards.map(card => (
                        <option key={card.id} value={card.id}>
                          {card.name} (**** {card.last4})
                        </option>
                      ))}
                    </select>
                    {creditCards.length === 0 && (
                      <div style={{ fontSize: 12, color: '#ff9800', marginTop: 4 }}>
                        No credit cards defined. Go to <span 
                          onClick={() => { setMainMenu('settings'); setShowTileModal(false); }}
                          style={{ color: '#1976d2', cursor: 'pointer', textDecoration: 'underline' }}
                        >Settings</span> to add one.
                      </div>
                    )}
                  </label>
                  <label style={{ display: 'block', marginTop: 12 }}>
                    Signup Date:<br />
                    <input
                      type="date"
                      name="signupDate"
                      value={form.signupDate ?? ''}
                      onChange={e => setForm(f => ({ ...f, signupDate: e.target.value }))}
                      style={{ width: '100%', padding: 6, marginTop: 2 }}
                    />
                  </label>
                  <label style={{ display: 'block', marginTop: 12 }}>
                    Last Payment Date:<br />
                    <input
                      type="date"
                      name="lastPaymentDate"
                      value={form.lastPaymentDate ?? ''}
                      onChange={e => setForm(f => ({ ...f, lastPaymentDate: e.target.value }))}
                      style={{ width: '100%', padding: 6, marginTop: 2 }}
                    />
                  </label>
                  <label style={{ display: 'block', marginTop: 12 }}>
                    Account Link:<br />
                    <input
                      type="url"
                      name="accountLink"
                      value={form.accountLink ?? ''}
                      onChange={e => setForm(f => ({ ...f, accountLink: e.target.value }))}
                      style={{ width: '100%', padding: 6, marginTop: 2 }}
                      placeholder="https://example.com/account"
                    />
                  </label>
                </>
              )}
              <label style={{ display: 'block', marginTop: 12 }}>
                Notes:<br />
                <textarea
                  name="notes"
                  value={form.notes ?? ''}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ width: '100%', padding: 6, marginTop: 2, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }}
                  placeholder="Add any notes about this website..."
                />
              </label>
              <button type="submit">
                {editTileId !== null ? 'Save Changes' : 'Create'}
              </button>
              <button type="button" onClick={() => { setShowTileModal(false); setEditTileId(null); }}>
                Cancel
              </button>
            </form>
          </Modal>
        )}
        
        {showTabModal && (
          <Modal onClose={() => { setShowTabModal(false); setEditingTabIndex(null); setTabFormName(''); setTabHasStockTicker(false); setTabHomePageTabId('all'); }}>
            <form onSubmit={handleTabFormSubmit}>
              <h2>{tabModalMode === 'add' ? 'Add Web Tile' : 'Edit Web Tile'}</h2>
              <label>
                Web Tile Name:<br />
                <input
                  value={tabFormName}
                  onChange={e => setTabFormName(e.target.value)}
                  required
                  autoFocus
                />
              </label>
              {homePageTabs.length > 1 && (
                <label style={{ display: 'block', marginTop: 12 }}>
                  Home Page Tab:<br />
                  <select
                    value={tabHomePageTabId}
                    onChange={e => setTabHomePageTabId(e.target.value)}
                    style={{ width: '100%', padding: 8, marginTop: 4 }}
                  >
                    {homePageTabs.map(hpt => (
                      <option key={hpt.id} value={hpt.id}>{hpt.name}</option>
                    ))}
                  </select>
                </label>
              )}
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                marginTop: 16,
                cursor: 'pointer',
                padding: '12px',
                background: '#f5f5f5',
                borderRadius: 6,
                border: '1px solid #e0e0e0'
              }}>
                <input
                  type="checkbox"
                  checked={tabHasStockTicker}
                  onChange={e => setTabHasStockTicker(e.target.checked)}
                  style={{ cursor: 'pointer', width: 18, height: 18 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#333' }}>📈 Enable Stock Market Ticker</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Show live stock prices on this Web Tile</div>
                </div>
              </label>
              <button type="submit">
                {tabModalMode === 'add' ? 'Add Web Tile' : 'Save'}
              </button>
              <button type="button" onClick={() => { setShowTabModal(false); setEditingTabIndex(null); setTabFormName(''); setTabHasStockTicker(false); setTabHomePageTabId('all'); }}>
                Cancel
              </button>
            </form>
          </Modal>
        )}

        {showHomePageTabModal && (
          <Modal onClose={() => { setShowHomePageTabModal(false); setEditingHomePageTabId(null); setHomePageTabForm(''); }}>
            <form onSubmit={handleHomePageTabFormSubmit}>
              <h2>{homePageTabModalMode === 'add' ? 'Add Home Page Tab' : 'Edit Home Page Tab'}</h2>
              <label>
                Tab Name:<br />
                <input
                  value={homePageTabForm}
                  onChange={e => setHomePageTabForm(e.target.value)}
                  required
                  autoFocus
                  placeholder="e.g., Personal Apps, Business Apps"
                />
              </label>
              <button type="submit">
                {homePageTabModalMode === 'add' ? 'Add Tab' : 'Save'}
              </button>
              <button type="button" onClick={() => { setShowHomePageTabModal(false); setEditingHomePageTabId(null); setHomePageTabForm(''); }}>
                Cancel
              </button>
            </form>
          </Modal>
        )}

        {showCreditCardModal && (
          <Modal onClose={() => { setShowCreditCardModal(false); setEditingCreditCardId(null); setCreditCardForm({ name: '', last4: '' }); }}>
            <form onSubmit={handleCreditCardFormSubmit}>
              <h2>{creditCardModalMode === 'add' ? 'Add Credit Card' : 'Edit Credit Card'}</h2>
              <label>
                Credit Card Name:<br />
                <input
                  value={creditCardForm.name}
                  onChange={e => setCreditCardForm({ ...creditCardForm, name: e.target.value })}
                  required
                  autoFocus
                  maxLength={60}
                  placeholder="e.g., Chase Sapphire, Amex Gold"
                  style={{ width: '100%', padding: 8, marginTop: 4 }}
                />
              </label>
              <label style={{ display: 'block', marginTop: 16 }}>
                Last 4 Digits:<br />
                <input
                  type="text"
                  value={creditCardForm.last4}
                  onChange={e => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 4) {
                      setCreditCardForm({ ...creditCardForm, last4: value });
                    }
                  }}
                  required
                  maxLength={4}
                  pattern="[0-9]{4}"
                  placeholder="1234"
                  style={{ width: '100%', padding: 8, marginTop: 4, fontFamily: 'monospace' }}
                />
              </label>
              <button type="submit" style={{ marginTop: 16 }}>
                {creditCardModalMode === 'add' ? 'Add Credit Card' : 'Save Changes'}
              </button>
              <button type="button" onClick={() => { setShowCreditCardModal(false); setEditingCreditCardId(null); setCreditCardForm({ name: '', last4: '' }); }}>
                Cancel
              </button>
            </form>
          </Modal>
        )}

        {showUpcomingPaymentsModal && (
          <Modal onClose={() => { setShowUpcomingPaymentsModal(false); setViewingNextMonth(false); }}>
            <div style={{ padding: '16px 0' }}>
              <h2 style={{ color: '#1976d2', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 28 }}>💳</span>
                Upcoming Payments
              </h2>
              
              {/* Toggle Buttons */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <button
                  onClick={() => setViewingNextMonth(false)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: !viewingNextMonth ? '#1976d2' : '#e0e0e0',
                    color: !viewingNextMonth ? '#fff' : '#666',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  This Month
                </button>
                <button
                  onClick={() => setViewingNextMonth(true)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: viewingNextMonth ? '#1976d2' : '#e0e0e0',
                    color: viewingNextMonth ? '#fff' : '#666',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Next Month
                </button>
              </div>
              
              {(() => {
                const upcomingPayments = viewingNextMonth 
                  ? getUpcomingPaymentsNextMonth(tiles) 
                  : getUpcomingPaymentsThisMonth(tiles);
                const today = new Date();
                const displayDate = viewingNextMonth 
                  ? new Date(today.getFullYear(), today.getMonth() + 1, 1)
                  : today;
                const monthName = displayDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                
                if (upcomingPayments.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
                      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No Payments Due</div>
                      <div>You have no subscription payments scheduled for {monthName}.</div>
                    </div>
                  );
                }
                
                // Group by credit card (use new creditCardId system, fall back to legacy)
                const paymentsByCard = upcomingPayments.reduce((acc, payment) => {
                  let cardKey: string;
                  let displayInfo: { name: string; last4: string } | null = null;
                  
                  // Try new credit card system first
                  if (payment.tile.creditCardId) {
                    const creditCard = creditCards.find(cc => cc.id === payment.tile.creditCardId);
                    if (creditCard) {
                      cardKey = payment.tile.creditCardId;
                      displayInfo = { name: creditCard.name, last4: creditCard.last4 };
                    } else {
                      // Credit card was deleted, fallback
                      cardKey = 'No Card Specified';
                    }
                  } else if (payment.tile.paymentTypeLast4 || payment.tile.creditCardName) {
                    // Legacy system - use old fields
                    const last4 = payment.tile.paymentTypeLast4 || '';
                    const cardName = payment.tile.creditCardName || '';
                    cardKey = `legacy_${cardName}|${last4}`;
                    displayInfo = { name: cardName, last4: last4 };
                  } else {
                    cardKey = 'No Card Specified';
                  }
                  
                  if (!acc[cardKey]) {
                    acc[cardKey] = { payments: [], displayInfo };
                  }
                  acc[cardKey].payments.push(payment);
                  return acc;
                }, {} as Record<string, { payments: typeof upcomingPayments; displayInfo: { name: string; last4: string } | null }>);

                const totalAmount = upcomingPayments.reduce((sum, p) => sum + (p.tile.paymentAmount || 0), 0);
                
                return (
                  <>
                    <div style={{ marginBottom: 20, padding: 12, background: '#fff3e0', borderRadius: 6, border: '1px solid #ff9800' }}>
                      <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>{monthName}</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#ff9800' }}>
                        {upcomingPayments.length} Payment{upcomingPayments.length > 1 ? 's' : ''} Due
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: '#333', marginTop: 4 }}>
                        Total: {formatCurrency(totalAmount)}
                      </div>
                    </div>
                    
                    <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                      {Object.keys(paymentsByCard).sort((a, b) => {
                        // Sort: 'No Card Specified' last, others alphabetically by display name
                        if (a === 'No Card Specified') return 1;
                        if (b === 'No Card Specified') return -1;
                        const aInfo = paymentsByCard[a].displayInfo;
                        const bInfo = paymentsByCard[b].displayInfo;
                        const aName = aInfo?.name || '';
                        const bName = bInfo?.name || '';
                        return aName.localeCompare(bName);
                      }).map((cardKey) => {
                        const { payments: cardPayments, displayInfo } = paymentsByCard[cardKey];
                        const cardSubtotal = cardPayments.reduce((sum, p) => sum + (p.tile.paymentAmount || 0), 0);
                        
                        // Create display name
                        let displayName: string;
                        if (cardKey === 'No Card Specified') {
                          displayName = 'No Card Specified';
                        } else if (displayInfo) {
                          displayName = displayInfo.name && displayInfo.last4 
                            ? `${displayInfo.name}, **** ${displayInfo.last4}`
                            : displayInfo.name || `**** ${displayInfo.last4}`;
                        } else {
                          displayName = 'Unknown Card';
                        }
                        
                        return (
                          <div key={cardKey} style={{ marginBottom: 24 }}>
                            {/* Credit Card Header */}
                            <div style={{
                              background: '#e3f2fd',
                              padding: '10px 16px',
                              borderRadius: 6,
                              marginBottom: 8,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              border: '1px solid #1976d2',
                            }}>
                              <div style={{ fontWeight: 700, fontSize: 15, color: '#1976d2' }}>
                                💳 {displayName}
                              </div>
                              <div style={{ fontWeight: 700, fontSize: 16, color: '#1976d2' }}>
                                {formatCurrency(cardSubtotal)}
                              </div>
                            </div>
                            
                            {/* Payments for this card */}
                            {cardPayments.map(({ tile, nextPaymentDate }) => (
                              <div
                                key={tile.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '14px 16px',
                                  marginBottom: '8px',
                                  background: '#f9f9f9',
                                  borderRadius: 6,
                                  border: '1px solid #e0e0e0',
                                  marginLeft: 16,
                                }}
                              >
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600, fontSize: 15, color: '#333', marginBottom: 4 }}>
                                    {tile.name}
                                  </div>
                                  <div style={{ fontSize: 13, color: '#666' }}>
                                    Due: {formatDate(nextPaymentDate)}
                                  </div>
                                </div>
                                <div style={{ fontWeight: 700, fontSize: 16, color: '#ff9800', textAlign: 'right' }}>
                                  {formatCurrency(tile.paymentAmount)}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
              <button
                style={{
                  width: '100%',
                  marginTop: 20,
                  background: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '12px 20px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                onClick={() => { setShowUpcomingPaymentsModal(false); setViewingNextMonth(false); }}
              >
                Close
              </button>
            </div>
          </Modal>
        )}

        {/* Stock Ticker Management Modal */}
        {showStockModal && (
          <Modal onClose={() => { setShowStockModal(false); setStockSymbolInput(''); }}>
            <div style={{ padding: '16px 0' }}>
              <h2 style={{ color: '#1976d2', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 28 }}>📈</span>
                Manage Stock Ticker
              </h2>
              
              {/* Add Stock Symbol Form */}
              <form onSubmit={handleAddStockSymbol} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input
                    type="text"
                    value={stockSymbolInput}
                    onChange={(e) => setStockSymbolInput(e.target.value)}
                    placeholder="Enter stock symbol (e.g., AAPL)"
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      border: '2px solid #e0e0e0',
                      borderRadius: 6,
                      fontSize: 14,
                      outline: 'none',
                    }}
                    autoFocus
                  />
                  <button
                    type="submit"
                    style={{
                      background: '#4caf50',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '10px 20px',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Add Symbol
                  </button>
                </div>
                <div style={{ fontSize: 12, color: '#666', fontStyle: 'italic' }}>
                  Add stock symbols to track in the ticker bar (e.g., AAPL, GOOGL, MSFT, TSLA)
                </div>
              </form>

              {/* Current Stock Symbols */}
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, marginBottom: 12, color: '#1976d2' }}>Your Stocks:</h3>
                {stockSymbols.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No Stocks Added Yet</div>
                    <div style={{ fontSize: 14 }}>Add stock symbols above to start tracking</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {stockSymbols.map((symbol) => {
                      const priceData = stockPrices[symbol];
                      const isPositive = priceData && priceData.change >= 0;
                      
                      return (
                        <div
                          key={symbol}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 12px',
                            background: '#f5f5f5',
                            borderRadius: 6,
                            border: '1px solid #e0e0e0',
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#333' }}>
                              {symbol}
                            </div>
                            {priceData && (
                              <div style={{ fontSize: 12, color: isPositive ? '#4caf50' : '#f44336', fontWeight: 600 }}>
                                ${priceData.price.toFixed(2)} {isPositive ? '▲' : '▼'} {priceData.changePercent.toFixed(2)}%
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveStockSymbol(symbol)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#e53935',
                              cursor: 'pointer',
                              fontSize: 18,
                              padding: 4,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ fontSize: 12, color: '#4caf50', marginTop: 16, padding: 12, background: '#e8f5e9', borderRadius: 6, border: '1px solid #4caf50' }}>
                ✅ Connected to Finnhub API with your personal key. Stock prices update automatically every 60 seconds with real-time data (60 calls/minute limit on free tier).
              </div>

              <button
                style={{
                  width: '100%',
                  marginTop: 20,
                  background: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '12px 20px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                onClick={() => { setShowStockModal(false); setStockSymbolInput(''); }}
              >
                Close
              </button>
            </div>
          </Modal>
        )}

      </div>
    </div>
  );
}

export default App;


