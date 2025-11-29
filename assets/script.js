// Load sidebar and initialize per-page code
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing...');
  
  // Load sidebar for pages that have it
  if (document.getElementById('sidebar')) {
    loadSidebar();
  }
});

// Load sidebar function
function loadSidebar() {
  console.log('Loading sidebar...');
  
  // Use XMLHttpRequest instead of fetch (works with file:// protocol)
  const xhr = new XMLHttpRequest();
  xhr.open('GET', 'sidebar.html', true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        console.log('Sidebar HTML loaded successfully');
        const sb = document.getElementById('sidebar');
        if (sb) {
          sb.innerHTML = xhr.responseText;
          console.log('Sidebar content inserted');
          highlightActiveNav();
          runPageInit();
        }
      } else {
        console.error('Failed to load sidebar, status:', xhr.status);
        // Fallback: create complete sidebar
        const sb = document.getElementById('sidebar');
        if (sb) {
          sb.innerHTML = `
            <div class="logo">CTK KITCHEN</div>
            <nav class="nav">
              <a href="dashboard.html"><i class="fas fa-home"></i> Dashboard</a>
              <a href="production.html"><i class="fas fa-industry"></i> Production</a>
              <a href="inventory.html"><i class="fas fa-boxes"></i> Raw Materials</a>
              <a href="recipes.html"><i class="fas fa-scroll"></i> Recipes</a>
              <a href="cost-analysis.html"><i class="fas fa-calculator"></i> Cost Analysis</a>
              <a href="reports.html"><i class="fas fa-chart-bar"></i> Reports</a>
            </nav>
          `;
          highlightActiveNav();
          runPageInit();
        }
      }
    }
  };
  xhr.send();
}

// highlight active nav link (based on filename)
function highlightActiveNav() {
  const current = window.location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('#sidebar .nav a').forEach(a => {
    if (a.getAttribute('href') === current) a.classList.add('active');
  });
}

// Helper to run init for the current page by filename
function runPageInit() {
  const page = window.location.pathname.split('/').pop() || 'dashboard.html';
  if (page === 'dashboard.html') initDashboard();
  if (page === 'production.html') initProduction();
  if (page === 'inventory.html') initInventory();
  if (page === 'recipes.html') initRecipes();
  if (page === 'cost-analysis.html') initCostAnalysis();
  if (page === 'reports.html') initReports();
  // index.html (login) has no JS to initialize
}

/* -------------------
   dashboard.html code
   ------------------- */
function initDashboard() {
  console.log('Initializing dashboard...');
  
  // Set today's date in the header if element exists
  const todayDateEl = document.getElementById('todayDate');
  if (todayDateEl) {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    todayDateEl.textContent = today.toLocaleDateString('en-PH', options);
  }
  
  // Load dashboard stats from localStorage if available
  loadDashboardStats();
}

