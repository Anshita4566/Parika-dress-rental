const tableBody = document.getElementById("bookings-body");

async function loadMyBookings() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  try {
    const bookings = await apiRequest("/bookings/my", "GET", null, true);

    if (bookings.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6">No bookings yet. Go rent a dress! 👗</td></tr>`;
      return;
    }

    tableBody.innerHTML = bookings
      .map(
        (b) => `
      <tr>
        <td>${b.product?.name || "Deleted product"}</td>
        <td>${formatDate(b.startDate)}</td>
        <td>${formatDate(b.endDate)}</td>
        <td>₹${b.totalPrice}</td>
        <td><span class="status-badge status-${b.status}">${b.status}</span></td>
        <td>
          ${
            b.status === "confirmed"
              ? `<button class="btn btn-outline" style="padding:6px 12px; font-size:0.8rem;" onclick="cancelBooking('${b._id}')">Cancel</button>`
              : "—"
          }
        </td>
      </tr>
    `
      )
      .join("");
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="6">Error: ${err.message}</td></tr>`;
  }
}

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

async function cancelBooking(id) {
  if (!confirm("Are you sure you want to cancel this booking?")) return;
  try {
    await apiRequest(`/bookings/${id}/cancel`, "PUT", null, true);
    loadMyBookings();
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

loadMyBookings();
