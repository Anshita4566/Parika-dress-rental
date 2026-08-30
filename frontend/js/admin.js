// Guard: sirf admin hi is page ko use kar sake
const adminUser = getCurrentUser();
if (!adminUser || adminUser.role !== "admin") {
  alert("Access denied. Admins only.");
  window.location.href = "index.html";
}

// ============ ADD / EDIT DRESS FORM ============
const productForm = document.getElementById("product-form");
const editIdField = document.getElementById("p-id");
const formHeading = document.getElementById("form-heading");
const cancelEditBtn = document.getElementById("cancel-edit-btn");

if (productForm) {
  productForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgEl = document.getElementById("product-msg");

    const payload = {
      name: document.getElementById("p-name").value.trim(),
      description: document.getElementById("p-desc").value.trim(),
      category: document.getElementById("p-category").value.trim(),
      size: document.getElementById("p-size").value.split(",").map((s) => s.trim()),
      color: document.getElementById("p-color").value.trim(),
      gender: document.getElementById("p-gender").value,
      rentPricePerDay: Number(document.getElementById("p-price").value),
      securityDeposit: Number(document.getElementById("p-deposit").value) || 0,
      totalQuantity: Number(document.getElementById("p-qty").value) || 1,
    };

    // Photo abhi na ho to ye field khaali chhod do - backend automatically
    // ek placeholder image laga dega, baad me edit karke apni real photo daal dena
    const imageValue = document.getElementById("p-image").value.trim();
    if (imageValue) payload.imageUrl = imageValue;

    const editingId = editIdField.value;

    try {
      if (editingId) {
        await apiRequest(`/products/${editingId}`, "PUT", payload, true);
        msgEl.textContent = "✅ Dress updated successfully!";
      } else {
        await apiRequest("/products", "POST", payload, true);
        msgEl.textContent = "✅ Dress added successfully! (Using a placeholder photo until you add a real one)";
      }
      msgEl.className = "form-msg success";
      resetProductForm();
      loadAdminProducts();
    } catch (err) {
      msgEl.textContent = `Error: ${err.message}`;
      msgEl.className = "form-msg error";
    }
  });
}

function resetProductForm() {
  productForm.reset();
  editIdField.value = "";
  formHeading.textContent = "Add a new dress";
  cancelEditBtn.style.display = "none";
}

if (cancelEditBtn) {
  cancelEditBtn.addEventListener("click", resetProductForm);
}

// Edit button click hone par form ko us dress ki details se bhar do
function editProduct(p) {
  document.getElementById("p-id").value = p._id;
  document.getElementById("p-name").value = p.name;
  document.getElementById("p-desc").value = p.description;
  document.getElementById("p-category").value = p.category;
  document.getElementById("p-size").value = p.size.join(", ");
  document.getElementById("p-color").value = p.color || "";
  document.getElementById("p-gender").value = p.gender || "";
  document.getElementById("p-image").value = p.imageUrl.includes("placeholder") ? "" : p.imageUrl;
  document.getElementById("p-price").value = p.rentPricePerDay;
  document.getElementById("p-deposit").value = p.securityDeposit;
  document.getElementById("p-qty").value = p.totalQuantity;

  formHeading.textContent = `Editing: ${p.name}`;
  cancelEditBtn.style.display = "inline-block";
  productForm.scrollIntoView({ behavior: "smooth" });
}

// ============ LIST + DELETE PRODUCTS ============
async function loadAdminProducts() {
  const listEl = document.getElementById("admin-product-list");
  if (!listEl) return;

  try {
    const products = await apiRequest("/products");
    window._adminProducts = products; // edit button ke liye reference rakh lo
    listEl.innerHTML = products
      .map(
        (p, i) => `
      <tr>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>₹${p.rentPricePerDay}/day</td>
        <td>${p.totalQuantity}</td>
        <td style="display:flex; gap:8px;">
          <button class="btn btn-outline" style="padding:6px 12px; font-size:0.8rem;" onclick="editProduct(window._adminProducts[${i}])">Edit</button>
          <button class="btn btn-danger" style="padding:6px 12px; font-size:0.8rem;" onclick="deleteProduct('${p._id}')">Delete</button>
        </td>
      </tr>
    `
      )
      .join("");
  } catch (err) {
    listEl.innerHTML = `<tr><td colspan="5">Error: ${err.message}</td></tr>`;
  }
}

