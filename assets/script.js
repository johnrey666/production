// Load sidebar and initialize per-page code
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing...');
  
  // Load sidebar for pages that have it
  if (document.getElementById('sidebar')) {
    loadSidebar();
  }
  
  // Initialize mobile sidebar
  initMobileSidebar();
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
  if (page === 'production.html') initProduction();
  if (page === 'inventory.html') initInventory();
  if (page === 'cost-analysis.html') initCostAnalysis();
  if (page === 'reports.html') initReports();
  // recipes.html, dashboard.html, and index.html have their own JS
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