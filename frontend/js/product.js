const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

const wrapEl = document.getElementById("detail-wrap");
let currentProduct = null;

async function loadProduct() {
  try {
    currentProduct = await apiRequest(`/products/${productId}`);
    renderProduct(currentProduct);
  } catch (err) {
    wrapEl.innerHTML = `<p style="padding:40px;">Dress not found.</p>`;
  }
}

function renderProduct(p) {
  wrapEl.innerHTML = `
    <img src="${p.imageUrl}" alt="${p.name}" />
    <div class="detail-info">
      <span class="tag">${p.category}</span>
      <h1>${p.name}</h1>
      <p class="price-tag">₹${p.rentPricePerDay} / day ${p.securityDeposit ? `+ ₹${p.securityDeposit} deposit` : ""}</p>
      <p>${p.description}</p>
      <p style="margin-top:10px; font-size:0.85rem; color:var(--color-ink-soft);">
        Available sizes: ${p.size.join(", ")}
      </p>

      <div class="booking-box">
        <h3 style="font-family:var(--font-display);">Book this dress</h3>

        <div class="advance-notice">📅 Bookings must be made at least 10 days in advance</div>

        <label for="start-date">Pickup date</label>
        <input type="date" id="start-date" min="${minBookingDateISO()}" />

        <label for="end-date">Return date</label>
        <input type="date" id="end-date" min="${minBookingDateISO()}" />
        <label for="delivery-address">Delivery address</label>
        <input type="text" id="delivery-address" placeholder="Full address for pickup/delivery" />

        <div id="availability-msg" class="availability-msg"></div>

        <div id="price-summary" style="margin-top:14px; font-family:var(--font-mono); display:none;"></div>

        <button id="book-btn" class="btn btn-primary" style="width:100%; margin-top:16px;" disabled>
          Check dates first
        </button>
      </div>
    </div>
  `;

  document.getElementById("start-date").addEventListener("change", handleDateChange);
  document.getElementById("end-date").addEventListener("change", handleDateChange);
  document.getElementById("book-btn").addEventListener("click", handleBooking);
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function minBookingDateISO() {
  const d = new Date();
  d.setDate(d.getDate() + 10);
  return d.toISOString().split("T")[0];
}

async function handleDateChange() {
  const startDate = document.getElementById("start-date").value;
  const endDate = document.getElementById("end-date").value;
  const msgEl = document.getElementById("availability-msg");
  const bookBtn = document.getElementById("book-btn");
  const priceSummary = document.getElementById("price-summary");

  msgEl.className = "availability-msg";
  priceSummary.style.display = "none";
  bookBtn.disabled = true;
  bookBtn.textContent = "Check dates first";

  if (!startDate || !endDate) return;

  if (new Date(startDate) >= new Date(endDate)) {
    msgEl.textContent = "⚠️ Return date must be after pickup date";
    msgEl.className = "availability-msg unavailable";
    return;
  }

  try {
    const result = await apiRequest("/bookings/check-availability", "POST", {
      productId,
      startDate,
      endDate,
    });

    if (result.isAvailable) {
      msgEl.textContent = "✅ Available for these dates!";
      msgEl.className = "availability-msg available";
      bookBtn.disabled = false;
      bookBtn.textContent = "Confirm Booking";

      const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
      const FLAT_DAYS_LIMIT = 5;
      const EXTRA_DAY_CHARGE = 100;
      let rentAmount;
      let priceNote;
      if (days <= FLAT_DAYS_LIMIT) {
        rentAmount = currentProduct.rentPricePerDay;
        priceNote = `${days} day(s) flat`;
      } else {
        const extraDays = days - FLAT_DAYS_LIMIT;
        rentAmount = currentProduct.rentPricePerDay + extraDays * EXTRA_DAY_CHARGE;
        priceNote = `${FLAT_DAYS_LIMIT} days flat + ${extraDays} extra day(s) × ₹${EXTRA_DAY_CHARGE}`;
      }
      const total = rentAmount + currentProduct.securityDeposit;
      priceSummary.style.display = "block";
      priceSummary.innerHTML = `${priceNote} + ₹${currentProduct.securityDeposit} deposit = <strong>₹${total}</strong>`;
    } else {
      msgEl.textContent = `❌ Not available — already booked (${result.unitsBookedInRange}/${result.totalUnits} units taken) for these dates. Try different dates.`;
      msgEl.className = "availability-msg unavailable";
    }
  } catch (err) {
    msgEl.textContent = `Error: ${err.message}`;
    msgEl.className = "availability-msg unavailable";
  }
}

async function handleBooking() {
  const user = getCurrentUser();
  if (!user) {
    alert("Please login first to book a dress!");
    window.location.href = "login.html";
    return;
  }

  const startDate = document.getElementById("start-date").value;
  const endDate = document.getElementById("end-date").value;
  const deliveryAddress = document.getElementById("delivery-address").value.trim();
  const bookBtn = document.getElementById("book-btn");
  if (!deliveryAddress) {
    alert("Please enter a delivery address.");
    return;
  }
  bookBtn.disabled = true;
  bookBtn.textContent = "Preparing payment...";

  try {
    const orderData = await apiRequest(
      "/payments/create-order",
      "POST",
      { productId, startDate, endDate, deliveryAddress },
      true
    );

    const options = {
      key: orderData.keyId,
      amount: orderData.amount * 100,
      currency: orderData.currency,
      name: "Rento",
      description: `Booking: ${currentProduct.name}`,
      order_id: orderData.orderId,
      handler: async function (response) {
        bookBtn.textContent = "Verifying payment...";
        try {
          await apiRequest(
            "/payments/verify",
            "POST",
            {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              productId,
              startDate,
              endDate,
              deliveryAddress,
            },
            true
          );
          alert("🎉 Payment successful! Booking confirmed. Check 'My Bookings' page.");
          window.location.href = "mybookings.html";
        } catch (err) {
          alert(`Payment succeeded but booking failed: ${err.message}. Contact support with your payment ID: ${response.razorpay_payment_id}`);
          bookBtn.disabled = false;
          bookBtn.textContent = "Confirm Booking";
        }
      },
      prefill: {
        name: user.name,
        email: user.email,
      },
      theme: {
        color: "#a24e5c",
      },
      modal: {
        ondismiss: function () {
          bookBtn.disabled = false;
          bookBtn.textContent = "Confirm Booking";
        },
      },
    };

    const rzp = new Razorpay(options);
    rzp.open();
  } catch (err) {
    alert(`Something went wrong: ${err.message}`);
    bookBtn.disabled = false;
    bookBtn.textContent = "Confirm Booking";
    handleDateChange();
  }
}

loadProduct();