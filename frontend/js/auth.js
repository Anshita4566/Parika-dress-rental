// ============ SIGNUP FORM ============
const signupForm = document.getElementById("signup-form");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgEl = document.getElementById("form-msg");
    msgEl.textContent = "";
    msgEl.className = "form-msg";

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const phone = document.getElementById("phone").value.trim();
    const address = document.getElementById("address").value.trim();

    try {
      const data = await apiRequest("/auth/signup", "POST", { name, email, password, phone, address });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data));
      msgEl.textContent = "Account created! Redirecting...";
      msgEl.className = "form-msg success";
      setTimeout(() => (window.location.href = "index.html"), 800);
    } catch (err) {
      msgEl.textContent = err.message;
      msgEl.className = "form-msg error";
    }
  });
}

// ============ LOGIN FORM ============
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgEl = document.getElementById("form-msg");
    msgEl.textContent = "";
    msgEl.className = "form-msg";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      const data = await apiRequest("/auth/login", "POST", { email, password });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data));
      msgEl.textContent = "Login successful! Redirecting...";
      msgEl.className = "form-msg success";
      setTimeout(() => (window.location.href = "index.html"), 800);
    } catch (err) {
      msgEl.textContent = err.message;
      msgEl.className = "form-msg error";
    }
  });
}
