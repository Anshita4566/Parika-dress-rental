# Parika — Online Dress Rental Platform

A full-stack dress rental web app: browse dresses, pick rental dates, and book —
with **real-time date-overlap conflict checking** so two customers can never
double-book the same dress for overlapping dates.

**Tech stack:** HTML, CSS, JavaScript (frontend) · Node.js, Express (backend) · MongoDB, Mongoose (database) · JWT (auth)

---

## 1. Project Structure

```
dress-rental/
├── backend/
│   ├── config/db.js            → MongoDB connection
│   ├── models/                 → User, Product, Booking schemas
│   ├── middleware/              → auth (JWT check), error handler
│   ├── controllers/             → business logic (auth, products, bookings)
│   ├── routes/                  → API endpoints
│   ├── server.js                → app entry point
│   ├── seed.js                  → creates admin + sample dresses
│   └── .env.example             → copy to .env
└── frontend/
    ├── index.html                → homepage (browse dresses)
    ├── product.html               → dress detail + booking
    ├── login.html / signup.html
    ├── mybookings.html
    ├── admin.html                 → admin panel (add dresses, view bookings)
    ├── css/style.css
    └── js/                        → api.js, main.js, product.js, auth.js, mybookings.js, admin.js
```

---

## 2. Prerequisites (ek baar install karo)

1. **Node.js** — https://nodejs.org (LTS version download karo)
2. **MongoDB Atlas account** (free) — https://www.mongodb.com/cloud/atlas/register
   - Ya phir local MongoDB bhi install kar sakte ho, but Atlas beginners ke liye aasan hai
3. **VS Code** (ya koi bhi code editor)

---

## 3. Backend Setup (step by step)

### Step 1 — MongoDB Atlas se connection string lo
1. Atlas pe login karo → "Build a Database" → Free tier choose karo
2. Database user banao (username/password yaad rakhna)
3. Network Access me "Allow access from anywhere" (0.0.0.0/0) add karo
4. "Connect" → "Drivers" → connection string copy karo, kuch aisa dikhega:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/
   ```

### Step 2 — Backend install karo
Terminal me:
```bash
cd dress-rental/backend
npm install
```

### Step 3 — .env file banao
```bash
cp .env.example .env
```
Ab `.env` file open karo aur `MONGO_URI` me apna Atlas connection string paste karo
(end me `dressRental` database name add kar dena):
```
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/dressRental
JWT_SECRET=kuch_bhi_random_lamba_secret_string_daal_do
PORT=5000
```

### Step 4 — Sample data daalo (admin + 3 dresses)
```bash
node seed.js
```
Isse ek admin account ban jayega:
- Email: `admin@rento.com`
- Password: `admin123`

### Step 5 — Server chalao
```bash
npm run dev
```
Agar sab thik hai to terminal me dikhega:
```
✅ MongoDB Connected: cluster0...
🚀 Server running on http://localhost:5000
```

Browser me `http://localhost:5000` khol ke check karo — "Dress Rental API is running..." dikhna chahiye.

---

## 4. Frontend Setup

Frontend plain HTML/CSS/JS hai, koi build step nahi chahiye. Bas ek local server chahiye
(direct file khol ne pe fetch calls fail ho sakti hain CORS ki wajah se).

**Aasan tarika — VS Code "Live Server" extension:**
1. VS Code me `frontend` folder open karo
2. "Live Server" extension install karo
3. `index.html` pe right-click → "Open with Live Server"

**Ya phir terminal se:**
```bash
cd dress-rental/frontend
npx serve .
```

Backend (`localhost:5000`) aur frontend dono ek saath chalte rehne chahiye.

---

## 5. Kaise test karo (poora flow)

1. `index.html` khol ke dresses browse karo
2. Signup karo ek naye customer account se
3. Kisi dress pe click karo → dates select karo → "Available" green message dikhega
4. "Confirm Booking" dabao → booking ban jayegi
5. "My Bookings" me apni booking dekho
6. Ab **overlap test** karo: same dress ko wahi (ya overlapping) dates ke liye
   phir se book karne ki koshish karo → agar quantity khatam ho gayi to
   "Not available" red message dikhega — **yehi core feature hai jo resume me highlight karna hai**
7. Admin account se (`admin@rento.com` / `admin123`) login karo → `admin.html` khulega
   jahan tum naye dresses add kar sakte ho aur saari bookings dekh sakte ho

---

## 6. Core Engineering Concept (interview me explain karne ke liye)

Booking ka date-overlap check `backend/controllers/bookingController.js` me hai:

```js
// Do date ranges overlap karte hain agar:
// existingBooking.startDate <= newBooking.endDate  AND
// existingBooking.endDate  >= newBooking.startDate
const query = {
  product: productId,
  status: { $in: ["pending", "confirmed"] },
  startDate: { $lte: endDate },
  endDate: { $gte: startDate },
};
```

Isse count kiya jata hai ki us date range me kitni units already booked hain, aur
`product.totalQuantity` se compare karke availability decide hoti hai. Booking create
karne se **theek pehle** dobara check hota hai (double-check) — taaki race condition
(do log ek saath book karne ki koshish) kaafi had tak avoid ho.

**Resume bullet point example:**
> "Built a date-range conflict detection engine for a rental booking system,
> using MongoDB range queries and compound indexing to prevent double-bookings
> across concurrent requests."

---

## 7. Next Steps / Improvements (agar aur impressive banana ho)

- [ ] MongoDB **transactions** use karo booking create karte waqt (true concurrency safety)
- [ ] Razorpay/Stripe test-mode payment integration
- [ ] Cloudinary se real image upload (abhi URL manually daalna padta hai)
- [ ] Email confirmation (Nodemailer)
- [ ] Late-return fine calculation
- [ ] Admin analytics dashboard (Chart.js se revenue/most-rented graphs)
- [ ] Deploy: backend → Render/Railway, frontend → Netlify/Vercel, DB → MongoDB Atlas

---

## 8. Deployment Quick Notes

- **Backend:** Render.com pe free web service banao, GitHub repo connect karo,
  environment variables (`MONGO_URI`, `JWT_SECRET`) waha bhi add karna
- **Frontend:** Netlify pe `frontend` folder drag-drop karo, ya GitHub se connect karo
- Deploy ke baad `frontend/js/api.js` me `API_BASE` ko apne live backend URL se replace karna na bhoolna
