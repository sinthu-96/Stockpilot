document.addEventListener('DOMContentLoaded', () => {
  // Navigation Routing
  const navItems = document.querySelectorAll('.nav-item');
  const views = document.querySelectorAll('.view');
  const topbarTitle = document.querySelector('.topbar h1');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      // Update Active Nav
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      // Update View
      const target = item.dataset.target;
      views.forEach(view => {
        if (view.id === target) {
          view.classList.add('active');
          topbarTitle.textContent = item.textContent.trim();
        } else {
          view.classList.remove('active');
        }
      });

      // Reload Context Data
      if (target === 'dashboard') loadDashboard();
      if (target === 'inventory') loadInventory();
      if (target === 'pos') loadPOS();
    });
  });

  // Modal Logic
  const modalOverlay = document.getElementById('product-modal');
  const btnAddProduct = document.getElementById('btn-add-product');
  const btnCancelModal = document.getElementById('btn-cancel-modal');
  const productForm = document.getElementById('product-form');

  btnAddProduct.addEventListener('click', () => {
    document.getElementById('modal-title').textContent = 'Add Product';
    productForm.reset();
    document.getElementById('prod-id').value = '';
    modalOverlay.classList.add('active');
  });

  btnCancelModal.addEventListener('click', () => {
    modalOverlay.classList.remove('active');
  });

  // Formatters
  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  const formatDate = (dateString) => new Intl.DateTimeFormat('en-US', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(dateString));

  // --- API LOGIC ---

  // 1. Dashboard
  async function loadDashboard() {
    try {
      const res = await fetch('/api/sales/stats');
      const data = await res.json();
      
      document.getElementById('stat-revenue').textContent = formatCurrency(data.totalRevenue);
      document.getElementById('stat-items').textContent = data.totalItems || 0;
      document.getElementById('stat-low-stock').textContent = data.lowStockCount || 0;

      const tbody = document.querySelector('#recent-sales-table tbody');
      tbody.innerHTML = '';
      if(data.recentSales && data.recentSales.length > 0) {
        data.recentSales.forEach(sale => {
          tbody.innerHTML += `
            <tr>
              <td>${sale.name}</td>
              <td>${formatCurrency(sale.total_price)}</td>
              <td>${formatDate(sale.created_at)}</td>
            </tr>
          `;
        });
      } else {
        tbody.innerHTML = '<tr><td colspan="3">No recent sales</td></tr>';
      }
    } catch (e) {
      console.error(e);
    }
  }

  // 2. Inventory
  async function loadInventory() {
    try {
      const res = await fetch('/api/products');
      const products = await res.json();
      const tbody = document.querySelector('#inventory-table tbody');
      tbody.innerHTML = '';
      
      products.forEach(p => {
        tbody.innerHTML += `
          <tr>
            <td>#${p.id}</td>
            <td>${p.name}</td>
            <td>${formatCurrency(p.price)}</td>
            <td>
              <span style="color: ${p.quantity <= 5 ? 'var(--danger)' : 'inherit'}">
                ${p.quantity}
              </span>
            </td>
            <td>
              <button class="btn-icon" onclick="editProduct(${p.id}, '${p.name}', ${p.price}, ${p.quantity})">✏️</button>
              <button class="btn-icon danger" onclick="deleteProduct(${p.id})">🗑️</button>
            </td>
          </tr>
        `;
      });
    } catch (e) {
      console.error(e);
    }
  }

  window.editProduct = (id, name, price, quantity) => {
    document.getElementById('modal-title').textContent = 'Edit Product';
    document.getElementById('prod-id').value = id;
    document.getElementById('prod-name').value = name;
    document.getElementById('prod-price').value = price;
    document.getElementById('prod-quantity').value = quantity;
    modalOverlay.classList.add('active');
  };

  window.deleteProduct = async (id) => {
    if(confirm('Are you sure you want to delete this product?')) {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      loadInventory();
      loadDashboard();
    }
  };

  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('prod-id').value;
    const name = document.getElementById('prod-name').value;
    const price = document.getElementById('prod-price').value;
    const quantity = document.getElementById('prod-quantity').value;

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/products/${id}` : '/api/products';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, price, quantity })
    });

    modalOverlay.classList.remove('active');
    loadInventory();
  });

  // 3. POS
  let posSelectedProduct = null;
  const posInputQty = document.getElementById('pos-quantity');
  const posTotalEl = document.getElementById('pos-total');
  const posSelectedName = document.getElementById('pos-selected-name');
  const posSelectedPrice = document.getElementById('pos-selected-price');
  const btnCheckout = document.getElementById('btn-checkout');

  async function loadPOS() {
    try {
      const res = await fetch('/api/products');
      const products = await res.json();
      const grid = document.getElementById('pos-product-grid');
      grid.innerHTML = '';
      
      // Reset Selection
      posSelectedProduct = null;
      posInputQty.disabled = true;
      posInputQty.value = 1;
      posSelectedName.value = '';
      posSelectedPrice.value = '';
      btnCheckout.disabled = true;
      posTotalEl.textContent = '$0.00';

      products.forEach(p => {
        const outOfStock = p.quantity <= 0;
        grid.innerHTML += `
          <div class="pos-item-card" style="opacity: ${outOfStock ? 0.5 : 1}; pointer-events: ${outOfStock ? 'none' : 'auto'}" onclick="selectPOSProduct(${p.id}, '${p.name}', ${p.price}, ${p.quantity})">
            <h4>${p.name}</h4>
            <div class="price">${formatCurrency(p.price)}</div>
            <div class="stock">${p.quantity} in stock</div>
          </div>
        `;
      });
    } catch (e) {
      console.error(e);
    }
  }

  window.selectPOSProduct = (id, name, price, maxQty) => {
    posSelectedProduct = { id, name, price, maxQty };
    posSelectedName.value = name;
    posSelectedPrice.value = formatCurrency(price);
    posInputQty.disabled = false;
    posInputQty.max = maxQty;
    posInputQty.value = 1;
    btnCheckout.disabled = false;
    updatePOSTotal();
  };

  posInputQty.addEventListener('input', updatePOSTotal);

  function updatePOSTotal() {
    if(!posSelectedProduct) return;
    let qty = parseInt(posInputQty.value);
    if(qty > posSelectedProduct.maxQty) {
      qty = posSelectedProduct.maxQty;
      posInputQty.value = qty;
    }
    if (qty < 1 || isNaN(qty)) qty = 1;
    posInputQty.value = qty;
    const total = qty * posSelectedProduct.price;
    posTotalEl.textContent = formatCurrency(total);
  }

  document.getElementById('pos-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!posSelectedProduct) return;

    btnCheckout.disabled = true;
    btnCheckout.textContent = 'Processing...';

    const qty = parseInt(posInputQty.value);

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: posSelectedProduct.id, quantity: qty })
      });

      if(res.ok) {
        alert('Sale completed successfully!');
        loadPOS(); // Reloads product grid and resets form
      } else {
        const error = await res.json();
        alert('Error: ' + error.message);
        btnCheckout.disabled = false;
        btnCheckout.textContent = 'Complete Sale';
      }
    } catch (e) {
      console.error(e);
      btnCheckout.disabled = false;
      btnCheckout.textContent = 'Complete Sale';
    }
  });


  // Initial load
  loadDashboard();
});
