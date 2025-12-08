# 🎫 Event Ticketing System (Midnight Void Edition)

> A high-end, real-time event management dashboard featuring a
> glassmorphism UI, secure cloud synchronization, intelligent QR entry
> validation, and flexible data export tools.

## 📋 Table of Contents

-   [📖 Overview](#-overview)
-   [✨ Key Features](#-key-features)
    -   [🎟️ Smart Ticket Issuance](#️-smart-ticket-issuance)
    -   [📸 Advanced Entry Scanner](#-advanced-entry-scanner)
    -   [📊 Guest List Management](#-guest-list-management)
    -   [📂 Universal Data Export](#-universal-data-export)
    -   [🛡️ Security & Access Control](#️-security--access-control)
    -   [📱 Responsive & Robust](#-responsive--robust)
-   [🛠️ Installation & Setup](#️-installation--setup)
    -   [Prerequisites](#prerequisites)
    -   [Step 1: Clone the Repository](#step-1-clone-the-repository)
    -   [Step 2: Firebase Configuration](#step-2-firebase-configuration)
    -   [Step 3: Link the Code](#step-3-link-the-code)
    -   [Step 4: Add Custom Sounds
        Optional](#step-4-add-custom-sounds-optional)
-   [🚀 How to Use](#-how-to-use)
    -   [The Dashboard (Desk Agent)](#the-dashboard-desk-agent)
    -   [The Scanner (Security Team)](#the-scanner-security-team)
    -   [Management & Export](#management--export)
-   [📂 Project Structure](#-project-structure)
-   [🛡️ Security Architecture](#️-security-architecture)
-   [📄 License](#-license)

## 📖 Overview

This project is a serverless, single-file event ticketing system
designed for private or high-end events. It replaces spreadsheets and
fragile manual workflows with a smooth, dark-themed dashboard that runs
on any modern browser.

**Why this stands out:** 
- ✨ **Premium Look**: Uses a "Midnight Void"
theme featuring animated stars, frosted-glass panels, and the 'Outfit'
font.
- ⚡ **Instant Updates**: Every ticket action syncs live across
devices via Firebase Firestore.
- 🔒 **Secure Access Only**: No public
signup; only pre-approved admin emails can access the system.

## ✨ Key Features

### 🎟️ Smart Ticket Issuance

-   Creates a holographic-style digital pass with guest details and a QR
    code.
-   Smooth WhatsApp workflow:
    -   Converts the pass into a PNG using html2canvas.
    -   Downloads automatically.
    -   Opens WhatsApp with a ready-to-send message.
    -   Resets the form for the next guest.

### 📸 Advanced Entry Scanner

-   Uses the device camera directly in the browser.
-   Validates QR codes in real time with Firestore.
-   Audio alerts:
    -   🟢 Beep for a valid scan.
    -   🔴 Buzzer for duplicate/invalid scans.
-   Marks guests as "Arrived" instantly to avoid repeat entries.

### 📊 Guest List Management

-   Live-updating table that syncs across all logged-in devices.
-   Filters by status (Arrived, Coming Soon, Absent) or gender.
-   Sorts by name, age, date added, and more.
-   Bulk delete or export tools.
-   Optionally auto-marks guests as Absent after a deadline.

### 📂 Universal Data Export

Export the guest list in any of these formats:

-   `.xlsx`
-   `.pdf`
-   `.csv`
-   `.json`
-   `.doc`
-   `.txt`

### 🛡️ Security & Access Control

-   **Master Lock** for hiding sensitive tabs like Guest List and
    Config.
-   Cloud-synced master password for all devices.
-   Device-level persistence so locked tabs stay locked even after
    refresh.

### 📱 Responsive & Robust

-   Looks good on laptops and phones.
-   Slide-out tray with quick call and WhatsApp actions.
-   Connection watchdog with offline indicator.
-   Toast notifications for important actions.

## 🛠️ Installation & Setup

### Prerequisites

-   Firebase account
-   GitHub account (optional for hosting)

### Step 1: Clone the Repository

```bash
git clone https://github.com/Hawkay002/Ticket-backend.git
cd Ticket-backend
```

### Step 2: Firebase Configuration

1.  Go to **Firebase Console**.
2.  Create a new project.
3.  Add a **Web App**.
4.  Enable **Firestore Database** in Test Mode.
5.  Enable **Email/Password Authentication**.
6.  Manually add admin user(s) under the **Users** tab.

### Step 3: Link the Code

Replace the Firebase config in `script.js` or inside `index.html`:

```js
const firebaseConfig = {
apiKey: "YOUR_API_KEY",
authDomain: "YOUR_PROJECT.firebaseapp.com",
projectId: "YOUR_PROJECT_ID",
//Rest of config
};
```

### Step 4: Add Custom Sounds Optional

Place these audio files in the project root: - `success.mp3` -
`error.mp3`

## 🚀 How to Use

### The Dashboard (Desk Agent)

-   Log in with your admin credentials.
-   Open **Issue Ticket**.
-   Fill the guest details.
-   Generate the pass and share it instantly via WhatsApp.

### The Scanner (Security Team)

-   In **Configuration**, set a master password and lock sensitive tabs.
-   Hand the device to the security staff.
-   Open **Scanner**, start the camera, and scan incoming guests.

### Management & Export

-   View real-time attendance from the **Guest List** page.
-   Filter, sort, or bulk-select guests.
-   Export to any supported file format.

## 📂 Project Structure

```
Ticket-backend/
├── index.html
├── style.css
├── script.js
├── success.mp3
├── error.mp3
├── manifest.json
├── service-worker.js
└── README.md
```

## 🛡️ Security Architecture

-   **Admin-Only Access**
-   **Data Isolation**
-   **Tab Locking**

## 📄 License

Distributed under the [**Apache License 2.0**](https://github.com/Hawkay002/Ticket-backend/blob/main/LICENSE).
