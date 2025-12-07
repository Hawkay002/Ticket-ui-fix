# 🎫 Event Ticketing System (Midnight Edition)

> A high-end, real-time event management dashboard featuring a glassmorphism UI, secure cloud synchronization and intelligent QR entry validation.

## Table of Contents
1. [📖 Overview](#-overview)
2. [✨ Key Features](#-key-features)
3. [🛠️ Setup](#-setup)
4. [🚀 How to Use](#-how-to-use)
5. [📂 Project Structure](#-project-structure)
6. [🛡️ Security](#-security)
7. [📄 License](#-license)

---

## 📖 Overview

This is a serverless, single-file web application designed for exclusive events. It replaces clunky spreadsheets with a sleek, dark-themed dashboard that runs in any browser.

**Why this stands out:**
* **✨ Premium Aesthetics:** "Midnight Void" dark theme with glassmorphism panels and the modern 'Outfit' typeface.
* **⚡ Real-Time Sync:** Data updates instantly across the check-in desk and security scanners using Firebase Firestore.
* **🔒 Admin-Only Security:** Public registration is disabled. Only specific authorized emails can access the dashboard.

---

## ✨ Key Features

### 🎟️ Smart Ticket Issuance
* **Ticket Generation:** Creates a professional, holographic-style digital pass.
* **One-Click WhatsApp Workflow:**
    * Generates the ticket image.
    * Auto-downloads the file to the device.
    * Redirects to the Guest's WhatsApp number with a pre-filled message.
    * Auto-Resets the form for rapid-fire entry of the next guest.

### 📸 Advanced Entry Scanner
* **Browser-Native:** Uses the device camera directly (no app download needed).
* **Audio Feedback Engine:**
    * **Success:** Plays a cheerful beep when a valid guest arrives.
    * **Error:** Plays a buzzer for duplicates or invalid codes.
* **Status Tracking:** Prevents double-entry by marking used tickets as "Arrived" instantly across all devices.

### 📱 Responsive & Robust
* **Cross-Device:** Works perfectly on Laptops (Desk Agents) and Mobile Phones (Security/Bouncers).

---

## 🛠️ Setup

### Prerequisites
* A Google/Firebase Account.
* A GitHub Account (for hosting).

### Step 1: Clone the Repository
```bash
git clone https://github.com/Hawkay002/Ticket-backend.git
cd Ticket-backend
```

### Step 2: Firebase Configuration
1.  Go to **Firebase Console**.
2.  Create a project and register a Web App (`</>`).
3.  **Database:** Create a Firestore Database in "Test Mode".
4.  **Auth:** Enable Email/Password authentication.
5.  **Users:** Manually add your admin email/password in the Firebase Console (Users tab).
    * *Note: The app code has public registration disabled for security.*

### Step 3: Link the Code
Open `index.html` and find the configuration section. Replace it with your keys:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  // ... other keys
};
```

### Step 4: Add Custom Sounds (Optional)
To enable premium audio feedback, add these two files to your root folder (next to `index.html`):
* `success.mp3` – Plays on valid entry.
* `error.mp3` – Plays on invalid/duplicate entry.

*(If these files are missing, the system will automatically fall back to generated electronic beeps).*

---

## 🚀 How to Use

### 1. The Dashboard (Desk Agent)
* Log in securely using your Admin credentials.
* Navigate to **"Issue Ticket"**.
* Enter guest details (Name, Age, Phone).
* Click **"Generate Pass"**.
* Click **"Save & Share via WhatsApp"** to send the ticket immediately.

### 2. The Scanner (Security Team)
* Log in on a mobile device.
* Go to the **"Scanner"** tab.
* Tap **"Activate Camera"**.
* Point at a guest's QR code.
    * 🟢 **Green Flash + Sound:** Valid. Guest marked as "Arrived".
    * 🔴 **Red Flash + Buzzer:** "Already Scanned" or "Fake Ticket".

### 3. Management
* Go to **"Guest List"** to see real-time attendance stats.
* Use **"Configuration"** to change the Event Name or Location instantly for all tickets.

---

## 📂 Project Structure

```text
Ticket-backend/
├── index.html          # Core app
├── style.css           # UI
├── script.js           # Logic
├── success.mp3         # Optional sound played on a valid scan
├── error.mp3           # Optional sound played on an invalid scan
├── LICENSE             # Apache License 2.0
├── manifest.json       # App metadata for install support
├── service-worker.js   # Handles caching and offline behavior
├── icon-512.png        # App icon (512×512)
├── icon-192.png        # App icon (192×192)
└── README.md           # Project overview and setup details
```

---

## 🛡️ Security
* **Authentication:** Locked to manually created accounts only. No "Sign Up" button for the public.
* **Data Isolation:** Data is stored under specific user collections in Firestore.

---

## 📄 License
Distributed under the [Apache License 2.0](/LICENSE).