function loadDashboardStats() {
  // Try to load real data from production records
  const prodDB = JSON.parse(localStorage.getItem('ctk_prod')) || {};
  const today = new Date().toISOString().split('T')[0];
  const todayData = prodDB[today] || [];
  
  let batchesToday = 0;
  let totalOutput = 0;
  let totalCost = 0;
  let netVariance = 0;
  
  todayData.forEach(entry => {
    batchesToday += entry.batches || 0;
    totalOutput += entry.output || 0;
    
    // Calculate cost (simplified - you might want more complex logic)
    const recipes = JSON.parse(localStorage.getItem('ctk_recipes')) || [];
    const recipe = recipes.find(r => r.name === entry.product);
    if (recipe) {
      const rawMaterials = JSON.parse(localStorage.getItem('ctk_mats')) || [];
      let recipeCost = 0;
      recipe.ingredients.forEach(ing => {
        const mat = rawMaterials.find(m => m.sku === ing.sku);
        if (mat) {
          recipeCost += (ing.qty || 0) * (entry.batches || 0) * (mat.perkg || 0);
        }
      });
      totalCost += recipeCost;
    }
    
    // Calculate variance
    const expectedOutput = (entry.batches || 0) * (recipe?.yieldKg || 0);
    netVariance += (entry.output || 0) - expectedOutput;
  });
  
  // Update dashboard stats if elements exist
  const batchesEl = document.querySelector('.stat:nth-child(1) .stat-value');
  const outputEl = document.querySelector('.stat:nth-child(2) .stat-value');
  const costEl = document.querySelector('.stat:nth-child(3) .stat-value');
  const varianceEl = document.querySelector('.stat:nth-child(4) .stat-value');
  
  if (batchesEl && batchesToday > 0) batchesEl.textContent = batchesToday;
  if (outputEl && totalOutput > 0) outputEl.textContent = totalOutput.toFixed(0) + ' kg';
  if (costEl && totalCost > 0) costEl.textContent = '₱' + totalCost.toFixed(0);
  if (varianceEl) {
    varianceEl.textContent = (netVariance >= 0 ? '+' : '') + netVariance.toFixed(1) + ' kg';
    varianceEl.className = netVariance >= 0 ? 'stat-value positive' : 'stat-value negative';
  }
  
  // Update summary
  const summaryEl = document.querySelector('.card-body');
  if (summaryEl && todayData.length > 0) {
    // Find top product
    const productCount = {};
    todayData.forEach(entry => {
      if (entry.product) {
        productCount[entry.product] = (productCount[entry.product] || 0) + (entry.batches || 0);
      }
    });
    
    const topProduct = Object.entries(productCount).sort((a, b) => b[1] - a[1])[0];
    const hasWastage = netVariance < 0;
    
    summaryEl.innerHTML = `
      <p>${todayData.length > 0 ? 'Production data loaded for today.' : 'No production data for today.'}</p>
      <p><strong>Top Product:</strong> ${topProduct ? topProduct[0] : 'None'} • <strong>Wastage Alert:</strong> ${hasWastage ? 'Yes' : 'None'}</p>
    `;
  }
}

/* -------------------
   production.html code
   ------------------- */
