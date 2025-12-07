// ...IMPORTS...
import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import {
  DndContext,
  closestCenter,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';
import wamsLogo from '/Finance Companion Logo.png';
import LandingPage from './LandingPage';

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
  // Budget fields
  isWebLinkOnly?: boolean;
  budgetType?: 'Bill' | 'Subscription' | 'Expense' | 'Savings' | null;
  budgetAmount?: number | null;
  budgetPeriod?: 'Monthly' | 'Annually' | null;
  budgetCategory?: string | null;  // Budget category ID
  budgetSubcategory?: string | null;  // Budget subcategory name
  budgetHistory?: {
    [yearMonth: string]: {
      budget: number;
      actual: number;
      paidDate?: string;
      notes?: string;
    }
  };
};
type HomePageTab = { id: string; name: string; };
type Tab = { name: string; subcategories?: string[]; hasStockTicker?: boolean; homePageTabId?: string; };
type BudgetCategory = { id: string; name: string; icon: string; subcategories: string[]; };

// Default budget categories (sorted A-Z by name)
const defaultBudgetCategories: BudgetCategory[] = [
  { id: 'ai', name: 'AI & Machine Learning', icon: '🤖', subcategories: ['Chat AI', 'Image Generation', 'Code Assistants', 'Writing Tools', 'Research'] },
  { id: 'finance', name: 'Banking & Finance', icon: '🏦', subcategories: ['Banks', 'Credit Cards', 'Investments', 'Crypto', 'Tax', 'Budgeting Apps'] },
  { id: 'business', name: 'Business', icon: '💼', subcategories: ['Software/SaaS', 'Office Supplies', 'Professional Services', 'Marketing', 'Equipment', 'Licenses/Permits'] },
  { id: 'debt', name: 'Debt Repayment', icon: '💳', subcategories: ['Credit Cards', 'Student Loans', 'Personal Loans', 'Medical Debt', 'Other Debt'] },
  { id: 'discretionary', name: 'Discretionary', icon: '🎉', subcategories: ['Dining Out', 'Entertainment', 'Hobbies', 'Clothing', 'Gifts', 'Subscriptions', 'Travel/Vacation'] },
  { id: 'education', name: 'Education', icon: '📚', subcategories: ['Tuition', 'Books/Supplies', 'Online Courses', 'Professional Development'] },
  { id: 'entertainment', name: 'Entertainment & Media', icon: '🎬', subcategories: ['Streaming Video', 'Music', 'Gaming', 'Podcasts', 'Sports', 'News'] },
  { id: 'general', name: 'General', icon: '📌', subcategories: ['Miscellaneous', 'Favorites', 'Bookmarks', 'Quick Access', 'Other'] },
  { id: 'health', name: 'Health', icon: '🏥', subcategories: ['Health Insurance', 'Dental Insurance', 'Vision Insurance', 'Prescriptions', 'Doctor Visits', 'Medical Equipment'] },
  { id: 'household', name: 'Household & Groceries', icon: '🛒', subcategories: ['Groceries', 'Household Supplies', 'Personal Care/Toiletries', 'Cleaning Supplies'] },
  { id: 'housing', name: 'Housing', icon: '🏠', subcategories: ['Mortgage Payment', 'Property Taxes', 'Homeowners Insurance', 'PMI', 'HOA Fees', 'Rent'] },
  { id: 'insurance', name: 'Insurance', icon: '🛡️', subcategories: ['Life Insurance', 'Disability Insurance', 'Umbrella Policy', 'Pet Insurance'] },
  { id: 'maintenance', name: 'Maintenance & Repairs', icon: '🛠️', subcategories: ['Routine Maintenance', 'Lawn Care/Landscaping', 'Pest Control', 'Repairs Fund', 'Home Improvements', 'Appliances'] },
  { id: 'reference', name: 'Reference & Research', icon: '🔍', subcategories: ['Search Engines', 'Documentation', 'Wikipedia', 'How-To', 'APIs', 'Developer Tools'] },
  { id: 'savings', name: 'Savings & Investments', icon: '💰', subcategories: ['Emergency Fund', 'Retirement (401k/IRA)', 'General Savings', 'College Fund', 'Investment Account'] },
  { id: 'shopping', name: 'Shopping & Retail', icon: '🛍️', subcategories: ['General Retail', 'Electronics', 'Clothing', 'Home Goods', 'Groceries', 'Deals & Coupons'] },
  { id: 'social', name: 'Social & Communication', icon: '💬', subcategories: ['Social Media', 'Messaging', 'Video Chat', 'Forums', 'Professional Networks'] },
  { id: 'productivity', name: 'Tools & Productivity', icon: '🔧', subcategories: ['Email', 'Calendar', 'Notes', 'File Storage', 'Project Management', 'Collaboration', 'Utilities'] },
  { id: 'transportation', name: 'Transportation', icon: '🚗', subcategories: ['Car Payment', 'Auto Insurance', 'Gas/Fuel', 'Car Maintenance', 'Public Transit', 'Tolls/Parking', 'Registration/Fees'] },
  { id: 'utilities', name: 'Utilities', icon: '💡', subcategories: ['Electricity', 'Gas/Propane', 'Water/Sewer', 'Trash/Recycling', 'Internet', 'Cable/Streaming', 'Cell Phone'] },
];
type PaymentMethodType = 'Credit Card' | 'ACH' | 'Check' | 'Cash';
type CreditCard = { 
  id: string; 
  name: string; 
  last4: string;
  methodType?: PaymentMethodType;
  bankName?: string;  // For ACH and Check
  accountType?: 'Checking' | 'Savings';  // For ACH
  routingLast4?: string;  // For ACH - last 4 of routing number
};
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

