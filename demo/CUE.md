# Local demo cue

These accounts exist only in the local database `punjabi-rishtey-demo` on `127.0.0.1`. Signup, photos, and the payment screenshot stay on this machine. They are not written to the live database, Cloudinary, or email.

Shared password for every seeded login: `DemoLocal-2026`

Re-running the seed deletes that local database, including a practice signup.

## Start

MongoDB must be listening on `127.0.0.1:27017`. This kit includes a local server binary that is not part of the app:

```bash
cd backend
mkdir -p .demo-runtime/db
.demo-runtime/mongodb-macos-aarch64-7.0.14/bin/mongod \
  --dbpath .demo-runtime/db \
  --bind_ip 127.0.0.1 \
  --port 27017
```

In another terminal:

```bash
cd backend
npm run seed:demo
npm run dev:demo
```

The demo API refuses to start unless `MONGO_URI` points at `127.0.0.1` or `localhost` and the database name is `punjabi-rishtey-demo`. It also refuses to start if Cloudinary, email, or OpenAI credentials are loaded.

Run the unpublished member site against that API. Do not use `npm run dev` alone: that build calls the live API.

```bash
cd user-frontend
git worktree add ../.worktrees/frontend-demo-record wip/member-site-redesign
cd ../.worktrees/frontend-demo-record
VITE_BACKEND_BASE_URL=http://127.0.0.1:8080 npm run dev
```

Before recording, confirm the page is calling `http://127.0.0.1:8080`.

## 1. How to register

Leave the seeded accounts logged out. On `/signup`, enter:

- Name: Simran Kaur
- Mobile: `9000000001`
- Secondary contact: leave blank
- Gender: Female
- Date of birth: 12 Apr 1998
- Religion: Sikh
- Caste: Khatri
- Marital status: Never Married
- Email: `simran.signup@demo.punjabi-rishtey.test`
- Password: `DemoLocal-2026`
- Photo: `backend/demo/assets/portraits/signup-simran.jpg`

Accept the declaration. In the profile studio, fill Family, Education, Profession, and About. Short lines you can type:

- Family: mother Paramjit Kaur, homemaker. Father Harjit Singh, retired teacher. Nuclear family. One sister.
- Education: Graduate, Computer Science, a college in Chandigarh.
- Profession: Private job, designer, 6 Lakhs, Chandigarh.
- About: I live in Chandigarh with my family and want a serious rishta.
- Looking for: A kind partner whose family is as involved as mine.

## 2. Membership and payment

Log in as `harpreet.payer@demo.punjabi-rishtey.test`.

Open `/membership`. Gold is ₹2,000 for 1 year. Hallmark is ₹3,000 for 1.5 years. Choose **Unlock with Gold**.

The QR id on screen is `demo@local`. It does not pay the real Punjabi Rishtey account. Do not complete it in a real UPI app.

Upload `backend/demo/assets/payments/gold-receipt.png`.

- Full name: Harpreet Kaur
- Phone: `9000000002`
- UPI transaction id: `DEMO2000`

Submit payment details.

## 3. Browsing and connecting

Log in as `arjun.browser@demo.punjabi-rishtey.test`.

Open `/findpartner`. The list is six fictional profiles. Open **Meher Kaur**.

Her mobile `9000000011` is not a real number. The Call, WhatsApp, and email links on that page are the real Punjabi Rishtey support contacts. Do not click them while recording.

The other profiles on the list are Amanpreet Kaur, Jasleen Kaur, Navjot Kaur, Gurleen Kaur, and Harleen Kaur.