function initProduction() {
  window.rawMaterials = JSON.parse(localStorage.getItem('ctk_raw')) || JSON.parse(localStorage.getItem('ctk_mats')) || [];
  window.recipes = JSON.parse(localStorage.getItem('ctk_recipes')) || [];
  const DB = 'ctk_prod';
  window.data = JSON.parse(localStorage.getItem(DB)) || {};

  window.today = function() {
    const today = new Date().toISOString().split('T')[0];
    const dEl = document.getElementById('prodDate');
    if (dEl) dEl.value = today;
    const hd = document.getElementById('todayDate');
    if (hd) hd.textContent = new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    loadDay();
  };

  window.loadDay = function() {
    const date = document.getElementById('prodDate').value || new Date().toISOString().split('T')[0];
    if (!window.data[date]) window.data[date] = [];

    const tbody = document.getElementById('prodBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let totalCost = 0;
    let totalOutput = 0;

    window.data[date].forEach((entry, i) => {
      const recipe = window.recipes.find(r => r.name === entry.product) || { yieldKg: 0, ingredients: [] };
      const batches = entry.batches || 0;
      const actualOutput = entry.output || 0;
      const expectedOutput = batches * (recipe.yieldKg || 0);
      const variance = actualOutput - expectedOutput;

      let rawCost = 0;
      (recipe.ingredients || []).forEach(ing => {
        const mat = window.rawMaterials.find(m => m.sku === ing.sku);
        if (mat) rawCost += (ing.qty || 0) * batches * (mat.perkg || mat.costPerKg || 0);
      });

      totalCost += rawCost;
      totalOutput += actualOutput;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <select onchange="update(${i}, 'product', this.value)" style="width:100%">
            <option value="">-- Select Product --</option>
            ${window.recipes.map(r => `<option value="${r.name}" ${r.name===entry.product?'selected':''}>${r.name}</option>`).join('')}
          </select>
        </td>
        <td style="text-align:center">${recipe.yieldKg || '-'}</td>
        <td><input type="number" min="0" step="0.5" value="${batches}" style="width:70px" onchange="update(${i}, 'batches', +this.value)"></td>
        <td style="text-align:center">${(expectedOutput).toFixed(2)}</td>
        <td><input type="number" step="0.1" value="${actualOutput}" style="width:80px" onchange="update(${i}, 'output', +this.value)"></td>
        <td style="text-align:right;font-weight:600">₱${rawCost.toFixed(0)}</td>
        <td class="${variance < 0 ? 'negative' : variance > 0 ? 'positive' : ''}" style="font-weight:600">
          ${variance.toFixed(2)}
        </td>
        <td style="text-align:right">
          ${actualOutput > 0 ? '₱' + (rawCost / actualOutput).toFixed(1) : '-'}
        </td>
        <td><button class="btn btn-small" style="background:#e53e3e;color:white;" onclick="del(${i})">×</button></td>
      `;
      tbody.appendChild(tr);
    });

    const totalCostEl = document.getElementById('totalCost');
    const totalOutputEl = document.getElementById('totalOutput');
    const avgCostEl = document.getElementById('avgCost');
    if (totalCostEl) totalCostEl.textContent = '₱' + totalCost.toFixed(0);
    if (totalOutputEl) totalOutputEl.textContent = totalOutput.toFixed(2) + ' kg';
    if (avgCostEl) avgCostEl.textContent = totalOutput > 0 ? '₱' + (totalCost / totalOutput).toFixed(1) + '/kg' : '₱0/kg';
  };

  window.update = function(i, field, value) {
    const date = document.getElementById('prodDate').value || new Date().toISOString().split('T')[0];
    if (!window.data[date]) window.data[date] = [];
    if (!window.data[date][i]) window.data[date][i] = { product: '', batches: 0, output: 0 };

    window.data[date][i][field] = value;

    if (field === 'product' && value) {
      const recipe = window.recipes.find(r => r.name === value);
      if (recipe) window.data[date][i].batches = window.data[date][i].batches || 1;
    }

    localStorage.setItem('ctk_prod', JSON.stringify(window.data));
    window.loadDay();
  };

  window.addRow = function() {
    const date = document.getElementById('prodDate').value || new Date().toISOString().split('T')[0];
    if (!window.data[date]) window.data[date] = [];
    window.data[date].push({
      product: window.recipes.length > 0 ? window.recipes[0].name : "",
      batches: 1,
      output: 0
    });
    localStorage.setItem('ctk_prod', JSON.stringify(window.data));
    window.loadDay();
  };

  window.del = function(i) {
    if (!confirm('Delete this entry?')) return;
    const date = document.getElementById('prodDate').value || new Date().toISOString().split('T')[0];
    window.data[date].splice(i, 1);
    localStorage.setItem('ctk_prod', JSON.stringify(window.data));
    window.loadDay();
  };

  // Auto-load today on production page
  window.today();
}

/* -------------------
   inventory.html code
   ------------------- */
function initInventory() {
  window.mats = JSON.parse(localStorage.getItem('ctk_mats')) || [
    {sku:"4362771",desc:"AJI Umami Seasoning 2.5kg×8",cost:459.99,perkg:184,cat:"Seasoning"},
    {sku:"3498918",desc:"Pork Belly Skinless",cost:310,perkg:310,cat:"Pork"},
    {sku:"4236408",desc:"Cooking Oil 17kg",cost:1510,perkg:88.8,cat:"Oil"},
    {sku:"5129341",desc:"Sugar White Refined",cost:68,perkg:68,cat:"Sweetener"},
    {sku:"6678210",desc:"Soy Sauce 5L",cost:285,perkg:57,cat:"Condiment"}
  ];

  function load() {
    const tbody = document.getElementById('matBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    window.mats.forEach((m, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input value="${m.sku}"    onblur="save(${i},'sku',this.value)"></td>
        <td><input value="${m.desc}"   onblur="save(${i},'desc',this.value)"></td>
        <td><input type="number" step="0.01" value="${m.cost}"  onblur="save(${i},'cost',+this.value)"></td>
        <td><input type="number" step="0.1"  value="${m.perkg}" onblur="save(${i},'perkg',+this.value)"></td>
        <td><input value="${m.cat}"    onblur="save(${i},'cat',this.value)"></td>
        <td><button class="btn btn-small" onclick="delMat(${i})">×</button></td>
      `;
      tbody.appendChild(tr);
    });
  }

  window.save = function(i, field, value) {
    window.mats[i][field] = value;
    localStorage.setItem('ctk_mats', JSON.stringify(window.mats));
  };

  window.addMat = function() {
    window.mats.push({sku:"", desc:"", cost:0, perkg:0, cat:""});
    localStorage.setItem('ctk_mats', JSON.stringify(window.mats));
    load();
  };

  window.delMat = function(i) {
    if (!confirm('Delete this material?')) return;
    window.mats.splice(i, 1);
    localStorage.setItem('ctk_mats', JSON.stringify(window.mats));
    load();
  };

  load();
}

/* -------------------
   recipes.html code
   ------------------- */
function initRecipes() {
  // prefer existing saved recipes
  window.recipes = JSON.parse(localStorage.getItem('ctk_recipes')) || [
    {name:"Pork BBQ", batchSize:1, yieldKg:0.9, ingredients:[
      {sku:"3498918", qty:7},
      {sku:"4474919", qty:0.8},
      {sku:"4362771", qty:0.1},
    ]},
    {name:"Chicken Cordon Bleu", batchSize:1, yieldKg:1, ingredients:[
      {sku:"3735649", qty:10},
      {sku:"4447742", qty:1},
    ]}
  ];

  // provide rawMaterials (try both keys)
  window.rawMaterials = JSON.parse(localStorage.getItem('ctk_raw')) || JSON.parse(localStorage.getItem('ctk_mats')) || [];

  window.saveRecipes = function() { localStorage.setItem('ctk_recipes', JSON.stringify(window.recipes)); };
  window.renderRecipes = function() {
    const el = document.getElementById('recipes');
    if (!el) return;
    el.innerHTML = window.recipes.map((r,i) => `
      <div class="card" style="margin-top:20px;">
        <div class="card-header">
          <input value="${r.name}" onchange="window.recipes[${i}].name=this.value;window.saveRecipes()">
          <button class="btn btn-small" onclick="window.recipes.splice(${i},1);window.saveRecipes();window.renderRecipes()">×</button>
        </div>
        <div class="card-body">
          Batch size: <input type="number" value="${r.batchSize}" style="width:80px" onchange="window.recipes[${i}].batchSize=+this.value;window.saveRecipes()">
           | Expected yield (kg): <input type="number" step="0.1" value="${r.yieldKg}" style="width:100px" onchange="window.recipes[${i}].yieldKg=+this.value;window.saveRecipes()">
          <table style="margin-top:10px;width:100%">
            <thead><tr><th>Raw Material</th><th>Qty per Batch</th><th></th></tr></thead>
            <tbody id="ing${i}"></tbody>
          </table>
          <button onclick="addIng(${i})">+ Add Ingredient</button>
        </div>
      </div>
    `).join('');
    // render ingredient rows
    window.recipes.forEach((r,i) => {
      const tbody = document.getElementById(`ing${i}`);
      if (!tbody) return;
      tbody.innerHTML = r.ingredients.map((ing,j) => {
        const mat = window.rawMaterials.find(m => m.sku === ing.sku) || {desc:'???'};
        return `<tr>
          <td><select onchange="window.recipes[${i}].ingredients[${j}].sku=this.value;window.saveRecipes();window.renderRecipes()">${window.rawMaterials.map(m=>`<option value="${m.sku}" ${m.sku===ing.sku?'selected':''}>${m.sku} - ${m.desc}</option>`).join('')}</select></td>
          <td><input type="number" step="0.001" value="${ing.qty}" onchange="window.recipes[${i}].ingredients[${j}].qty=+this.value;window.saveRecipes()"></td>
          <td><button class="btn btn-small" onclick="window.recipes[${i}].ingredients.splice(${j},1);window.saveRecipes();window.renderRecipes()">×</button></td>
        </tr>`;
      }).join('');
    });
  };

  window.addRecipe = function() { window.recipes.push({name:"New Product", batchSize:1, yieldKg:1, ingredients:[]}); window.saveRecipes(); window.renderRecipes(); };
  window.addIng = function(i) {
    const fallbackSku = (window.rawMaterials[0] && window.rawMaterials[0].sku) || '';
    window.recipes[i].ingredients.push({sku:fallbackSku, qty:1});
    window.saveRecipes(); window.renderRecipes();
  };

  window.renderRecipes();
}

/* -------------------
   cost-analysis.html code
   ------------------- */
function initCostAnalysis() {
  window.mats = JSON.parse(localStorage.getItem('ctk_mats')) || [];
  window.prodDB = JSON.parse(localStorage.getItem('ctk_prod')) || {};

  function loadSummary() {
    const today = new Date().toISOString().split('T')[0];
    const dayData = window.prodDB[today] || [];

    let totalRawCost = 0;
    let totalOutput = 0;
    let variance = 0;
    const productCost = {};

    dayData.forEach(r => {
      const rawKg = r.r || 0;
      const outputKg = r.out || 0;
      const expected = (r.o || 0) * (r.y || 0);
      const cost = rawKg * 300; // keep original placeholder

      totalRawCost += cost;
      totalOutput += outputKg;
      variance += (outputKg - expected);

      if (r.p) productCost[r.p] = (productCost[r.p] || 0) + cost;
    });

    const totalCostEl = document.getElementById('totalCost');
    const avgEl = document.getElementById('avgCostPerKg');
    const topEl = document.getElementById('topProduct');
    const vEl = document.getElementById('variance');

    if (totalCostEl) totalCostEl.textContent = '₱' + totalRawCost.toLocaleString(undefined, {minimumFractionDigits: 0});
    if (avgEl) avgEl.textContent = totalOutput ? '₱' + (totalRawCost / totalOutput).toFixed(0) : '₱0';
    const top = Object.entries(productCost).sort((a,b)=>b[1]-a[1])[0];
    if (topEl) topEl.textContent = top ? top[0] : '-';
    if (vEl) {
      vEl.textContent = variance > 0 ? '+' + variance.toFixed(1) + ' kg' : variance.toFixed(1) + ' kg';
      vEl.className = variance >= 0 ? 'positive' : 'negative';
    }
  }

  function loadRecipeTable() {
    const tbody = document.getElementById('recipeBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    window.mats.forEach((m, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${m.desc} (${m.sku})</td>
        <td><input type="number" step="0.01" min="0" data-idx="${i}" onchange="calcRecipe()"></td>
        <td>₱${(m.perkg||0).toFixed(1)}</td>
        <td id="tc${i}">₱0.00</td>
        <td><button class="btn btn-small" style="background:#e53e3e;color:white;" onclick="this.parentElement.parentElement.remove();calcRecipe()">×</button></td>
      `;
      tbody.appendChild(tr);
    });
    calcRecipe();
  }

  window.addRecipeRow = function() {
    const tbody = document.getElementById('recipeBody');
    if (!tbody) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input placeholder="Custom item" style="width:100%"></td>
      <td><input type="number" step="0.01" min="0" onchange="calcRecipe()"></td>
      <td><input type="number" step="0.1" value="0" onchange="calcRecipe()"></td>
      <td id="tcCustom${tbody.children.length}">₱0.00</td>
      <td><button class="btn btn-small" style="background:#e53e3e;color:white;" onclick="this.parentElement.parentElement.remove();calcRecipe()">×</button></td>
    `;
    tbody.appendChild(tr);
    calcRecipe();
  };

  window.calcRecipe = function() {
    let total = 0;
    document.querySelectorAll('#recipeBody tr').forEach(row => {
      const qtyInput = row.querySelector('input[type=number]:nth-of-type(1)');
      const costKgInput = row.querySelector('input[type=number]:nth-of-type(2)') || {value: row.cells[2].textContent.replace('₱','')};
      const qty = parseFloat(qtyInput && qtyInput.value) || 0;
      const costPerKg = parseFloat(costKgInput && costKgInput.value) || 0;
      const lineTotal = qty * costPerKg;
      total += lineTotal;
      const td = row.querySelector('td:nth-child(4)');
      if (td) td.textContent = '₱' + lineTotal.toFixed(2);
    });
    const totalEl = document.getElementById('recipeTotal');
    if (totalEl) totalEl.textContent = '₱' + total.toFixed(2);
  };

  loadSummary();
  loadRecipeTable();
}

/* -------------------
   reports.html code
   ------------------- */
function initReports() {
  window.prodDB = JSON.parse(localStorage.getItem('ctk_prod')) || {};

  window.generateReport = function() {
    const monthInput = document.getElementById('reportMonth') ? document.getElementById('reportMonth').value : '';
    const tbody = document.getElementById('reportBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let totalOutput = 0, totalCost = 0, totalDays = 0;

    Object.keys(window.prodDB).sort().forEach(date => {
      if (!monthInput || date.startsWith(monthInput)) {
        const day = window.prodDB[date];
        (day || []).forEach((r, idx) => {
          const expected = (r.o || 0) * (r.y || 0);
          const actual = r.out || 0;
          const rawKg = r.r || 0;
          const cost = rawKg * 300;

          totalOutput += actual;
          totalCost += cost;
          if (idx === 0) totalDays++;

          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${date}</td>
            <td>${r.p || '-'}</td>
            <td>${r.o || 0}</td>
            <td>${expected.toFixed(1)}</td>
            <td>${actual.toFixed(1)}</td>
            <td>${rawKg.toFixed(1)}</td>
            <td>₱${cost.toFixed(0)}</td>
            <td class="${(actual - expected) >= 0 ? 'positive' : 'negative'}">${(actual - expected).toFixed(1)}</td>
          `;
          tbody.appendChild(tr);
        });
      }
    });

    const daysEl = document.getElementById('rDays');
    const outEl = document.getElementById('rOutput');
    const costEl = document.getElementById('rCost');
    const avgEl = document.getElementById('rAvg');
    if (daysEl) daysEl.textContent = totalDays;
    if (outEl) outEl.textContent = totalOutput.toFixed(0) + ' kg';
    if (costEl) costEl.textContent = '₱' + totalCost.toLocaleString();
    if (avgEl) avgEl.textContent = totalOutput ? '₱' + (totalCost / totalOutput).toFixed(0) : '₱0';
  };

  // default month set & initial generate
  const now = new Date();
  const monthEl = document.getElementById('reportMonth');
  if (monthEl) monthEl.value = now.toISOString().slice(0,7);
  window.generateReport();

  window.exportCSV = function() {
    let csv = "Date,Product,Order Batches,Expected kg,Actual kg,Raw Used kg,Raw Cost,Variance kg\n";
    document.querySelectorAll('#reportBody tr').forEach(row => {
      const cells = Array.from(row.cells).map(c => c.textContent.replace(/,/g, ''));
      csv += cells.join(',') + "\n";
    });
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const monthVal = document.getElementById('reportMonth') ? document.getElementById('reportMonth').value : '';
    a.href = url;
    a.download = `CTK_Report_${monthVal}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
}


// Mobile sidebar functionality
function initMobileSidebar() {
  const menuToggle = document.querySelector('.menu-toggle');
  const closeSidebar = document.querySelector('.close-sidebar');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.add('active');
      if (overlay) overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  }
  
  if (closeSidebar && sidebar) {
    closeSidebar.addEventListener('click', () => {
      sidebar.classList.remove('active');
      if (overlay) overlay.classList.remove('active');
      document.body.style.overflow = '';
    });
  }
  
  if (overlay && sidebar) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    });
  }
  
  // Close sidebar when clicking on nav links on mobile
  const navLinks = document.querySelectorAll('.nav a');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 768) {
        sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  });
}

// Update the DOMContentLoaded event to include mobile sidebar
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing...');
  
  // Load sidebar for pages that have it
  if (document.getElementById('sidebar')) {
    loadSidebar();
  }
  
  // Initialize mobile sidebar
  initMobileSidebar();
});