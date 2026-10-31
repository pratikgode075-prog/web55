/* ===================================================================
   FinSight — AI Personal Finance Management System
   script.js  |  Vanilla JS + Gemini API + Chart.js + localStorage
   =================================================================== */

'use strict';

/* ─────────────────────────────────────────
   CONFIGURATION  (No real key embedded)
───────────────────────────────────────── */
const CONFIG = {
  GEMINI_API_KEY: '', // Set via Settings page — stored in localStorage
  GEMINI_MODEL:   'gemini-1.5-flash',
  GEMINI_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models',
  APP_VERSION: '1.0.0'
};

/* ─────────────────────────────────────────
   STORAGE HELPERS
───────────────────────────────────────── */
const Store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { console.warn('localStorage write failed', e); }
  },
  remove(key) { localStorage.removeItem(key); },
  keys() {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fs_')) out.push(k);
    }
    return out;
  }
};

/* ─────────────────────────────────────────
   STATE
───────────────────────────────────────── */
const State = {
  income:       Store.get('fs_income', []),
  expenses:     Store.get('fs_expenses', []),
  budgets:      Store.get('fs_budgets', {}),   // { 'YYYY-MM': { total, categories: { Cat: amt } } }
  goals:        Store.get('fs_goals', []),
  activeSection: 'dashboard',
  currentMonth:  Store.get('fs_currentMonth', todayMonth()),
  demoLoaded:    Store.get('fs_demoLoaded', false),

  save() {
    Store.set('fs_income',      this.income);
    Store.set('fs_expenses',    this.expenses);
    Store.set('fs_budgets',     this.budgets);
    Store.set('fs_goals',       this.goals);
    Store.set('fs_currentMonth',this.currentMonth);
    Store.set('fs_demoLoaded',  this.demoLoaded);
  }
};