// Check if a tile's payment is due within a certain number of days
function isPaymentDueSoon(
  tile: Tile,
  daysThreshold: number = 5
): boolean {
  if (!tile.paidSubscription || !tile.signupDate || !tile.paymentFrequency) {
    return false;
  }
  
  const nextPaymentDateStr = calculateNextPaymentDate(tile.signupDate, tile.paymentFrequency, tile.annualType);
  if (!nextPaymentDateStr) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const nextPaymentDate = new Date(nextPaymentDateStr);
  nextPaymentDate.setHours(0, 0, 0, 0);
  
  const diffTime = nextPaymentDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays >= 0 && diffDays <= daysThreshold;
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
  const [showLanding, setShowLanding] = useState(true);
  
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
  
  // --- Budget Categories state and handlers ---
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>(() => {
    const saved = localStorage.getItem('budgetCategories');
    return saved ? JSON.parse(saved) : defaultBudgetCategories;
  });
  
  useEffect(() => {
    localStorage.setItem('budgetCategories', JSON.stringify(budgetCategories));
  }, [budgetCategories]);
  
  // --- WebTabs state and handlers ---
  const [tabs, setTabs] = useState<Tab[]>(() => {
    const saved = localStorage.getItem('tabs');
    return saved ? JSON.parse(saved) : defaultTabs;
  });
  const [tiles, setTiles] = useState<Tile[]>(() => {
    const saved = localStorage.getItem('tiles');
    if (saved) {
      // Fix any floating point precision issues in saved monetary values
      const parsed = JSON.parse(saved);
      return parsed.map((tile: Tile) => ({
        ...tile,
        budgetAmount: tile.budgetAmount !== null && tile.budgetAmount !== undefined 
          ? Math.round(tile.budgetAmount * 100) / 100 
          : null,
        paymentAmount: tile.paymentAmount !== null && tile.paymentAmount !== undefined 
          ? Math.round(tile.paymentAmount * 100) / 100 
          : null,
      }));
    }
    return initialTiles;
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
  const [activeReport, setActiveReport] = useState<'cost' | 'list' | 'budget'>('cost');

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
            {tabTiles.slice(0, 24).map((tile) => {
              const paymentDueSoon = isPaymentDueSoon(tile, 5);
              // Budget type color for home page cards
              const getBudgetColor = () => {
                if (tile.isWebLinkOnly) return '#9E9E9E'; // Medium Grey
                switch (tile.budgetType) {
                  case 'Bill': return '#4169E1'; // Royal Blue
                  case 'Subscription': return '#87CEEB'; // Light Blue
                  case 'Expense': return '#FF6B6B'; // Light Red
                  case 'Savings': return '#4CAF50'; // Green
                  default: return null;
                }
              };
              const budgetColor = getBudgetColor();
              const budgetTypeLabel = tile.isWebLinkOnly ? 'Web Link Only' : tile.budgetType;
              
              return tile.logo && (
                <div
                  key={tile.id}
                  style={{
                    position: 'relative',
                    flexShrink: 0,
                  }}
                  className="home-card-wrapper"
                >
                  <a
                    href={tile.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`${tile.name}${tile.description ? ` - ${tile.description}` : ''}${budgetTypeLabel ? `\n📊 ${budgetTypeLabel}` : ''}${tile.budgetAmount ? ` - ${formatCurrency(tile.budgetAmount)}/${tile.budgetPeriod === 'Monthly' ? 'mo' : 'yr'}` : ''}${paymentDueSoon ? '\n⚠️ Payment due soon!' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      trackSession(tile.id, tile.name);
                    }}
                    style={{
                      textDecoration: 'none',
                      display: 'block',
                    }}
                  >
                    <img
                      src={tile.logo}
                      alt={tile.name}
                      className={paymentDueSoon ? 'home-card-payment-due' : ''}
                      style={{
                        width: 40,
                        height: 40,
                        objectFit: 'contain',
                        borderRadius: 6,
                        background: '#f9f9f9',
                        padding: 4,
                        border: paymentDueSoon ? '2px solid #ff9800' : '1px solid #e0e0e0',
                        borderTop: budgetColor ? `3px solid ${budgetColor}` : undefined,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        animation: paymentDueSoon ? 'homeCardGlow 2s ease-in-out infinite' : 'none',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.15)';
                        e.currentTarget.style.boxShadow = paymentDueSoon 
                          ? '0 0 12px 4px rgba(255, 152, 0, 0.6)' 
                          : '0 2px 8px rgba(25, 118, 210, 0.3)';
                        // Set border colors but preserve the budget type top color
                        const hoverBorderColor = paymentDueSoon ? '#ff9800' : '#1976d2';
                        e.currentTarget.style.borderLeftColor = hoverBorderColor;
                        e.currentTarget.style.borderRightColor = hoverBorderColor;
                        e.currentTarget.style.borderBottomColor = hoverBorderColor;
                        // Keep the top border color for budget type
                        if (budgetColor) {
                          e.currentTarget.style.borderTopColor = budgetColor;
                        } else {
                          e.currentTarget.style.borderTopColor = hoverBorderColor;
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = paymentDueSoon ? '' : 'none';
                        // Reset border colors but preserve the budget type top color
                        const defaultBorderColor = paymentDueSoon ? '#ff9800' : '#e0e0e0';
                        e.currentTarget.style.borderLeftColor = defaultBorderColor;
                        e.currentTarget.style.borderRightColor = defaultBorderColor;
                        e.currentTarget.style.borderBottomColor = defaultBorderColor;
                        // Keep the top border color for budget type
                        if (budgetColor) {
                          e.currentTarget.style.borderTopColor = budgetColor;
                        } else {
                          e.currentTarget.style.borderTopColor = defaultBorderColor;
                        }
                      }}
                    />
                  </a>
                  {/* Edit button - appears on hover via CSS */}
                  <button
                    className="home-card-edit-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleEditTile(tile.id);
                    }}
                    title="Edit card"
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      border: 'none',
                      background: '#1976d2',
                      color: '#fff',
                      fontSize: 10,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 0.2s ease, transform 0.2s ease',
                      zIndex: 10,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    }}
                  >
                    ✏️
                  </button>
                </div>
              );
            })}
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

  // State to track the currently dragged card for DragOverlay
  const [activeCardId, setActiveCardId] = useState<number | null>(null);
  const activeCard = activeCardId ? tiles.find(t => t.id === activeCardId) : null;

  // Draggable Card component for home page
  function DraggableHomeCard({ tile, categoryId }: { tile: Tile; categoryId: string }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: `card-${tile.id}`,
      data: { type: 'card', tileId: tile.id, fromCategory: categoryId },
    });
    
    const paymentDueSoon = isPaymentDueSoon(tile, 5);
    const getBudgetColor = () => {
      if (tile.isWebLinkOnly) return '#9E9E9E';
      switch (tile.budgetType) {
        case 'Bill': return '#4169E1';
        case 'Subscription': return '#87CEEB';
        case 'Expense': return '#FF6B6B';
        case 'Savings': return '#4CAF50';
        default: return null;
      }
    };
    const budgetColor = getBudgetColor();
    const budgetTypeLabel = tile.isWebLinkOnly ? 'Web Link Only' : tile.budgetType;

    const style = {
      transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      opacity: isDragging ? 0.3 : 1,
      cursor: isDragging ? 'grabbing' : 'grab',
    };

    return (
      <div
        ref={setNodeRef}
        style={{
          ...style,
          position: 'relative',
          flexShrink: 0,
          touchAction: 'none',
        }}
        className="home-card-wrapper"
        {...attributes}
        {...listeners}
      >
        <a
          href={tile.link}
          target="_blank"
          rel="noopener noreferrer"
          title={`${tile.name}${tile.description ? ` - ${tile.description}` : ''}${budgetTypeLabel ? `\n📊 ${budgetTypeLabel}` : ''}${tile.budgetAmount ? ` - ${formatCurrency(tile.budgetAmount)}/${tile.budgetPeriod === 'Monthly' ? 'mo' : 'yr'}` : ''}${paymentDueSoon ? '\n⚠️ Payment due soon!' : ''}\n\n🖱️ Drag to move to another category`}
          onClick={(e) => {
            if (isDragging) {
              e.preventDefault();
              return;
            }
            e.stopPropagation();
            trackSession(tile.id, tile.name);
          }}
          style={{
            textDecoration: 'none',
            display: 'block',
          }}
        >
          <img
            src={tile.logo}
            alt={tile.name}
            className={paymentDueSoon ? 'home-card-payment-due' : ''}
            style={{
              width: 40,
              height: 40,
              objectFit: 'contain',
              borderRadius: 6,
              background: '#f9f9f9',
              padding: 4,
              border: paymentDueSoon ? '2px solid #ff9800' : '1px solid #e0e0e0',
              borderTop: budgetColor ? `3px solid ${budgetColor}` : undefined,
              cursor: isDragging ? 'grabbing' : 'grab',
              transition: 'all 0.2s ease',
              animation: paymentDueSoon ? 'homeCardGlow 2s ease-in-out infinite' : 'none',
            }}
            onMouseEnter={(e) => {
              if (!isDragging) {
                e.currentTarget.style.transform = 'scale(1.15)';
                e.currentTarget.style.boxShadow = paymentDueSoon 
                  ? '0 0 12px 4px rgba(255, 152, 0, 0.6)' 
                  : '0 2px 8px rgba(25, 118, 210, 0.3)';
                const hoverBorderColor = paymentDueSoon ? '#ff9800' : '#1976d2';
                e.currentTarget.style.borderLeftColor = hoverBorderColor;
                e.currentTarget.style.borderRightColor = hoverBorderColor;
                e.currentTarget.style.borderBottomColor = hoverBorderColor;
                if (budgetColor) {
                  e.currentTarget.style.borderTopColor = budgetColor;
                } else {
                  e.currentTarget.style.borderTopColor = hoverBorderColor;
                }
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = paymentDueSoon ? '' : 'none';
              const defaultBorderColor = paymentDueSoon ? '#ff9800' : '#e0e0e0';
              e.currentTarget.style.borderLeftColor = defaultBorderColor;
              e.currentTarget.style.borderRightColor = defaultBorderColor;
              e.currentTarget.style.borderBottomColor = defaultBorderColor;
              if (budgetColor) {
                e.currentTarget.style.borderTopColor = budgetColor;
              } else {
                e.currentTarget.style.borderTopColor = defaultBorderColor;
              }
            }}
          />
        </a>
        {/* Edit button - appears on hover via CSS */}
        <button
          className="home-card-edit-btn"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleEditTile(tile.id);
          }}
          title="Edit card"
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            width: 20,
            height: 20,
            borderRadius: '50%',
            border: 'none',
            background: '#1976d2',
            color: '#fff',
            fontSize: 10,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            transition: 'opacity 0.2s ease, transform 0.2s ease',
            zIndex: 10,
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        >
          ✏️
        </button>
      </div>
    );
  }

  // Droppable Category Tile that accepts cards from other categories
  function DroppableCategoryTile({ category }: { category: BudgetCategory }) {
    const { isOver, setNodeRef: setDropRef } = useDroppable({
      id: `category-${category.id}`,
      data: { type: 'category', categoryId: category.id },
    });
    
    // Filter cards that belong to this budget category
    const categoryCards = tiles.filter(t => t.budgetCategory === category.id);
    
    // Calculate monthly and annual spend for this category
    const monthlySpend = categoryCards.reduce((sum, tile) => {
      const amount = parseFloat(String(tile.budgetAmount || tile.paymentAmount || 0));
      const period = tile.budgetPeriod || tile.paymentFrequency;
      return period === 'Monthly' ? sum + amount : sum;
    }, 0);
    const annualSpend = categoryCards.reduce((sum, tile) => {
      const amount = parseFloat(String(tile.budgetAmount || tile.paymentAmount || 0));
      const period = tile.budgetPeriod || tile.paymentFrequency;
      return period === 'Annually' ? sum + amount : sum;
    }, 0);

    // Check if there are uncategorized cards that need a home
    const hasUncategorizedCards = tiles.some(t => !t.budgetCategory);
    
    // Don't render if no cards in this category AND not being hovered AND no uncategorized cards
    // (We want to show empty categories as drop targets when there are uncategorized cards)
    if (categoryCards.length === 0 && !isOver && !hasUncategorizedCards) return null;

    return (
      <div
        ref={setDropRef}
        onClick={() => {
          setMainMenu('home');
          setActiveTab(category.id);
        }}
        style={{
          background: isOver ? '#e3f2fd' : (categoryCards.length === 0 ? '#fafafa' : '#fff'),
          border: isOver ? '2px dashed #1976d2' : (categoryCards.length === 0 ? '2px dashed #ccc' : '2px solid #e0e0e0'),
          borderRadius: 12,
          boxShadow: isOver ? '0 4px 24px #1976d244' : '0 2px 12px #0001',
          padding: '20px 24px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          height: 280,
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          transform: isOver ? 'scale(1.02)' : 'scale(1)',
          opacity: categoryCards.length === 0 && !isOver ? 0.7 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isOver) {
            e.currentTarget.style.boxShadow = '0 4px 24px #1976d244';
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.borderColor = '#1976d2';
          }
        }}
        onMouseLeave={(e) => {
          if (!isOver) {
            e.currentTarget.style.boxShadow = '0 2px 12px #0001';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = '#e0e0e0';
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
              <span style={{ fontSize: 20 }}>{category.icon}</span>
              {category.name}
              {isOver && <span style={{ fontSize: 12, color: '#4caf50', fontWeight: 500 }}>Drop here!</span>}
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
                category: '',
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
                isWebLinkOnly: false,
                budgetType: null,
                budgetAmount: null,
                budgetPeriod: null,
                budgetCategory: category.id,
                budgetSubcategory: null,
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
            title={`Add new card to ${category.name}`}
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
          padding: '8px 0',
          minHeight: isOver && categoryCards.length === 0 ? 80 : undefined,
        }}>
          {categoryCards.slice(0, 24).map((tile) => (
            tile.logo && <DraggableHomeCard key={tile.id} tile={tile} categoryId={category.id} />
          ))}
          {categoryCards.length > 24 && (
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
              +{categoryCards.length - 24}
            </div>
          )}
          {categoryCards.length === 0 && (
            <div style={{ 
              color: isOver ? '#1976d2' : '#999', 
              fontSize: 14, 
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              flexDirection: 'column',
              gap: 8,
            }}>
              <span style={{ fontSize: 32, opacity: isOver ? 1 : 0.5 }}>📥</span>
              <span>{isOver ? `Drop to add to ${category.name}` : 'Drag cards here'}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // New component: Displays TILES based on Budget Categories (replacing tab-based grouping)
  function SortableBudgetCategoryTile({ category }: { category: BudgetCategory }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: category.id,
    });
    
    // Filter cards that belong to this budget category
    const categoryCards = tiles.filter(t => t.budgetCategory === category.id);
    
    // Calculate monthly and annual spend for this category
    const monthlySpend = categoryCards.reduce((sum, tile) => {
      const amount = parseFloat(String(tile.budgetAmount || tile.paymentAmount || 0));
      const period = tile.budgetPeriod || tile.paymentFrequency;
      return period === 'Monthly' ? sum + amount : sum;
    }, 0);
    const annualSpend = categoryCards.reduce((sum, tile) => {
      const amount = parseFloat(String(tile.budgetAmount || tile.paymentAmount || 0));
      const period = tile.budgetPeriod || tile.paymentFrequency;
      return period === 'Annually' ? sum + amount : sum;
    }, 0);

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      zIndex: isDragging ? 100 : 1,
    };

    // Don't render if no cards in this category
    if (categoryCards.length === 0) return null;

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
              // Navigate to detailed view for this category
              setMainMenu('home');
              setActiveTab(category.id); // Use category ID as active "tab"
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
                <span style={{ fontSize: 20 }}>{category.icon}</span>
                {category.name}
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
                  category: '', // Deprecated - keeping for backward compatibility
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
                  // Set budget category for new card
                  isWebLinkOnly: false,
                  budgetType: null,
                  budgetAmount: null,
                  budgetPeriod: null,
                  budgetCategory: category.id,
                  budgetSubcategory: null,
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
              title={`Add new card to ${category.name}`}
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
            {categoryCards.slice(0, 24).map((tile) => {
              const paymentDueSoon = isPaymentDueSoon(tile, 5);
              // Budget type color for home page cards
              const getBudgetColor = () => {
                if (tile.isWebLinkOnly) return '#9E9E9E'; // Medium Grey
                switch (tile.budgetType) {
                  case 'Bill': return '#4169E1'; // Royal Blue
                  case 'Subscription': return '#87CEEB'; // Light Blue
                  case 'Expense': return '#FF6B6B'; // Light Red
                  case 'Savings': return '#4CAF50'; // Green
                  default: return null;
                }
              };
              const budgetColor = getBudgetColor();
              const budgetTypeLabel = tile.isWebLinkOnly ? 'Web Link Only' : tile.budgetType;
              
              return tile.logo && (
                <div
                  key={tile.id}
                  style={{
                    position: 'relative',
                    flexShrink: 0,
                  }}
                  className="home-card-wrapper"
                >
                  <a
                    href={tile.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`${tile.name}${tile.description ? ` - ${tile.description}` : ''}${budgetTypeLabel ? `\n📊 ${budgetTypeLabel}` : ''}${tile.budgetAmount ? ` - ${formatCurrency(tile.budgetAmount)}/${tile.budgetPeriod === 'Monthly' ? 'mo' : 'yr'}` : ''}${paymentDueSoon ? '\n⚠️ Payment due soon!' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      trackSession(tile.id, tile.name);
                    }}
                    style={{
                      textDecoration: 'none',
                      display: 'block',
                    }}
                  >
                    <img
                      src={tile.logo}
                      alt={tile.name}
                      className={paymentDueSoon ? 'home-card-payment-due' : ''}
                      style={{
                        width: 40,
                        height: 40,
                        objectFit: 'contain',
                        borderRadius: 6,
                        background: '#f9f9f9',
                        padding: 4,
                        border: paymentDueSoon ? '2px solid #ff9800' : '1px solid #e0e0e0',
                        borderTop: budgetColor ? `3px solid ${budgetColor}` : undefined,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        animation: paymentDueSoon ? 'homeCardGlow 2s ease-in-out infinite' : 'none',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.15)';
                        e.currentTarget.style.boxShadow = paymentDueSoon 
                          ? '0 0 12px 4px rgba(255, 152, 0, 0.6)' 
                          : '0 2px 8px rgba(25, 118, 210, 0.3)';
                        const hoverBorderColor = paymentDueSoon ? '#ff9800' : '#1976d2';
                        e.currentTarget.style.borderLeftColor = hoverBorderColor;
                        e.currentTarget.style.borderRightColor = hoverBorderColor;
                        e.currentTarget.style.borderBottomColor = hoverBorderColor;
                        if (budgetColor) {
                          e.currentTarget.style.borderTopColor = budgetColor;
                        } else {
                          e.currentTarget.style.borderTopColor = hoverBorderColor;
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = paymentDueSoon ? '' : 'none';
                        const defaultBorderColor = paymentDueSoon ? '#ff9800' : '#e0e0e0';
                        e.currentTarget.style.borderLeftColor = defaultBorderColor;
                        e.currentTarget.style.borderRightColor = defaultBorderColor;
                        e.currentTarget.style.borderBottomColor = defaultBorderColor;
                        if (budgetColor) {
                          e.currentTarget.style.borderTopColor = budgetColor;
                        } else {
                          e.currentTarget.style.borderTopColor = defaultBorderColor;
                        }
                      }}
                    />
                  </a>
                  {/* Edit button - appears on hover via CSS */}
                  <button
                    className="home-card-edit-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleEditTile(tile.id);
                    }}
                    title="Edit card"
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      border: 'none',
                      background: '#1976d2',
                      color: '#fff',
                      fontSize: 10,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 0.2s ease, transform 0.2s ease',
                      zIndex: 10,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    }}
                  >
                    ✏️
                  </button>
                </div>
              );
            })}
            {categoryCards.length > 24 && (
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
                +{categoryCards.length - 24}
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
    // Budget fields
    isWebLinkOnly: false,
    budgetType: null,
    budgetAmount: null,
    budgetPeriod: null,
    budgetCategory: null,
    budgetSubcategory: null,
  });
  const [editTileId, setEditTileId] = useState<number | null>(null);
  const [editingTabIndex, setEditingTabIndex] = useState<number | null>(null);
  const [tabFormName, setTabFormName] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tileToDeleteId, setTileToDeleteId] = useState<number | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreData, setRestoreData] = useState<any>(null);
  const [showSimpleImportModal, setShowSimpleImportModal] = useState(false);
  const [importTextarea, setImportTextarea] = useState('');
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
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Active Sessions tracking
  interface ActiveSession {
    tileId: number;
    tileName: string;
    openedAt: number;
  }
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>(() => {
    const saved = localStorage.getItem('activeSessions');
    if (!saved) return [];
    const sessions = JSON.parse(saved);
    // Filter out expired sessions (older than 8 hours)
    const eightHoursAgo = Date.now() - (8 * 60 * 60 * 1000);
    return sessions.filter((s: ActiveSession) => s.openedAt > eightHoursAgo);
  });
  
  useEffect(() => {
    localStorage.setItem('activeSessions', JSON.stringify(activeSessions));
  }, [activeSessions]);
  
  const trackSession = (tileId: number, tileName: string) => {
    // Check if already active
    if (activeSessions.some(s => s.tileId === tileId)) return;
    
    setActiveSessions(prev => [...prev, {
      tileId,
      tileName,
      openedAt: Date.now()
    }]);
  };
  
  const closeSession = (tileId: number) => {
    setActiveSessions(prev => prev.filter(s => s.tileId !== tileId));
  };
  
  const closeAllSessions = () => {
    setActiveSessions([]);
  };
  
  const formatSessionDuration = (openedAt: number) => {
    const minutes = Math.floor((Date.now() - openedAt) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };
  
  // Payment Method Management State (formerly Credit Card)
  const [showCreditCardModal, setShowCreditCardModal] = useState(false);
  const [creditCardModalMode, setCreditCardModalMode] = useState<'add' | 'edit'>('add');
  const [creditCardForm, setCreditCardForm] = useState<{
    name: string;
    last4: string;
    methodType: PaymentMethodType;
    bankName: string;
    accountType: 'Checking' | 'Savings';
    routingLast4: string;
  }>({ 
    name: '', 
    last4: '', 
    methodType: 'Credit Card',
    bankName: '',
    accountType: 'Checking',
    routingLast4: '',
  });
  const [editingCreditCardId, setEditingCreditCardId] = useState<string | null>(null);
  
  // Budget Category Management State
  const [showBudgetCategoryModal, setShowBudgetCategoryModal] = useState(false);
  const [budgetCategoryModalMode, setBudgetCategoryModalMode] = useState<'add' | 'edit'>('add');
  const [budgetCategoryForm, setBudgetCategoryForm] = useState<{
    name: string;
    icon: string;
    subcategories: string;  // Comma-separated for easy editing
  }>({ 
    name: '', 
    icon: '📁',
    subcategories: '',
  });
  const [editingBudgetCategoryId, setEditingBudgetCategoryId] = useState<string | null>(null);
  
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
    // Validate that activeTab is a valid budget category ID (or empty/special values)
    if (activeTab !== '' && activeTab !== 'APP Report' && !budgetCategories.find(cat => cat.id === activeTab)) {
      setActiveTab(''); // Reset to home if category doesn't exist
    }
  }, [budgetCategories, activeTab]);
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
      // Budget fields
      isWebLinkOnly: tile.isWebLinkOnly || false,
      budgetType: tile.budgetType || null,
      budgetAmount: tile.budgetAmount || null,
      budgetPeriod: tile.budgetPeriod || null,
      budgetCategory: tile.budgetCategory || null,
      budgetSubcategory: tile.budgetSubcategory || null,
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
    // Fix floating point precision for monetary values
    const fixedForm = {
      ...form,
      budgetAmount: form.budgetAmount !== null && form.budgetAmount !== undefined 
        ? Math.round(form.budgetAmount * 100) / 100 
        : null,
      paymentAmount: form.paymentAmount !== null && form.paymentAmount !== undefined 
        ? Math.round(form.paymentAmount * 100) / 100 
        : null,
    };
    if (editTileId !== null) {
      setTiles(tiles =>
        tiles.map(t =>
          t.id === editTileId
            ? { ...t, ...fixedForm }
            : t
        )
      );
    } else {
      setTiles([...tiles, { ...fixedForm, id: Date.now() + Math.random() }]);
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
  
  // Payment Method Management Functions (formerly Credit Card)
  const openAddCreditCardModal = () => {
    setCreditCardModalMode('add');
    setCreditCardForm({ 
      name: '', 
      last4: '', 
      methodType: 'Credit Card',
      bankName: '',
      accountType: 'Checking',
      routingLast4: '',
    });
    setShowCreditCardModal(true);
    setEditingCreditCardId(null);
  };
  
  const openEditCreditCardModal = (id: string) => {
    const card = creditCards.find(cc => cc.id === id);
    if (!card) return;
    setCreditCardModalMode('edit');
    setCreditCardForm({ 
      name: card.name, 
      last4: card.last4,
      methodType: card.methodType || 'Credit Card',
      bankName: card.bankName || '',
      accountType: card.accountType || 'Checking',
      routingLast4: card.routingLast4 || '',
    });
    setShowCreditCardModal(true);
    setEditingCreditCardId(id);
  };
  
  const handleCreditCardFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = creditCardForm.name.trim();
    const last4 = creditCardForm.last4.trim();
    const methodType = creditCardForm.methodType;
    const bankName = creditCardForm.bankName.trim();
    const accountType = creditCardForm.accountType;
    const routingLast4 = creditCardForm.routingLast4.trim();
    
    // Validation based on method type
    if (!name) {
      alert('Please enter a name');
      return;
    }
    
    if (methodType === 'Credit Card') {
      if (!last4 || !/^\d{4}$/.test(last4)) {
        alert('Please enter the last 4 digits of the card');
        return;
      }
    } else if (methodType === 'ACH') {
      if (!bankName) {
        alert('Please enter the bank name');
        return;
      }
      if (!last4 || !/^\d{4}$/.test(last4)) {
        alert('Please enter the last 4 digits of the account');
        return;
      }
    } else if (methodType === 'Check') {
      if (!bankName) {
        alert('Please enter the bank name');
        return;
      }
    }
    // Cash doesn't require additional fields
    
    const newCard: CreditCard = {
      id: editingCreditCardId || Date.now().toString(),
      name,
      last4: methodType === 'Cash' ? '' : last4,
      methodType,
      bankName: (methodType === 'ACH' || methodType === 'Check') ? bankName : undefined,
      accountType: methodType === 'ACH' ? accountType : undefined,
      routingLast4: methodType === 'ACH' ? routingLast4 : undefined,
    };
    
    if (creditCardModalMode === 'add') {
      // Check for duplicates
      if (creditCards.some(cc => cc.name === name && cc.methodType === methodType)) {
        alert('A payment method with this name already exists');
        return;
      }
      setCreditCards([...creditCards, newCard]);
    } else if (editingCreditCardId !== null) {
      // Check for duplicates (excluding current card)
      if (creditCards.some(cc => cc.name === name && cc.methodType === methodType && cc.id !== editingCreditCardId)) {
        alert('A payment method with this name already exists');
        return;
      }
      setCreditCards(creditCards.map(cc =>
        cc.id === editingCreditCardId ? newCard : cc
      ));
    }
    
    setShowCreditCardModal(false);
    setEditingCreditCardId(null);
    setCreditCardForm({ 
      name: '', 
      last4: '', 
      methodType: 'Credit Card',
      bankName: '',
      accountType: 'Checking',
      routingLast4: '',
    });
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
  
  // Budget Category Management Functions
  const openAddBudgetCategoryModal = () => {
    setBudgetCategoryModalMode('add');
    setBudgetCategoryForm({ 
      name: '', 
      icon: '📁',
      subcategories: '',
    });
    setShowBudgetCategoryModal(true);
    setEditingBudgetCategoryId(null);
  };
  
  const openEditBudgetCategoryModal = (id: string) => {
    const category = budgetCategories.find(bc => bc.id === id);
    if (!category) return;
    setBudgetCategoryModalMode('edit');
    setBudgetCategoryForm({ 
      name: category.name, 
      icon: category.icon,
      subcategories: category.subcategories.join(', '),
    });
    setShowBudgetCategoryModal(true);
    setEditingBudgetCategoryId(id);
  };
  
  const handleBudgetCategoryFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = budgetCategoryForm.name.trim();
    const icon = budgetCategoryForm.icon.trim() || '📁';
    const subcategories = budgetCategoryForm.subcategories
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    if (!name) {
      alert('Please enter a category name');
      return;
    }
    
    const newCategory: BudgetCategory = {
      id: editingBudgetCategoryId || Date.now().toString(),
      name,
      icon,
      subcategories,
    };
    
    if (budgetCategoryModalMode === 'add') {
      // Check for duplicates
      if (budgetCategories.some(bc => bc.name.toLowerCase() === name.toLowerCase())) {
        alert('A budget category with this name already exists');
        return;
      }
      setBudgetCategories([...budgetCategories, newCategory]);
    } else if (editingBudgetCategoryId !== null) {
      // Check for duplicates (excluding current)
      if (budgetCategories.some(bc => bc.name.toLowerCase() === name.toLowerCase() && bc.id !== editingBudgetCategoryId)) {
        alert('A budget category with this name already exists');
        return;
      }
      setBudgetCategories(budgetCategories.map(bc =>
        bc.id === editingBudgetCategoryId ? newCategory : bc
      ));
    }
    
    setShowBudgetCategoryModal(false);
    setEditingBudgetCategoryId(null);
    setBudgetCategoryForm({ 
      name: '', 
      icon: '📁',
      subcategories: '',
    });
  };
  
  const handleDeleteBudgetCategory = (id: string) => {
    const category = budgetCategories.find(bc => bc.id === id);
    if (!category) return;
    
    // Check if any tiles are using this category
    const tilesUsingCategory = tiles.filter(t => t.budgetCategory === id);
    if (tilesUsingCategory.length > 0) {
      if (!window.confirm(`This category is used by ${tilesUsingCategory.length} card(s). Deleting it will remove the category from those cards. Continue?`)) {
        return;
      }
      // Remove category reference from tiles
      setTiles(tiles.map(t => 
        t.budgetCategory === id ? { ...t, budgetCategory: null, budgetSubcategory: null } : t
      ));
    }
    
    setBudgetCategories(budgetCategories.filter(bc => bc.id !== id));
  };
  
  const resetBudgetCategoriesToDefault = () => {
    if (window.confirm('This will reset all budget categories to the default list. Any custom categories will be lost. Continue?')) {
      setBudgetCategories(defaultBudgetCategories);
    }
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
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data && (data.tiles || data.tabs)) {
          setRestoreData(data); // Store the entire backup data
          setShowRestoreModal(true);
        } else {
          alert('Invalid backup file.');
        }
      } catch (error) {
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
          // Note: financeTiles state is managed within FinanceManagementPage component
          // The reload below will restore it from localStorage
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
  
  function handleSimpleImport() {
    try {
      const data = JSON.parse(importTextarea);
      
      // Restore all data
      if (data.tiles) {
        localStorage.setItem('tiles', JSON.stringify(data.tiles));
        setTiles(data.tiles);
      }
      if (data.tabs) {
        localStorage.setItem('tabs', JSON.stringify(data.tabs));
        setTabs(data.tabs);
        setActiveTab(data.tabs[0]?.name || '');
      }
      if (data.financeTiles) {
        localStorage.setItem('financeTiles', JSON.stringify(data.financeTiles));
        // Note: financeTiles state is managed within FinanceManagementPage component
        // The reload below will restore it from localStorage
      }
      if (data.homePageTabs) {
        localStorage.setItem('homePageTabs', JSON.stringify(data.homePageTabs));
        setHomePageTabs(data.homePageTabs);
        if (data.homePageTabs.length > 0) {
          setSelectedHomePageTab(data.homePageTabs[0].id);
        }
      }
      if (data.creditCards) {
        localStorage.setItem('creditCards', JSON.stringify(data.creditCards));
        setCreditCards(data.creditCards);
      }
      if (data.stockSymbols) {
        localStorage.setItem('stockSymbols', JSON.stringify(data.stockSymbols));
        setStockSymbols(data.stockSymbols);
      }
      if (data.expandedHomePageTabs) {
        localStorage.setItem('expandedHomePageTabs', JSON.stringify(data.expandedHomePageTabs));
        setExpandedHomePageTabs(new Set(data.expandedHomePageTabs));
      }
      if (data.pickedFolders) {
        localStorage.setItem('pickedFolders', JSON.stringify(data.pickedFolders));
        setPickedFolders(data.pickedFolders);
      }
      if (data.bannerTitle) {
        localStorage.setItem('bannerTitle', data.bannerTitle);
        setBannerTitle(data.bannerTitle);
      }
      if (data.lastPaymentsReminderShown) {
        localStorage.setItem('lastPaymentsReminderShown', data.lastPaymentsReminderShown);
      }
      
      setShowSimpleImportModal(false);
      setImportTextarea('');
      alert('Data imported successfully! The page will reload.');
      window.location.reload();
    } catch (error) {
      alert('Error importing data. Make sure you pasted valid JSON: ' + error);
    }
  }
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );
  
  // Filter tiles by budget category (activeTab now holds category ID)
  const filteredTiles = tiles.filter(tile => tile.budgetCategory === activeTab);
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
          trackSession(tile.id, tile.name);
        }
      } else {
        // Track session for web and protocol apps
        trackSession(tile.id, tile.name);
      }
      // For 'web' and 'protocol' types, the default anchor behavior handles it
    };
    
    // Check if payment is due within 5 days
    const paymentDueSoon = isPaymentDueSoon(tile, 5);
    
    // Get budget type color for top edge
    const getBudgetTypeColor = () => {
      if (tile.isWebLinkOnly) return '#9E9E9E'; // Medium Grey
      switch (tile.budgetType) {
        case 'Bill': return '#4169E1'; // Royal Blue
        case 'Subscription': return '#87CEEB'; // Light Blue
        case 'Expense': return '#FF6B6B'; // Light Red
        case 'Savings': return '#4CAF50'; // Green
        default: return 'transparent';
      }
    };
    
    const budgetTypeColor = getBudgetTypeColor();
    const hasBudgetType = tile.budgetType || tile.isWebLinkOnly;
    
    // Build tooltip with budget type
    const getBudgetTypeLabel = () => {
      if (tile.isWebLinkOnly) return 'Web Link Only';
      return tile.budgetType || '';
    };
    
    return (
      <a
        className={`tile${paymentDueSoon ? ' payment-due-soon' : ''}`}
        href={tile.appType === 'local' && !tile.link ? '#' : tile.link}
        target="_blank"
        rel="noopener noreferrer"
        ref={setNodeRef}
        onClick={handleTileClick}
        title={`${tile.name}${tile.description ? ` - ${tile.description}` : ''}${hasBudgetType ? `\n📊 ${getBudgetTypeLabel()}` : ''}${tile.budgetAmount ? ` - ${formatCurrency(tile.budgetAmount)}/${tile.budgetPeriod === 'Monthly' ? 'mo' : 'yr'}` : ''}${paymentDueSoon ? '\n⚠️ Payment due soon!' : ''}`}
        style={{
          position: 'relative',
          textDecoration: 'none',
          color: 'inherit',
          userSelect: 'none',
          transform: CSS.Transform.toString(transform),
          transition,
          boxShadow: isDragging
            ? '0 8px 32px #1976d244'
            : undefined, // Let CSS handle the box-shadow for glow effect
          zIndex: isDragging ? 100 : undefined,
          cursor: 'pointer',
          borderTop: hasBudgetType ? `4px solid ${budgetTypeColor}` : undefined,
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
            {tile.budgetType && (
              <span 
                style={{ marginLeft: 8, fontSize: 12 }} 
                title={`Budget: ${tile.budgetType}${tile.budgetAmount ? ` - ${formatCurrency(tile.budgetAmount)}/${tile.budgetPeriod === 'Monthly' ? 'mo' : 'yr'}` : ''}`}
              >
                {tile.budgetType === 'Bill' && '💡'}
                {tile.budgetType === 'Subscription' && '🔄'}
                {tile.budgetType === 'Expense' && '💳'}
                {tile.budgetType === 'Savings' && '💰'}
              </span>
            )}
            {tile.isWebLinkOnly && (
              <span style={{ marginLeft: 8, fontSize: 11, color: '#9e9e9e' }} title="Web Link Only (no budget tracking)">🔗</span>
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

  if (showLanding) {
    return <LandingPage onLogin={() => setShowLanding(false)} />;
  }

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
          overflowY: 'auto',
          overflowX: 'hidden',
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
          backgroundColor: 'transparent',
        }}>
          <img
            src={wamsLogo}
            alt="WAMS logo"
            style={{ 
              maxWidth: '120px',
              width: '100%', 
              height: 'auto', 
              objectFit: 'contain',
              filter: 'invert(1)', 
              mixBlendMode: 'screen',
              display: 'block',
              backgroundColor: 'transparent',
            }}
          />
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
                  marginBottom: 2,
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
              <div
                onClick={() => { setMainMenu('reports'); setActiveReport('budget'); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 0 8px 8px',
                  cursor: 'pointer',
                  color: activeReport === 'budget' ? '#fff' : '#bbdefb',
                  fontWeight: activeReport === 'budget' ? 700 : 500,
                  background: activeReport === 'budget' ? '#64b5f6' : 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  transition: 'background 0.2s, color 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (activeReport !== 'budget') {
                    e.currentTarget.style.background = '#64b5f633';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeReport !== 'budget') {
                    e.currentTarget.style.background = 'none';
                  }
                }}
              >
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Budget Report</span>
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
            <div
              onClick={() => setShowSimpleImportModal(true)}
              title="Simple Import (Paste JSON)"
              style={{
                background: '#4caf50',
                color: '#fff',
                borderRadius: '50%',
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 20,
                boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#45a049';
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#4caf50';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(76, 175, 80, 0.3)';
              }}
              role="button"
              aria-label="Simple Import"
            >
              📋
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
          <div style={{ padding: '24px 24px', maxWidth: '100%', overflow: 'hidden' }}>
            {/* Breadcrumb Navigation */}
            <div style={{ 
              fontSize: 14, 
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
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
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 16 }}>
              <h1 style={{ color: '#1976d2', fontSize: 32, fontWeight: 700, margin: 0, flexShrink: 0 }}>Home Page</h1>
              
              {/* Spacer to push search to the right */}
              <div style={{ flex: 1 }} />
              
              {/* Search Bar */}
              <div style={{ position: 'relative', width: 220, flexShrink: 0, marginRight: 40 }}>
                <input
                  type="text"
                  placeholder="🔍 Search for a web tile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    fontSize: 14,
                    border: '2px solid #e0e0e0',
                    borderRadius: 8,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#1976d2'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e0e0e0'}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 16,
                      color: '#999',
                      padding: 2,
                    }}
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
                
                {/* Search Results Dropdown */}
                {searchQuery.trim() && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    background: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: 8,
                    maxHeight: 300,
                    overflowY: 'auto',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 100,
                  }}>
                    {(() => {
                      const results = tiles.filter(tile => 
                        tile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        tile.description.toLowerCase().includes(searchQuery.toLowerCase())
                      );
                      
                      if (results.length === 0) {
                        return (
                          <div style={{ padding: 16, textAlign: 'center', color: '#999', fontSize: 13 }}>
                            No tiles found
                          </div>
                        );
                      }
                      
                      return results.slice(0, 8).map(tile => {
                        const category = budgetCategories.find(c => c.id === tile.budgetCategory);
                        return (
                          <div
                            key={tile.id}
                            onClick={() => {
                              // Navigate to category view or edit the tile
                              if (tile.budgetCategory) {
                                setActiveTab(tile.budgetCategory);
                              }
                              setSearchQuery('');
                            }}
                            style={{
                              padding: '10px 12px',
                              borderBottom: '1px solid #f0f0f0',
                              cursor: 'pointer',
                              transition: 'background 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                          >
                            <div style={{ fontWeight: 600, color: '#1976d2', fontSize: 13 }}>
                              {tile.name}
                            </div>
                            <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                              {category ? `${category.icon} ${category.name}` : 'Uncategorized'}
                              {tile.budgetSubcategory && ` • ${tile.budgetSubcategory}`}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
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
              
              {/* Main Content - Budget Category TILES containing CARDS */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Get categories that have at least one card */}
                {(() => {
                  // Show all categories when dragging OR when there are uncategorized cards that need a home
                  const hasUncategorizedCards = tiles.some(t => !t.budgetCategory);
                  const categoriesToShow = (activeCardId || hasUncategorizedCards)
                    ? budgetCategories // Show all categories when dragging or when cards need categorizing
                    : budgetCategories.filter(cat => tiles.some(t => t.budgetCategory === cat.id));
                  
                  // Also check for uncategorized cards (cards without budgetCategory)
                  const uncategorizedCards = tiles.filter(t => !t.budgetCategory);
                  
                  // Handler for card drag between categories
                  const handleCardDragEnd = (event: any) => {
                    const { active, over } = event;
                    setActiveCardId(null);
                    
                    if (!over) return;
                    
                    const activeIdStr = String(active.id);
                    const overIdStr = String(over.id);
                    
                    // Check if we're dropping a card onto a category
                    if (activeIdStr.startsWith('card-') && overIdStr.startsWith('category-')) {
                      const cardIdStr = activeIdStr.replace('card-', '');
                      const cardId = parseFloat(cardIdStr);
                      const targetCategoryId = overIdStr.replace('category-', '');
                      
                      // Update the card's category
                      setTiles(prevTiles => prevTiles.map(t => 
                        (t.id === cardId || t.id.toString() === cardIdStr)
                          ? { ...t, budgetCategory: targetCategoryId, budgetSubcategory: null }
                          : t
                      ));
                    }
                  };
                  
                  return (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={pointerWithin}
                      onDragStart={(event) => {
                        if (event.active.id.toString().startsWith('card-')) {
                          const cardId = parseInt(event.active.id.toString().replace('card-', ''));
                          setActiveCardId(cardId);
                        }
                      }}
                      onDragEnd={handleCardDragEnd}
                      onDragCancel={() => setActiveCardId(null)}
                    >
                      <div style={{ 
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))',
                        gap: 24,
                        alignItems: 'stretch',
                        width: '100%',
                        maxWidth: '100%',
                      }}>
                        {categoriesToShow.map((category) => (
                          <DroppableCategoryTile key={category.id} category={category} />
                        ))}
                      </div>
                      
                      {/* Drag Overlay - Shows the card being dragged */}
                      <DragOverlay zIndex={9999} dropAnimation={null}>
                        {activeCard && activeCard.logo && (
                          <div style={{
                            background: '#fff',
                            borderRadius: 8,
                            padding: 8,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                            border: '2px solid #1976d2',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            cursor: 'grabbing',
                          }}>
                            <img
                              src={activeCard.logo}
                              alt={activeCard.name}
                              style={{
                                width: 40,
                                height: 40,
                                objectFit: 'contain',
                                borderRadius: 6,
                              }}
                            />
                            <span style={{ fontWeight: 600, fontSize: 13, color: '#333' }}>
                              {activeCard.name}
                            </span>
                          </div>
                        )}
                      </DragOverlay>
                      
                      {/* Uncategorized Cards Section */}
                      {uncategorizedCards.length > 0 && (
                        <div style={{ marginTop: 24 }}>
                          <div style={{
                            background: '#fff8e1',
                            border: '2px solid #ffc107',
                            borderRadius: 12,
                            padding: '20px 24px',
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              borderBottom: '2px solid #ffc107',
                              paddingBottom: 12,
                              marginBottom: 16,
                            }}>
                              <h2 style={{ 
                                color: '#f57c00', 
                                fontSize: 18, 
                                fontWeight: 700, 
                                margin: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                              }}>
                                <span style={{ fontSize: 20 }}>⚠️</span>
                                Uncategorized ({uncategorizedCards.length} cards need a category)
                              </h2>
                            </div>
                            <div style={{ 
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: 12,
                              alignContent: 'flex-start',
                            }}>
                              {uncategorizedCards.slice(0, 24).map((tile) => (
                                tile.logo 
                                  ? <DraggableHomeCard key={tile.id} tile={tile} categoryId="uncategorized" />
                                  : (
                                    <div
                                      key={tile.id}
                                      style={{
                                        position: 'relative',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '8px 12px',
                                        paddingRight: 32,
                                        background: '#fff',
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                        border: '1px solid #e0e0e0',
                                        transition: 'all 0.2s ease',
                                      }}
                                      onClick={() => handleEditTile(tile.id)}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = '#1976d2';
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(25, 118, 210, 0.2)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = '#e0e0e0';
                                        e.currentTarget.style.boxShadow = 'none';
                                      }}
                                      title="Click to edit and assign a category"
                                    >
                                      <span style={{ 
                                        width: 24, 
                                        height: 24, 
                                        background: '#e0e0e0', 
                                        borderRadius: 4,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 12,
                                        color: '#666',
                                      }}>
                                        {tile.name.charAt(0).toUpperCase()}
                                      </span>
                                      <span style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>
                                        {tile.name}
                                      </span>
                                      {/* Delete button */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteTile(tile.id);
                                        }}
                                        style={{
                                          position: 'absolute',
                                          right: 4,
                                          top: '50%',
                                          transform: 'translateY(-50%)',
                                          width: 20,
                                          height: 20,
                                          borderRadius: '50%',
                                          border: 'none',
                                          background: '#ffebee',
                                          color: '#e53935',
                                          fontSize: 12,
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          transition: 'all 0.2s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = '#e53935';
                                          e.currentTarget.style.color = '#fff';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = '#ffebee';
                                          e.currentTarget.style.color = '#e53935';
                                        }}
                                        title="Delete this card"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  )
                              ))}
                              {uncategorizedCards.length > 24 && (
                                <div style={{
                                  padding: '8px 12px',
                                  background: '#f0f0f0',
                                  borderRadius: 6,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: '#666',
                                }}>
                                  +{uncategorizedCards.length - 24} more
                                </div>
                              )}
                            </div>
                            <div style={{ 
                              marginTop: 8, 
                              fontSize: 12, 
                              color: '#f57c00', 
                              fontStyle: 'italic' 
                            }}>
                              💡 Tip: Drag cards to a category tile above to organize them
                            </div>
                          </div>
                        </div>
                      )}
                    </DndContext>
                  );
                })()}
              </div>

              {/* Right Sidebar - Stats & Pie Chart */}
              <div style={{ 
                width: 320, 
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}>
                {(() => {
                  // All tiles are shown (homePageTabs filtering simplified for now)
                  const filteredTiles = tiles;
                  
                  // Get filtered upcoming payments
                  const filteredUpcomingPayments = getUpcomingPaymentsThisMonth(filteredTiles);
                  const today = new Date();
                  const monthName = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                  const totalPaymentAmount = filteredUpcomingPayments.reduce((sum, p) => sum + (p.tile.paymentAmount || 0), 0);
                  
                  // Calculate stats
                  const totalApps = filteredTiles.length;
                  const monthlySpend = filteredTiles.reduce((sum, t) => 
                    sum + (t.paymentFrequency === 'Monthly' && typeof t.paymentAmount === 'number' ? t.paymentAmount : 0), 0
                  );
                  const annualSpend = filteredTiles.reduce((sum, t) => 
                    sum + (t.paymentFrequency === 'Annually' && typeof t.paymentAmount === 'number' ? t.paymentAmount : 0), 0
                  );
                  
                  // Show all active sessions (simplified filtering)
                  const filteredSessions = activeSessions;
                  
                  return (
                    <>
                {/* Active Sessions */}
                <div style={{
                  background: '#e3f2fd',
                  padding: '16px',
                  borderRadius: 8,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                  border: '2px solid #1976d2',
                }}>
                  <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}>
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: 16, 
                      fontWeight: 600, 
                      color: '#1976d2',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}>
                      <span style={{ fontSize: 18 }}>🟢</span> Active Sessions ({filteredSessions.length})
                    </h3>
                    {filteredSessions.length > 0 && (
                      <button
                        onClick={closeAllSessions}
                        style={{
                          background: '#fff',
                          border: '1px solid #e53935',
                          borderRadius: 4,
                          padding: '4px 10px',
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#e53935',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#e53935';
                          e.currentTarget.style.color = '#fff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#fff';
                          e.currentTarget.style.color = '#e53935';
                        }}
                        title="Close all active sessions"
                      >
                        ✕ Close All
                      </button>
                    )}
                  </div>
                  {filteredSessions.length === 0 ? (
                    <div style={{ fontSize: 13, color: '#666', textAlign: 'center', padding: '8px 0' }}>
                      No active sessions. Click a tile to start tracking!
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {filteredSessions.map(session => {
                        const tile = tiles.find(t => t.id === session.tileId);
                        return (
                          <div 
                            key={session.tileId}
                            style={{
                              background: '#fff',
                              padding: '10px 12px',
                              borderRadius: 6,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            }}
                          >
                            {tile?.logo && (
                              <img 
                                src={tile.logo} 
                                alt={session.tileName}
                                style={{ 
                                  width: 24, 
                                  height: 24, 
                                  objectFit: 'contain',
                                  flexShrink: 0,
                                }}
                              />
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ 
                                fontWeight: 600, 
                                fontSize: 13, 
                                color: '#333',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}>
                                {session.tileName}
                              </div>
                              <div style={{ fontSize: 11, color: '#666' }}>
                                {formatSessionDuration(session.openedAt)}
                              </div>
                            </div>
                            <button
                              onClick={() => closeSession(session.tileId)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: 18,
                                color: '#999',
                                padding: 4,
                                lineHeight: 1,
                                transition: 'color 0.2s',
                                flexShrink: 0,
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#e53935'}
                              onMouseLeave={(e) => e.currentTarget.style.color = '#999'}
                              title="Close session"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                {/* This Month's Payments */}
                <div style={{
                  background: '#f5f5f5',
                  padding: '20px',
                  borderRadius: 8,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                  border: '1px solid #e0e0e0',
                }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          marginBottom: 16,
                          paddingBottom: 12,
                          borderBottom: '1px solid #e0e0e0',
                        }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#333' }}>
                              💳 Payments Due for {monthName}
                            </h3>
                            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                              {filteredUpcomingPayments.length} payment{filteredUpcomingPayments.length !== 1 ? 's' : ''} scheduled
                            </div>
                          </div>
                          <div style={{ 
                            fontSize: 20, 
                            fontWeight: 700, 
                            color: '#ff9800',
                          }}>
                            {formatCurrency(totalPaymentAmount)}
                          </div>
                        </div>
                        
                        {filteredUpcomingPayments.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '20px 0', color: '#999', fontSize: 14 }}>
                            ✅ No payments due this month
                          </div>
                        ) : (
                          <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: 8,
                            maxHeight: 600,
                            overflowY: 'auto',
                          }}>
                            {filteredUpcomingPayments.map(({ tile, nextPaymentDate }) => {
                              const paymentDueSoon = isPaymentDueSoon(tile, 5);
                              const paymentDate = new Date(nextPaymentDate);
                              const dayOfMonth = paymentDate.getDate();
                              const dayName = paymentDate.toLocaleDateString('en-US', { weekday: 'short' });
                              
                              return (
                                <div
                                  key={tile.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '10px 12px',
                                    background: paymentDueSoon ? '#fff8e1' : '#fff',
                                    borderRadius: 6,
                                    border: paymentDueSoon ? '1px solid #ff9800' : '1px solid #e0e0e0',
                                    boxShadow: paymentDueSoon ? '0 0 8px rgba(255, 152, 0, 0.2)' : 'none',
                                  }}
                                >
                                  {/* Date Column */}
                                  <div style={{
                                    minWidth: 44,
                                    textAlign: 'center',
                                    padding: '4px 0',
                                    background: paymentDueSoon ? '#ff9800' : '#1976d2',
                                    borderRadius: 4,
                                    color: '#fff',
                                  }}>
                                    <div style={{ fontSize: 10, fontWeight: 500, opacity: 0.9 }}>{dayName}</div>
                                    <div style={{ fontSize: 16, fontWeight: 700 }}>{dayOfMonth}</div>
                                  </div>
                                  
                                  {/* App Info */}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ 
                                      fontWeight: 600, 
                                      fontSize: 14, 
                                      color: '#333',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}>
                                      {tile.name}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#999' }}>
                                      {(() => {
                                        const cat = budgetCategories.find(c => c.id === tile.budgetCategory);
                                        return cat ? `${cat.icon} ${cat.name}` : tile.budgetSubcategory || '-';
                                      })()}
                                    </div>
                                  </div>
                                  
                                  {/* Amount */}
                                  <div style={{ 
                                    fontWeight: 700, 
                                    fontSize: 14, 
                                    color: paymentDueSoon ? '#ff9800' : '#333',
                                    whiteSpace: 'nowrap',
                                  }}>
                                    {formatCurrency(tile.paymentAmount)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
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
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#333' }}>{totalApps}</div>
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
                      {formatCurrency(monthlySpend)}
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
                      {formatCurrency(annualSpend)}
                    </div>
                  </div>
                </div>

                    </>
                  );
                })()}
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
                {(() => {
                  const cat = budgetCategories.find(c => c.id === activeTab);
                  return cat ? `${cat.icon} ${cat.name}` : activeTab;
                })()}
              </span>
            </div>
            
            {/* Search Bar */}
            <div style={{ marginBottom: 24, maxWidth: 600 }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="🔍 Search for a web tile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: 16,
                    border: '2px solid #e0e0e0',
                    borderRadius: 8,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#1976d2'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e0e0e0'}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 20,
                      color: '#999',
                      padding: 4,
                    }}
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
              
              {/* Search Results */}
              {searchQuery.trim() && (
                <div style={{
                  marginTop: 12,
                  background: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: 8,
                  maxHeight: 400,
                  overflowY: 'auto',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}>
                  {(() => {
                    const results = tiles.filter(tile => 
                      tile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      tile.description.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                    
                    if (results.length === 0) {
                      return (
                        <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
                          No tiles found matching "{searchQuery}"
                        </div>
                      );
                    }
                    
                    return results.map(tile => {
                      const category = budgetCategories.find(c => c.id === tile.budgetCategory);
                      return (
                        <div
                          key={tile.id}
                          onClick={() => {
                            if (tile.budgetCategory) {
                              setActiveTab(tile.budgetCategory);
                            }
                            setSearchQuery('');
                          }}
                          style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid #f0f0f0',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                        >
                          <div style={{ fontWeight: 600, color: '#1976d2', marginBottom: 4 }}>
                            {tile.name}
                          </div>
                          <div style={{ fontSize: 14, color: '#666' }}>
                            {tile.description}
                          </div>
                          <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                            {category ? `${category.icon} ${category.name}` : 'Uncategorized'}
                            {tile.budgetSubcategory && ` • ${tile.budgetSubcategory}`}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
            
            {/* Active Category Title Row */}
            {activeTab !== 'APP Report' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 24px 0', minHeight: 48, flexWrap: 'wrap', gap: 12, maxWidth: '100%' }}>
              <h1 style={{ color: '#1976d2', fontSize: 28, fontWeight: 700, margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {(() => {
                  const cat = budgetCategories.find(c => c.id === activeTab);
                  return cat ? `${cat.icon} ${cat.name}` : activeTab;
                })()}
              </h1>
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
                          ref={el => { repickRefs.current[idx] = el; }}
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
                      const cat = budgetCategories.find(c => c.id === tile.budgetCategory);
                      excelData.push([
                        tile.name,
                        tile.description || '',
                        tile.link || '',
                        cat ? `${cat.icon} ${cat.name}` : 'Uncategorized'
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
                        {(() => {
                          const cat = budgetCategories.find(c => c.id === tile.budgetCategory);
                          return cat ? `${cat.icon} ${cat.name}` : '-';
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* BUDGET REPORT PAGE */}
        {mainMenu === 'reports' && activeReport === 'budget' && (
          <div style={{ padding: '32px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h1 style={{ color: '#1976d2', fontSize: 28, fontWeight: 700, margin: 0 }}>Budget Report</h1>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => {
                    // Prepare Excel data grouped by budget type
                    const budgetTypes: Array<{ type: string; tiles: Tile[] }> = [
                      { type: 'Bill', tiles: tiles.filter(t => t.budgetType === 'Bill') },
                      { type: 'Subscription', tiles: tiles.filter(t => t.budgetType === 'Subscription') },
                      { type: 'Expense', tiles: tiles.filter(t => t.budgetType === 'Expense') },
                      { type: 'Savings', tiles: tiles.filter(t => t.budgetType === 'Savings') },
                      { type: 'Web Link Only', tiles: tiles.filter(t => t.isWebLinkOnly || (!t.budgetType && !t.paidSubscription)) },
                    ];
                    
                    const excelData: string[][] = [
                      ['Budget Report'],
                      [],
                    ];
                    
                    let grandTotalMonthly = 0;
                    let grandTotalAnnual = 0;
                    
                    budgetTypes.forEach(({ type, tiles: groupTiles }) => {
                      if (groupTiles.length === 0) return;
                      
                      const sortedTiles = [...groupTiles].sort((a, b) => a.name.localeCompare(b.name));
                      
                      const currentMonth = new Date().toISOString().slice(0, 7);
                      excelData.push([type.toUpperCase()]);
                      excelData.push(['Name', 'Description', 'Subcategory', 'Budget', 'Frequency', 'Actual', 'Difference', 'Annual']);
                      
                      let subtotalBudget = 0;
                      let subtotalActual = 0;
                      let subtotalAnnual = 0;
                      
                      sortedTiles.forEach(tile => {
                        const budget = tile.budgetAmount || tile.paymentAmount || 0;
                        const freq = tile.budgetPeriod || tile.paymentFrequency || '';
                        const monthlyBudget = freq === 'Monthly' ? budget : (freq === 'Annually' ? budget / 12 : 0);
                        const annual = freq === 'Annually' ? budget : (freq === 'Monthly' ? budget * 12 : 0);
                        const actual = tile.budgetHistory?.[currentMonth]?.actual || 0;
                        const difference = monthlyBudget - actual;
                        
                        subtotalBudget += monthlyBudget;
                        subtotalActual += actual;
                        subtotalAnnual += annual;
                        
                        excelData.push([
                          tile.name,
                          tile.description || '',
                          tile.budgetSubcategory || '-',
                          monthlyBudget > 0 ? `$${monthlyBudget.toFixed(2)}` : '-',
                          freq || '-',
                          actual > 0 ? `$${actual.toFixed(2)}` : '-',
                          monthlyBudget > 0 ? `$${difference.toFixed(2)}` : '-',
                          annual > 0 ? `$${annual.toFixed(2)}` : '-',
                        ]);
                      });
                      
                      const subtotalDiff = subtotalBudget - subtotalActual;
                      excelData.push(['', '', '', `${type} Subtotal:`, '', `$${subtotalActual.toFixed(2)}`, `$${subtotalDiff.toFixed(2)}`, `$${subtotalAnnual.toFixed(2)}`]);
                      excelData.push([]);
                      
                      grandTotalMonthly += subtotalBudget;
                      grandTotalAnnual += subtotalAnnual;
                    });
                    
                    // Calculate grand total actual
                    const currentMonthExcel = new Date().toISOString().slice(0, 7);
                    let grandTotalActual = 0;
                    tiles.forEach(tile => {
                      grandTotalActual += tile.budgetHistory?.[currentMonthExcel]?.actual || 0;
                    });
                    const grandTotalDiff = grandTotalMonthly - grandTotalActual;
                    excelData.push(['', '', '', 'GRAND TOTAL:', '', `$${grandTotalActual.toFixed(2)}`, `$${grandTotalDiff.toFixed(2)}`, `$${grandTotalAnnual.toFixed(2)}`]);
                    
                    exportToExcel(excelData, 'budget-report.xls');
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
              // Define budget type groups with colors
              const budgetGroups = [
                { type: 'Bill', label: 'Bills (Fixed)', color: '#4169E1', icon: '💡' },
                { type: 'Subscription', label: 'Subscriptions', color: '#87CEEB', icon: '🔄' },
                { type: 'Expense', label: 'Expenses', color: '#FF6B6B', icon: '💳' },
                { type: 'Savings', label: 'Savings', color: '#4CAF50', icon: '💰' },
                { type: 'WebLinkOnly', label: 'Web Link Only', color: '#9E9E9E', icon: '🔗' },
              ];
              
              let grandTotalMonthly = 0;
              let grandTotalAnnual = 0;
              
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {budgetGroups.map(({ type, label, color, icon }) => {
                    // Filter tiles by budget type
                    const groupTiles = type === 'WebLinkOnly'
                      ? tiles.filter(t => t.isWebLinkOnly || (!t.budgetType && !t.paidSubscription))
                      : tiles.filter(t => t.budgetType === type);
                    
                    if (groupTiles.length === 0) return null;
                    
                    const sortedTiles = [...groupTiles].sort((a, b) => a.name.localeCompare(b.name));
                    const currentMonthKey = new Date().toISOString().slice(0, 7);
                    
                    // Calculate subtotals
                    let subtotalBudget = 0;
                    let subtotalActual = 0;
                    let subtotalAnnual = 0;
                    
                    sortedTiles.forEach(tile => {
                      const amount = tile.budgetAmount || tile.paymentAmount || 0;
                      const freq = tile.budgetPeriod || tile.paymentFrequency || '';
                      const actual = tile.budgetHistory?.[currentMonthKey]?.actual || 0;
                      if (freq === 'Monthly') {
                        subtotalBudget += amount;
                        subtotalAnnual += amount * 12;
                      } else if (freq === 'Annually') {
                        subtotalBudget += amount / 12;
                        subtotalAnnual += amount;
                      }
                      subtotalActual += actual;
                    });
                    
                    // Keep for backward compatibility with grand total
                    const subtotalMonthly = subtotalBudget;
                    grandTotalMonthly += subtotalBudget;
                    grandTotalAnnual += subtotalAnnual;
                    
                    return (
                      <div key={type} style={{
                        background: '#fff',
                        borderRadius: 8,
                        boxShadow: '0 2px 8px #0001',
                        overflow: 'hidden',
                      }}>
                        {/* Group Header */}
                        <div style={{
                          background: '#fff',
                          borderTop: `4px solid ${color}`,
                          padding: '14px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 20 }}>{icon}</span>
                            <span style={{ 
                              fontWeight: 700, 
                              fontSize: 16, 
                              color: '#000',
                            }}>
                              {label} ({sortedTiles.length})
                            </span>
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            gap: 20, 
                            fontWeight: 700,
                            fontSize: 14,
                          }}>
                            <span style={{ color: '#333' }}>Budget: {formatCurrency(subtotalBudget)}</span>
                            <span style={{ color: '#1976d2' }}>Actual: {formatCurrency(subtotalActual)}</span>
                            <span style={{ color: subtotalBudget - subtotalActual >= 0 ? '#4caf50' : '#e53935' }}>
                              Diff: {subtotalBudget - subtotalActual >= 0 ? '+' : ''}{formatCurrency(subtotalBudget - subtotalActual)}
                            </span>
                          </div>
                        </div>
                        
                        {/* Table Header */}
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '1.8fr 1fr 1fr 0.8fr 0.7fr 0.9fr 0.9fr 0.9fr', 
                          gap: 8, 
                          padding: '12px 16px',
                          background: '#f5f5f5',
                          fontWeight: 700, 
                          fontSize: 12,
                          color: '#666',
                          borderBottom: '1px solid #e0e0e0',
                        }}>
                          <div>Name</div>
                          <div>Description</div>
                          <div>Subcategory</div>
                          <div style={{ textAlign: 'right' }}>Budget</div>
                          <div style={{ textAlign: 'center' }}>Freq</div>
                          <div style={{ textAlign: 'right' }}>Actual</div>
                          <div style={{ textAlign: 'right' }}>Difference</div>
                          <div style={{ textAlign: 'right' }}>Annual</div>
                        </div>
                        
                        {/* Table Rows */}
                        {sortedTiles.map(tile => {
                          const budget = tile.budgetAmount || tile.paymentAmount || 0;
                          const freq = tile.budgetPeriod || tile.paymentFrequency || '';
                          const monthlyBudget = freq === 'Monthly' ? budget : (freq === 'Annually' ? budget / 12 : 0);
                          const annual = freq === 'Annually' ? budget : (freq === 'Monthly' ? budget * 12 : 0);
                          
                          // Get current month's actual from budgetHistory
                          const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
                          const actual = tile.budgetHistory?.[currentMonth]?.actual || 0;
                          const difference = monthlyBudget - actual;
                          
                          return (
                            <div key={tile.id} style={{ 
                              display: 'grid', 
                              gridTemplateColumns: '1.8fr 1fr 1fr 0.8fr 0.7fr 0.9fr 0.9fr 0.9fr', 
                              gap: 8, 
                              padding: '10px 16px',
                              borderBottom: '1px solid #f0f0f0',
                              fontSize: 13,
                              color: '#333',
                              alignItems: 'center',
                            }}>
                              <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {tile.name}
                              </div>
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#666', fontSize: 12 }}>
                                {tile.description || '-'}
                              </div>
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#666', fontSize: 12 }}>
                                {tile.budgetSubcategory || '-'}
                              </div>
                              <div style={{ textAlign: 'right', fontWeight: 500 }}>
                                {monthlyBudget > 0 ? formatCurrency(monthlyBudget) : '-'}
                              </div>
                              <div style={{ textAlign: 'center', color: '#666', fontSize: 11 }}>
                                {freq || '-'}
                              </div>
                              <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                                <input
                                  type="checkbox"
                                  checked={actual === monthlyBudget && monthlyBudget > 0}
                                  onChange={(e) => {
                                    if (e.target.checked && monthlyBudget > 0) {
                                      setTiles(prevTiles => prevTiles.map(t => {
                                        if (t.id !== tile.id) return t;
                                        return {
                                          ...t,
                                          budgetHistory: {
                                            ...t.budgetHistory,
                                            [currentMonth]: {
                                              ...t.budgetHistory?.[currentMonth],
                                              budget: monthlyBudget,
                                              actual: monthlyBudget,
                                            }
                                          }
                                        };
                                      }));
                                    }
                                  }}
                                  title="Same as Budget - Click to set Actual equal to Budget amount"
                                  style={{
                                    width: 14,
                                    height: 14,
                                    cursor: 'pointer',
                                    accentColor: '#4caf50',
                                  }}
                                />
                                <input
                                  type="number"
                                  step="0.01"
                                  value={actual || ''}
                                  onChange={(e) => {
                                    const newActual = e.target.value ? Math.round(parseFloat(e.target.value) * 100) / 100 : 0;
                                    setTiles(prevTiles => prevTiles.map(t => {
                                      if (t.id !== tile.id) return t;
                                      return {
                                        ...t,
                                        budgetHistory: {
                                          ...t.budgetHistory,
                                          [currentMonth]: {
                                            ...t.budgetHistory?.[currentMonth],
                                            budget: monthlyBudget,
                                            actual: newActual,
                                          }
                                        }
                                      };
                                    }));
                                  }}
                                  placeholder="0.00"
                                  style={{
                                    width: '65px',
                                    padding: '4px 6px',
                                    border: '1px solid #ddd',
                                    borderRadius: 4,
                                    fontSize: 12,
                                    textAlign: 'right',
                                  }}
                                />
                              </div>
                              <div style={{ 
                                textAlign: 'right', 
                                fontWeight: 600,
                                color: difference >= 0 ? '#4caf50' : '#e53935',
                              }}>
                                {monthlyBudget > 0 ? (
                                  <>
                                    {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
                                  </>
                                ) : '-'}
                              </div>
                              <div style={{ textAlign: 'right', color: '#1976d2', fontWeight: 500 }}>
                                {annual > 0 ? formatCurrency(annual) : '-'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                  
                  {/* Grand Total */}
                  {(() => {
                    // Calculate grand total actual
                    const currentMonthTotal = new Date().toISOString().slice(0, 7);
                    let grandTotalActual = 0;
                    tiles.forEach(tile => {
                      grandTotalActual += tile.budgetHistory?.[currentMonthTotal]?.actual || 0;
                    });
                    const grandTotalDiff = grandTotalMonthly - grandTotalActual;
                    
                    return (
                      <div style={{
                        background: '#1976d2',
                        borderRadius: 8,
                        padding: '20px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}>
                        <span style={{ fontWeight: 700, fontSize: 18, color: '#fff' }}>
                          📊 Grand Total ({new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})
                        </span>
                        <div style={{ display: 'flex', gap: 24, fontWeight: 700, fontSize: 16, color: '#fff' }}>
                          <span>Budget: {formatCurrency(grandTotalMonthly)}</span>
                          <span style={{ color: '#bbdefb' }}>Actual: {formatCurrency(grandTotalActual)}</span>
                          <span style={{ 
                            color: grandTotalDiff >= 0 ? '#a5d6a7' : '#ef9a9a',
                            fontWeight: 700,
                          }}>
                            {grandTotalDiff >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(grandTotalDiff))} {grandTotalDiff >= 0 ? 'Under' : 'Over'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
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
            
            {/* Payment Methods Section */}
            <div style={{ marginBottom: 48 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h2 style={{ color: '#1976d2', fontSize: 24, fontWeight: 600, margin: 0 }}>Payment Methods</h2>
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
                  💳 Add Payment Method
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
                  No payment methods added yet. Click "Add Payment Method" to get started.
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
                    gridTemplateColumns: '1fr 2fr 1fr 100px', 
                    gap: 16, 
                    padding: 16, 
                    background: '#f5f5f5',
                    fontWeight: 700,
                    fontSize: 14,
                    borderBottom: '2px solid #e0e0e0'
                  }}>
                    <div>Type</div>
                    <div>Name</div>
                    <div>Details</div>
                    <div style={{ textAlign: 'center' }}>Actions</div>
                  </div>
                  {/* Group by method type and sort A-Z within each group */}
                  {(['Credit Card', 'ACH', 'Check', 'Cash'] as PaymentMethodType[]).map(methodType => {
                    const methodCards = creditCards
                      .filter(c => (c.methodType || 'Credit Card') === methodType)
                      .sort((a, b) => a.name.localeCompare(b.name));
                    
                    if (methodCards.length === 0) return null;
                    
                    return methodCards.map((card) => {
                      const getTypeIcon = () => {
                        switch (card.methodType || 'Credit Card') {
                          case 'Credit Card': return '💳';
                          case 'ACH': return '🏦';
                          case 'Check': return '📝';
                          case 'Cash': return '💵';
                          default: return '💳';
                        }
                      };
                      
                      const getDetails = () => {
                        const type = card.methodType || 'Credit Card';
                        if (type === 'Credit Card') return `**** ${card.last4}`;
                        if (type === 'ACH') return `${card.bankName} - ${card.accountType} **** ${card.last4}`;
                        if (type === 'Check') return card.bankName || '-';
                        if (type === 'Cash') return '-';
                        return '-';
                      };
                      
                      return (
                        <div 
                          key={card.id}
                          style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '1fr 2fr 1fr 100px', 
                            gap: 16, 
                            padding: 16, 
                            borderBottom: '1px solid #f0f0f0',
                            alignItems: 'center'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 18 }}>{getTypeIcon()}</span>
                            <span style={{ color: '#666', fontSize: 13 }}>{card.methodType || 'Credit Card'}</span>
                          </div>
                          <div style={{ fontWeight: 500 }}>{card.name}</div>
                          <div style={{ color: '#666', fontFamily: 'monospace', fontSize: 13 }}>{getDetails()}</div>
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
                              title="Edit payment method"
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
                              title="Delete payment method"
                            >
                              🗑️
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })}
                </div>
              )}
            </div>
            
            {/* Budget Categories Section */}
            <div style={{ marginBottom: 48 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h2 style={{ color: '#1976d2', fontSize: 24, fontWeight: 600, margin: 0 }}>Budget Categories</h2>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={resetBudgetCategoriesToDefault}
                    style={{
                      background: '#fff3e0',
                      color: '#e65100',
                      border: '2px solid #ff9800',
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
                      e.currentTarget.style.background = '#ff9800';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#fff3e0';
                      e.currentTarget.style.color = '#e65100';
                    }}
                    title="Reset to default categories"
                  >
                    🔄 Reset to Default
                  </button>
                  <button
                    onClick={openAddBudgetCategoryModal}
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
                    ➕ Add Category
                  </button>
                </div>
              </div>
              
              {budgetCategories.length === 0 ? (
                <div style={{ 
                  background: '#f5f5f5', 
                  padding: 32, 
                  borderRadius: 8, 
                  textAlign: 'center',
                  color: '#666' 
                }}>
                  No budget categories defined. Click "Add Category" or "Reset to Default" to get started.
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
                    gridTemplateColumns: '60px 1fr 2fr 100px', 
                    gap: 16, 
                    padding: 16, 
                    background: '#f5f5f5',
                    fontWeight: 700,
                    fontSize: 14,
                    borderBottom: '2px solid #e0e0e0'
                  }}>
                    <div style={{ textAlign: 'center' }}>Icon</div>
                    <div>Category Name</div>
                    <div>Subcategories</div>
                    <div style={{ textAlign: 'center' }}>Actions</div>
                  </div>
                  {budgetCategories.map((category) => (
                    <div 
                      key={category.id}
                      style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '60px 1fr 2fr 100px', 
                        gap: 16, 
                        padding: 16, 
                        borderBottom: '1px solid #f0f0f0',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ textAlign: 'center', fontSize: 24 }}>{category.icon}</div>
                      <div style={{ fontWeight: 500 }}>{category.name}</div>
                      <div style={{ 
                        color: '#666', 
                        fontSize: 13,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {category.subcategories.length > 0 
                          ? category.subcategories.join(', ')
                          : <span style={{ color: '#999', fontStyle: 'italic' }}>No subcategories</span>
                        }
                      </div>
                      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                        <span
                          onClick={() => openEditBudgetCategoryModal(category.id)}
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
                          title="Edit category"
                        >
                          ✏️
                        </span>
                        <span
                          onClick={() => handleDeleteBudgetCategory(category.id)}
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
                          title="Delete category"
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

        {/* Simple Import Modal */}
        {showSimpleImportModal && (
          <Modal onClose={() => { setShowSimpleImportModal(false); setImportTextarea(''); }}>
            <div style={{ padding: '16px 0' }}>
              <h2 style={{ marginBottom: 16 }}>Import Data</h2>
              <p style={{ marginBottom: 16, color: '#666' }}>
                1. Open your backup JSON file in Notepad<br/>
                2. Copy ALL the text (Ctrl+A, Ctrl+C)<br/>
                3. Paste it below and click Import
              </p>
              <textarea
                value={importTextarea}
                onChange={(e) => setImportTextarea(e.target.value)}
                placeholder="Paste your backup JSON here..."
                style={{
                  width: '100%',
                  height: 200,
                  padding: 12,
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  fontSize: 14,
                  fontFamily: 'monospace',
                  marginBottom: 16,
                  resize: 'vertical'
                }}
              />
              <div style={{ textAlign: 'center' }}>
                <button
                  style={{
                    background: '#4caf50',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '10px 20px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginRight: 8,
                  }}
                  onClick={handleSimpleImport}
                  disabled={!importTextarea.trim()}
                >
                  Import Data
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
                  onClick={() => { setShowSimpleImportModal(false); setImportTextarea(''); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </Modal>
        )}
        
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
              {/* Category Section - Uses Budget Categories */}
              <div style={{ 
                padding: 12, 
                background: '#e3f2fd', 
                borderRadius: 8,
                border: '1px solid #90caf9',
                marginTop: 8,
              }}>
                <div style={{ fontWeight: 600, color: '#1976d2', marginBottom: 8, fontSize: 14 }}>
                  📂 Category (Required)
                </div>
                <label style={{ display: 'block' }}>
                  <select
                    value={form.budgetCategory || ''}
                    onChange={e => {
                      const categoryId = e.target.value || null;
                      setForm(f => ({ 
                        ...f, 
                        budgetCategory: categoryId,
                        budgetSubcategory: null, // Reset subcategory when category changes
                        // Also update legacy category field for backward compatibility
                        category: categoryId ? (budgetCategories.find(c => c.id === categoryId)?.name || '') : '',
                      }));
                    }}
                    style={{ width: '100%', padding: 10, fontSize: 14, borderRadius: 6, border: '1px solid #ccc' }}
                    required
                  >
                    <option value="">-- Select Category --</option>
                    {[...budgetCategories].sort((a, b) => a.name.localeCompare(b.name)).map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </label>
                
                {form.budgetCategory && (
                  <label style={{ display: 'block', marginTop: 10 }}>
                    <span style={{ fontSize: 13, color: '#555' }}>Subcategory (optional):</span>
                    <select
                      value={form.budgetSubcategory || ''}
                      onChange={e => setForm(f => ({ ...f, budgetSubcategory: e.target.value || null }))}
                      style={{ width: '100%', padding: 8, marginTop: 4, borderRadius: 6, border: '1px solid #ccc' }}
                    >
                      <option value="">-- None --</option>
                      {(budgetCategories.find(c => c.id === form.budgetCategory)?.subcategories || []).map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              
              {/* Budget & Payment Section - Merged */}
              <div style={{ 
                marginTop: 20, 
                padding: 16, 
                background: '#f5f5f5', 
                borderRadius: 8,
                border: '1px solid #e0e0e0',
              }}>
                <div style={{ fontWeight: 600, color: '#1976d2', marginBottom: 12, fontSize: 14 }}>
                  📊 Budget & Payment Tracking
                </div>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={!!form.isWebLinkOnly}
                    onChange={e => setForm(f => ({
                      ...f,
                      isWebLinkOnly: e.target.checked,
                      budgetType: e.target.checked ? null : f.budgetType,
                      budgetAmount: e.target.checked ? null : f.budgetAmount,
                      budgetPeriod: e.target.checked ? null : f.budgetPeriod,
                      paidSubscription: e.target.checked ? false : f.paidSubscription,
                      paymentAmount: e.target.checked ? null : f.paymentAmount,
                      paymentFrequency: e.target.checked ? null : f.paymentFrequency,
                    }))}
                    style={{ width: 18, height: 18 }}
                  />
                  <span style={{ fontWeight: 500 }}>Web Link Only</span>
                  <span style={{ color: '#666', fontSize: 12 }}>(no budget/payment tracking)</span>
                </label>
                
                {!form.isWebLinkOnly && (
                  <>
                    <label style={{ display: 'block', marginTop: 12 }}>
                      Type:<br />
                      <select
                        value={form.budgetType || ''}
                        onChange={e => {
                          const newType = e.target.value as 'Bill' | 'Subscription' | 'Expense' | 'Savings' | null || null;
                          const isPaid = newType === 'Bill' || newType === 'Subscription';
                          setForm(f => ({ 
                            ...f, 
                            budgetType: newType,
                            paidSubscription: isPaid,
                            // Sync payment fields when switching to Bill/Subscription
                            paymentAmount: isPaid ? (f.budgetAmount || f.paymentAmount) : null,
                            paymentFrequency: isPaid ? (f.budgetPeriod || f.paymentFrequency || 'Monthly') : null,
                          }));
                        }}
                        style={{ width: '100%', padding: 8, marginTop: 4 }}
                      >
                        <option value="">-- Select Type --</option>
                        <option value="Bill">💡 Bill (Fixed recurring payment)</option>
                        <option value="Subscription">🔄 Subscription (Recurring service)</option>
                        <option value="Expense">💳 Expense (Variable spending)</option>
                        <option value="Savings">💰 Savings Goal</option>
                      </select>
                    </label>
                    
                    {form.budgetType && (
                      <>
                        {/* Budget Amount and Frequency */}
                        <label style={{ display: 'block', marginTop: 12 }}>
                          {form.budgetType === 'Savings' ? 'Monthly Contribution ($):' : 'Amount ($):'}<br />
                          <input
                            type="number"
                            step="0.01"
                            value={form.budgetAmount ?? ''}
                            onChange={e => {
                              // Fix floating point precision by rounding to 2 decimal places
                              const rawValue = e.target.value;
                              const amount = rawValue ? Math.round(parseFloat(rawValue) * 100) / 100 : null;
                              const isPaid = form.budgetType === 'Bill' || form.budgetType === 'Subscription';
                              setForm(f => ({ 
                                ...f, 
                                budgetAmount: amount,
                                paymentAmount: isPaid ? amount : f.paymentAmount,
                              }));
                            }}
                            style={{ width: '100%', padding: 8, marginTop: 4 }}
                            placeholder="0.00"
                          />
                        </label>
                        
                        <label style={{ display: 'block', marginTop: 12 }}>
                          Frequency:<br />
                          <select
                            value={form.budgetPeriod || ''}
                            onChange={e => {
                              const period = e.target.value as 'Monthly' | 'Annually' | null || null;
                              const isPaid = form.budgetType === 'Bill' || form.budgetType === 'Subscription';
                              setForm(f => ({ 
                                ...f, 
                                budgetPeriod: period,
                                paymentFrequency: isPaid ? period : f.paymentFrequency,
                                annualType: period === 'Annually' ? (f.annualType || 'Subscriber') : null,
                              }));
                            }}
                            style={{ width: '100%', padding: 8, marginTop: 4 }}
                          >
                            <option value="">-- Select Frequency --</option>
                            <option value="Monthly">Monthly</option>
                            <option value="Annually">Annually</option>
                          </select>
                        </label>
                        
                        {/* Payment-specific fields for Bill and Subscription */}
                        {(form.budgetType === 'Bill' || form.budgetType === 'Subscription') && (
                          <>
                            {form.budgetPeriod === 'Annually' && (
                              <label style={{ display: 'block', marginTop: 12 }}>
                                Annual Payment Type:<br />
                                <select
                                  value={form.annualType || 'Subscriber'}
                                  onChange={e => setForm(f => ({ ...f, annualType: e.target.value as 'Subscriber' | 'Fiscal' | 'Calendar' | null }))}
                                  style={{ width: '100%', padding: 8, marginTop: 4 }}
                                >
                                  <option value="Subscriber">Subscriber Anniversary</option>
                                  <option value="Fiscal">Fiscal Year (April)</option>
                                  <option value="Calendar">Calendar Year (January)</option>
                                </select>
                              </label>
                            )}
                            
                            <label style={{ display: 'block', marginTop: 12 }}>
                              Payment Method:<br />
                              <select
                                value={form.creditCardId ?? ''}
                                onChange={e => setForm(f => ({ ...f, creditCardId: e.target.value || null }))}
                                style={{ width: '100%', padding: 8, marginTop: 4 }}
                              >
                                <option value="">-- Select Payment Method --</option>
                                {/* Group by method type, sorted A-Z within each group */}
                                {(['Credit Card', 'ACH', 'Check', 'Cash'] as PaymentMethodType[]).map(methodType => {
                                  const methodCards = creditCards
                                    .filter(c => (c.methodType || 'Credit Card') === methodType)
                                    .sort((a, b) => a.name.localeCompare(b.name));
                                  
                                  if (methodCards.length === 0) return null;
                                  
                                  const getTypeIcon = () => {
                                    switch (methodType) {
                                      case 'Credit Card': return '💳';
                                      case 'ACH': return '🏦';
                                      case 'Check': return '📝';
                                      case 'Cash': return '💵';
                                      default: return '💳';
                                    }
                                  };
                                  
                                  return (
                                    <optgroup key={methodType} label={`${getTypeIcon()} ${methodType}`}>
                                      {methodCards.map(card => {
                                        const details = card.methodType === 'Cash' ? '' :
                                          card.methodType === 'ACH' ? ` (${card.bankName} **** ${card.last4})` :
                                          card.methodType === 'Check' ? ` (${card.bankName})` :
                                          ` (**** ${card.last4})`;
                                        return (
                                          <option key={card.id} value={card.id}>
                                            {card.name}{details}
                                          </option>
                                        );
                                      })}
                                    </optgroup>
                                  );
                                })}
                              </select>
                              {creditCards.length === 0 && (
                                <div style={{ fontSize: 12, color: '#ff9800', marginTop: 4 }}>
                                  No payment methods defined. Go to <span 
                                    onClick={() => { setMainMenu('settings'); setShowTileModal(false); }}
                                    style={{ color: '#1976d2', cursor: 'pointer', textDecoration: 'underline' }}
                                  >Settings</span> to add one.
                                </div>
                              )}
                            </label>
                            
                            <label style={{ display: 'block', marginTop: 12 }}>
                              Start/Signup Date:<br />
                              <input
                                type="date"
                                value={form.signupDate ?? ''}
                                onChange={e => setForm(f => ({ ...f, signupDate: e.target.value }))}
                                style={{ width: '100%', padding: 8, marginTop: 4 }}
                              />
                              <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                                Used to calculate next payment date
                              </div>
                            </label>
                            
                            <label style={{ display: 'block', marginTop: 12 }}>
                              Account Management Link:<br />
                              <input
                                type="url"
                                value={form.accountLink ?? ''}
                                onChange={e => setForm(f => ({ ...f, accountLink: e.target.value }))}
                                style={{ width: '100%', padding: 8, marginTop: 4 }}
                                placeholder="https://example.com/account"
                              />
                            </label>
                          </>
                        )}
                        
                        {/* Savings-specific fields */}
                        {form.budgetType === 'Savings' && (
                          <div style={{ marginTop: 12, padding: 10, background: '#e8f5e9', borderRadius: 6, fontSize: 12, color: '#2e7d32' }}>
                            💡 Track your monthly savings contributions. Phase 2 will add goal tracking and progress visualization.
                          </div>
                        )}
                        
                        {/* Expense-specific fields */}
                        {form.budgetType === 'Expense' && (
                          <div style={{ marginTop: 12, padding: 10, background: '#fff3e0', borderRadius: 6, fontSize: 12, color: '#e65100' }}>
                            💡 Set a budget for variable expenses. Phase 2 will let you track actual spending against this budget.
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
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
          <Modal onClose={() => { 
            setShowCreditCardModal(false); 
            setEditingCreditCardId(null); 
            setCreditCardForm({ name: '', last4: '', methodType: 'Credit Card', bankName: '', accountType: 'Checking', routingLast4: '' }); 
          }}>
            <form onSubmit={handleCreditCardFormSubmit}>
              <h2>{creditCardModalMode === 'add' ? 'Add Payment Method' : 'Edit Payment Method'}</h2>
              
              {/* Payment Method Type */}
              <label style={{ display: 'block', marginBottom: 16 }}>
                Payment Type:<br />
                <select
                  value={creditCardForm.methodType}
                  onChange={e => setCreditCardForm({ 
                    ...creditCardForm, 
                    methodType: e.target.value as PaymentMethodType,
                    // Reset fields when type changes
                    last4: e.target.value === 'Cash' ? '' : creditCardForm.last4,
                    bankName: '',
                    routingLast4: '',
                  })}
                  style={{ width: '100%', padding: 8, marginTop: 4 }}
                >
                  <option value="Credit Card">💳 Credit Card</option>
                  <option value="ACH">🏦 ACH (Bank Transfer)</option>
                  <option value="Check">📝 Check</option>
                  <option value="Cash">💵 Cash</option>
                </select>
              </label>
              
              {/* Name - Always shown */}
              <label style={{ display: 'block', marginBottom: 16 }}>
                {creditCardForm.methodType === 'Credit Card' ? 'Card Name' : 
                 creditCardForm.methodType === 'ACH' ? 'Account Name' :
                 creditCardForm.methodType === 'Check' ? 'Check Description' : 'Payment Name'}:<br />
                <input
                  value={creditCardForm.name}
                  onChange={e => setCreditCardForm({ ...creditCardForm, name: e.target.value })}
                  required
                  autoFocus
                  maxLength={60}
                  placeholder={
                    creditCardForm.methodType === 'Credit Card' ? 'e.g., Chase Sapphire, Amex Gold' :
                    creditCardForm.methodType === 'ACH' ? 'e.g., Primary Checking' :
                    creditCardForm.methodType === 'Check' ? 'e.g., Personal Checks' : 'e.g., Petty Cash'
                  }
                  style={{ width: '100%', padding: 8, marginTop: 4 }}
                />
              </label>
              
              {/* Credit Card specific fields */}
              {creditCardForm.methodType === 'Credit Card' && (
                <label style={{ display: 'block', marginBottom: 16 }}>
                  Last 4 Digits of Card:<br />
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
              )}
              
              {/* ACH specific fields */}
              {creditCardForm.methodType === 'ACH' && (
                <>
                  <label style={{ display: 'block', marginBottom: 16 }}>
                    Bank Name:<br />
                    <input
                      value={creditCardForm.bankName}
                      onChange={e => setCreditCardForm({ ...creditCardForm, bankName: e.target.value })}
                      required
                      maxLength={60}
                      placeholder="e.g., Chase, Bank of America"
                      style={{ width: '100%', padding: 8, marginTop: 4 }}
                    />
                  </label>
                  <label style={{ display: 'block', marginBottom: 16 }}>
                    Account Type:<br />
                    <select
                      value={creditCardForm.accountType}
                      onChange={e => setCreditCardForm({ ...creditCardForm, accountType: e.target.value as 'Checking' | 'Savings' })}
                      style={{ width: '100%', padding: 8, marginTop: 4 }}
                    >
                      <option value="Checking">Checking</option>
                      <option value="Savings">Savings</option>
                    </select>
                  </label>
                  <label style={{ display: 'block', marginBottom: 16 }}>
                    Last 4 Digits of Account:<br />
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
                </>
              )}
              
              {/* Check specific fields */}
              {creditCardForm.methodType === 'Check' && (
                <label style={{ display: 'block', marginBottom: 16 }}>
                  Bank Name:<br />
                  <input
                    value={creditCardForm.bankName}
                    onChange={e => setCreditCardForm({ ...creditCardForm, bankName: e.target.value })}
                    required
                    maxLength={60}
                    placeholder="e.g., Chase, Bank of America"
                    style={{ width: '100%', padding: 8, marginTop: 4 }}
                  />
                </label>
              )}
              
              {/* Cash has no extra fields */}
              {creditCardForm.methodType === 'Cash' && (
                <div style={{ 
                  background: '#e8f5e9', 
                  padding: 12, 
                  borderRadius: 6, 
                  marginBottom: 16,
                  color: '#2e7d32',
                  fontSize: 13 
                }}>
                  💡 Cash payments don't require additional details.
                </div>
              )}
              
              <button type="submit" style={{ marginTop: 8 }}>
                {creditCardModalMode === 'add' ? 'Add Payment Method' : 'Save Changes'}
              </button>
              <button type="button" onClick={() => { 
                setShowCreditCardModal(false); 
                setEditingCreditCardId(null); 
                setCreditCardForm({ name: '', last4: '', methodType: 'Credit Card', bankName: '', accountType: 'Checking', routingLast4: '' }); 
              }}>
                Cancel
              </button>
            </form>
          </Modal>
        )}

        {showBudgetCategoryModal && (
          <Modal onClose={() => { 
            setShowBudgetCategoryModal(false); 
            setEditingBudgetCategoryId(null); 
            setBudgetCategoryForm({ name: '', icon: '📁', subcategories: '' }); 
          }}>
            <form onSubmit={handleBudgetCategoryFormSubmit}>
              <h2>{budgetCategoryModalMode === 'add' ? 'Add Budget Category' : 'Edit Budget Category'}</h2>
              
              {/* Icon and Name Row */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <label style={{ width: 80 }}>
                  Icon:<br />
                  <input
                    value={budgetCategoryForm.icon}
                    onChange={e => setBudgetCategoryForm({ ...budgetCategoryForm, icon: e.target.value })}
                    maxLength={2}
                    placeholder="📁"
                    style={{ width: '100%', padding: 8, marginTop: 4, fontSize: 20, textAlign: 'center' }}
                  />
                </label>
                <label style={{ flex: 1 }}>
                  Category Name:<br />
                  <input
                    value={budgetCategoryForm.name}
                    onChange={e => setBudgetCategoryForm({ ...budgetCategoryForm, name: e.target.value })}
                    required
                    autoFocus
                    maxLength={50}
                    placeholder="e.g., Housing, Transportation"
                    style={{ width: '100%', padding: 8, marginTop: 4 }}
                  />
                </label>
              </div>
              
              <label style={{ display: 'block', marginBottom: 16 }}>
                Subcategories (comma-separated):<br />
                <textarea
                  value={budgetCategoryForm.subcategories}
                  onChange={e => setBudgetCategoryForm({ ...budgetCategoryForm, subcategories: e.target.value })}
                  placeholder="e.g., Mortgage, Property Taxes, Insurance, HOA Fees"
                  rows={4}
                  style={{ 
                    width: '100%', 
                    padding: 8, 
                    marginTop: 4, 
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                  Enter subcategories separated by commas. Example: Groceries, Household Supplies, Personal Care
                </div>
              </label>
              
              <button type="submit" style={{ marginTop: 8 }}>
                {budgetCategoryModalMode === 'add' ? 'Add Category' : 'Save Changes'}
              </button>
              <button type="button" onClick={() => { 
                setShowBudgetCategoryModal(false); 
                setEditingBudgetCategoryId(null); 
                setBudgetCategoryForm({ name: '', icon: '📁', subcategories: '' }); 
              }}>
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


