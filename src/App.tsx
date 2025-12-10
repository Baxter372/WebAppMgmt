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
import wamsLogo from '/FinCampanionLogo.png';
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
  paymentFrequency?: 'Weekly' | 'Bi-Weekly' | 'Semi-Monthly' | 'Monthly' | 'Quarterly' | 'Annually' | null;
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
  // Home types: Bill, Subscription, Expense, Savings
  // Business types: Operating Expense, Capital Expense, Subscription/SaaS, Payroll, Vendor Payment, Tax Payment, Loan/Debt Payment
  budgetType?: 'Bill' | 'Subscription' | 'Expense' | 'Savings' | 'Operating Expense' | 'Capital Expense' | 'Subscription/SaaS' | 'Payroll' | 'Vendor Payment' | 'Tax Payment' | 'Loan/Debt Payment' | null;
  budgetAmount?: number | null;
  budgetPeriod?: 'Weekly' | 'Bi-Weekly' | 'Semi-Monthly' | 'Monthly' | 'Quarterly' | 'Annually' | null;
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
  // Home Page Tab assignment
  homePageTabId?: string | null;  // Which home page tab this card belongs to
  // Main Tab assignment (Home Apps, Business Apps, etc.)
  mainTabId?: string | null;  // Which main tab this card belongs to
  // Cancellation tracking
  isCancelled?: boolean;
  cancellationDate?: string | null;
  previousBudgetCategory?: string | null;  // Store original category before cancellation
};
type HomePageTab = { id: string; name: string; };
type BudgetCategory = { id: string; name: string; icon: string; subcategories: string[]; };
type Tab = { 
  id: string;
  name: string; 
  subcategories?: string[]; 
  hasStockTicker?: boolean; 
  homePageTabId?: string;
  budgetCategories: BudgetCategory[];
};

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
  { id: 'cancelled', name: '🚫 Cancelled Subscriptions', icon: '🚫', subcategories: ['Cancelled This Month', 'Cancelled This Year', 'Archived'] },
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

// Budget Types for Home and Business
const homeBudgetTypes = ['Bill', 'Subscription', 'Expense', 'Savings'] as const;
const businessBudgetTypes = ['Operating Expense', 'Capital Expense', 'Subscription/SaaS', 'Payroll', 'Vendor Payment', 'Tax Payment', 'Loan/Debt Payment'] as const;

// Budget type colors
const budgetTypeColors: Record<string, string> = {
  // Home types
  'Bill': '#4169E1',           // Royal Blue
  'Subscription': '#87CEEB',   // Light Blue
  'Expense': '#FF6B6B',        // Coral
  'Savings': '#4CAF50',        // Green
  // Business types
  'Operating Expense': '#FF9800',  // Orange
  'Capital Expense': '#9C27B0',    // Purple
  'Subscription/SaaS': '#00BCD4',  // Cyan
  'Payroll': '#E91E63',            // Pink
  'Vendor Payment': '#795548',     // Brown
  'Tax Payment': '#607D8B',        // Blue Grey
  'Loan/Debt Payment': '#F44336',  // Red
};

// Budget type icons
const budgetTypeIcons: Record<string, string> = {
  // Home types
  'Bill': '💡',
  'Subscription': '🔄',
  'Expense': '💳',
  'Savings': '💰',
  // Business types
  'Operating Expense': '🏢',
  'Capital Expense': '🏗️',
  'Subscription/SaaS': '💻',
  'Payroll': '👥',
  'Vendor Payment': '📦',
  'Tax Payment': '📋',
  'Loan/Debt Payment': '🏦',
};

// Check if a budget type is a "paid" type (for Payments Due list)
const isPaidBudgetType = (budgetType: string | null | undefined): boolean => {
  const paidTypes = ['Bill', 'Subscription', 'Operating Expense', 'Capital Expense', 'Subscription/SaaS', 'Payroll', 'Vendor Payment', 'Tax Payment', 'Loan/Debt Payment'];
  return budgetType ? paidTypes.includes(budgetType) : false;
};

// Default business budget categories (18 standard small business categories)
const defaultBusinessBudgetCategories: BudgetCategory[] = [
  // 💼 Personnel & Compensation
  { id: 'biz-payroll', name: 'Salaries & Wages (Payroll)', icon: '💰', subcategories: ['Full-Time Employees', 'Part-Time Employees', 'Bonuses', 'Commissions', 'Contractors'] },
  { id: 'biz-benefits', name: 'Employee Benefits', icon: '🏥', subcategories: ['Health Insurance', 'Retirement/401k', 'Life Insurance', 'PTO/Vacation', 'Other Perks'] },
  { id: 'biz-payroll-tax', name: 'Payroll Taxes', icon: '📋', subcategories: ['Social Security', 'Medicare', 'Unemployment Tax', 'State Payroll Tax'] },
  
  // 🏢 Occupancy & Operations
  { id: 'biz-rent', name: 'Rent or Mortgage Interest', icon: '🏢', subcategories: ['Office Rent', 'Warehouse Rent', 'Mortgage Interest', 'Home Office'] },
  { id: 'biz-utilities', name: 'Utilities', icon: '💡', subcategories: ['Electricity', 'Gas', 'Water/Sewage', 'Trash Service'] },
  { id: 'biz-internet', name: 'Internet & Phone', icon: '📱', subcategories: ['Business Internet', 'Landlines', 'Mobile Devices', 'VoIP Services'] },
  { id: 'biz-supplies', name: 'Office Supplies', icon: '📎', subcategories: ['Paper/Printing', 'Pens/Stationery', 'Printer Ink/Toner', 'Cleaning Supplies', 'General Consumables'] },
  
  // 📢 Sales & Marketing
  { id: 'biz-marketing', name: 'Marketing & Advertising', icon: '📢', subcategories: ['Online Ads (Google/Social)', 'Print Materials', 'PR/Public Relations', 'Email Marketing', 'SEO/Content'] },
  { id: 'biz-travel', name: 'Business Travel & Meals', icon: '✈️', subcategories: ['Airfare', 'Lodging/Hotels', 'Client Meals', 'Ground Transportation', 'Per Diem'] },
  
  // 🛠️ Equipment & Technology
  { id: 'biz-software', name: 'Software & Subscriptions', icon: '💻', subcategories: ['Accounting Software', 'CRM', 'Cloud Storage', 'Design Tools', 'Industry Apps'] },
  { id: 'biz-equipment', name: 'Equipment & Furniture', icon: '🖥️', subcategories: ['Computers/Laptops', 'Printers/Scanners', 'Desks/Furniture', 'Machinery', 'Vehicles'] },
  { id: 'biz-maintenance', name: 'Maintenance & Repairs', icon: '🔧', subcategories: ['Equipment Repairs', 'Vehicle Maintenance', 'Facility Repairs', 'IT Support'] },
  { id: 'biz-depreciation', name: 'Depreciation', icon: '📉', subcategories: ['Vehicle Depreciation', 'Equipment Depreciation', 'Building Depreciation', 'Technology Depreciation'] },
  
  // ⚖️ Professional & Compliance
  { id: 'biz-professional', name: 'Legal & Professional Fees', icon: '⚖️', subcategories: ['CPA/Accountant', 'Lawyer/Attorney', 'Consultants', 'Marketing Agency'] },
  { id: 'biz-bank-fees', name: 'Bank & Merchant Fees', icon: '🏦', subcategories: ['Bank Service Charges', 'Credit Card Processing', 'Loan Interest', 'Wire Transfer Fees'] },
  { id: 'biz-taxes', name: 'Taxes, Licenses & Permits', icon: '📜', subcategories: ['Business Property Tax', 'Business License', 'Operating Permits', 'State/Local Taxes'] },
  { id: 'biz-insurance', name: 'Business Insurance', icon: '🛡️', subcategories: ['General Liability', 'Professional Liability (E&O)', 'Property Insurance', 'Workers Comp'] },
  
  // 📦 Manufacturing & Inventory
  { id: 'biz-cogs', name: 'Cost of Goods Sold (COGS)', icon: '📦', subcategories: ['Raw Materials', 'Direct Labor', 'Freight/Shipping', 'Manufacturing Overhead'] },
  
  // System category
  { id: 'biz-cancelled', name: '🚫 Cancelled Subscriptions', icon: '🚫', subcategories: ['Cancelled This Month', 'Cancelled This Year', 'Archived'] },
];

