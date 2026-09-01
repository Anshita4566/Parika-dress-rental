// Backend server ka base URL - agar deploy karo to isse apne live backend URL se replace karna
const API_BASE = "https://rento-backend-rc99.onrender.com/api";

// Helper function jo har API call ke liye reuse hoga
async function apiRequest(endpoint, method = "GET", body = null, needsAuth = false) {
  const headers = { "Content-Type": "application/json" };

  if (needsAuth) {
    const token = localStorage.getItem("token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await res.json();

  if (!res.ok) {
    // agar server ne error bheja, to usse throw karo taaki catch block me pakad sakein
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}

// Logged-in user ki info localStorage se nikalne ka helper
function getCurrentUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

// Navbar me login/logout state dikhane ke liye - har page pe call hoga
function renderNavAuthState() {
  const user = getCurrentUser();
  const authSlot = document.getElementById("nav-auth-slot");
  if (!authSlot) return;

  if (user) {
    authSlot.innerHTML = `
      <a href="contact.html">Contact</a>
      <a href="mybookings.html">My Bookings</a>
      ${user.role === "admin" ? '<a href="admin.html">Admin</a>' : ""}
      <span style="color:var(--color-ink-soft); font-size:0.85rem;">Hi, ${user.name.split(" ")[0]}</span>
      <a href="#" id="logout-btn" class="btn btn-outline" style="padding:8px 16px;">Logout</a>
    `;
    document.getElementById("logout-btn").addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  } else {
    authSlot.innerHTML = `
      <a href="contact.html">Contact</a>
      <a href="login.html">Login</a>
      <a href="signup.html" class="btn btn-primary" style="padding:8px 18px;">Sign up</a>
    `;
  }
}
document.addEventListener("DOMContentLoaded", renderNavAuthState);