/* ─────────────────────────────────────────
   UTILITY FUNCTIONS
───────────────────────────────────────── */
function todayMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function todayDate() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function fmtINR(n) {
  const num = Number(n) || 0;
  return '₹' + Math.abs(num).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function monthLabel(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${names[parseInt(m,10)-1]} ${y}`;
}
function safeNum(v) { const n = parseFloat(v); return isNaN(n) || n < 0 ? 0 : n; }
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
// Convert simple markdown-like text to safe HTML
function renderMarkdown(text) {
  let s = escHtml(text);
  s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*(.*?)\*/g, '<em>$1</em>');
  s = s.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  s = s.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  s = s.replace(/^# (.+)$/gm, '<h3>$1</h3>');
  s = s.replace(/^- (.+)$/gm, '<li>$1</li>');
  s = s.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  s = s.replace(/\n{2,}/g, '</p><p>');
  s = s.replace(/\n/g, '<br>');
  s = '<p>' + s + '</p>';
  s = s.replace(/<p><\/p>/g, '');
  return s;
}

// Chart colour palette
const CHART_COLORS = [
  '#C65D3A','#9A8BC1','#66856B','#C28A42','#5B8DB8','#B64D45',
  '#A07050','#7BA3A0','#D4956B','#8A7DB8'
];
const CATEGORY_ICONS = {
  Food:'🍔',Travel:'✈️',Rent:'🏠',Education:'📚',Shopping:'🛍️',
  Bills:'💡',Health:'💊',Entertainment:'🎬',Other:'💰',
  Salary:'💼',Freelancing:'💻',Business:'🏢',Scholarship:'🎓',Allowance:'👨‍👩‍👧','':'💰'
};

/* ─────────────────────────────────────────
   DEMO DATA
───────────────────────────────────────── */
function loadDemoData() {
  const now = new Date();
  const thisYM = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const lastYM = (() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  })();

  const mkDate = (ym, day) => `${ym}-${String(day).padStart(2,'0')}`;

  State.income = [
    { id: uid(), source:'Salary',      amount:45000, date: mkDate(thisYM,1),  desc:'Monthly salary',         month: thisYM },
    { id: uid(), source:'Freelancing', amount:8500,  date: mkDate(thisYM,12), desc:'Web design project',     month: thisYM },
    { id: uid(), source:'Allowance',   amount:2000,  date: mkDate(thisYM,5),  desc:'Family allowance',       month: thisYM },
    { id: uid(), source:'Salary',      amount:45000, date: mkDate(lastYM,1),  desc:'Monthly salary',         month: lastYM },
    { id: uid(), source:'Freelancing', amount:5000,  date: mkDate(lastYM,20), desc:'Logo design',            month: lastYM },
  ];

  State.expenses = [
    { id: uid(), category:'Rent',          amount:12000, date: mkDate(thisYM,2),  desc:'Monthly rent',           month: thisYM },
    { id: uid(), category:'Food',          amount:3200,  date: mkDate(thisYM,8),  desc:'Groceries & dining',     month: thisYM },
    { id: uid(), category:'Travel',        amount:1800,  date: mkDate(thisYM,10), desc:'Commute & Uber',         month: thisYM },
    { id: uid(), category:'Bills',         amount:2400,  date: mkDate(thisYM,3),  desc:'Electricity & internet', month: thisYM },
    { id: uid(), category:'Education',     amount:3500,  date: mkDate(thisYM,6),  desc:'Online course',          month: thisYM },
    { id: uid(), category:'Shopping',      amount:2800,  date: mkDate(thisYM,14), desc:'Clothes & accessories',  month: thisYM },
    { id: uid(), category:'Entertainment', amount:1200,  date: mkDate(thisYM,18), desc:'Movies & subscriptions', month: thisYM },
    { id: uid(), category:'Health',        amount:800,   date: mkDate(thisYM,9),  desc:'Gym membership',         month: thisYM },
    { id: uid(), category:'Rent',          amount:12000, date: mkDate(lastYM,2),  desc:'Monthly rent',           month: lastYM },
    { id: uid(), category:'Food',          amount:2900,  date: mkDate(lastYM,15), desc:'Groceries',              month: lastYM },
    { id: uid(), category:'Bills',         amount:2200,  date: mkDate(lastYM,5),  desc:'Utilities',              month: lastYM },
    { id: uid(), category:'Travel',        amount:1500,  date: mkDate(lastYM,22), desc:'Travel',                 month: lastYM },
  ];

  State.budgets[thisYM] = {
    total: 35000,
    categories: { Rent:13000, Food:4000, Travel:2500, Bills:3000, Shopping:3500, Education:4000, Entertainment:2000, Health:1500 }
  };

  State.goals = [
    { id: uid(), name:'Buy a Laptop',      target:65000, saved:22000, date: futureMonth(4) },
    { id: uid(), name:'Emergency Fund',    target:150000, saved:45000, date: futureMonth(12) },
    { id: uid(), name:'Vacation Trip',     target:40000, saved:8000,  date: futureMonth(6) },
  ];

  State.demoLoaded = true;
  State.currentMonth = thisYM;
  State.save();
}

function futureMonth(n) {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

/* ─────────────────────────────────────────
   NAVIGATION
───────────────────────────────────────── */
function navigate(section) {
  if (!section) return;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + section);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.section === section);
  });

  State.activeSection = section;
  renderSection(section);
  window.scrollTo(0, 0);
}

function renderSection(section) {
  switch(section) {
    case 'dashboard':   renderDashboard(); break;
    case 'income':      renderIncome(); break;
    case 'expenses':    renderExpenses(); break;
    case 'budget':      renderBudget(); break;
    case 'savings':     renderSavings(); break;
    case 'reports':     renderReports(); break;
    case 'settings':    renderSettings(); break;
    case 'investment':  renderInvestment(); break;
  }
}

/* ─────────────────────────────────────────
   CHART INSTANCES
───────────────────────────────────────── */
const Charts = {};
function destroyChart(key) { if (Charts[key]) { Charts[key].destroy(); delete Charts[key]; } }

/* ─────────────────────────────────────────
   DASHBOARD
───────────────────────────────────────── */
function renderDashboard() {
  const ym = State.currentMonth;
  const monthIncome   = State.income.filter(i => i.month === ym);
  const monthExpenses = State.expenses.filter(e => e.month === ym);

  const totalIncome  = monthIncome.reduce((s,i) => s + i.amount, 0);
  const totalExpense = monthExpenses.reduce((s,e) => s + e.amount, 0);
  const netSavings   = totalIncome - totalExpense;
  const savingsRate  = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  const budget  = (State.budgets[ym] || {}).total || 0;
  const budgRem = budget - totalExpense;
  const budgPct = budget > 0 ? Math.round((totalExpense / budget) * 100) : 0;

  setText('dash-income',       fmtINR(totalIncome));
  setText('dash-income-count', `${monthIncome.length} entr${monthIncome.length===1?'y':'ies'}`);
  setText('dash-expense',      fmtINR(totalExpense));
  setText('dash-expense-count',`${monthExpenses.length} entr${monthExpenses.length===1?'y':'ies'}`);
  setText('dash-savings',      fmtINR(netSavings));
  setText('dash-savings-rate', `${savingsRate}% savings rate`);
  setText('dash-budget-rem',   budget ? fmtINR(Math.max(budgRem,0)) : 'Not set');
  setText('dash-budget-pct',   budget ? `${budgPct}% used` : 'Set a budget');

  renderHealthScore(totalIncome, totalExpense, budget);
  renderRecentTransactions();
  renderGoalsPreview();
  renderDashboardCharts(ym);
}

function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

function renderHealthScore(income, expense, budget) {
  let score = 50;
  if (income > 0) {
    const savingsRate = (income - expense) / income;
    if (savingsRate >= 0.3) score += 25;
    else if (savingsRate >= 0.2) score += 15;
    else if (savingsRate >= 0.1) score += 8;
    else if (savingsRate < 0) score -= 20;

    if (budget > 0) {
      const used = expense / budget;
      if (used <= 0.7) score += 15;
      else if (used <= 0.9) score += 8;
      else if (used > 1) score -= 15;
    }
    if (State.goals.length > 0) score += 10;
  }
  score = Math.max(0, Math.min(100, score));

  const circle = document.getElementById('healthCircle');
  const circumference = 314;
  const offset = circumference - (circumference * score / 100);
  if (circle) {
    circle.style.strokeDashoffset = offset;
    circle.style.stroke = score >= 70 ? '#66856B' : score >= 40 ? '#C28A42' : '#B64D45';
  }
  setText('healthScore', score);

  let status = 'Good financial health! Keep it up.';
  const tips = [];
  if (income === 0) { status = 'Add income & expenses to see your health score.'; }
  else if (score >= 75) { status = 'Excellent! Your finances are in great shape.'; }
  else if (score >= 55) { status = 'Good. A few improvements will make it great.'; }
  else if (score >= 35) { status = 'Fair. Consider adjusting your spending habits.'; }
  else { status = 'Needs attention. Review your income vs expenses.'; }

  if (income > 0 && (income - expense)/income < 0.2) tips.push('Try to save at least 20% of income.');
  if (!State.goals.length) tips.push('Set a savings goal to stay motivated.');
  if (!((State.budgets[State.currentMonth] || {}).total)) tips.push('Create a monthly budget to track spending.');

  setText('healthStatus', status);
  const el = document.getElementById('healthTips');
  if (el) el.innerHTML = tips.map(t => `<div class="health-tip">💡 ${escHtml(t)}</div>`).join('');
}

function renderRecentTransactions() {
  const all = [
    ...State.income.map(i => ({ ...i, type:'income' })),
    ...State.expenses.map(e => ({ ...e, type:'expense' }))
  ].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0,6);

  const el = document.getElementById('recentTransactions');
  if (!el) return;
  if (!all.length) {
    el.innerHTML = `<div class="empty-state"><p>No transactions yet</p></div>`;
    return;
  }
  el.innerHTML = all.map(tx => txItemHTML(tx)).join('');
}

function txItemHTML(tx) {
  const isIncome = tx.type === 'income';
  const label = isIncome ? (tx.source || 'Income') : (tx.category || 'Expense');
  const icon = CATEGORY_ICONS[label] || '💰';
  return `
    <div class="transaction-item">
      <div class="tx-icon ${isIncome ? 'tx-icon-income' : 'tx-icon-expense'}">${icon}</div>
      <div class="tx-info">
        <div class="tx-desc">${escHtml(tx.desc || label)}</div>
        <div class="tx-meta">${escHtml(label)} · ${fmtDate(tx.date)}</div>
      </div>
      <div class="tx-amount ${isIncome ? 'income' : 'expense'}">${isIncome?'+':'-'}${fmtINR(tx.amount)}</div>
      <div class="tx-actions">
        <button class="tx-btn" onclick="openEditModal('${tx.type}','${tx.id}')" title="Edit" aria-label="Edit">
          <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </button>
        <button class="tx-btn delete" onclick="deleteEntry('${tx.type}','${tx.id}')" title="Delete" aria-label="Delete">
          <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><polyline points="3,6 5,6 21,6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </button>
      </div>
    </div>`;
}

function renderGoalsPreview() {
  const el = document.getElementById('goalsPreview');
  if (!el) return;
  if (!State.goals.length) {
    el.innerHTML = `<div class="empty-state"><p>No savings goals yet</p><button class="btn-secondary" onclick="navigate('savings')">Create a Goal</button></div>`;
    return;
  }
  el.innerHTML = State.goals.slice(0,3).map(g => {
    const pct = g.target > 0 ? Math.min(100, Math.round(g.saved/g.target*100)) : 0;
    return `
      <div class="goal-preview-item">
        <div class="goal-preview-name"><span>${escHtml(g.name)}</span><span>${pct}%</span></div>
        <div class="goal-preview-sub">${fmtINR(g.saved)} of ${fmtINR(g.target)}</div>
        <div class="progress-bar-track"><div class="progress-bar-fill${pct>=100?' completed':''}" style="width:${pct}%"></div></div>
      </div>`;
  }).join('');
}

function renderDashboardCharts(ym) {
  // Income vs Expense (6 months bar)
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  }
  const incomeData  = months.map(m => State.income.filter(i => i.month===m).reduce((s,i)=>s+i.amount,0));
  const expenseData = months.map(m => State.expenses.filter(e => e.month===m).reduce((s,e)=>s+e.amount,0));
  const labels = months.map(m => monthLabel(m));

  destroyChart('incomeExpense');
  const ctx1 = document.getElementById('incomeExpenseChart');
  if (ctx1) {
    Charts.incomeExpense = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label:'Income',   data: incomeData,  backgroundColor:'rgba(102,133,107,0.8)', borderRadius:6 },
          { label:'Expenses', data: expenseData, backgroundColor:'rgba(198,93,58,0.8)',   borderRadius:6 }
        ]
      },
      options: chartBarOptions()
    });
  }

  // Category pie
  const catMap = {};
  State.expenses.filter(e => e.month===ym).forEach(e => { catMap[e.category] = (catMap[e.category]||0) + e.amount; });
  const catKeys = Object.keys(catMap);

  destroyChart('categoryDash');
  const ctx2 = document.getElementById('categoryChart');
  if (ctx2) {
    if (catKeys.length) {
      Charts.categoryDash = new Chart(ctx2, {
        type:'doughnut',
        data: { labels:catKeys, datasets:[{ data:catKeys.map(k=>catMap[k]), backgroundColor:CHART_COLORS, borderWidth:2, borderColor:'#FFFCF7' }] },
        options: chartDoughnutOptions()
      });
    } else {
      ctx2.parentElement.innerHTML = '<div class="empty-state" style="height:100%"><p>No expense data for this month</p></div>';
    }
  }
}

function chartBarOptions() {
  return {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{ labels:{ color:'#77716B', font:{ size:11 }, boxWidth:12, padding:16 } } },
    scales:{
      x:{ grid:{ display:false }, ticks:{ color:'#77716B', font:{ size:11 } } },
      y:{ grid:{ color:'rgba(222,213,201,0.5)' }, ticks:{ color:'#77716B', font:{ size:11 }, callback: v => '₹'+v.toLocaleString('en-IN') } }
    }
  };
}
function chartDoughnutOptions() {
  return {
    responsive:true, maintainAspectRatio:false,
    plugins:{
      legend:{ position:'bottom', labels:{ color:'#77716B', font:{ size:11 }, boxWidth:10, padding:12 } }
    },
    cutout:'60%'
  };
}

/* ─────────────────────────────────────────
   INCOME
───────────────────────────────────────── */
function renderIncome() {
  const ym = document.getElementById('incomeMonth')?.value || State.currentMonth;
  const filtered = State.income.filter(i => i.month === ym);
  const total = filtered.reduce((s,i) => s+i.amount, 0);
  setText('income-total-month', fmtINR(total));

  // Source breakdown
  const srcMap = {};
  filtered.forEach(i => { srcMap[i.source] = (srcMap[i.source]||0) + i.amount; });
  const srcKeys = Object.keys(srcMap);

  const breakEl = document.getElementById('incomeBreakdown');
  if (breakEl) {
    if (srcKeys.length) {
      breakEl.innerHTML = srcKeys.map((k,idx) => {
        const pct = total > 0 ? Math.round(srcMap[k]/total*100) : 0;
        return `<div class="breakdown-item">
          <div class="breakdown-color" style="background:${CHART_COLORS[idx%CHART_COLORS.length]}"></div>
          <div class="breakdown-name">${escHtml(k)}</div>
          <div class="breakdown-value">${fmtINR(srcMap[k])}</div>
          <div class="breakdown-pct">${pct}%</div>
        </div>`;
      }).join('');
    } else { breakEl.innerHTML = '<div class="empty-state"><p>No data</p></div>'; }
  }

  destroyChart('incomeSource');
  const ctx = document.getElementById('incomeSourceChart');
  if (ctx) {
    if (srcKeys.length) {
      Charts.incomeSource = new Chart(ctx, {
        type:'doughnut',
        data:{ labels:srcKeys, datasets:[{ data:srcKeys.map(k=>srcMap[k]), backgroundColor:CHART_COLORS, borderWidth:2, borderColor:'#FFFCF7' }] },
        options: chartDoughnutOptions()
      });
    } else { ctx.parentElement.innerHTML = '<div class="empty-state" style="height:100%"><p>No income data</p></div>'; }
  }

  // List
  const listEl = document.getElementById('incomeList');
  if (listEl) {
    if (filtered.length) {
      listEl.innerHTML = [...filtered].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(i => txItemHTML({...i,type:'income'})).join('');
    } else {
      listEl.innerHTML = '<div class="empty-state"><p>No income entries for this month</p><button class="btn-primary" onclick="openModal(\'incomeModal\')">Add Income</button></div>';
    }
  }
}

/* ─────────────────────────────────────────
   EXPENSES
───────────────────────────────────────── */
function renderExpenses() {
  const ym  = document.getElementById('expenseMonth')?.value || State.currentMonth;
  const cat = document.getElementById('expenseFilterCat')?.value || '';
  const srch = (document.getElementById('expenseSearch')?.value || '').toLowerCase();

  let filtered = State.expenses.filter(e => e.month === ym);
  if (cat)  filtered = filtered.filter(e => e.category === cat);
  if (srch) filtered = filtered.filter(e =>
    e.desc.toLowerCase().includes(srch) || e.category.toLowerCase().includes(srch)
  );

  const total = filtered.reduce((s,e)=>s+e.amount,0);
  setText('expense-total-month', fmtINR(total));

  // Category breakdown
  const catMap = {};
  filtered.forEach(e => { catMap[e.category]=(catMap[e.category]||0)+e.amount; });
  const catKeys = Object.keys(catMap).sort((a,b)=>catMap[b]-catMap[a]);

  const breakEl = document.getElementById('expenseBreakdown');
  if (breakEl) {
    if (catKeys.length) {
      breakEl.innerHTML = catKeys.map((k,idx) => {
        const pct = total>0?Math.round(catMap[k]/total*100):0;
        return `<div class="breakdown-item">
          <div class="breakdown-color" style="background:${CHART_COLORS[idx%CHART_COLORS.length]}"></div>
          <div class="breakdown-name">${CATEGORY_ICONS[k]||''} ${escHtml(k)}</div>
          <div class="breakdown-value">${fmtINR(catMap[k])}</div>
          <div class="breakdown-pct">${pct}%</div>
        </div>`;
      }).join('');
    } else { breakEl.innerHTML = '<div class="empty-state"><p>No data</p></div>'; }
  }

  destroyChart('expenseCat');
  const ctx = document.getElementById('expenseCategoryChart');
  if (ctx) {
    if (catKeys.length) {
      Charts.expenseCat = new Chart(ctx, {
        type:'doughnut',
        data:{ labels:catKeys, datasets:[{ data:catKeys.map(k=>catMap[k]), backgroundColor:CHART_COLORS, borderWidth:2, borderColor:'#FFFCF7' }] },
        options: chartDoughnutOptions()
      });
    } else { ctx.parentElement.innerHTML = '<div class="empty-state" style="height:100%"><p>No expense data</p></div>'; }
  }

  // List
  const listEl = document.getElementById('expenseList');
  if (listEl) {
    if (filtered.length) {
      listEl.innerHTML = [...filtered].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(e => txItemHTML({...e,type:'expense'})).join('');
    } else {
      listEl.innerHTML = '<div class="empty-state"><p>No expense entries found</p><button class="btn-primary" onclick="openModal(\'expenseModal\')">Add Expense</button></div>';
    }
  }
}

/* ─────────────────────────────────────────
   BUDGET
───────────────────────────────────────── */
function renderBudget() {
  const ym = document.getElementById('budgetMonth')?.value || State.currentMonth;
  const budgetData = State.budgets[ym] || { total:0, categories:{} };
  const totalExpense = State.expenses.filter(e=>e.month===ym).reduce((s,e)=>s+e.amount,0);

  const totalBudgetInput = document.getElementById('totalBudgetInput');
  if (totalBudgetInput && !totalBudgetInput._listening) {
    totalBudgetInput._listening = true;
  }
  if (totalBudgetInput) totalBudgetInput.value = budgetData.total || '';

  const spent    = totalExpense;
  const total    = budgetData.total || 0;
  const remaining = Math.max(total - spent, 0);
  const pct       = total > 0 ? Math.min(Math.round(spent/total*100), 100) : 0;

  setText('budget-spent',     fmtINR(spent));
  setText('budget-remaining', total ? fmtINR(remaining) : 'No budget set');

  const bar = document.getElementById('budgetProgressBar');
  if (bar) {
    bar.style.width = pct + '%';
    bar.className = 'progress-bar-fill' + (pct>=100?' danger': pct>=80?' warning':'');
  }
  setText('budgetPct', total ? `${pct}% of ${fmtINR(total)} used` : 'Set a budget above');

  // Category budgets
  const listEl = document.getElementById('categoryBudgetList');
  if (!listEl) return;
  const cats = Object.keys(budgetData.categories || {});
  if (!cats.length) {
    listEl.innerHTML = '<div class="empty-state"><p>No category budgets set yet</p></div>';
    return;
  }
  const catExpenses = {};
  State.expenses.filter(e=>e.month===ym).forEach(e=>{ catExpenses[e.category]=(catExpenses[e.category]||0)+e.amount; });

  listEl.innerHTML = cats.map(cat => {
    const bamt  = budgetData.categories[cat];
    const spent = catExpenses[cat] || 0;
    const pct   = bamt > 0 ? Math.min(Math.round(spent/bamt*100),100) : 0;
    const over  = spent > bamt;
    const warn  = !over && pct >= 80;
    return `
      <div class="cat-budget-item">
        <div class="cat-budget-header">
          <span class="cat-budget-name">${CATEGORY_ICONS[cat]||''} ${escHtml(cat)}</span>
          <div class="cat-budget-meta">
            <span>${fmtINR(spent)} / ${fmtINR(bamt)}</span>
            <button class="tx-btn" onclick="editCatBudget('${cat}')" aria-label="Edit">✏️</button>
            <button class="tx-btn delete" onclick="deleteCatBudget('${ym}','${cat}')" aria-label="Delete">🗑️</button>
          </div>
        </div>
        <div class="progress-bar-track"><div class="progress-bar-fill${over?' danger': warn?' warning':''}" style="width:${pct}%"></div></div>
        ${over ? `<div class="cat-budget-alert">⚠️ Over budget by ${fmtINR(spent-bamt)}</div>` : warn ? `<div class="cat-budget-alert" style="color:var(--accent-warning)">📊 ${pct}% used — watch spending</div>` : ''}
      </div>`;
  }).join('');
}

/* ─────────────────────────────────────────
   SAVINGS
───────────────────────────────────────── */
function renderSavings() {
  const grid = document.getElementById('goalsGrid');
  if (!grid) return;
  if (!State.goals.length) {
    grid.innerHTML = `<div class="empty-state full-width" style="padding:40px"><svg viewBox="0 0 64 64" fill="none" width="56" height="56"><path d="M32 8l6 12 13 2-9.5 9.3L44 45l-12-6.3L20 45l2.5-13.7L13 22l13-2z" stroke="#DED5C9" stroke-width="2" stroke-linejoin="round"/></svg><p>No savings goals yet</p><button class="btn-primary" onclick="openModal('goalModal')">Create your first goal</button></div>`;
    return;
  }
  const now = new Date();
  grid.innerHTML = State.goals.map(g => {
    const pct = g.target > 0 ? Math.min(100, Math.round(g.saved/g.target*100)) : 0;
    const remaining = Math.max(g.target - g.saved, 0);
    const [gy,gm] = (g.date||'').split('-').map(Number);
    const targetDate = new Date(gy, (gm||1)-1, 1);
    const monthsLeft = Math.max(0, (targetDate.getFullYear()-now.getFullYear())*12 + (targetDate.getMonth()-now.getMonth()));
    const completed = pct >= 100;
    const overdue   = !completed && targetDate < now;
    const badge     = completed ? 'completed' : overdue ? 'overdue' : 'active';
    const badgeTxt  = completed ? '✅ Completed' : overdue ? '⚠️ Overdue' : '🎯 Active';
    const monthly   = monthsLeft > 0 && !completed ? fmtINR(Math.ceil(remaining/monthsLeft)) + '/month needed' : completed ? 'Goal reached!' : 'Target date passed';

    return `
      <div class="goal-card">
        <div class="goal-card-header">
          <div class="goal-name">${escHtml(g.name)}</div>
          <span class="goal-badge ${badge}">${badgeTxt}</span>
        </div>
        <div class="goal-amounts">
          <span>Saved: <strong>${fmtINR(g.saved)}</strong></span>
          <span>Target: <strong>${fmtINR(g.target)}</strong></span>
        </div>
        <div class="progress-bar-track"><div class="progress-bar-fill${pct>=100?' completed':''}" style="width:${pct}%;background:${pct>=100?'var(--accent-secondary)':'var(--accent-success)'}"></div></div>
        <div class="goal-monthly">${monthly} · Target: ${g.date ? monthLabel(g.date) : 'Not set'}</div>
        <div class="goal-card-actions">
          <button class="btn-secondary" style="font-size:0.78rem;padding:6px 12px" onclick="openEditModal('goal','${g.id}')">Edit</button>
          <button class="btn-danger"    style="font-size:0.78rem;padding:6px 12px" onclick="deleteEntry('goal','${g.id}')">Delete</button>
        </div>
      </div>`;
  }).join('');
}

/* ─────────────────────────────────────────
   REPORTS
───────────────────────────────────────── */
function renderReports() {
  const ym = document.getElementById('reportMonth')?.value || State.currentMonth;

  const totalIncome  = State.income.filter(i=>i.month===ym).reduce((s,i)=>s+i.amount,0);
  const totalExpense = State.expenses.filter(e=>e.month===ym).reduce((s,e)=>s+e.amount,0);
  const netSavings   = totalIncome - totalExpense;
  const budget       = (State.budgets[ym]||{}).total || 0;
  const budgPct      = budget > 0 ? Math.round(totalExpense/budget*100)+'%' : 'N/A';

  setText('rep-income',     fmtINR(totalIncome));
  setText('rep-expense',    fmtINR(totalExpense));
  setText('rep-savings',    fmtINR(netSavings));
  setText('rep-budget-pct', budgPct);

  // Chart
  destroyChart('reportChart');
  const ctx = document.getElementById('reportChart');
  if (ctx) {
    Charts.reportChart = new Chart(ctx, {
      type:'bar',
      data:{
        labels:['Income','Expenses','Savings'],
        datasets:[{ data:[totalIncome,totalExpense,Math.max(netSavings,0)], backgroundColor:['#66856B','#C65D3A','#9A8BC1'], borderRadius:6 }]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ display:false } },
        scales:{
          x:{ grid:{display:false}, ticks:{color:'#77716B'} },
          y:{ grid:{color:'rgba(222,213,201,0.5)'}, ticks:{color:'#77716B',callback:v=>'₹'+v.toLocaleString('en-IN')} }
        }
      }
    });
  }

  // Expense breakdown
  const catMap = {};
  State.expenses.filter(e=>e.month===ym).forEach(e=>{ catMap[e.category]=(catMap[e.category]||0)+e.amount; });
  const catKeys = Object.keys(catMap).sort((a,b)=>catMap[b]-catMap[a]);
  const repBreak = document.getElementById('reportBreakdown');
  if (repBreak) {
    if (catKeys.length) {
      repBreak.innerHTML = catKeys.map((k,i)=>`
        <div class="breakdown-item">
          <div class="breakdown-color" style="background:${CHART_COLORS[i%CHART_COLORS.length]}"></div>
          <div class="breakdown-name">${escHtml(k)}</div>
          <div class="breakdown-value">${fmtINR(catMap[k])}</div>
          <div class="breakdown-pct">${totalExpense>0?Math.round(catMap[k]/totalExpense*100):0}%</div>
        </div>`).join('');
    } else { repBreak.innerHTML = '<div class="empty-state"><p>No expenses this month</p></div>'; }
  }

  // Goals
  const repGoals = document.getElementById('reportGoals');
  if (repGoals) {
    if (State.goals.length) {
      repGoals.innerHTML = State.goals.map(g=>{
        const pct = g.target>0?Math.min(100,Math.round(g.saved/g.target*100)):0;
        return `<div style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:4px"><span>${escHtml(g.name)}</span><span>${fmtINR(g.saved)} / ${fmtINR(g.target)} (${pct}%)</span></div>
          <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
        </div>`;
      }).join('');
    } else { repGoals.innerHTML = '<div class="empty-state"><p>No savings goals</p></div>'; }
  }
}

/* ─────────────────────────────────────────
   SETTINGS
───────────────────────────────────────── */
function renderSettings() {
  const apiKeyInput = document.getElementById('apiKeyInput');
  const modelSelect = document.getElementById('modelSelect');
  if (apiKeyInput) apiKeyInput.value = Store.get('fs_apiKey','');
  if (modelSelect) modelSelect.value = Store.get('fs_model', CONFIG.GEMINI_MODEL);

  // Storage used
  let bytes = 0;
  try { for (const k of Store.keys()) bytes += (localStorage.getItem(k)||'').length * 2; } catch {}
  const kb = (bytes/1024).toFixed(1);
  setText('storageUsed', `~${kb} KB`);

  const notice = document.getElementById('aiKeyNotice');
  if (notice) notice.classList.toggle('hidden', !!Store.get('fs_apiKey',''));
}

/* ─────────────────────────────────────────
   INVESTMENT
───────────────────────────────────────── */
function renderInvestment() {
  // Just ensure edu tabs work — handled by event listeners
}

function calcSIP() {
  const monthly = safeNum(document.getElementById('sip-amount')?.value);
  const rate    = safeNum(document.getElementById('sip-return')?.value);
  const years   = safeNum(document.getElementById('sip-years')?.value);

  if (!monthly || !rate || !years) { showToast('Please fill all SIP fields.', 'error'); return; }
  if (years > 50) { showToast('Duration should be ≤ 50 years.', 'error'); return; }

  const n  = years * 12;
  const r  = rate / 100 / 12;
  const fv = r > 0 ? monthly * ((Math.pow(1+r,n)-1)/r) * (1+r) : monthly * n;
  const invested = monthly * n;
  const gains    = fv - invested;

  setText('sip-invested', fmtINR(invested));
  setText('sip-returns',  fmtINR(gains));
  setText('sip-total',    fmtINR(fv));

  const result = document.getElementById('sipResult');
  const chartWrap = document.getElementById('sipChartWrap');
  if (result) result.style.display = 'block';
  if (chartWrap) chartWrap.style.display = 'block';

  destroyChart('sip');
  const ctx = document.getElementById('sipChart');
  if (ctx) {
    Charts.sip = new Chart(ctx, {
      type:'doughnut',
      data:{
        labels:['Amount Invested','Estimated Gains'],
        datasets:[{ data:[Math.round(invested),Math.round(gains)], backgroundColor:['#9A8BC1','#66856B'], borderWidth:2, borderColor:'#FFFCF7' }]
      },
      options: chartDoughnutOptions()
    });
  }
}

/* ─────────────────────────────────────────
   ROADMAP GENERATOR
───────────────────────────────────────── */
function generateRoadmap() {
  const income   = safeNum(document.getElementById('rm-income')?.value);
  const expenses = safeNum(document.getElementById('rm-expenses')?.value);
  const savings  = safeNum(document.getElementById('rm-savings')?.value);
  const debt     = safeNum(document.getElementById('rm-debt')?.value);
  const goal     = (document.getElementById('rm-goal')?.value||'').trim();
  const target   = safeNum(document.getElementById('rm-target')?.value);
  const dateVal  = document.getElementById('rm-date')?.value || '';

  if (!income || !target || !goal) {
    showToast('Please fill income, goal name and target amount.', 'error'); return;
  }

  const surplus      = income - expenses - debt;
  const remaining    = Math.max(target - savings, 0);
  const resultEl     = document.getElementById('roadmapResult');
  if (!resultEl) return;

  let monthsNeeded   = surplus > 0 ? Math.ceil(remaining / surplus) : Infinity;
  let monthsAvail    = 0;
  if (dateVal) {
    const now = new Date();
    const [ty,tm] = dateVal.split('-').map(Number);
    const tgt = new Date(ty, tm-1, 1);
    monthsAvail = Math.max(0, (tgt.getFullYear()-now.getFullYear())*12 + (tgt.getMonth()-now.getMonth()));
  }

  const impossible = surplus <= 0 || (dateVal && monthsNeeded > monthsAvail && monthsAvail > 0);
  const monthlyNeeded = dateVal && monthsAvail > 0 ? Math.ceil(remaining/monthsAvail) : Math.ceil(remaining/Math.max(monthsNeeded,1));

  let html = `<h3 style="margin-bottom:14px">Your Financial Roadmap for <em>${escHtml(goal)}</em></h3>`;

  html += `<div class="roadmap-summary-grid">
    <div class="roadmap-stat"><div class="roadmap-stat-label">Monthly Surplus</div><div class="roadmap-stat-val" style="color:${surplus>0?'var(--accent-success)':'var(--accent-error)'}}">${fmtINR(surplus)}</div></div>
    <div class="roadmap-stat"><div class="roadmap-stat-label">Amount Remaining</div><div class="roadmap-stat-val">${fmtINR(remaining)}</div></div>
    <div class="roadmap-stat"><div class="roadmap-stat-label">Monthly Savings Needed</div><div class="roadmap-stat-val">${fmtINR(monthlyNeeded)}</div></div>
    <div class="roadmap-stat"><div class="roadmap-stat-label">Est. Months to Goal</div><div class="roadmap-stat-val">${monthsNeeded===Infinity?'∞':monthsNeeded}</div></div>
  </div>`;

  if (impossible) {
    html += `<div class="roadmap-warning">⚠️ <strong>Note:</strong> ${surplus<=0 ? 'Your monthly expenses exceed your income — there is no surplus to save from. Review your expenses.' : `You need ${fmtINR(monthlyNeeded)}/month but only have ${fmtINR(surplus)}/month available. The goal may be unrealistic by the target date. Consider increasing income, reducing expenses, or extending the timeline.`}</div>`;
  }

  const steps = [];
  if (savings > 0)  steps.push(`You already have ${fmtINR(savings)} saved — great start!`);
  if (surplus > 0)  steps.push(`Set aside ${fmtINR(monthlyNeeded)} each month toward this goal.`);
  steps.push(`Reduce discretionary spending to increase your surplus.`);
  steps.push(`Consider a recurring deposit (RD) or separate savings account for this goal.`);
  if (monthsNeeded < 12) steps.push(`You could reach this goal in under a year if you stay consistent!`);
  else steps.push(`Stay consistent. Review your progress every 3 months.`);

  html += `<div style="margin-top:14px"><h4 style="font-size:0.9rem;margin-bottom:10px">Action Plan</h4>` +
    steps.map((s,i)=>`<div class="roadmap-step"><div class="roadmap-step-num">${i+1}</div><div class="roadmap-step-text">${escHtml(s)}</div></div>`).join('') +
  `</div>`;

  resultEl.innerHTML = html;
}

/* ─────────────────────────────────────────
   MODAL HELPERS
───────────────────────────────────────── */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('open'); el.querySelector('input,select,textarea')?.focus(); }
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('open'); }
}
function openEditModal(type, id) {
  if (type === 'income') {
    const entry = State.income.find(i=>i.id===id);
    if (!entry) return;
    document.getElementById('incomeModalTitle').textContent = 'Edit Income';
    document.getElementById('incomeEditId').value = id;
    document.getElementById('incomeSource').value = entry.source;
    document.getElementById('incomeAmount').value = entry.amount;
    document.getElementById('incomeDate').value   = entry.date;
    document.getElementById('incomeDesc').value   = entry.desc||'';
    openModal('incomeModal');
  } else if (type === 'expense') {
    const entry = State.expenses.find(e=>e.id===id);
    if (!entry) return;
    document.getElementById('expenseModalTitle').textContent = 'Edit Expense';
    document.getElementById('expenseEditId').value  = id;
    document.getElementById('expenseCategory').value = entry.category;
    document.getElementById('expenseAmount').value  = entry.amount;
    document.getElementById('expenseDate').value    = entry.date;
    document.getElementById('expenseDesc').value    = entry.desc||'';
    openModal('expenseModal');
  } else if (type === 'goal') {
    const entry = State.goals.find(g=>g.id===id);
    if (!entry) return;
    document.getElementById('goalModalTitle').textContent = 'Edit Goal';
    document.getElementById('goalEditId').value  = id;
    document.getElementById('goalName').value    = entry.name;
    document.getElementById('goalTarget').value  = entry.target;
    document.getElementById('goalSaved').value   = entry.saved;
    document.getElementById('goalDate').value    = entry.date||'';
    openModal('goalModal');
  }
}

function deleteEntry(type, id) {
  showConfirm('Are you sure you want to delete this entry?', () => {
    if (type==='income')  State.income   = State.income.filter(i=>i.id!==id);
    if (type==='expense') State.expenses = State.expenses.filter(e=>e.id!==id);
    if (type==='goal')    State.goals    = State.goals.filter(g=>g.id!==id);
    State.save();
    renderSection(State.activeSection);
    if (State.activeSection !== 'dashboard') renderDashboard(); // keep dash in sync
    showToast('Entry deleted.', 'info');
  });
}

function editCatBudget(cat) {
  const ym = document.getElementById('budgetMonth')?.value || State.currentMonth;
  const amt = (State.budgets[ym]?.categories||{})[cat]||'';
  document.getElementById('catBudgetEditKey').value = cat;
  document.getElementById('catBudgetCat').value = cat;
  document.getElementById('catBudgetAmt').value = amt;
  openModal('catBudgetModal');
}

function deleteCatBudget(ym, cat) {
  showConfirm(`Remove budget for ${cat}?`, () => {
    if (State.budgets[ym]?.categories) delete State.budgets[ym].categories[cat];
    State.save();
    renderBudget();
    showToast('Category budget removed.', 'info');
  });
}

let confirmCallback = null;
function showConfirm(msg, cb) {
  document.getElementById('confirmMessage').textContent = msg;
  confirmCallback = cb;
  openModal('confirmModal');
}

/* ─────────────────────────────────────────
   TOAST NOTIFICATIONS
───────────────────────────────────────── */
function showToast(msg, type='info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity='0'; toast.style.transition='opacity 0.4s'; setTimeout(()=>toast.remove(),400); }, 3000);
}

/* ─────────────────────────────────────────
   GEMINI AI
───────────────────────────────────────── */
function getApiKey() { return Store.get('fs_apiKey','') || CONFIG.GEMINI_API_KEY; }
function getModel()  { return Store.get('fs_model', CONFIG.GEMINI_MODEL); }

async function callGemini(prompt) {
  const key   = getApiKey();
  const model = getModel();
  if (!key) throw new Error('NO_KEY');

  const url = `${CONFIG.GEMINI_ENDPOINT}/${model}:generateContent?key=${key}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 1024, temperature: 0.7 }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    let errMsg = `API error ${res.status}`;
    try {
      const errData = await res.json();
      const msg = errData?.error?.message || '';
      if (res.status === 400) errMsg = `Invalid request: ${msg}`;
      else if (res.status === 401 || res.status === 403) errMsg = 'Invalid or unauthorized API key. Check your key in Settings.';
      else if (res.status === 429) errMsg = 'Rate limit or quota exceeded. Wait a moment and try again.';
      else if (res.status === 404) errMsg = `Model "${model}" not found. Try a different model in Settings.`;
      else errMsg = msg || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini. The model may have filtered this request.');
  return text;
}

/* ===== CHAT ===== */
const chatHistory = [];
let chatLoading = false;

function buildFinanceContext() {
  const ym = State.currentMonth;
  const totalIncome  = State.income.filter(i=>i.month===ym).reduce((s,i)=>s+i.amount,0);
  const totalExpense = State.expenses.filter(e=>e.month===ym).reduce((s,e)=>s+e.amount,0);
  const budget = (State.budgets[ym]||{}).total||0;
  return `[User's current financial context: Income this month: ${fmtINR(totalIncome)}, Expenses: ${fmtINR(totalExpense)}, Budget: ${fmtINR(budget)}, Savings goals: ${State.goals.length}]\n\n`;
}

async function sendChatMessage(userText) {
  if (chatLoading || !userText.trim()) return;

  const key = getApiKey();
  if (!key) {
    appendChatMsg('error', 'No API key configured. Please go to Settings and enter your Gemini API key.');
    return;
  }

  chatLoading = true;
  const sendBtn = document.getElementById('chatSendBtn');
  if (sendBtn) sendBtn.disabled = true;

  appendChatMsg('user', userText);
  const loadingId = appendChatLoading();

  const systemInstruction = `You are FinSight AI, an educational personal finance assistant for Indian users. Always use Indian Rupees (₹). Explain financial concepts in simple, clear language. Give practical budgeting and saving suggestions. Clearly distinguish between calculated values and estimates. Explain assumptions you use. Do not guarantee investment returns. Encourage users to consider their debt, emergency needs, time horizon, and risk tolerance before investing. Keep responses helpful and concise. Use markdown formatting for readability.`;

  const prompt = systemInstruction + '\n\n' + buildFinanceContext() + userText;

  try {
    const response = await callGemini(prompt);
    removeChatLoading(loadingId);
    appendChatMsg('ai', response);
  } catch(err) {
    removeChatLoading(loadingId);
    let msg = err.message || 'Something went wrong.';
    if (err.message === 'NO_KEY') msg = 'API key not configured. Go to Settings to add your Gemini API key.';
    appendChatMsg('error', msg);
  } finally {
    chatLoading = false;
    if (sendBtn) sendBtn.disabled = false;
  }
}

function appendChatMsg(type, text) {
  const container = document.getElementById('chatMessages');
  if (!container) return;
  const div = document.createElement('div');
  div.className = `chat-msg ${type}`;
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  if (type === 'ai') { bubble.innerHTML = renderMarkdown(text); }
  else if (type === 'error') { bubble.textContent = text; }
  else { bubble.textContent = text; }
  div.appendChild(bubble);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function appendChatLoading() {
  const container = document.getElementById('chatMessages');
  if (!container) return null;
  const id = 'loading-' + Date.now();
  const div = document.createElement('div');
  div.className = 'chat-msg ai'; div.id = id;
  div.innerHTML = `<div class="chat-bubble"><div class="loading-dots"><span></span><span></span><span></span></div></div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeChatLoading(id) {
  if (id) document.getElementById(id)?.remove();
}

/* ===== AI ANALYSIS ===== */
async function runFinancialAnalysis() {
  const key = getApiKey();
  if (!key) {
    showToast('No API key. Configure in Settings first.', 'error'); return;
  }

  openModal('analysisModal');
  const content = document.getElementById('analysisContent');
  if (content) content.innerHTML = `<div class="ai-loading"><div class="loading-dots"><span></span><span></span><span></span></div><p>Analyzing your finances with AI...</p></div>`;

  const ym = State.currentMonth;
  const totalIncome  = State.income.filter(i=>i.month===ym).reduce((s,i)=>s+i.amount,0);
  const totalExpense = State.expenses.filter(e=>e.month===ym).reduce((s,e)=>s+e.amount,0);
  const budget = (State.budgets[ym]||{}).total||0;
  const catMap = {};
  State.expenses.filter(e=>e.month===ym).forEach(e=>{ catMap[e.category]=(catMap[e.category]||0)+e.amount; });
  const goalsStr = State.goals.map(g=>`${g.name}: ${fmtINR(g.saved)}/${fmtINR(g.target)}`).join(', ') || 'None';

  const prompt = `You are a personal finance advisor for Indian users. Analyze the following financial data and provide a structured analysis:

Monthly Income: ${fmtINR(totalIncome)}
Monthly Expenses: ${fmtINR(totalExpense)}
Monthly Budget Set: ${fmtINR(budget)}
Net Savings: ${fmtINR(totalIncome-totalExpense)}
Category Expenses: ${Object.entries(catMap).map(([k,v])=>`${k}: ${fmtINR(v)}`).join(', ')||'No data'}
Savings Goals: ${goalsStr}
Month: ${monthLabel(ym)}

${totalIncome===0 ? 'Note: No income data available for this month.' : ''}
${totalExpense===0 ? 'Note: No expense data available for this month.' : ''}

Please provide:
1. **Financial Overview** – Income/expense/savings summary
2. **Spending Analysis** – Key spending areas, anything worth reviewing
3. **Budget Recommendations** – Practical limits and adjustments
4. **Savings Roadmap** – Monthly saving target and steps
5. **Investment Education** – Appropriate options to explore based on their situation

Use Indian Rupees (₹). Be practical and encouraging. If data is missing, note what's needed. Do not guarantee returns or invent data.`;

  try {
    const response = await callGemini(prompt);
    if (content) content.innerHTML = renderMarkdown(response);
  } catch(err) {
    let msg = err.message || 'Something went wrong.';
    if (err.message === 'NO_KEY') msg = 'API key not found. Please add your Gemini API key in Settings.';
    if (content) content.innerHTML = `<div style="color:var(--accent-error);padding:10px">${escHtml(msg)}</div>`;
  }
}

/* ===== AI ROADMAP EXPLANATION ===== */
async function explainRoadmapWithAI() {
  const income   = safeNum(document.getElementById('rm-income')?.value);
  const expenses = safeNum(document.getElementById('rm-expenses')?.value);
  const target   = safeNum(document.getElementById('rm-target')?.value);
  const goal     = (document.getElementById('rm-goal')?.value||'').trim();
  const date     = document.getElementById('rm-date')?.value||'';

  if (!income || !goal || !target) {
    showToast('Please fill in the roadmap form first.', 'error'); return;
  }

  const key = getApiKey();
  if (!key) { showToast('No API key. Configure in Settings.', 'error'); return; }

  const resultEl = document.getElementById('roadmapResult');
  if (resultEl) resultEl.innerHTML = '<div class="ai-loading"><div class="loading-dots"><span></span><span></span><span></span></div><p>Generating AI explanation...</p></div>';

  const prompt = `As a personal finance advisor for Indian users, create a detailed actionable financial roadmap for this person:

Goal: ${goal}
Target Amount: ${fmtINR(target)}
Monthly Income: ${fmtINR(income)}
Monthly Expenses: ${fmtINR(expenses)}
Target Date: ${date ? monthLabel(date) : 'Flexible'}

Please provide:
1. Whether this goal is realistic given the numbers
2. A step-by-step monthly action plan
3. Specific ways to increase savings
4. Investment options to consider
5. What to do if expenses need to be reduced

Be honest if the goal seems unrealistic. Use ₹ and practical advice.`;

  try {
    const res = await callGemini(prompt);
    if (resultEl) resultEl.innerHTML = `<h3 style="margin-bottom:14px">AI Roadmap Explanation</h3>` + renderMarkdown(res);
  } catch(err) {
    let msg = err.message || 'Something went wrong.';
    if (err.message === 'NO_KEY') msg = 'API key not found.';
    if (resultEl) resultEl.innerHTML = `<div style="color:var(--accent-error)">${escHtml(msg)}</div>`;
  }
}

/* ─────────────────────────────────────────
   FORM SUBMISSIONS
───────────────────────────────────────── */
function handleIncomeSubmit(e) {
  e.preventDefault();
  const errEl = document.getElementById('incomeFormError');
  const source = document.getElementById('incomeSource').value;
  const amount = parseFloat(document.getElementById('incomeAmount').value);
  const date   = document.getElementById('incomeDate').value;
  const desc   = document.getElementById('incomeDesc').value.trim();
  const editId = document.getElementById('incomeEditId').value;

  if (!source) { if(errEl) errEl.textContent='Please select a source.'; return; }
  if (!amount || amount <= 0) { if(errEl) errEl.textContent='Enter a valid amount.'; return; }
  if (!date) { if(errEl) errEl.textContent='Please select a date.'; return; }
  if(errEl) errEl.textContent='';

  const month = date.slice(0,7);
  if (editId) {
    const idx = State.income.findIndex(i=>i.id===editId);
    if (idx>-1) State.income[idx] = { id:editId, source, amount, date, desc, month };
  } else {
    State.income.push({ id:uid(), source, amount, date, desc, month });
  }
  State.save();
  closeModal('incomeModal');
  resetForm('incomeForm');
  document.getElementById('incomeEditId').value='';
  document.getElementById('incomeModalTitle').textContent='Add Income';
  renderSection('income');
  renderDashboard();
  showToast(editId ? 'Income updated!' : 'Income added!', 'success');
}

function handleExpenseSubmit(e) {
  e.preventDefault();
  const errEl  = document.getElementById('expenseFormError');
  const category = document.getElementById('expenseCategory').value;
  const amount   = parseFloat(document.getElementById('expenseAmount').value);
  const date     = document.getElementById('expenseDate').value;
  const desc     = document.getElementById('expenseDesc').value.trim();
  const editId   = document.getElementById('expenseEditId').value;

  if (!category) { if(errEl) errEl.textContent='Please select a category.'; return; }
  if (!amount || amount <= 0) { if(errEl) errEl.textContent='Enter a valid amount.'; return; }
  if (!date) { if(errEl) errEl.textContent='Please select a date.'; return; }
  if (!desc) { if(errEl) errEl.textContent='Please add a description.'; return; }
  if(errEl) errEl.textContent='';

  const month = date.slice(0,7);
  if (editId) {
    const idx = State.expenses.findIndex(e=>e.id===editId);
    if (idx>-1) State.expenses[idx] = { id:editId, category, amount, date, desc, month };
  } else {
    State.expenses.push({ id:uid(), category, amount, date, desc, month });
  }
  State.save();
  closeModal('expenseModal');
  resetForm('expenseForm');
  document.getElementById('expenseEditId').value='';
  document.getElementById('expenseModalTitle').textContent='Add Expense';
  renderSection('expenses');
  renderDashboard();
  showToast(editId ? 'Expense updated!' : 'Expense added!', 'success');
}

function handleGoalSubmit(e) {
  e.preventDefault();
  const errEl  = document.getElementById('goalFormError');
  const name   = document.getElementById('goalName').value.trim();
  const target = parseFloat(document.getElementById('goalTarget').value);
  const saved  = parseFloat(document.getElementById('goalSaved').value)||0;
  const date   = document.getElementById('goalDate').value;
  const editId = document.getElementById('goalEditId').value;

  if (!name) { if(errEl) errEl.textContent='Please enter a goal name.'; return; }
  if (!target || target <= 0) { if(errEl) errEl.textContent='Enter a valid target amount.'; return; }
  if (saved < 0) { if(errEl) errEl.textContent='Saved amount cannot be negative.'; return; }
  if (saved > target) { if(errEl) errEl.textContent='Saved amount cannot exceed target.'; return; }
  if (!date) { if(errEl) errEl.textContent='Please select a target date.'; return; }
  if(errEl) errEl.textContent='';

  if (editId) {
    const idx = State.goals.findIndex(g=>g.id===editId);
    if (idx>-1) State.goals[idx] = { id:editId, name, target, saved, date };
  } else {
    State.goals.push({ id:uid(), name, target, saved, date });
  }
  State.save();
  closeModal('goalModal');
  resetForm('goalForm');
  document.getElementById('goalEditId').value='';
  document.getElementById('goalModalTitle').textContent='New Savings Goal';
  renderSavings();
  renderDashboard();
  showToast(editId ? 'Goal updated!' : 'Goal created!', 'success');
}

function handleCatBudgetSubmit(e) {
  e.preventDefault();
  const errEl = document.getElementById('catBudgetFormError');
  const cat   = document.getElementById('catBudgetCat').value;
  const amt   = parseFloat(document.getElementById('catBudgetAmt').value);

  if (!cat) { if(errEl) errEl.textContent='Please select a category.'; return; }
  if (!amt || amt<=0) { if(errEl) errEl.textContent='Enter a valid amount.'; return; }
  if(errEl) errEl.textContent='';

  const ym = document.getElementById('budgetMonth')?.value || State.currentMonth;
  if (!State.budgets[ym]) State.budgets[ym] = { total:0, categories:{} };
  if (!State.budgets[ym].categories) State.budgets[ym].categories = {};
  State.budgets[ym].categories[cat] = amt;
  State.save();
  closeModal('catBudgetModal');
  resetForm('catBudgetForm');
  renderBudget();
  showToast('Category budget saved!', 'success');
}

function resetForm(formId) {
  const form = document.getElementById(formId);
  if (form) form.reset();
}

/* ─────────────────────────────────────────
   INIT & EVENT LISTENERS
───────────────────────────────────────── */
function init() {
  // Load API config from storage
  CONFIG.GEMINI_API_KEY = Store.get('fs_apiKey','') || '';
  CONFIG.GEMINI_MODEL   = Store.get('fs_model', 'gemini-1.5-flash');

  // Set today's info
  const now = new Date();
  const hours = now.getHours();
  const greeting = hours < 12 ? 'Good morning' : hours < 17 ? 'Good afternoon' : 'Good evening';
  const greetEl = document.getElementById('greeting');
  if (greetEl) greetEl.textContent = greeting;

  const dateEl = document.getElementById('currentDate');
  if (dateEl) dateEl.textContent = now.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  // Set month inputs to current month
  const currentMonth = State.currentMonth || todayMonth();
  ['incomeMonth','expenseMonth','budgetMonth','reportMonth'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = currentMonth;
  });

  // Set date inputs to today
  ['incomeDate','expenseDate'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = todayDate();
  });

  // Load demo data if first run
  if (!State.demoLoaded && State.income.length === 0 && State.expenses.length === 0) {
    loadDemoData();
  }

  // Show/hide demo badge
  const demoBadge = document.getElementById('demoBadge');
  if (demoBadge) demoBadge.classList.toggle('hidden', !State.demoLoaded);

  // Show/hide AI key notice
  const notice = document.getElementById('aiKeyNotice');
  if (notice) notice.classList.toggle('hidden', !!Store.get('fs_apiKey',''));

  // Initial render
  navigate('dashboard');

  // ── Navigation ──
  document.querySelectorAll('[data-section]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.section));
  });

  // ── Quick actions ──
  document.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', () => {
      const action = el.dataset.action;
      if (action==='addIncome')  { navigate('income');  openModal('incomeModal'); }
      if (action==='addExpense') { navigate('expenses');openModal('expenseModal');}
      if (action==='setBudget')  { navigate('budget'); }
      if (action==='addGoal')    { navigate('savings'); openModal('goalModal'); }
      if (action==='aiChat')     { navigate('ai'); }
    });
  });

  // ── Open modals ──
  document.getElementById('addIncomeBtn')?.addEventListener('click', () => openModal('incomeModal'));
  document.getElementById('addExpenseBtn')?.addEventListener('click', () => openModal('expenseModal'));
  document.getElementById('addGoalBtn')?.addEventListener('click', () => openModal('goalModal'));
  document.getElementById('addGoalEmptyBtn')?.addEventListener('click', () => openModal('goalModal'));
  document.getElementById('addCatBudgetBtn')?.addEventListener('click', () => {
    document.getElementById('catBudgetEditKey').value='';
    resetForm('catBudgetForm');
    openModal('catBudgetModal');
  });

  // ── Close modals ──
  document.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.modal;
      if (id) closeModal(id);
    });
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  // ── Form submissions ──
  document.getElementById('incomeForm')?.addEventListener('submit', handleIncomeSubmit);
  document.getElementById('expenseForm')?.addEventListener('submit', handleExpenseSubmit);
  document.getElementById('goalForm')?.addEventListener('submit', handleGoalSubmit);
  document.getElementById('catBudgetForm')?.addEventListener('submit', handleCatBudgetSubmit);

  // ── Budget save ──
  document.getElementById('saveBudgetBtn')?.addEventListener('click', () => {
    const ym   = document.getElementById('budgetMonth')?.value || State.currentMonth;
    const val  = parseFloat(document.getElementById('totalBudgetInput').value);
    if (isNaN(val)||val<0) { showToast('Enter a valid budget amount.','error'); return; }
    if (!State.budgets[ym]) State.budgets[ym] = { total:0, categories:{} };
    State.budgets[ym].total = val;
    State.save();
    renderBudget();
    renderDashboard();
    showToast('Budget saved!', 'success');
  });

  // ── Month change listeners ──
  document.getElementById('incomeMonth')?.addEventListener('change', renderIncome);
  document.getElementById('expenseMonth')?.addEventListener('change', renderExpenses);
  document.getElementById('budgetMonth')?.addEventListener('change', renderBudget);
  document.getElementById('reportMonth')?.addEventListener('change', renderReports);
  document.getElementById('expenseFilterCat')?.addEventListener('change', renderExpenses);
  document.getElementById('expenseSearch')?.addEventListener('input', renderExpenses);

  // ── Confirm dialog ──
  document.getElementById('confirmOkBtn')?.addEventListener('click', () => {
    closeModal('confirmModal');
    if (typeof confirmCallback === 'function') { confirmCallback(); confirmCallback=null; }
  });
  document.getElementById('confirmCancelBtn')?.addEventListener('click', () => closeModal('confirmModal'));

  // ── AI chat ──
  const sendBtn = document.getElementById('chatSendBtn');
  const chatInput = document.getElementById('chatInput');

  sendBtn?.addEventListener('click', () => {
    const msg = chatInput?.value.trim();
    if (!msg) return;
    if (chatInput) chatInput.value='';
    sendChatMessage(msg);
    const sq = document.getElementById('suggestedQuestions');
    if (sq) sq.style.display='none';
  });

  chatInput?.addEventListener('keydown', e => {
    if (e.key==='Enter' && !e.shiftKey) {
      e.preventDefault();
      sendBtn?.click();
    }
  });

  // Auto-resize textarea
  chatInput?.addEventListener('input', () => {
    chatInput.style.height='auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120)+'px';
  });

  // ── Suggested questions ──
  document.querySelectorAll('.sq-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const msg = btn.textContent.trim();
      if (chatInput) chatInput.value = msg;
      sendBtn?.click();
    });
  });

  // ── Analyze button ──
  document.getElementById('analyzeBtn')?.addEventListener('click', runFinancialAnalysis);

  // ── Roadmap ──
  document.getElementById('generateRoadmapBtn')?.addEventListener('click', generateRoadmap);
  document.getElementById('aiRoadmapBtn')?.addEventListener('click', explainRoadmapWithAI);

  // ── SIP Calculator ──
  document.getElementById('calcSipBtn')?.addEventListener('click', calcSIP);

  // ── Investment edu tabs ──
  document.querySelectorAll('.edu-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.edu-tab').forEach(t=>t.classList.remove('active'));
      document.querySelectorAll('.edu-panel').forEach(p=>p.classList.remove('active'));
      tab.classList.add('active');
      const target = document.getElementById(tab.dataset.tab);
      if (target) target.classList.add('active');
    });
  });

  // ── Settings ──
  document.getElementById('saveApiKeyBtn')?.addEventListener('click', () => {
    const key   = document.getElementById('apiKeyInput')?.value.trim();
    const model = document.getElementById('modelSelect')?.value || CONFIG.GEMINI_MODEL;
    Store.set('fs_apiKey', key);
    Store.set('fs_model', model);
    CONFIG.GEMINI_API_KEY = key;
    CONFIG.GEMINI_MODEL   = model;
    const status = document.getElementById('apiStatus');
    const notice = document.getElementById('aiKeyNotice');
    if (status) { status.textContent = key ? '✓ API key saved.' : 'API key cleared.'; status.className='api-status '+(key?'success':''); }
    if (notice) notice.classList.toggle('hidden', !!key);
    showToast('Settings saved!', 'success');
  });

  document.getElementById('toggleApiKey')?.addEventListener('click', () => {
    const input = document.getElementById('apiKeyInput');
    const btn   = document.getElementById('toggleApiKey');
    if (!input) return;
    input.type = input.type==='password'?'text':'password';
    if (btn) btn.textContent = input.type==='password'?'Show':'Hide';
  });

  document.getElementById('clearDemoBtn')?.addEventListener('click', () => {
    showConfirm('Clear demo data and start fresh?', () => {
      State.income=[]; State.expenses=[]; State.goals=[];
      State.budgets={}; State.demoLoaded=false;
      State.save();
      document.getElementById('demoBadge')?.classList.add('hidden');
      renderSection(State.activeSection);
      renderDashboard();
      showToast('Demo data cleared.', 'info');
    });
  });

  document.getElementById('loadDemoDataBtn')?.addEventListener('click', () => {
    showConfirm('Load sample demo data? This will add sample income, expenses and goals.', () => {
      loadDemoData();
      document.getElementById('demoBadge')?.classList.remove('hidden');
      renderSection(State.activeSection);
      renderDashboard();
      showToast('Demo data loaded!', 'success');
    });
  });

  document.getElementById('clearAllDataBtn')?.addEventListener('click', () => {
    showConfirm('This will permanently delete ALL your data. This cannot be undone. Continue?', () => {
      State.income=[]; State.expenses=[]; State.goals=[];
      State.budgets={}; State.demoLoaded=false;
      State.save();
      document.getElementById('demoBadge')?.classList.add('hidden');
      renderSection('dashboard');
      navigate('dashboard');
      showToast('All data cleared.', 'info');
    });
  });

  // ── Link buttons (View All etc.) ──
  document.querySelectorAll('.link-btn[data-section]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.section));
  });

  // Keyboard: close modals with Escape
  document.addEventListener('keydown', e => {
    if (e.key==='Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m=>m.classList.remove('open'));
    }
  });
}

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