const defaultTabs: Tab[] = [
  { id: 'home', name: 'Home Apps', budgetCategories: defaultBudgetCategories },
  { id: 'business', name: 'Business Apps', budgetCategories: defaultBusinessBudgetCategories },
];
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
  // Check if tile has payment info (either old system or new budget system)
  const paymentFreq = tile.paymentFrequency || tile.budgetPeriod;
  const isPaidItem = tile.paidSubscription || isPaidBudgetType(tile.budgetType);
  
  if (!isPaidItem || !tile.signupDate || !paymentFreq) {
    return false;
  }
  
  const nextPaymentDateStr = calculateNextPaymentDate(tile.signupDate, paymentFreq, tile.annualType);
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
  paymentFrequency: 'Weekly' | 'Bi-Weekly' | 'Semi-Monthly' | 'Monthly' | 'Quarterly' | 'Annually' | null | undefined,
  annualType: 'Subscriber' | 'Fiscal' | 'Calendar' | null | undefined
): string | null {
  if (!signupDate || !paymentFrequency) return null;
  
  const signup = new Date(signupDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (paymentFrequency === 'Weekly') {
    // Calculate next weekly payment
    let nextDate = new Date(signup);
    while (nextDate <= today) {
      nextDate.setDate(nextDate.getDate() + 7);
    }
    return nextDate.toISOString().split('T')[0];
  }
  
  if (paymentFrequency === 'Bi-Weekly') {
    // Calculate next bi-weekly payment (every 14 days)
    let nextDate = new Date(signup);
    while (nextDate <= today) {
      nextDate.setDate(nextDate.getDate() + 14);
    }
    return nextDate.toISOString().split('T')[0];
  }
  
  if (paymentFrequency === 'Semi-Monthly') {
    // Semi-monthly: 1st and 15th of each month
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Try 1st and 15th of current month, then next month
    const options = [
      new Date(currentYear, currentMonth, 1),
      new Date(currentYear, currentMonth, 15),
      new Date(currentYear, currentMonth + 1, 1),
      new Date(currentYear, currentMonth + 1, 15),
    ];
    
    for (const date of options) {
      if (date > today) {
        return date.toISOString().split('T')[0];
      }
    }
    return options[options.length - 1].toISOString().split('T')[0];
  }
  
  if (paymentFrequency === 'Monthly') {
    // Calculate next monthly payment
    let nextDate = new Date(signup);
    
    // Keep adding months until we're in the future
    while (nextDate <= today) {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
    
    return nextDate.toISOString().split('T')[0];
  }
  
  if (paymentFrequency === 'Quarterly') {
    // Calculate next quarterly payment (every 3 months)
    let nextDate = new Date(signup);
    while (nextDate <= today) {
      nextDate.setMonth(nextDate.getMonth() + 3);
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
    // Check if tile has payment info (either old system or new budget system)
    const hasPaymentAmount = tile.paymentAmount || tile.budgetAmount;
    const paymentFreq = tile.paymentFrequency || tile.budgetPeriod;
    const isPaidItem = tile.paidSubscription || isPaidBudgetType(tile.budgetType);
    
    if (isPaidItem && tile.signupDate && hasPaymentAmount && paymentFreq) {
      const nextPaymentDateStr = calculateNextPaymentDate(tile.signupDate, paymentFreq, tile.annualType);
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
    // Check if tile has payment info (either old system or new budget system)
    const hasPaymentAmount = tile.paymentAmount || tile.budgetAmount;
    const paymentFreq = tile.paymentFrequency || tile.budgetPeriod;
    const isPaidItem = tile.paidSubscription || isPaidBudgetType(tile.budgetType);
    
    if (isPaidItem && tile.signupDate && hasPaymentAmount && paymentFreq) {
      const nextPaymentDateStr = calculateNextPaymentDate(tile.signupDate, paymentFreq, tile.annualType);
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
  // Persist login state - if user has any tiles, they've "logged in" before
  const [showLanding, setShowLanding] = useState(() => {
    const hasLoggedIn = localStorage.getItem('hasLoggedIn');
    return hasLoggedIn !== 'true';
  });
  
  // Save login state when user enters the app
  useEffect(() => {
    if (!showLanding) {
      localStorage.setItem('hasLoggedIn', 'true');
    }
  }, [showLanding]);
  
  // --- HomePageTabs state and handlers ---
  const [homePageTabs, setHomePageTabs] = useState<HomePageTab[]>(() => {
    const saved = localStorage.getItem('homePageTabs');
    return saved ? JSON.parse(saved) : [{ id: 'all', name: 'All Web Tiles' }];
  });
  
  useEffect(() => {
    localStorage.setItem('homePageTabs', JSON.stringify(homePageTabs));
  }, [homePageTabs]);
  
  const [selectedHomePageTab, setSelectedHomePageTab] = useState<string>('all');
  const [homePageView, setHomePageView] = useState<'tiles' | 'budget'>('tiles');
  
  // --- Credit Cards state and handlers ---
  const [creditCards, setCreditCards] = useState<CreditCard[]>(() => {
    const saved = localStorage.getItem('creditCards');
    return saved ? JSON.parse(saved) : [];
  });
  
  useEffect(() => {
    localStorage.setItem('creditCards', JSON.stringify(creditCards));
  }, [creditCards]);
  
  // --- Budget Categories state (now stored per-tab, this is for backwards compatibility) ---
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>(() => {
    const saved = localStorage.getItem('budgetCategories');
    let categories = saved ? JSON.parse(saved) : defaultBudgetCategories;
    // Ensure "Cancelled Subscriptions" category always exists
    if (!categories.find((c: BudgetCategory) => c.id === 'cancelled')) {
      categories = [...categories, { id: 'cancelled', name: '🚫 Cancelled Subscriptions', icon: '🚫', subcategories: ['Cancelled This Month', 'Cancelled This Year', 'Archived'] }];
    }
    return categories;
  });
  
  useEffect(() => {
    localStorage.setItem('budgetCategories', JSON.stringify(budgetCategories));
  }, [budgetCategories]);
  
  // Migration effect: Copy existing budgetCategories into Home Apps tab if not done
  const [hasMigratedCategories, setHasMigratedCategories] = useState(() => {
    return localStorage.getItem('hasMigratedToTabCategories') === 'true';
  });
  
  // --- WebTabs state and handlers ---
  const [tabs, setTabs] = useState<Tab[]>(() => {
    const saved = localStorage.getItem('tabs');
    const hasRunBusinessMigration = localStorage.getItem('hasRunBusinessCategoriesMigration') === 'true';
    
    if (saved) {
      const parsed = JSON.parse(saved);
      // Check if tabs have the new structure (with id and budgetCategories)
      if (parsed.length > 0 && parsed[0].id && parsed[0].budgetCategories) {
        // Force migration: Update Business Apps with the 19 standard business categories
        // This migration runs ONCE and is tracked by localStorage flag
        if (!hasRunBusinessMigration) {
          console.log('FORCE migrating Business Apps to correct business categories...');
          // Replace business tab categories with new default business categories
          const migrated = parsed.map((tab: Tab) => {
            if (tab.id === 'business') {
              return { ...tab, budgetCategories: defaultBusinessBudgetCategories };
            }
            return tab;
          });
          // Save immediately to localStorage
          localStorage.setItem('tabs', JSON.stringify(migrated));
          localStorage.setItem('hasRunBusinessCategoriesMigration', 'true');
          return migrated;
        }
        return parsed;
      }
      // Migration: Old tabs don't have budgetCategories - create new default tabs
      // and migrate existing budgetCategories to "Home Apps"
    }
    // Return default tabs - existing budgetCategories will be migrated to Home Apps
    localStorage.setItem('hasRunBusinessCategoriesMigration', 'true');
    return defaultTabs;
  });
  
  // Selected main tab (Home Apps, Business Apps, etc.)
  const [selectedMainTab, setSelectedMainTab] = useState<string>(() => {
    const saved = localStorage.getItem('selectedMainTab');
    return saved || 'home';
  });
  
  useEffect(() => {
    localStorage.setItem('selectedMainTab', selectedMainTab);
  }, [selectedMainTab]);
  
  // Get budget categories for the currently selected main tab
  const currentTabBudgetCategories = React.useMemo(() => {
    const tab = tabs.find(t => t.id === selectedMainTab);
    const categories = tab?.budgetCategories || [];
    
    // For business tab, ensure we have the correct business categories
    // Check if it has home categories instead of business categories
    if (selectedMainTab === 'business') {
      const hasCorrectBusinessCategories = categories.some(
        (c: BudgetCategory) => c.id === 'biz-payroll' || c.id === 'biz-cogs'
      );
      if (!hasCorrectBusinessCategories) {
        return defaultBusinessBudgetCategories;
      }
    }
    
    return categories;
  }, [tabs, selectedMainTab]);
  
  // Migration effect: Copy existing budgetCategories into Home Apps tab
  useEffect(() => {
    if (!hasMigratedCategories && budgetCategories.length > 0) {
      // Update Home Apps tab with user's existing budget categories
      setTabs(prevTabs => prevTabs.map(tab => {
        if (tab.id === 'home') {
          return { ...tab, budgetCategories: budgetCategories };
        }
        return tab;
      }));
      setHasMigratedCategories(true);
      localStorage.setItem('hasMigratedToTabCategories', 'true');
    }
  }, [hasMigratedCategories, budgetCategories]);
  
  // Update tabs when currentTabBudgetCategories changes (for backwards compat with old setBudgetCategories calls)
  useEffect(() => {
    if (hasMigratedCategories) {
      setTabs(prevTabs => prevTabs.map(tab => {
        if (tab.id === selectedMainTab) {
          return { ...tab, budgetCategories: budgetCategories };
        }
        return tab;
      }));
    }
  }, [budgetCategories, selectedMainTab, hasMigratedCategories]);
  
  const [tiles, setTiles] = useState<Tile[]>(() => {
    const saved = localStorage.getItem('tiles');
    if (saved) {
      // Fix any floating point precision issues in saved monetary values
      // Also migrate tiles without mainTabId to 'home' tab
      const parsed = JSON.parse(saved);
      return parsed.map((tile: Tile) => ({
        ...tile,
        budgetAmount: tile.budgetAmount !== null && tile.budgetAmount !== undefined 
          ? Math.round(tile.budgetAmount * 100) / 100 
          : null,
        paymentAmount: tile.paymentAmount !== null && tile.paymentAmount !== undefined 
          ? Math.round(tile.paymentAmount * 100) / 100 
          : null,
        // Migration: Assign existing tiles without mainTabId to 'home' tab
        mainTabId: tile.mainTabId || 'home',
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
  const [activeReport, setActiveReport] = useState<'cost' | 'list' | 'budget' | 'calendar'>('cost');
  const [calendarReportYear, setCalendarReportYear] = useState<number>(new Date().getFullYear());
  const [calendarReportMonth, setCalendarReportMonth] = useState<number>(new Date().getMonth()); // 0-11

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
                return tile.budgetType ? (budgetTypeColors[tile.budgetType] || null) : null;
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
                  {/* Cancel Subscription button - for paid subscriptions */}
                  {(tile.paidSubscription || isPaidBudgetType(tile.budgetType)) && !tile.isCancelled && (
                    <button
                      className="home-card-cancel-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openCancellationModal(tile.id);
                      }}
                      title="Cancel subscription"
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: 18,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: 'none',
                        background: '#e53935',
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
                      🚫
                    </button>
                  )}
                  {/* Restore button - for cancelled subscriptions */}
                  {tile.isCancelled && (
                    <button
                      className="home-card-restore-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        restoreSubscription(tile.id);
                      }}
                      title="Restore subscription"
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: 18,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: 'none',
                        background: '#4caf50',
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
                      ♻️
                    </button>
                  )}
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
      return tile.budgetType ? (budgetTypeColors[tile.budgetType] || null) : null;
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
        {/* Cancel Subscription button - for paid subscriptions */}
        {(tile.paidSubscription || isPaidBudgetType(tile.budgetType)) && !tile.isCancelled && (
          <button
            className="home-card-cancel-btn"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openCancellationModal(tile.id);
            }}
            title="Cancel subscription"
            style={{
              position: 'absolute',
              top: -6,
              right: 18,
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: 'none',
              background: '#e53935',
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
            🚫
          </button>
        )}
        {/* Restore button - for cancelled subscriptions */}
        {tile.isCancelled && (
          <button
            className="home-card-restore-btn"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              restoreSubscription(tile.id);
            }}
            title="Restore subscription"
            style={{
              position: 'absolute',
              top: -6,
              right: 18,
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: 'none',
              background: '#4caf50',
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
            ♻️
          </button>
        )}
        {/* Delete button - appears on hover */}
        <button
          className="home-card-delete-btn"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.confirm(`Are you sure you want to delete "${tile.name}"? This action cannot be undone.`)) {
              handleDeleteTile(tile.id);
            }
          }}
          title="Delete card"
          style={{
            position: 'absolute',
            bottom: -6,
            right: -6,
            width: 18,
            height: 18,
            borderRadius: '50%',
            border: 'none',
            background: '#757575',
            color: '#fff',
            fontSize: 9,
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
          🗑️
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
    
    // Filter cards that belong to this budget category AND match the selected main tab AND home page tab
    const categoryCards = tiles.filter(t => {
      const matchesMainTab = t.mainTabId === selectedMainTab; // Home Apps vs Business Apps
      const matchesCategory = t.budgetCategory === category.id;
      const matchesTab = selectedHomePageTab === 'all' || t.homePageTabId === selectedHomePageTab || !t.homePageTabId;
      return matchesMainTab && matchesCategory && matchesTab;
    });
    
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

    // Check if there are uncategorized cards that need a home (in current tab view)
    // First filter by main tab (Home Apps vs Business Apps)
    // Treat null/undefined mainTabId as 'home' for backwards compatibility
    const mainTabFiltered = tiles.filter(t => t.mainTabId === selectedMainTab || (!t.mainTabId && selectedMainTab === 'home'));
    const filteredByTab = selectedHomePageTab === 'all'
      ? mainTabFiltered
      : mainTabFiltered.filter(t => t.homePageTabId === selectedHomePageTab || !t.homePageTabId);
    const hasUncategorizedCards = filteredByTab.some(t => !t.budgetCategory);
    
    // Always show all categories (even empty ones) - removed the condition that hid empty categories
    // Empty categories serve as drop targets and help users understand the category structure

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
          {/* Add Card button - card style at end of tile */}
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
                category: category.name,
                subcategory: '',
                signupDate: '',
                paymentFrequency: 'Monthly',
                paymentAmount: 0,
                paidSubscription: false,
                homePageTabId: null,
                cancellationDate: null,
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
              width: 48,
              height: 48,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f9f9f9',
              border: '2px dashed #ccc',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              flexShrink: 0,
              gap: 2,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e3f2fd';
              e.currentTarget.style.borderColor = '#1976d2';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f9f9f9';
              e.currentTarget.style.borderColor = '#ccc';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title={`Add new card to ${category.name}`}
          >
            <span style={{ fontSize: 16 }}>🃏</span>
            <span style={{ fontSize: 8, color: '#666', fontWeight: 600 }}>Add</span>
          </button>
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
    
    // Filter cards that belong to this budget category AND the selected main tab
    const categoryCards = tiles.filter(t => t.budgetCategory === category.id && t.mainTabId === selectedMainTab);
    
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
                  mainTabId: selectedMainTab, // Set to current tab when creating new card
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
                return tile.budgetType ? (budgetTypeColors[tile.budgetType] || null) : null;
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
                  {/* Cancel Subscription button - for paid subscriptions */}
                  {(tile.paidSubscription || isPaidBudgetType(tile.budgetType)) && !tile.isCancelled && (
                    <button
                      className="home-card-cancel-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openCancellationModal(tile.id);
                      }}
                      title="Cancel subscription"
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: 18,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: 'none',
                        background: '#e53935',
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
                      🚫
                    </button>
                  )}
                  {/* Restore button - for cancelled subscriptions */}
                  {tile.isCancelled && (
                    <button
                      className="home-card-restore-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        restoreSubscription(tile.id);
                      }}
                      title="Restore subscription"
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: 18,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: 'none',
                        background: '#4caf50',
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
                      ♻️
                    </button>
                  )}
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
  
  // Cancellation Modal State
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [cancellationTileId, setCancellationTileId] = useState<number | null>(null);
  const [cancellationDate, setCancellationDate] = useState<string>(new Date().toISOString().split('T')[0]);
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
    // Home Page Tab assignment
    homePageTabId: null,
    // Main Tab assignment (Home Apps, Business Apps, etc.)
    mainTabId: null,
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
  
  // Categories submenu expand/collapse
  const [categoriesExpanded, setCategoriesExpanded] = useState<boolean>(() => {
    const saved = localStorage.getItem('categoriesExpanded');
    return saved ? JSON.parse(saved) : true;
  });
  
  useEffect(() => {
    localStorage.setItem('categoriesExpanded', JSON.stringify(categoriesExpanded));
  }, [categoriesExpanded]);
  
  // Resizable sidebar width
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? parseInt(saved) : 220;
  });
  const [isResizing, setIsResizing] = useState(false);
  
  useEffect(() => {
    localStorage.setItem('sidebarWidth', String(sidebarWidth));
  }, [sidebarWidth]);
  
  // Receipt files state
  type ReceiptFile = {
    id: number;
    cardId: number | null;
    cardName: string;
    fileName: string;
    fileType: 'pdf' | 'html' | 'image' | 'other';
    fileData: string; // Base64 encoded file data
    paymentDate: string;
    paymentAmount: number;
    uploadDate: string;
    notes?: string;
  };
  
  const [receiptFiles, setReceiptFiles] = useState<ReceiptFile[]>(() => {
    const saved = localStorage.getItem('receiptFiles');
    return saved ? JSON.parse(saved) : [];
  });
  
  useEffect(() => {
    localStorage.setItem('receiptFiles', JSON.stringify(receiptFiles));
  }, [receiptFiles]);
  
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [pendingReceiptFile, setPendingReceiptFile] = useState<{
    fileName: string;
    fileType: 'pdf' | 'html' | 'image' | 'other';
    fileData: string;
  } | null>(null);
  const [receiptForm, setReceiptForm] = useState({
    cardId: null as number | null,
    cardName: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentAmount: 0,
    notes: '',
  });
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  
  // Handle sidebar resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.min(Math.max(e.clientX, 180), 400); // Min 180px, Max 400px
      setSidebarWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
    
    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);
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
  
  // FORCE FIX: Update Business Apps tab with correct business categories on every mount
  useEffect(() => {
    const businessTab = tabs.find(t => t.id === 'business');
    // Check if business tab exists and has wrong categories (check for Home Apps category IDs)
    const hasHomeCategories = businessTab?.budgetCategories?.some(
      (c: BudgetCategory) => c.id === 'ai' || c.id === 'finance' || c.id === 'housing' || c.id === 'utilities'
    );
    const hasCorrectBusinessCategories = businessTab?.budgetCategories?.some(
      (c: BudgetCategory) => c.id === 'biz-payroll' || c.id === 'biz-cogs'
    );
    
    if (businessTab && hasHomeCategories && !hasCorrectBusinessCategories) {
      console.log('FORCE FIX: Replacing Business Apps categories with correct business categories...');
      setTabs(prevTabs => prevTabs.map(tab => {
        if (tab.id === 'business') {
          return { ...tab, budgetCategories: defaultBusinessBudgetCategories };
        }
        return tab;
      }));
    }
  }, []); // Run once on mount
  
  // Force migration: Ensure ALL tiles have mainTabId set to 'home'
  // This runs once on mount and forces all tiles to have mainTabId
  useEffect(() => {
    // Check both undefined and null
    const needsMigration = tiles.some(t => t.mainTabId === undefined || t.mainTabId === null || t.mainTabId === '');
    if (needsMigration) {
      console.log('Force migrating ALL tiles to add mainTabId=home...');
      const migratedTiles = tiles.map(t => ({
        ...t,
        mainTabId: (t.mainTabId && t.mainTabId !== '') ? t.mainTabId : 'home'
      }));
      setTiles(migratedTiles);
      // Force save to localStorage immediately
      localStorage.setItem('tiles', JSON.stringify(migratedTiles));
    }
  }, []); // Run once on mount
  
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
      // Home Page Tab assignment
      homePageTabId: tile.homePageTabId || null,
      // Main Tab assignment (Home Apps, Business Apps)
      mainTabId: tile.mainTabId || 'home',
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

  // Open cancellation modal for a tile
  const openCancellationModal = (tileId: number) => {
    setCancellationTileId(tileId);
    setCancellationDate(new Date().toISOString().split('T')[0]);
    setShowCancellationModal(true);
  };

  // Confirm and process subscription cancellation
  const confirmCancellation = () => {
    if (cancellationTileId === null) return;
    
    const tile = tiles.find(t => t.id === cancellationTileId);
    if (!tile) return;
    
    // Calculate the monthly savings amount
    const amount = tile.budgetAmount || tile.paymentAmount || 0;
    const freq = tile.budgetPeriod || tile.paymentFrequency || '';
    const monthlySavings = freq === 'Monthly' ? amount : (freq === 'Annually' ? amount / 12 : 0);
    
    // Get the cancellation month key for budget history
    const cancelDate = new Date(cancellationDate);
    const monthKey = `${cancelDate.getFullYear()}-${String(cancelDate.getMonth() + 1).padStart(2, '0')}`;
    
    // Update the tile
    setTiles(prevTiles => prevTiles.map(t => {
      if (t.id !== cancellationTileId) return t;
      return {
        ...t,
        isCancelled: true,
        cancellationDate: cancellationDate,
        previousBudgetCategory: t.budgetCategory, // Store original category
        budgetCategory: 'cancelled', // Move to cancelled category
        // Add negative entry to budget history to show savings
        budgetHistory: {
          ...t.budgetHistory,
          [monthKey]: {
            ...t.budgetHistory?.[monthKey],
            budget: 0,
            actual: -(monthlySavings), // Negative to show savings
            notes: `Cancelled on ${cancellationDate}`,
          }
        }
      };
    }));
    
    // Close modal
    setShowCancellationModal(false);
    setCancellationTileId(null);
  };

  // Restore a cancelled subscription
  const restoreSubscription = (tileId: number) => {
    setTiles(prevTiles => prevTiles.map(t => {
      if (t.id !== tileId) return t;
      return {
        ...t,
        isCancelled: false,
        cancellationDate: null,
        budgetCategory: t.previousBudgetCategory || null, // Restore original category
        previousBudgetCategory: null,
      };
    }));
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
      // Auto-assign mainTabId to current selected tab when creating new tile
      setTiles([...tiles, { ...fixedForm, id: Date.now() + Math.random(), mainTabId: selectedMainTab }]);
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
      const newTabId = `tab-${Date.now()}`;
      setTabs([...tabs, { 
        id: newTabId, 
        name: newName, 
        hasStockTicker: tabHasStockTicker, 
        homePageTabId: tabHomePageTabId,
        budgetCategories: [...defaultBudgetCategories] // New tabs start with default categories
      }]);
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
  
  // Filter tiles by budget category (activeTab now holds category ID) AND main tab
  const filteredTiles = tiles.filter(tile => tile.budgetCategory === activeTab && tile.mainTabId === selectedMainTab);
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
                {budgetTypeIcons[tile.budgetType] || '📊'}
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
          width: sidebarWidth,
          height: '100vh',
          background: '#f5f5f5',
          color: '#333',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          padding: '0 8px 0 0',
          boxShadow: '2px 0 12px #0002',
          zIndex: 100,
          overflow: 'hidden',
        }}
      >
        {/* Resize Handle */}
        <div
          onMouseDown={() => setIsResizing(true)}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: 8,
            height: '100%',
            cursor: 'col-resize',
            background: isResizing ? '#64b5f6' : 'transparent',
            transition: 'background 0.2s ease',
            zIndex: 101,
          }}
          onMouseEnter={(e) => {
            if (!isResizing) {
              e.currentTarget.style.background = '#1976d244';
            }
          }}
          onMouseLeave={(e) => {
            if (!isResizing) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
          title="Drag to resize sidebar"
        />
        <div style={{
          padding: 0,
          borderBottom: '1px solid #ddd',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          backgroundColor: 'transparent',
          flexShrink: 0,
        }}>
          <img
            src={wamsLogo}
            alt="Finance Companion logo"
            style={{ 
              width: '100%', 
              height: 'auto', 
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>
        <nav style={{ marginTop: 16, flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden', paddingBottom: 24 }}>
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
              background: 'none',
              color: mainMenu === 'home' ? '#1976d2' : '#333',
              fontWeight: mainMenu === 'home' ? 700 : 500,
              fontSize: 18,
              borderLeft: mainMenu === 'home' ? '4px solid #1976d2' : '4px solid transparent',
              transition: 'background 0.2s, color 0.2s',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e8f5e9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
            }}
          >
            <span style={{ fontSize: 22, marginRight: 12 }}>🏠</span> Home Page
          </div>
          
          {/* Budget Categories for selected main tab */}
          {mainMenu === 'home' && (
            <div style={{ marginLeft: 12, marginTop: 12, marginRight: 12 }}>
              {/* Current tab indicator */}
              <div style={{ 
                padding: '8px 12px',
                marginBottom: 12,
                background: '#e3f2fd',
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 13,
                color: '#1976d2',
                textAlign: 'center',
              }}>
                {tabs.find(t => t.id === selectedMainTab)?.name || 'Home Apps'}
              </div>
              
              {/* All Cards for selected tab */}
              <div style={{ marginBottom: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 8px',
                    cursor: 'pointer',
                    color: activeTab === '' ? '#fff' : '#333',
                    fontWeight: 600,
                    fontSize: 14,
                    borderRadius: 6,
                    background: activeTab === '' ? '#64b5f6' : 'none',
                    transition: 'background 0.2s, color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== '') {
                      e.currentTarget.style.background = '#e3f2fd';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== '') {
                      e.currentTarget.style.background = 'none';
                    }
                  }}
                >
                  <span 
                    onClick={(e) => { e.stopPropagation(); setCategoriesExpanded(!categoriesExpanded); }}
                    style={{ 
                      fontSize: 12, 
                      marginRight: 8, 
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                      transform: categoriesExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                      display: 'inline-block',
                    }}
                    title={categoriesExpanded ? 'Collapse categories' : 'Expand categories'}
                  >▼</span>
                  <span 
                    style={{ flex: 1 }}
                    onClick={() => { setMainMenu('home'); setActiveTab(''); }}
                  >{tabs.find(t => t.id === selectedMainTab)?.name || 'All Cards'}</span>
                  <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 4 }}>
                    ({tiles.filter(t => t.mainTabId === selectedMainTab).length})
                  </span>
                </div>
                
                {/* Budget Categories for selected tab */}
                {categoriesExpanded && (
                <div style={{ marginLeft: 16, marginTop: 4 }}>
                  {currentTabBudgetCategories
                    .filter(cat => tiles.some(t => t.budgetCategory === cat.id && t.mainTabId === selectedMainTab))
                    .map((category) => {
                      const categoryTiles = tiles.filter(t => t.budgetCategory === category.id && t.mainTabId === selectedMainTab);
                      return (
                        <div
                          key={category.id}
                          onClick={() => { setMainMenu('home'); setActiveTab(category.id); }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '6px 0 6px 8px',
                            cursor: 'pointer',
                            color: activeTab === category.id ? '#fff' : '#555',
                            fontWeight: activeTab === category.id ? 700 : 500,
                            background: activeTab === category.id ? '#1976d2' : 'none',
                            borderRadius: 6,
                            marginBottom: 2,
                            fontSize: 13,
                            transition: 'background 0.2s, color 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            if (activeTab !== category.id) {
                              e.currentTarget.style.background = '#e3f2fd';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (activeTab !== category.id) {
                              e.currentTarget.style.background = 'none';
                            }
                          }}
                        >
                          <span style={{ marginRight: 6 }}>{category.icon || '📁'}</span>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {category.name}
                          </span>
                          <span style={{ fontSize: 11, opacity: 0.7 }}>
                            {categoryTiles.length}
                          </span>
                        </div>
                      );
                    })}
                  {!currentTabBudgetCategories.some(cat => tiles.some(t => t.budgetCategory === cat.id && t.mainTabId === selectedMainTab)) && (
                    <div style={{ 
                      padding: '6px 8px', 
                      color: '#64b5f688', 
                      fontSize: 13, 
                      fontStyle: 'italic' 
                    }}>
                      No categorized cards
                    </div>
                  )}
                </div>
                )}
              </div>
              
            </div>
          )}
          <div
            onClick={() => setMainMenu('files')}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '14px 32px',
              cursor: 'pointer',
              background: mainMenu === 'files' ? '#1976d2' : 'none',
              color: mainMenu === 'files' ? '#fff' : '#333',
              fontWeight: mainMenu === 'files' ? 700 : 500,
              fontSize: 18,
              borderLeft: mainMenu === 'files' ? '4px solid #1976d2' : '4px solid transparent',
              transition: 'background 0.2s, color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (mainMenu !== 'files') {
                e.currentTarget.style.background = '#e3f2fd';
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
              background: mainMenu === 'settings' ? '#1976d2' : 'none',
              color: mainMenu === 'settings' ? '#fff' : '#333',
              fontWeight: mainMenu === 'settings' ? 700 : 500,
              fontSize: 18,
              borderLeft: mainMenu === 'settings' ? '4px solid #1976d2' : '4px solid transparent',
              transition: 'background 0.2s, color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (mainMenu !== 'settings') {
                e.currentTarget.style.background = '#e3f2fd';
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
          </div>
          </nav>
      </aside>

      {/* Main Content */}
      <div style={{ marginLeft: sidebarWidth, width: `calc(100vw - ${sidebarWidth}px)`, minHeight: '100vh', position: 'relative', padding: '0' }}>
        <div className="header" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          gap: 12, 
          flexWrap: 'wrap', 
          width: '100%',
          margin: '0', 
          padding: '28px 24px 12px 24px',
          background: 'linear-gradient(90deg, #00b4a6 0%, #0099a8 25%, #0077b6 50%, #1976d2 75%, #90caf9 100%)',
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
          <div style={{ padding: '0 24px 24px 24px', maxWidth: '100%', overflow: 'hidden' }}>
            {/* Breadcrumb Navigation */}
            <div style={{ 
              fontSize: 14, 
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
              background: '#2B3B60',
              padding: '10px 16px',
              borderRadius: '0 0 8px 8px',
              marginLeft: -24,
              marginRight: -24,
              paddingLeft: 24,
            }}>
              <span 
                onClick={() => { setMainMenu('home'); setActiveTab(''); }}
                style={{ 
                  color: '#fff', 
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                🏠 Home
              </span>
              {selectedHomePageTab !== 'all' && (
                <>
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>/</span>
                  <span style={{ color: '#fff', fontWeight: 500 }}>
                    {homePageTabs.find(hpt => hpt.id === selectedHomePageTab)?.name || 'All Web Tiles'}
                  </span>
                </>
              )}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h1 style={{ color: '#1976d2', fontSize: 32, fontWeight: 700, margin: 0, flexShrink: 0 }}>Home Page</h1>
                  {activeTab && activeTab !== '' && (
                    <>
                      <span style={{ color: '#666', fontSize: 24 }}>›</span>
                      <span style={{ 
                        color: '#1976d2', 
                        fontSize: 20, 
                        fontWeight: 600,
                        background: '#e3f2fd',
                        padding: '4px 12px',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}>
                        {budgetCategories.find(c => c.id === activeTab)?.icon || '📁'}
                        {budgetCategories.find(c => c.id === activeTab)?.name || activeTab}
                        <button
                          onClick={() => setActiveTab('')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#1976d2',
                            cursor: 'pointer',
                            padding: '0 0 0 4px',
                            fontSize: 16,
                            fontWeight: 700,
                          }}
                          title="Show all categories"
                        >
                          ✕
                        </button>
                      </span>
                    </>
                  )}
                </div>
                
                {/* View Toggle Tabs */}
                <div style={{ 
                  display: 'flex', 
                  gap: 4,
                  background: '#f0f0f0',
                  padding: 4,
                  borderRadius: 8,
                }}>
                  <button
                    onClick={() => setHomePageView('tiles')}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: 6,
                      background: homePageView === 'tiles' ? '#1976d2' : 'transparent',
                      color: homePageView === 'tiles' ? '#fff' : '#666',
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    🏠 Web Tiles
                  </button>
                  <button
                    onClick={() => setHomePageView('budget')}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: 6,
                      background: homePageView === 'budget' ? '#1976d2' : 'transparent',
                      color: homePageView === 'budget' ? '#fff' : '#666',
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    📅 Calendar Budget
                  </button>
                </div>
              </div>
              
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
            
            {/* Conditional Content Based on View Mode */}
            {homePageView === 'tiles' && (
              <>
            {/* Main Tab Selector - Home Apps / Business Apps */}
            <div style={{ 
              display: 'flex', 
              gap: 0, 
              marginBottom: 24, 
              overflowX: 'auto',
              borderBottom: '2px solid #e0e0e0',
              position: 'relative'
            }}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setSelectedMainTab(tab.id); setActiveTab(''); }}
                  style={{
                    padding: '14px 24px',
                    background: 'transparent',
                    color: selectedMainTab === tab.id ? '#1976d2' : '#666',
                    border: 'none',
                    borderBottom: selectedMainTab === tab.id ? '3px solid #1976d2' : '3px solid transparent',
                    fontSize: 15,
                    fontWeight: selectedMainTab === tab.id ? 600 : 400,
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
                    if (selectedMainTab !== tab.id) {
                      e.currentTarget.style.color = '#1976d2';
                      e.currentTarget.style.background = '#f5f9fc';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedMainTab !== tab.id) {
                      e.currentTarget.style.color = '#666';
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {tab.name}
                </button>
              ))}
            </div>
            
            {/* Two Column Layout: Main Content + Sidebar */}
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
              
              {/* Main Content - Budget Category TILES containing CARDS */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Get categories that have at least one card */}
                {(() => {
                  // Filter tiles by main tab first (Home Apps / Business Apps)
                  // Treat null/undefined mainTabId as 'home' for backwards compatibility
                  const mainTabTiles = tiles.filter(t => t.mainTabId === selectedMainTab || (!t.mainTabId && selectedMainTab === 'home'));
                  
                  // Filter tiles based on selected home page tab
                  let filteredByTab = selectedHomePageTab === 'all'
                    ? mainTabTiles
                    : mainTabTiles.filter(t => t.homePageTabId === selectedHomePageTab || (!t.homePageTabId && selectedHomePageTab === 'all'));
                  
                  // Also filter by activeTab if it's set to a budget category
                  if (activeTab && activeTab !== '') {
                    filteredByTab = filteredByTab.filter(t => t.budgetCategory === activeTab);
                  }
                  
                  // Show all categories when dragging OR when there are uncategorized cards that need a home
                  const hasUncategorizedCards = mainTabTiles.some(t => !t.budgetCategory);
                  
                  // If filtering by a specific category, only show that category
                  // Always exclude 'cancelled' category from regular grid - it has its own section
                  // Use currentTabBudgetCategories instead of global budgetCategories
                  let categoriesToShow;
                  if (activeTab && activeTab !== '') {
                    categoriesToShow = currentTabBudgetCategories.filter(cat => cat.id === activeTab && !cat.id.includes('cancelled'));
                  } else if (activeCardId || hasUncategorizedCards) {
                    categoriesToShow = currentTabBudgetCategories.filter(cat => !cat.id.includes('cancelled')); // Show all except cancelled when dragging
                  } else {
                    // Always show ALL categories for the tab (even empty ones)
                    // This ensures empty categories remain visible after adding cards
                    categoriesToShow = currentTabBudgetCategories.filter(cat => !cat.id.includes('cancelled'));
                  }
                  
                  // Also check for uncategorized cards (cards without budgetCategory) - only show when viewing all
                  const uncategorizedCards = activeTab === '' ? mainTabTiles.filter(t => !t.budgetCategory) : [];
                  
                  // Get cancelled subscriptions for display (only for this main tab)
                  const cancelledCards = mainTabTiles.filter(t => t.budgetCategory === 'cancelled' || t.cancellationDate);
                  
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
                      
                      {/* Cancelled Subscriptions Section */}
                      {cancelledCards.length > 0 && (
                        <div style={{ marginTop: 24 }}>
                          {/* Grey horizontal divider line */}
                          <div style={{ 
                            height: 1, 
                            background: '#ccc', 
                            marginBottom: 24,
                          }}></div>
                          <div style={{
                            background: '#fff5f5',
                            border: '1px solid #ffcdd2',
                            borderRadius: 12,
                            padding: '20px 24px',
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              borderBottom: '1px solid #ffcdd2',
                              paddingBottom: 12,
                              marginBottom: 16,
                            }}>
                              <h2 style={{ 
                                color: '#d32f2f', 
                                fontSize: 18, 
                                fontWeight: 700, 
                                margin: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                              }}>
                                <span style={{ fontSize: 20 }}>🚫</span>
                                Cancelled Subscriptions ({cancelledCards.length})
                              </h2>
                              <div style={{ fontSize: 12, color: '#d32f2f', fontWeight: 600 }}>
                                💰 Tracking your savings
                              </div>
                            </div>
                            <div style={{ 
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: 12,
                              alignContent: 'flex-start',
                            }}>
                              {cancelledCards.map((tile) => (
                                <div
                                  key={tile.id}
                                  style={{
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: '10px 14px',
                                    background: '#fff',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    border: '1px solid #f8bbd9',
                                    transition: 'all 0.2s ease',
                                    minWidth: 180,
                                  }}
                                  onClick={() => handleEditTile(tile.id)}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = '#e91e63';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(233, 30, 99, 0.2)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = '#f8bbd9';
                                    e.currentTarget.style.boxShadow = 'none';
                                  }}
                                  title={`Cancelled: ${tile.cancellationDate ? new Date(tile.cancellationDate).toLocaleDateString() : 'Date not set'}`}
                                >
                                  {tile.logo ? (
                                    <img 
                                      src={tile.logo} 
                                      alt={tile.name}
                                      style={{ 
                                        width: 32, 
                                        height: 32, 
                                        borderRadius: 6,
                                        objectFit: 'contain',
                                        opacity: 0.6,
                                        filter: 'grayscale(50%)',
                                      }}
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <span style={{ 
                                      width: 32, 
                                      height: 32, 
                                      background: '#f0f0f0', 
                                      borderRadius: 6,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: 14,
                                      color: '#999',
                                    }}>
                                      {tile.name.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                  <div style={{ flex: 1 }}>
                                    <div style={{ 
                                      fontSize: 13, 
                                      fontWeight: 600, 
                                      color: '#666',
                                      textDecoration: 'line-through',
                                    }}>
                                      {tile.name}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#e91e63', fontWeight: 500 }}>
                                      {tile.cancellationDate 
                                        ? `Cancelled: ${new Date(tile.cancellationDate).toLocaleDateString()}`
                                        : 'Cancelled'
                                      }
                                    </div>
                                  </div>
                                  {/* Restore button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      restoreSubscription(tile.id);
                                    }}
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: 4,
                                      border: 'none',
                                      background: '#e8f5e9',
                                      color: '#2e7d32',
                                      fontSize: 11,
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4,
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = '#2e7d32';
                                      e.currentTarget.style.color = '#fff';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = '#e8f5e9';
                                      e.currentTarget.style.color = '#2e7d32';
                                    }}
                                    title="Restore this subscription"
                                  >
                                    ♻️ Restore
                                  </button>
                                  {/* Delete button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (window.confirm(`Are you sure you want to delete "${tile.name}"? This action cannot be undone.`)) {
                                        handleDeleteTile(tile.id);
                                      }
                                    }}
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: 4,
                                      border: 'none',
                                      background: '#ffebee',
                                      color: '#c62828',
                                      fontSize: 11,
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4,
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = '#c62828';
                                      e.currentTarget.style.color = '#fff';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = '#ffebee';
                                      e.currentTarget.style.color = '#c62828';
                                    }}
                                    title="Delete this card permanently"
                                  >
                                    🗑️ Delete
                                  </button>
                                </div>
                              ))}
                            </div>
                            <div style={{ 
                              marginTop: 12, 
                              fontSize: 12, 
                              color: '#c2185b', 
                              fontStyle: 'italic' 
                            }}>
                              💡 Click a card to view details or use the Restore button to reactivate
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
                  // Filter tiles by main tab (Home Apps vs Business Apps)
                  // Treat null/undefined mainTabId as 'home' for backwards compatibility
                  const filteredTiles = tiles.filter(t => t.mainTabId === selectedMainTab || (!t.mainTabId && selectedMainTab === 'home'));
                  
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
                  
                  // Calculate annual savings from cancelled subscriptions (for current main tab)
                  // Treat null/undefined mainTabId as 'home' for backwards compatibility with older tiles
                  const cancelledTiles = tiles.filter(t => (t.isCancelled || t.budgetCategory === 'cancelled') && (t.mainTabId === selectedMainTab || (!t.mainTabId && selectedMainTab === 'home')));
                  const annualSavings = cancelledTiles.reduce((sum, t) => {
                    const amount = t.budgetAmount || t.paymentAmount || 0;
                    const freq = t.budgetPeriod || t.paymentFrequency || '';
                    if (freq === 'Monthly') {
                      return sum + (amount * 12); // Monthly savings * 12 = annual
                    } else if (freq === 'Annually') {
                      return sum + amount;
                    }
                    return sum;
                  }, 0);
                  
                  // Show all active sessions (simplified filtering)
                  const filteredSessions = activeSessions;
                  
                  return (
                    <>
                {/* Annual Savings Card - at top */}
                {annualSavings > 0 && (
                <div style={{
                  background: '#e8f5e9',
                  padding: '16px 20px',
                  borderRadius: 8,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  border: '2px solid #4caf50',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(76,175,80,0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)';
                }}>
                  <div style={{ fontSize: 32 }}>💚</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#2e7d32', marginBottom: 2 }}>Annual Savings</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#2e7d32' }}>
                      {formatCurrency(annualSavings)}
                    </div>
                    <div style={{ fontSize: 11, color: '#66bb6a', marginTop: 2 }}>
                      {cancelledTiles.length} cancelled subscription{cancelledTiles.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                )}

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
            </>
            )}

            {/* Calendar Budget View */}
            {homePageView === 'budget' && (
              <div style={{ marginTop: 0 }}>
                {/* Tab indicator for Calendar Budget */}
                <div style={{ 
                  marginBottom: 16, 
                  padding: '10px 16px', 
                  background: '#e3f2fd', 
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <span style={{ fontWeight: 600, color: '#1976d2' }}>
                    📊 {tabs.find(t => t.id === selectedMainTab)?.name || 'Home Apps'} Budget
                  </span>
                  <span style={{ fontSize: 12, color: '#666' }}>
                    Showing budget for selected tab only
                  </span>
                </div>
                
                {/* Year Selector and Month Tabs */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => setCalendarReportYear(y => y - 1)}
                      style={{
                        background: '#e3f2fd',
                        color: '#1976d2',
                        border: 'none',
                        borderRadius: 4,
                        padding: '6px 12px',
                        fontSize: 16,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ◀
                    </button>
                    <span style={{ 
                      fontSize: 20, 
                      fontWeight: 700, 
                      color: '#1976d2',
                      minWidth: 60,
                      textAlign: 'center',
                    }}>
                      {calendarReportYear}
                    </span>
                    <button
                      onClick={() => setCalendarReportYear(y => y + 1)}
                      style={{
                        background: '#e3f2fd',
                        color: '#1976d2',
                        border: 'none',
                        borderRadius: 4,
                        padding: '6px 12px',
                        fontSize: 16,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ▶
                    </button>
                  </div>
                  
                  {/* Month Tabs */}
                  <div style={{ 
                    display: 'flex', 
                    gap: 2,
                    flex: 1,
                  }}>
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => {
                      const isActive = calendarReportMonth === index;
                      const monthKey = `${calendarReportYear}-${String(index + 1).padStart(2, '0')}`;
                      const hasData = tiles.some(t => (t.budgetHistory?.[monthKey]?.actual || 0) > 0);
                      
                      return (
                        <button
                          key={month}
                          onClick={() => setCalendarReportMonth(index)}
                          style={{
                            padding: '8px 12px',
                            border: 'none',
                            background: isActive ? '#1976d2' : '#f5f5f5',
                            color: isActive ? '#fff' : '#666',
                            fontWeight: isActive ? 700 : 500,
                            fontSize: 13,
                            cursor: 'pointer',
                            borderRadius: 6,
                            position: 'relative',
                            transition: 'all 0.2s ease',
                            flex: 1,
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.background = '#e3f2fd';
                              e.currentTarget.style.color = '#1976d2';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.background = '#f5f5f5';
                              e.currentTarget.style.color = '#666';
                            }
                          }}
                        >
                          {month}
                          {hasData && (
                            <span style={{
                              position: 'absolute',
                              top: 2,
                              right: 2,
                              width: 5,
                              height: 5,
                              background: isActive ? '#90caf9' : '#4caf50',
                              borderRadius: '50%',
                            }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Budget Table - Simplified for Home Page */}
                {(() => {
                  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                  const monthKey = `${calendarReportYear}-${String(calendarReportMonth + 1).padStart(2, '0')}`;
                  
                  // Get all tiles with budget info - filtered by selected main tab (strict)
                  const budgetTiles = tiles.filter(t => 
                    (t.budgetAmount || t.paymentAmount || t.budgetType) && 
                    t.mainTabId === selectedMainTab
                  );
                  const sortedTiles = [...budgetTiles].sort((a, b) => {
                    const catA = a.budgetCategory || 'zzz';
                    const catB = b.budgetCategory || 'zzz';
                    if (catA !== catB) return catA.localeCompare(catB);
                    return a.name.localeCompare(b.name);
                  });
                  
                  // Group by category
                  const groupedByCategory: { [key: string]: Tile[] } = {};
                  sortedTiles.forEach(tile => {
                    const catId = tile.budgetCategory || 'uncategorized';
                    if (!groupedByCategory[catId]) {
                      groupedByCategory[catId] = [];
                    }
                    groupedByCategory[catId].push(tile);
                  });
                  
                  let grandTotalBudget = 0;
                  let grandTotalActual = 0;
                  
                  return (
                    <div style={{ display: 'flex', gap: 24 }}>
                      {/* Main Budget Content */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Month Header */}
                        <div style={{
                          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                          borderRadius: 8,
                          padding: '14px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}>
                          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: 0 }}>
                            {monthNames[calendarReportMonth]} {calendarReportYear}
                          </h2>
                          <span style={{ color: '#bbdefb', fontSize: 13 }}>
                            {sortedTiles.length} budget items
                          </span>
                        </div>

                        {/* Category Groups - Sort cancelled to bottom */}
                        {Object.entries(groupedByCategory)
                          .sort(([a], [b]) => {
                            // Put 'cancelled' category at the end
                            if (a === 'cancelled') return 1;
                            if (b === 'cancelled') return -1;
                            return a.localeCompare(b);
                          })
                          .map(([categoryId, categoryTiles]) => {
                          const category = budgetCategories.find(c => c.id === categoryId);
                          const categoryName = category?.name || 'Uncategorized';
                          
                          let categoryBudget = 0;
                          let categoryActual = 0;
                          
                          // Helper to calculate payment day for a tile
                          const getPaymentDay = (tile: Tile): number => {
                            if (tile.signupDate) {
                              const signup = new Date(tile.signupDate);
                              return signup.getDate();
                            }
                            return 32; // Put tiles without date at end
                          };
                          
                          // Sort categoryTiles by payment day
                          const sortedCategoryTiles = [...categoryTiles].sort((a, b) => {
                            return getPaymentDay(a) - getPaymentDay(b);
                          });
                          
                          return (
                            <div key={categoryId} style={{
                              background: '#fff',
                              borderRadius: 8,
                              boxShadow: '0 2px 8px #0001',
                              overflow: 'hidden',
                            }}>
                              {/* Category Header */}
                              <div style={{
                                background: '#f5f5f5',
                                padding: '10px 16px',
                                borderBottom: '1px solid #e0e0e0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                              }}>
                                <span style={{ fontSize: 16 }}>{category?.icon || '📁'}</span>
                                <span style={{ fontWeight: 700, color: '#333', fontSize: 14 }}>{categoryName}</span>
                                <span style={{ color: '#666', fontSize: 12 }}>({categoryTiles.length})</span>
                              </div>

                              {/* Table Header */}
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 0.7fr 1fr 1fr 1fr',
                                gap: 8,
                                padding: '10px 16px',
                                background: '#fafafa',
                                borderBottom: '1px solid #eee',
                                fontWeight: 600,
                                fontSize: 11,
                                color: '#666',
                                textTransform: 'uppercase',
                              }}>
                                <div>Name</div>
                                <div style={{ textAlign: 'center' }}>Due Date</div>
                                <div style={{ textAlign: 'right' }}>Budget</div>
                                <div style={{ textAlign: 'right' }}>Actual</div>
                                <div style={{ textAlign: 'right' }}>Diff</div>
                              </div>

                              {/* Table Rows */}
                              {sortedCategoryTiles.map((tile, tileIndex) => {
                                const amount = tile.budgetAmount || tile.paymentAmount || 0;
                                const freq = tile.budgetPeriod || tile.paymentFrequency || '';
                                const isCancelled = tile.isCancelled || tile.budgetCategory === 'cancelled';
                                
                                // Calculate budget for this specific month
                                let monthlyBudget = 0;
                                let paymentDateStr = '-';
                                let isPaymentMonth = false;
                                
                                if (tile.signupDate) {
                                  const signupDate = new Date(tile.signupDate);
                                  const signupMonth = signupDate.getMonth(); // 0-11
                                  const paymentDay = signupDate.getDate();
                                  
                                  // Create date for current report month
                                  const paymentDate = new Date(calendarReportYear, calendarReportMonth, paymentDay);
                                  // Handle months with fewer days (e.g., Feb 30 -> Feb 28)
                                  if (paymentDate.getMonth() !== calendarReportMonth) {
                                    paymentDate.setDate(0); // Go to last day of previous month
                                  }
                                  paymentDateStr = paymentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                  
                                  // Calculate monthly budget based on frequency
                                  switch (freq) {
                                    case 'Weekly':
                                      // 52 weeks per year, ~4.33 per month
                                      monthlyBudget = amount * (52 / 12);
                                      isPaymentMonth = true;
                                      paymentDateStr = 'Weekly';
                                      break;
                                    case 'Bi-Weekly':
                                      // 26 pay periods per year, ~2.17 per month
                                      monthlyBudget = amount * (26 / 12);
                                      isPaymentMonth = true;
                                      paymentDateStr = 'Bi-Weekly';
                                      break;
                                    case 'Semi-Monthly':
                                      // 24 pay periods per year, exactly 2 per month
                                      monthlyBudget = amount * 2;
                                      isPaymentMonth = true;
                                      paymentDateStr = '1st & 15th';
                                      break;
                                    case 'Monthly':
                                      // Monthly: show amount every month
                                      monthlyBudget = amount;
                                      isPaymentMonth = true;
                                      break;
                                    case 'Quarterly':
                                      // Quarterly: show full amount every 3 months starting from signup month
                                      isPaymentMonth = (calendarReportMonth - signupMonth + 12) % 3 === 0;
                                      monthlyBudget = isPaymentMonth ? amount : 0;
                                      if (!isPaymentMonth) paymentDateStr = '-';
                                      break;
                                    case 'Annually':
                                      // Annual: only show full amount in the payment month
                                      isPaymentMonth = signupMonth === calendarReportMonth;
                                      monthlyBudget = isPaymentMonth ? amount : 0;
                                      if (!isPaymentMonth) paymentDateStr = '-';
                                      break;
                                    default:
                                      monthlyBudget = amount;
                                      isPaymentMonth = true;
                                  }
                                } else {
                                  // No signup date - fall back to averaged monthly amounts
                                  switch (freq) {
                                    case 'Weekly': monthlyBudget = amount * (52 / 12); break;
                                    case 'Bi-Weekly': monthlyBudget = amount * (26 / 12); break;
                                    case 'Semi-Monthly': monthlyBudget = amount * 2; break;
                                    case 'Monthly': monthlyBudget = amount; break;
                                    case 'Quarterly': monthlyBudget = amount / 3; break;
                                    case 'Annually': monthlyBudget = amount / 12; break;
                                    default: monthlyBudget = amount;
                                  }
                                }
                                
                                // For cancelled subscriptions, show as negative (savings)
                                if (isCancelled) {
                                  monthlyBudget = -Math.abs(monthlyBudget);
                                }
                                
                                const actual = tile.budgetHistory?.[monthKey]?.actual || 0;
                                const difference = monthlyBudget - actual;
                                
                                categoryBudget += monthlyBudget;
                                categoryActual += actual;
                                grandTotalBudget += monthlyBudget;
                                grandTotalActual += actual;
                                
                                return (
                                  <div
                                    key={tile.id}
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns: '2fr 0.7fr 1fr 1fr 1fr',
                                      gap: 8,
                                      padding: '10px 16px',
                                      borderBottom: tileIndex < sortedCategoryTiles.length - 1 ? '1px solid #f0f0f0' : 'none',
                                      alignItems: 'center',
                                      fontSize: 13,
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      {tile.logo && (
                                        <img 
                                          src={tile.logo} 
                                          alt="" 
                                          style={{ width: 20, height: 20, borderRadius: 4, objectFit: 'contain' }}
                                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                      )}
                                      {tile.link ? (
                                        <a 
                                          href={tile.link} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          style={{ 
                                            fontWeight: 500, 
                                            color: '#1976d2', 
                                            textDecoration: 'none',
                                            cursor: 'pointer',
                                          }}
                                          onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                                          onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                                        >
                                          {tile.name}
                                        </a>
                                      ) : (
                                        <span style={{ fontWeight: 500, color: '#333' }}>{tile.name}</span>
                                      )}
                                      {/* Edit Card Button */}
                                      <button
                                        onClick={() => handleEditTile(tile.id)}
                                        title="Edit card"
                                        style={{
                                          background: '#f5f5f5',
                                          border: '1px solid #ccc',
                                          padding: '2px 5px',
                                          cursor: 'pointer',
                                          fontSize: 11,
                                          color: '#999',
                                          borderRadius: 4,
                                          transition: 'all 0.2s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = '#e3f2fd';
                                          e.currentTarget.style.borderColor = '#90caf9';
                                          e.currentTarget.style.color = '#1976d2';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = '#f5f5f5';
                                          e.currentTarget.style.borderColor = '#ccc';
                                          e.currentTarget.style.color = '#999';
                                        }}
                                      >
                                        ✎
                                      </button>
                                    </div>
                                    <div style={{ textAlign: 'center', fontSize: 12, color: '#666' }}>
                                      {paymentDateStr}
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                      <div style={{ 
                                        display: 'inline-flex', 
                                        alignItems: 'center',
                                        border: '1px solid #ddd',
                                        borderRadius: 4,
                                        background: '#fff',
                                        overflow: 'hidden',
                                      }}>
                                        <span style={{ 
                                          padding: '4px 3px 4px 6px', 
                                          color: '#666',
                                          fontSize: 12,
                                          fontWeight: 500,
                                          background: '#f5f5f5',
                                        }}>$</span>
                                        <input
                                          type="text"
                                          defaultValue={monthlyBudget > 0 ? monthlyBudget.toFixed(2) : ''}
                                          key={`budget-${tile.id}-${monthKey}-${monthlyBudget}`}
                                          onBlur={(e) => {
                                            const value = e.target.value.replace(/[^0-9.]/g, '');
                                            const newBudget = parseFloat(value) || 0;
                                            if (newBudget !== monthlyBudget) {
                                              // Convert monthly budget back to per-period amount
                                              let newAmount = newBudget;
                                              switch (freq) {
                                                case 'Weekly': newAmount = newBudget / (52 / 12); break;
                                                case 'Bi-Weekly': newAmount = newBudget / (26 / 12); break;
                                                case 'Semi-Monthly': newAmount = newBudget / 2; break;
                                                case 'Monthly': newAmount = newBudget; break;
                                                case 'Quarterly': newAmount = newBudget; break; // Quarterly shows full amount
                                                case 'Annually': newAmount = newBudget; break; // Annually shows full amount
                                              }
                                              setTiles(prevTiles => prevTiles.map(t => {
                                                if (t.id !== tile.id) return t;
                                                return { ...t, budgetAmount: newAmount, paymentAmount: newAmount };
                                              }));
                                            }
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.currentTarget.blur();
                                            }
                                          }}
                                          placeholder="0.00"
                                          style={{
                                            width: '70px',
                                            padding: '4px 6px 4px 3px',
                                            border: 'none',
                                            fontSize: 12,
                                            textAlign: 'right',
                                            background: '#fff',
                                            outline: 'none',
                                          }}
                                        />
                                      </div>
                                    </div>
                                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                                      {/* Receipt icon - shows if there's a receipt for this card in this month */}
                                      {(() => {
                                        const tileReceipts = receiptFiles.filter(r => {
                                          if (r.cardId !== tile.id) return false;
                                          const receiptDate = new Date(r.paymentDate);
                                          return receiptDate.getFullYear() === calendarReportYear && 
                                                 receiptDate.getMonth() === calendarReportMonth;
                                        });
                                        if (tileReceipts.length > 0) {
                                          return (
                                            <button
                                              onClick={() => {
                                                // Open first receipt in new tab
                                                const receipt = tileReceipts[0];
                                                const newWindow = window.open();
                                                if (newWindow) {
                                                  if (receipt.fileType === 'pdf' || receipt.fileType === 'image') {
                                                    newWindow.document.write(`<iframe src="${receipt.fileData}" style="width:100%;height:100%;border:none;"></iframe>`);
                                                  } else if (receipt.fileType === 'html') {
                                                    const htmlContent = atob(receipt.fileData.split(',')[1]);
                                                    newWindow.document.write(htmlContent);
                                                  } else {
                                                    newWindow.location.href = receipt.fileData;
                                                  }
                                                }
                                              }}
                                              title={`View receipt${tileReceipts.length > 1 ? ` (${tileReceipts.length} receipts)` : ''}`}
                                              style={{
                                                background: '#e8f5e9',
                                                border: '1px solid #a5d6a7',
                                                borderRadius: 4,
                                                padding: '3px 5px',
                                                cursor: 'pointer',
                                                fontSize: 12,
                                                transition: 'all 0.2s ease',
                                              }}
                                              onMouseEnter={(e) => {
                                                e.currentTarget.style.background = '#4caf50';
                                                e.currentTarget.style.borderColor = '#4caf50';
                                              }}
                                              onMouseLeave={(e) => {
                                                e.currentTarget.style.background = '#e8f5e9';
                                                e.currentTarget.style.borderColor = '#a5d6a7';
                                              }}
                                            >
                                              🧾{tileReceipts.length > 1 ? tileReceipts.length : ''}
                                            </button>
                                          );
                                        }
                                        return null;
                                      })()}
                                      {/* Copy Budget to Actual button */}
                                      <button
                                        onClick={() => {
                                          setTiles(prevTiles => prevTiles.map(t => {
                                            if (t.id !== tile.id) return t;
                                            return {
                                              ...t,
                                              budgetHistory: {
                                                ...t.budgetHistory,
                                                [monthKey]: {
                                                  ...t.budgetHistory?.[monthKey],
                                                  budget: monthlyBudget,
                                                  actual: monthlyBudget,
                                                }
                                              }
                                            };
                                          }));
                                        }}
                                        title="Copy Budget to Actual"
                                        style={{
                                          background: '#e3f2fd',
                                          border: '1px solid #90caf9',
                                          borderRadius: 4,
                                          padding: '4px 6px',
                                          cursor: 'pointer',
                                          fontSize: 11,
                                          color: '#1976d2',
                                          fontWeight: 600,
                                          transition: 'all 0.2s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = '#1976d2';
                                          e.currentTarget.style.color = '#fff';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = '#e3f2fd';
                                          e.currentTarget.style.color = '#1976d2';
                                        }}
                                      >
                                        →
                                      </button>
                                      <div style={{ 
                                        display: 'inline-flex', 
                                        alignItems: 'center',
                                        border: '1px solid #ddd',
                                        borderRadius: 4,
                                        background: '#fff',
                                        overflow: 'hidden',
                                      }}>
                                        <span style={{ 
                                          padding: '4px 3px 4px 6px', 
                                          color: '#666',
                                          fontSize: 12,
                                          fontWeight: 500,
                                          background: '#f5f5f5',
                                        }}>$</span>
                                        <input
                                          type="text"
                                          defaultValue={actual > 0 ? actual.toFixed(2) : ''}
                                          key={`actual-${tile.id}-${monthKey}-${actual}`}
                                          onBlur={(e) => {
                                            const value = e.target.value.replace(/[^0-9.]/g, '');
                                            const newActual = parseFloat(value) || 0;
                                            if (newActual !== actual) {
                                              setTiles(prevTiles => prevTiles.map(t => {
                                                if (t.id !== tile.id) return t;
                                                return {
                                                  ...t,
                                                  budgetHistory: {
                                                    ...t.budgetHistory,
                                                    [monthKey]: {
                                                      ...t.budgetHistory?.[monthKey],
                                                      budget: monthlyBudget,
                                                      actual: newActual,
                                                    }
                                                  }
                                                };
                                              }));
                                            }
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.currentTarget.blur();
                                            }
                                          }}
                                          placeholder="0.00"
                                          style={{
                                            width: '70px',
                                            padding: '4px 6px 4px 3px',
                                            border: 'none',
                                            fontSize: 12,
                                            textAlign: 'right',
                                            background: '#fff',
                                            outline: 'none',
                                          }}
                                        />
                                      </div>
                                    </div>
                                    <div style={{ 
                                      textAlign: 'right',
                                      fontWeight: 600,
                                      fontSize: 12,
                                      color: difference >= 0 ? '#4caf50' : '#e53935',
                                    }}>
                                      {monthlyBudget > 0 ? (
                                        <>{difference >= 0 ? '+' : ''}{formatCurrency(difference)}</>
                                      ) : '-'}
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Category Subtotal */}
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 1fr 1fr 1fr',
                                gap: 8,
                                padding: '10px 16px',
                                background: '#f9f9f9',
                                fontWeight: 600,
                                fontSize: 12,
                              }}>
                                <div style={{ color: '#666' }}>Subtotal</div>
                                <div style={{ textAlign: 'right', color: '#1976d2' }}>
                                  {formatCurrency(categoryBudget)}
                                </div>
                                <div style={{ textAlign: 'right', color: '#666' }}>
                                  {formatCurrency(categoryActual)}
                                </div>
                                <div style={{ 
                                  textAlign: 'right',
                                  color: categoryBudget - categoryActual >= 0 ? '#4caf50' : '#e53935',
                                }}>
                                  {categoryBudget - categoryActual >= 0 ? '+' : ''}{formatCurrency(categoryBudget - categoryActual)}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Grand Total */}
                        <div style={{
                          background: 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)',
                          borderRadius: 8,
                          padding: '16px 20px',
                        }}>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '2fr 1fr 1fr 1fr',
                            gap: 16,
                            alignItems: 'center',
                          }}>
                            <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>
                              📊 Total
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ color: '#bbdefb', fontSize: 10, textTransform: 'uppercase' }}>Budget</div>
                              <div style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{formatCurrency(grandTotalBudget)}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ color: '#bbdefb', fontSize: 10, textTransform: 'uppercase' }}>Actual</div>
                              <div style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{formatCurrency(grandTotalActual)}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ color: '#bbdefb', fontSize: 10, textTransform: 'uppercase' }}>Diff</div>
                              <div style={{ 
                                fontSize: 16, 
                                fontWeight: 700,
                                color: grandTotalBudget - grandTotalActual >= 0 ? '#a5d6a7' : '#ef9a9a',
                              }}>
                                {grandTotalBudget - grandTotalActual >= 0 ? '+' : ''}{formatCurrency(grandTotalBudget - grandTotalActual)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Sidebar - Year Overview */}
                      <div style={{ width: 280, flexShrink: 0 }}>
                        <div style={{
                          background: '#fff',
                          borderRadius: 8,
                          boxShadow: '0 2px 8px #0001',
                          padding: '16px',
                        }}>
                          <h3 style={{ color: '#333', fontSize: 14, fontWeight: 700, marginBottom: 16, margin: '0 0 16px 0' }}>
                            📈 {calendarReportYear} Overview
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, idx) => {
                              const mKey = `${calendarReportYear}-${String(idx + 1).padStart(2, '0')}`;
                              let mBudget = 0;
                              let mActual = 0;
                              tiles.forEach(t => {
                                const amt = t.budgetAmount || t.paymentAmount || 0;
                                const fr = t.budgetPeriod || t.paymentFrequency || '';
                                const mb = fr === 'Monthly' ? amt : (fr === 'Annually' ? amt / 12 : 0);
                                mBudget += mb;
                                mActual += t.budgetHistory?.[mKey]?.actual || 0;
                              });
                              const isCurrentMonth = calendarReportMonth === idx;
                              const diff = mBudget - mActual;
                              const percentage = mBudget > 0 ? Math.min((mActual / mBudget) * 100, 100) : 0;
                              
                              return (
                                <div 
                                  key={month}
                                  onClick={() => setCalendarReportMonth(idx)}
                                  style={{ 
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '6px 8px',
                                    borderRadius: 4,
                                    background: isCurrentMonth ? '#e3f2fd' : 'transparent',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                  }}
                                >
                                  <span style={{ 
                                    fontSize: 11, 
                                    color: isCurrentMonth ? '#1976d2' : '#999',
                                    fontWeight: isCurrentMonth ? 700 : 500,
                                    width: 28,
                                  }}>
                                    {month}
                                  </span>
                                  <div style={{ 
                                    flex: 1, 
                                    height: 8, 
                                    background: '#f0f0f0',
                                    borderRadius: 4,
                                    overflow: 'hidden',
                                  }}>
                                    <div style={{
                                      height: '100%',
                                      width: `${percentage}%`,
                                      background: diff >= 0 ? '#4caf50' : '#e53935',
                                      borderRadius: 4,
                                      transition: 'width 0.3s ease',
                                    }} />
                                  </div>
                                  <span style={{ 
                                    fontSize: 10, 
                                    fontWeight: 600,
                                    color: diff >= 0 ? '#4caf50' : '#e53935',
                                    width: 50,
                                    textAlign: 'right',
                                  }}>
                                    {mActual > 0 ? formatCurrency(diff) : '-'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
        {mainMenu === 'home' && activeTab !== '' && activeTab !== 'APP Report' && (
          <div style={{ padding: '0 24px' }}>
            {/* Breadcrumb Navigation */}
            <div style={{ 
              marginTop: 32,
              marginBottom: 12, 
              fontSize: 14, 
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#2B3B60',
              padding: '10px 16px',
              borderRadius: 8,
            }}>
              <span 
                onClick={() => { setMainMenu('home'); setActiveTab(''); }}
                style={{ 
                  color: '#fff', 
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                🏠 Home
              </span>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>/</span>
              <span style={{ color: '#fff', fontWeight: 500 }}>
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
                      // Look for category in ALL tabs' budget categories, not just the global one
                      let category: BudgetCategory | undefined;
                      let tileMainTab: Tab | undefined;
                      for (const tab of tabs) {
                        const found = tab.budgetCategories?.find(c => c.id === tile.budgetCategory);
                        if (found) {
                          category = found;
                          tileMainTab = tab;
                          break;
                        }
                      }
                      // Fallback to global budgetCategories if not found in tabs
                      if (!category) {
                        category = budgetCategories.find(c => c.id === tile.budgetCategory);
                      }
                      
                      // Determine which main tab the tile belongs to
                      const mainTabName = tile.mainTabId === 'business' ? 'Business Apps' : 'Home Apps';
                      
                      return (
                        <div
                          key={tile.id}
                          onClick={() => {
                            // Switch to the correct main tab (Home Apps / Business Apps)
                            if (tile.mainTabId) {
                              setSelectedMainTab(tile.mainTabId);
                            }
                            // Switch to the correct home page tab if specified
                            if (tile.homePageTabId) {
                              setSelectedHomePageTab(tile.homePageTabId);
                            } else {
                              setSelectedHomePageTab('all');
                            }
                            // Set the category filter
                            if (tile.budgetCategory) {
                              setActiveTab(tile.budgetCategory);
                            } else {
                              setActiveTab('');
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
                            <span style={{ marginLeft: 8, padding: '2px 6px', background: tile.mainTabId === 'business' ? '#e3f2fd' : '#f3e5f5', borderRadius: 4, fontSize: 11 }}>
                              {mainTabName}
                            </span>
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
                <span
                  className="edit-icon"
                  title="Edit Category"
                  style={{ fontSize: 22, color: '#1976d2', cursor: 'pointer', background: '#e3f2fd', borderRadius: '50%', padding: 6, transition: 'all 0.2s ease' }}
                  onClick={() => openEditBudgetCategoryModal(activeTab)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#1976d2';
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.transform = 'scale(1.15) rotate(5deg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#e3f2fd';
                    e.currentTarget.style.color = '#1976d2';
                    e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                  }}
                  role="button"
                  tabIndex={0}
                >✏️</span>
                {activeTab !== 'cancelled' && (
                  <span
                    className="edit-icon"
                    title="Delete Category"
                    style={{ fontSize: 22, color: '#e53935', cursor: 'pointer', background: '#ffebee', borderRadius: '50%', padding: 6, transition: 'all 0.2s ease' }}
                    onClick={() => handleDeleteBudgetCategory(activeTab)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e53935';
                      e.currentTarget.style.color = '#fff';
                      e.currentTarget.style.transform = 'scale(1.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#ffebee';
                      e.currentTarget.style.color = '#e53935';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    role="button"
                    tabIndex={0}
                  >🗑️</span>
                )}
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
                            {/* Add Card button */}
                            <div
                              onClick={() => {
                                setShowTileModal(true);
                                setEditTileId(null);
                                setForm({
                                  name: '',
                                  description: '',
                                  link: '',
                                  logo: '',
                                  category: activeTab,
                                  subcategory: group.name,
                                  signupDate: '',
                                  paymentFrequency: 'Monthly',
                                  paymentAmount: 0,
                                  paidSubscription: false,
                                  homePageTabId: null,
                                  cancellationDate: null,
                                  creditCardId: null,
                                  paymentTypeLast4: '',
                                  creditCardName: '',
                                  accountLink: '',
                                  notes: '',
                                  isWebLinkOnly: false,
                                  budgetType: null,
                                  budgetAmount: null,
                                  budgetPeriod: null,
                                  budgetCategory: activeTab,
                                  budgetSubcategory: group.name,
                                });
                              }}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#fafafa',
                                border: '2px dashed #ccc',
                                borderRadius: 16,
                                minHeight: 110,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                gap: 8,
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#e3f2fd';
                                e.currentTarget.style.borderColor = '#1976d2';
                                e.currentTarget.style.transform = 'scale(1.02)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#fafafa';
                                e.currentTarget.style.borderColor = '#ccc';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                              title={`Add new card to ${group.name}`}
                            >
                              <span style={{ fontSize: 32 }}>🃏</span>
                              <span style={{ fontSize: 14, color: '#666', fontWeight: 600 }}>Add Card</span>
                            </div>
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
                              {/* Add Card button */}
                              <div
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
                                    signupDate: '',
                                    paymentFrequency: 'Monthly',
                                    paymentAmount: 0,
                                    paidSubscription: false,
                                    homePageTabId: null,
                                    cancellationDate: null,
                                    creditCardId: null,
                                    paymentTypeLast4: '',
                                    creditCardName: '',
                                    accountLink: '',
                                    notes: '',
                                    isWebLinkOnly: false,
                                    budgetType: null,
                                    budgetAmount: null,
                                    budgetPeriod: null,
                                    budgetCategory: activeTab,
                                    budgetSubcategory: null,
                                  });
                                }}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: '#fafafa',
                                  border: '2px dashed #ccc',
                                  borderRadius: 16,
                                  minHeight: 110,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  gap: 8,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#e3f2fd';
                                  e.currentTarget.style.borderColor = '#1976d2';
                                  e.currentTarget.style.transform = 'scale(1.02)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = '#fafafa';
                                  e.currentTarget.style.borderColor = '#ccc';
                                  e.currentTarget.style.transform = 'scale(1)';
                                }}
                                title="Add new card"
                              >
                                <span style={{ fontSize: 32 }}>🃏</span>
                                <span style={{ fontSize: 14, color: '#666', fontWeight: 600 }}>Add Card</span>
                              </div>
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
        {/* FILES PAGE */}
        {mainMenu === 'files' && (
          <div style={{ padding: '32px 24px', maxWidth: 1400, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
              <h1 style={{ color: '#1976d2', fontSize: 32, fontWeight: 700, margin: 0 }}>📁 Receipt Files</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 14, color: '#666' }}>
                  {receiptFiles.length} receipt{receiptFiles.length !== 1 ? 's' : ''} stored
                </div>
                <button
                  onClick={() => {
                    setMainMenu('home');
                    setActiveTab('');
                    setHomePageView('budget');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 16px',
                    background: '#e3f2fd',
                    color: '#1976d2',
                    border: '2px solid #1976d2',
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#1976d2';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#e3f2fd';
                    e.currentTarget.style.color = '#1976d2';
                  }}
                >
                  📊 Calendar Budget
                </button>
              </div>
            </div>
            
            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingFile(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingFile(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingFile(false);
                
                const files = Array.from(e.dataTransfer.files);
                if (files.length > 0) {
                  const file = files[0];
                  const reader = new FileReader();
                  
                  reader.onload = (event) => {
                    const fileData = event.target?.result as string;
                    let fileType: 'pdf' | 'html' | 'image' | 'other' = 'other';
                    
                    if (file.type === 'application/pdf') {
                      fileType = 'pdf';
                    } else if (file.type === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm')) {
                      fileType = 'html';
                    } else if (file.type.startsWith('image/')) {
                      fileType = 'image';
                    }
                    
                    setPendingReceiptFile({
                      fileName: file.name,
                      fileType,
                      fileData,
                    });
                    setReceiptForm({
                      cardId: null,
                      cardName: '',
                      paymentDate: new Date().toISOString().split('T')[0],
                      paymentAmount: 0,
                      notes: '',
                    });
                    setReceiptSearchQuery('');
                    setShowReceiptModal(true);
                  };
                  
                  reader.readAsDataURL(file);
                }
              }}
              style={{
                border: isDraggingFile ? '3px dashed #1976d2' : '3px dashed #ccc',
                borderRadius: 16,
                padding: 48,
                textAlign: 'center',
                background: isDraggingFile ? '#e3f2fd' : '#fafafa',
                marginBottom: 32,
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>
                {isDraggingFile ? '📥' : '📄'}
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: isDraggingFile ? '#1976d2' : '#666', marginBottom: 8 }}>
                {isDraggingFile ? 'Drop your file here!' : 'Drag & Drop Receipt Files Here'}
              </div>
              <div style={{ fontSize: 14, color: '#999' }}>
                Supports PDF, HTML, and image files (JPG, PNG)
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={{
                  display: 'inline-block',
                  padding: '10px 24px',
                  background: '#1976d2',
                  color: '#fff',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'background 0.2s',
                }}>
                  Or Click to Browse
                  <input
                    type="file"
                    accept=".pdf,.html,.htm,.jpg,.jpeg,.png,.gif,.webp"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        const file = files[0];
                        const reader = new FileReader();
                        
                        reader.onload = (event) => {
                          const fileData = event.target?.result as string;
                          let fileType: 'pdf' | 'html' | 'image' | 'other' = 'other';
                          
                          if (file.type === 'application/pdf') {
                            fileType = 'pdf';
                          } else if (file.type === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm')) {
                            fileType = 'html';
                          } else if (file.type.startsWith('image/')) {
                            fileType = 'image';
                          }
                          
                          setPendingReceiptFile({
                            fileName: file.name,
                            fileType,
                            fileData,
                          });
                          setReceiptForm({
                            cardId: null,
                            cardName: '',
                            paymentDate: new Date().toISOString().split('T')[0],
                            paymentAmount: 0,
                            notes: '',
                          });
                          setReceiptSearchQuery('');
                          setShowReceiptModal(true);
                        };
                        
                        reader.readAsDataURL(file);
                      }
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </div>
            
            {/* Receipt Files List */}
            {receiptFiles.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: 48, 
                background: '#fff', 
                borderRadius: 12, 
                border: '1px solid #e0e0e0',
              }}>
                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>📋</div>
                <div style={{ fontSize: 18, color: '#666', fontWeight: 500 }}>No receipts yet</div>
                <div style={{ fontSize: 14, color: '#999', marginTop: 8 }}>
                  Drag and drop receipt files above to get started
                </div>
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '50px 1fr 150px 120px 120px 100px',
                  gap: 12,
                  padding: '12px 16px',
                  background: '#f5f5f5',
                  borderBottom: '1px solid #e0e0e0',
                  fontWeight: 600,
                  fontSize: 13,
                  color: '#666',
                }}>
                  <div>Type</div>
                  <div>Company / File</div>
                  <div>Payment Date</div>
                  <div style={{ textAlign: 'right' }}>Amount</div>
                  <div>Uploaded</div>
                  <div style={{ textAlign: 'center' }}>Actions</div>
                </div>
                
                {/* Receipt rows */}
                {receiptFiles
                  .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                  .map((receipt) => {
                    const linkedCard = receipt.cardId ? tiles.find(t => t.id === receipt.cardId) : null;
                    
                    return (
                      <div
                        key={receipt.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '50px 1fr 150px 120px 120px 100px',
                          gap: 12,
                          padding: '14px 16px',
                          borderBottom: '1px solid #f0f0f0',
                          alignItems: 'center',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#fafafa'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* File type icon */}
                        <div style={{ fontSize: 24 }}>
                          {receipt.fileType === 'pdf' && '📕'}
                          {receipt.fileType === 'html' && '🌐'}
                          {receipt.fileType === 'image' && '🖼️'}
                          {receipt.fileType === 'other' && '📄'}
                        </div>
                        
                        {/* Company / File */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {linkedCard?.logo && (
                              <img 
                                src={linkedCard.logo} 
                                alt="" 
                                style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'contain' }}
                              />
                            )}
                            <div>
                              <div style={{ fontWeight: 600, color: '#333' }}>
                                {receipt.cardName}
                              </div>
                              <div style={{ fontSize: 12, color: '#999' }}>
                                {receipt.fileName}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Payment Date */}
                        <div style={{ fontSize: 14, color: '#666' }}>
                          {new Date(receipt.paymentDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        
                        {/* Amount */}
                        <div style={{ textAlign: 'right', fontWeight: 600, color: '#333' }}>
                          {formatCurrency(receipt.paymentAmount)}
                        </div>
                        
                        {/* Upload Date */}
                        <div style={{ fontSize: 12, color: '#999' }}>
                          {new Date(receipt.uploadDate).toLocaleDateString()}
                        </div>
                        
                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                          {/* View/Download button */}
                          <button
                            onClick={() => {
                              // Open file in new tab
                              const newWindow = window.open();
                              if (newWindow) {
                                if (receipt.fileType === 'pdf' || receipt.fileType === 'image') {
                                  newWindow.document.write(`<iframe src="${receipt.fileData}" style="width:100%;height:100%;border:none;"></iframe>`);
                                } else if (receipt.fileType === 'html') {
                                  // Decode base64 and display HTML
                                  const htmlContent = atob(receipt.fileData.split(',')[1]);
                                  newWindow.document.write(htmlContent);
                                } else {
                                  newWindow.location.href = receipt.fileData;
                                }
                              }
                            }}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 4,
                              border: 'none',
                              background: '#e3f2fd',
                              color: '#1976d2',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#1976d2';
                              e.currentTarget.style.color = '#fff';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#e3f2fd';
                              e.currentTarget.style.color = '#1976d2';
                            }}
                            title="View receipt"
                          >
                            👁️ View
                          </button>
                          
                          {/* Delete button */}
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete receipt for ${receipt.cardName}?`)) {
                                setReceiptFiles(prev => prev.filter(r => r.id !== receipt.id));
                              }
                            }}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 4,
                              border: 'none',
                              background: '#ffebee',
                              color: '#c62828',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#c62828';
                              e.currentTarget.style.color = '#fff';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#ffebee';
                              e.currentTarget.style.color = '#c62828';
                            }}
                            title="Delete receipt"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
            
            {/* Receipt Modal */}
            {showReceiptModal && pendingReceiptFile && (
              <Modal onClose={() => { setShowReceiptModal(false); setPendingReceiptFile(null); }}>
                <h2 style={{ marginBottom: 24 }}>📄 Add Receipt Details</h2>
                
                <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>File:</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>
                      {pendingReceiptFile.fileType === 'pdf' && '📕'}
                      {pendingReceiptFile.fileType === 'html' && '🌐'}
                      {pendingReceiptFile.fileType === 'image' && '🖼️'}
                      {pendingReceiptFile.fileType === 'other' && '📄'}
                    </span>
                    <span style={{ fontWeight: 500, color: '#333' }}>{pendingReceiptFile.fileName}</span>
                  </div>
                </div>
                
                <form onSubmit={(e) => {
                  e.preventDefault();
                  
                  const newReceipt: ReceiptFile = {
                    id: Date.now(),
                    cardId: receiptForm.cardId,
                    cardName: receiptForm.cardName || 'Unknown Company',
                    fileName: pendingReceiptFile.fileName,
                    fileType: pendingReceiptFile.fileType,
                    fileData: pendingReceiptFile.fileData,
                    paymentDate: receiptForm.paymentDate,
                    paymentAmount: receiptForm.paymentAmount,
                    uploadDate: new Date().toISOString(),
                    notes: receiptForm.notes,
                  };
                  
                  setReceiptFiles(prev => [...prev, newReceipt]);
                  
                  // Also update the budgetHistory actual field for the linked card
                  if (receiptForm.cardId && receiptForm.paymentAmount > 0) {
                    const paymentDate = new Date(receiptForm.paymentDate);
                    const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
                    
                    setTiles(prevTiles => prevTiles.map(t => {
                      if (t.id !== receiptForm.cardId) return t;
                      
                      // Get existing actual amount and add the new receipt amount
                      const existingActual = t.budgetHistory?.[monthKey]?.actual || 0;
                      const existingBudget = t.budgetHistory?.[monthKey]?.budget || t.budgetAmount || t.paymentAmount || 0;
                      const newActual = existingActual + receiptForm.paymentAmount;
                      
                      return {
                        ...t,
                        budgetHistory: {
                          ...t.budgetHistory,
                          [monthKey]: {
                            budget: existingBudget,
                            actual: newActual,
                            paidDate: t.budgetHistory?.[monthKey]?.paidDate,
                            notes: t.budgetHistory?.[monthKey]?.notes,
                          }
                        }
                      };
                    }));
                  }
                  
                  setShowReceiptModal(false);
                  setPendingReceiptFile(null);
                }}>
                  <label style={{ display: 'block', marginBottom: 16 }}>
                    Company / Card:<br />
                    <div style={{ position: 'relative', marginTop: 4 }}>
                      <input
                        type="text"
                        value={receiptSearchQuery || receiptForm.cardName}
                        onChange={(e) => {
                          setReceiptSearchQuery(e.target.value);
                          setReceiptForm(prev => ({ ...prev, cardName: e.target.value, cardId: null }));
                        }}
                        placeholder="Search or type company name..."
                        style={{ width: '100%', marginBottom: 0 }}
                        required
                      />
                      {/* Search results dropdown */}
                      {receiptSearchQuery && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          background: '#fff',
                          border: '1px solid #e0e0e0',
                          borderRadius: 6,
                          maxHeight: 200,
                          overflowY: 'auto',
                          zIndex: 100,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}>
                          {tiles
                            .filter(t => t.name.toLowerCase().includes(receiptSearchQuery.toLowerCase()))
                            .slice(0, 8)
                            .map(tile => (
                              <div
                                key={tile.id}
                                onClick={() => {
                                  setReceiptForm(prev => ({ 
                                    ...prev, 
                                    cardId: tile.id, 
                                    cardName: tile.name,
                                    paymentAmount: prev.paymentAmount || tile.budgetAmount || tile.paymentAmount || 0,
                                  }));
                                  setReceiptSearchQuery('');
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10,
                                  padding: '10px 12px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid #f0f0f0',
                                  transition: 'background 0.2s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                {tile.logo ? (
                                  <img src={tile.logo} alt="" style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'contain' }} />
                                ) : (
                                  <span style={{ width: 24, height: 24, background: '#e0e0e0', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                                    {tile.name.charAt(0)}
                                  </span>
                                )}
                                <span style={{ fontWeight: 500 }}>{tile.name}</span>
                              </div>
                            ))
                          }
                          {tiles.filter(t => t.name.toLowerCase().includes(receiptSearchQuery.toLowerCase())).length === 0 && (
                            <div style={{ padding: 12, color: '#999', fontSize: 13, textAlign: 'center' }}>
                              No matching cards. Name will be used as-is.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </label>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <label>
                      Payment Date:<br />
                      <input
                        type="date"
                        value={receiptForm.paymentDate}
                        onChange={(e) => setReceiptForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                        required
                        style={{ marginTop: 4 }}
                      />
                    </label>
                    
                    <label>
                      Payment Amount:<br />
                      <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
                        <span style={{ padding: '10px 12px', background: '#f0f0f0', border: '1px solid #ccc', borderRight: 'none', borderRadius: '6px 0 0 6px' }}>$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={receiptForm.paymentAmount || ''}
                          onChange={(e) => setReceiptForm(prev => ({ ...prev, paymentAmount: parseFloat(e.target.value) || 0 }))}
                          placeholder="0.00"
                          required
                          style={{ borderRadius: '0 6px 6px 0', marginBottom: 0 }}
                        />
                      </div>
                    </label>
                  </div>
                  
                  <label style={{ display: 'block', marginBottom: 16 }}>
                    Notes (optional):<br />
                    <textarea
                      value={receiptForm.notes}
                      onChange={(e) => setReceiptForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Any additional notes..."
                      rows={2}
                      style={{ marginTop: 4 }}
                    />
                  </label>
                  
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button type="submit">💾 Save Receipt</button>
                    <button type="button" onClick={() => { setShowReceiptModal(false); setPendingReceiptFile(null); }}>Cancel</button>
                  </div>
                </form>
              </Modal>
            )}
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
            
            {/* Budget Categories Section - Per Tab */}
            {tabs.map((tab) => {
              // Get the correct categories for this tab (ensure business tab has business categories)
              const tabCategories = tab.id === 'business' 
                ? (tab.budgetCategories?.some((c: BudgetCategory) => c.id === 'biz-payroll') 
                    ? tab.budgetCategories 
                    : defaultBusinessBudgetCategories)
                : tab.budgetCategories;
              
              return (
            <div key={tab.id} style={{ marginBottom: 48 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h2 style={{ color: '#1976d2', fontSize: 24, fontWeight: 600, margin: 0 }}>
                  {tab.name} - Budget Categories ({tabCategories?.length || 0})
                </h2>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => {
                      setSelectedMainTab(tab.id);
                      resetBudgetCategoriesToDefault();
                    }}
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
                    onClick={() => {
                      setSelectedMainTab(tab.id);
                      openAddBudgetCategoryModal();
                    }}
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
              
              {(!tabCategories || tabCategories.length === 0) ? (
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
                  {tabCategories.map((category) => (
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
                          onClick={() => {
                            setSelectedMainTab(tab.id);
                            openEditBudgetCategoryModal(category.id);
                          }}
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
                          onClick={() => {
                            setSelectedMainTab(tab.id);
                            handleDeleteBudgetCategory(category.id);
                          }}
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
            );
            })}
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

        {/* Cancel Subscription Modal */}
        {showCancellationModal && cancellationTileId && (
          <Modal onClose={() => { setShowCancellationModal(false); setCancellationTileId(null); }}>
            <div style={{ padding: '8px 0' }}>
              {(() => {
                const tile = tiles.find(t => t.id === cancellationTileId);
                if (!tile) return null;
                
                const amount = tile.budgetAmount || tile.paymentAmount || 0;
                const freq = tile.budgetPeriod || tile.paymentFrequency || 'Monthly';
                const monthlySavings = freq === 'Monthly' ? amount : (freq === 'Annually' ? amount / 12 : 0);
                
                return (
                  <>
                    <div style={{ textAlign: 'center', marginBottom: 20 }}>
                      <span style={{ fontSize: 48 }}>🚫</span>
                      <h2 style={{ color: '#e53935', margin: '12px 0 8px 0' }}>Cancel Subscription</h2>
                      <p style={{ color: '#666', fontSize: 14 }}>
                        You are about to cancel <strong>{tile.name}</strong>
                      </p>
                    </div>
                    
                    {/* Important Disclaimer */}
                    <div style={{ 
                      background: '#ffebee', 
                      border: '2px solid #ef5350',
                      borderRadius: 8, 
                      padding: 14, 
                      marginBottom: 20,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
                        <div style={{ fontSize: 12, color: '#c62828', lineHeight: 1.5 }}>
                          <strong>Important:</strong> This cancellation feature does NOT cancel your subscription with <strong>{tile.name}</strong>. 
                          It only keeps track of your savings and cancellation date in this app. 
                          <br /><br />
                          <strong style={{ color: '#b71c1c' }}>You MUST go to the company's website and complete the cancellation process manually with them.</strong>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ 
                      background: '#fff3e0', 
                      border: '1px solid #ff9800',
                      borderRadius: 8, 
                      padding: 16, 
                      marginBottom: 20,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {tile.logo && (
                          <img 
                            src={tile.logo} 
                            alt={tile.name} 
                            style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'contain' }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                        <div>
                          <div style={{ fontWeight: 700, color: '#333' }}>{tile.name}</div>
                          <div style={{ fontSize: 13, color: '#666' }}>
                            {formatCurrency(amount)} / {freq}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#333' }}>
                        📅 Cancellation Date
                      </label>
                      <input
                        type="date"
                        value={cancellationDate}
                        onChange={(e) => setCancellationDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '2px solid #e0e0e0',
                          borderRadius: 8,
                          fontSize: 16,
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    
                    <div style={{ 
                      background: '#e8f5e9', 
                      border: '1px solid #4caf50',
                      borderRadius: 8, 
                      padding: 16, 
                      marginBottom: 24,
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 13, color: '#2e7d32', marginBottom: 4 }}>
                        💰 Estimated Monthly Savings
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 700, color: '#2e7d32' }}>
                        {formatCurrency(monthlySavings)}
                      </div>
                      <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                        ≈ {formatCurrency(monthlySavings * 12)} per year
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button
                        onClick={() => { setShowCancellationModal(false); setCancellationTileId(null); }}
                        style={{
                          flex: 1,
                          background: '#f5f5f5',
                          color: '#666',
                          border: 'none',
                          borderRadius: 8,
                          padding: '14px 20px',
                          fontSize: 15,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Keep Subscription
                      </button>
                      <button
                        onClick={confirmCancellation}
                        style={{
                          flex: 1,
                          background: '#e53935',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          padding: '14px 20px',
                          fontSize: 15,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                        }}
                      >
                        🚫 Cancel Subscription
                      </button>
                    </div>
                    
                    <p style={{ 
                      fontSize: 11, 
                      color: '#999', 
                      textAlign: 'center', 
                      marginTop: 16,
                      marginBottom: 0,
                    }}>
                      The card will be moved to "Cancelled Subscriptions" category.
                      <br />You can restore it anytime.
                    </p>
                  </>
                );
              })()}
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
              {(form.appType === 'web' || !form.appType) && (
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
              {/* Main Tab Assignment (Home Apps / Business Apps) */}
              <div style={{ 
                padding: 12, 
                background: '#fff3e0', 
                borderRadius: 8,
                border: '2px solid #ff9800',
                marginTop: 8,
              }}>
                <div style={{ fontWeight: 600, color: '#e65100', marginBottom: 8, fontSize: 14 }}>
                  🏠 App Tab
                </div>
                <label style={{ display: 'block' }}>
                  <select
                    value={form.mainTabId || 'home'}
                    onChange={e => {
                      const newMainTabId = e.target.value;
                      // When changing main tab, reset category since categories differ between Home and Business
                      setForm(f => ({ 
                        ...f, 
                        mainTabId: newMainTabId,
                        budgetCategory: null, // Reset - user must select new category
                        budgetSubcategory: null,
                        budgetType: null, // Reset budget type since Home and Business have different types
                        category: '', // Legacy field
                      }));
                    }}
                    style={{ width: '100%', padding: 10, fontSize: 14, borderRadius: 6, border: '1px solid #ccc', fontWeight: 600 }}
                  >
                    <option value="home">🏠 Home Apps</option>
                    <option value="business">💼 Business Apps</option>
                  </select>
                </label>
                <div style={{ fontSize: 11, color: '#666', marginTop: 6 }}>
                  Move this card between Home Apps and Business Apps
                </div>
                {editTileId !== null && form.mainTabId !== (tiles.find(t => t.id === editTileId)?.mainTabId || 'home') && (
                  <div style={{ 
                    marginTop: 8, 
                    padding: 8, 
                    background: '#fff8e1', 
                    borderRadius: 4, 
                    border: '1px solid #ffcc80',
                    fontSize: 12,
                    color: '#f57c00',
                  }}>
                    ⚠️ Changing tabs will require you to select a new category below
                  </div>
                )}
              </div>
              
              {/* Category Section - Uses Budget Categories based on form's mainTabId */}
              {(() => {
                // Get categories for the form's selected main tab (not the current view)
                const formMainTabId = form.mainTabId || 'home';
                const formTab = tabs.find(t => t.id === formMainTabId);
                const formTabCategories = formTab?.budgetCategories || currentTabBudgetCategories;
                
                return (
                  <div style={{ 
                    padding: 12, 
                    background: '#e3f2fd', 
                    borderRadius: 8,
                    border: '1px solid #90caf9',
                    marginTop: 8,
                  }}>
                    <div style={{ fontWeight: 600, color: '#1976d2', marginBottom: 8, fontSize: 14 }}>
                      📂 Category (Required) - {formMainTabId === 'business' ? 'Business' : 'Home'} Categories
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
                            category: categoryId ? (formTabCategories.find(c => c.id === categoryId)?.name || '') : '',
                          }));
                        }}
                        style={{ width: '100%', padding: 10, fontSize: 14, borderRadius: 6, border: '1px solid #ccc' }}
                        required
                      >
                        <option value="">-- Select Category --</option>
                        {[...formTabCategories].sort((a, b) => a.name.localeCompare(b.name)).map(cat => (
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
                          {(formTabCategories.find(c => c.id === form.budgetCategory)?.subcategories || []).map(sub => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                );
              })()}
              
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
                          const newType = e.target.value || null;
                          const isPaid = isPaidBudgetType(newType);
                          setForm(f => ({ 
                            ...f, 
                            budgetType: newType as any,
                            paidSubscription: isPaid,
                            // Sync payment fields when switching to paid types
                            paymentAmount: isPaid ? (f.budgetAmount || f.paymentAmount) : null,
                            paymentFrequency: isPaid ? (f.budgetPeriod || f.paymentFrequency || 'Monthly') : null,
                          }));
                        }}
                        style={{ width: '100%', padding: 8, marginTop: 4 }}
                      >
                        <option value="">-- Select Type --</option>
                        {(form.mainTabId || 'home') === 'business' ? (
                          <>
                            <option value="Operating Expense">🏢 Operating Expense (Day-to-day costs)</option>
                            <option value="Capital Expense">🏗️ Capital Expense (Large purchases)</option>
                            <option value="Subscription/SaaS">💻 Subscription/SaaS (Software & services)</option>
                            <option value="Payroll">👥 Payroll (Employee costs)</option>
                            <option value="Vendor Payment">📦 Vendor Payment (Suppliers)</option>
                            <option value="Tax Payment">📋 Tax Payment (Taxes & permits)</option>
                            <option value="Loan/Debt Payment">🏦 Loan/Debt Payment</option>
                          </>
                        ) : (
                          <>
                            <option value="Bill">💡 Bill (Fixed recurring payment)</option>
                            <option value="Subscription">🔄 Subscription (Recurring service)</option>
                            <option value="Expense">💳 Expense (Variable spending)</option>
                            <option value="Savings">💰 Savings Goal</option>
                          </>
                        )}
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
                            <option value="Weekly">Weekly (52/year)</option>
                            <option value="Bi-Weekly">Bi-Weekly (26/year)</option>
                            <option value="Semi-Monthly">Semi-Monthly (24/year)</option>
                            <option value="Monthly">Monthly (12/year)</option>
                            <option value="Quarterly">Quarterly (4/year)</option>
                            <option value="Annually">Annually (1/year)</option>
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


