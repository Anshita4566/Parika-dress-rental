const gridEl = document.getElementById("product-grid");
const searchInput = document.getElementById("search-input");
const categorySelect = document.getElementById("category-select");
const genderSelect = document.getElementById("gender-select");

async function loadProducts() {
  gridEl.innerHTML = `<p style="padding:20px;">Loading dresses...</p>`;

  const params = new URLSearchParams();
  if (searchInput.value.trim()) params.append("search", searchInput.value.trim());
  if (categorySelect.value) params.append("category", categorySelect.value);
  if (genderSelect.value) params.append("gender", genderSelect.value);

  try {
    const products = await apiRequest(`/products?${params.toString()}`);

    if (products.length === 0) {
      gridEl.innerHTML = `<p style="padding:20px;">No dresses found. Try a different search.</p>`;
      return;
    }

    gridEl.innerHTML = products
      .map(
        (p) => `
      <div class="card" onclick="window.location.href='product.html?id=${p._id}'">
        <img src="${p.imageUrl}" alt="${p.name}" />
        <div class="card-body">
          <span class="tag">${p.category}</span>
          <h3>${p.name}</h3>
          <p class="price">₹${p.rentPricePerDay} / 5 days</p>
        </div>
      </div>
    `
      )
      .join("");
  } catch (err) {
    gridEl.innerHTML = `<p style="padding:20px; color:var(--color-danger);">Error loading dresses: ${err.message}</p>`;
  }
}

searchInput.addEventListener("input", debounce(loadProducts, 400));
categorySelect.addEventListener("change", loadProducts);
genderSelect.addEventListener("change", loadProducts);

// Debounce - taaki har keystroke pe API call na ho, thoda ruk kar call ho
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

loadProducts();
