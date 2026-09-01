const contactForm = document.getElementById("contact-form");

if (contactForm) {
  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgEl = document.getElementById("form-msg");
    msgEl.textContent = "";
    msgEl.className = "form-msg";

    const name = document.getElementById("contact-name").value.trim();
    const email = document.getElementById("contact-email").value.trim();
    const phone = document.getElementById("contact-phone").value.trim();
    const message = document.getElementById("contact-message").value.trim();

    try {
      const result = await apiRequest("/contact", "POST", { name, email, phone, message });
      msgEl.textContent = result.message;
      msgEl.className = "form-msg success";
      contactForm.reset();
    } catch (err) {
      msgEl.textContent = err.message;
      msgEl.className = "form-msg error";
    }
  });
}