async function deleteProduct(id) {
  if (!confirm("Delete this dress permanently?")) return;
  try {
    await apiRequest(`/products/${id}`, "DELETE", null, true);
    loadAdminProducts();
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

// ============ VIEW ALL BOOKINGS ============
async function loadAllBookings() {
  const bookingsEl = document.getElementById("admin-bookings-list");
  if (!bookingsEl) return;

  try {
    const bookings = await apiRequest("/bookings", "GET", null, true);
//     bookingsEl.innerHTML = bookings
//       .map(
//         (b) => `
//       <tr>
//         <td>${b.user?.name || "Unknown"} (${b.user?.email || "-"})</td>
//         <td>${b.product?.name || "Deleted"}</td>
//         <td>${new Date(b.startDate).toLocaleDateString("en-IN")}</td>
//         <td>${new Date(b.endDate).toLocaleDateString("en-IN")}</td>
//         <td>₹${b.totalPrice}</td>
//         <td><span class="status-badge status-${b.status}">${b.status}</span></td>
//       </tr>
//     `
//       )
//       .join("");
//   } catch (err) {
//     bookingsEl.innerHTML = `<tr><td colspan="6">Error: ${err.message}</td></tr>`;
//   }
// }
    bookingsEl.innerHTML = bookings
      .map(
        (b) => `
      <tr>
        <td>${b.user?.name || "Unknown"} (${b.user?.email || "-"})</td>
        <td>${b.product?.name || "Deleted"}</td>
        <td>${new Date(b.startDate).toLocaleDateString("en-IN")}</td>
        <td>${new Date(b.endDate).toLocaleDateString("en-IN")}</td>
        <td>₹${b.totalPrice}</td>
        <td><span class="status-badge status-${b.status}">${b.status}</span></td>
        <td>
          ${
            b.status === "confirmed"
              ? `<button class="btn btn-outline" style="padding:6px 12px; font-size:0.8rem;" onclick="refundDeposit('${b._id}')">Mark Returned & Refund</button>`
              : b.refundStatus === "processed"
              ? `<span style="font-size:0.78rem; color:var(--color-success);">✅ Refunded</span>`
              : "—"
          }
        </td>
      </tr>
    `
      )
      .join("");
  } catch (err) {
    bookingsEl.innerHTML = `<tr><td colspan="7">Error: ${err.message}</td></tr>`;
  }
}

async function refundDeposit(bookingId) {
  if (!confirm("Confirm this dress has been returned and refund the security deposit?")) return;
  try {
    const result = await apiRequest(`/payments/refund-deposit/${bookingId}`, "PUT", null, true);
    alert(result.message);
    loadAllBookings();
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}
// ============ ANALYTICS DASHBOARD ============
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

async function loadAnalytics() {
  try {
    const data = await apiRequest("/bookings/analytics", "GET", null, true);

    document.getElementById("stat-revenue").textContent = `₹${data.totalRevenue.toLocaleString("en-IN")}`;
    document.getElementById("stat-bookings").textContent = data.totalBookings;

    const cancelledEntry = data.statusCounts.find((s) => s._id === "cancelled");
    document.getElementById("stat-cancelled").textContent = cancelledEntry ? cancelledEntry.count : 0;

    renderRevenueChart(data.monthlyRevenue);
    renderTopProductsChart(data.topProducts);
  } catch (err) {
    console.error("Analytics error:", err.message);
  }
}

function renderRevenueChart(monthlyRevenue) {
  const ctx = document.getElementById("revenue-chart");
  if (!ctx || monthlyRevenue.length === 0) return;

  const labels = monthlyRevenue.map((m) => `${monthNames[m._id.month - 1]} ${m._id.year}`);
  const values = monthlyRevenue.map((m) => m.revenue);

  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Revenue (₹)",
          data: values,
          backgroundColor: "#a24e5c",
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

function renderTopProductsChart(topProducts) {
  const ctx = document.getElementById("top-products-chart");
  if (!ctx || topProducts.length === 0) return;

  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: topProducts.map((p) => p.name),
      datasets: [
        {
          data: topProducts.map((p) => p.bookingCount),
          backgroundColor: ["#a24e5c", "#b8945f", "#4c7a5e", "#5b5468", "#7e3a45"],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom", labels: { font: { size: 11 } } } },
    },
  });
}

loadAdminProducts();
loadAllBookings();
loadAnalytics();
