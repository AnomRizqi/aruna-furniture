# 🪑 Aruna Furniture | Premium Scandinavian & Modern Interior

[![Live Demo Firebase](https://img.shields.io/badge/🔥_Live_Demo-Firebase_Hosting-orange?style=for-the-badge)](https://furnitur-f2bc0.web.app)
[![Live Demo Vercel](https://img.shields.io/badge/▲_Live_Demo-Vercel-black?style=for-the-badge)](https://aruna-furniture-a6ba.vercel.app)
[![GitHub Repo](https://img.shields.io/badge/📦_Source-GitHub-181717?style=for-the-badge&logo=github)](https://github.com/AnomRizqi/aruna-furniture)

**Aruna Furniture** adalah aplikasi *Single Page Application* (SPA) showroom furnitur premium bergaya **Scandinavian Minimalist**. Dibangun menggunakan teknologi Vanilla web (HTML5, CSS3, JS ES6+) dengan **Firebase Authentication** dan **Cloud Firestore** untuk pengelolaan katalog serta interaksi pelanggan secara real-time.

---

## 🌐 Demo & Testing Langsung

Aplikasi sudah di-deploy dan tersedia di dua platform:

| Platform | URL | Status |
|----------|-----|--------|
| 🔥 Firebase Hosting | https://furnitur-f2bc0.web.app | ✅ Login Google berfungsi penuh |
| ▲ Vercel | https://aruna-furniture-a6ba.vercel.app | ✅ Aktif |

### 🔑 Akun Testing

#### 👤 Login sebagai Pelanggan (Google)
1. Buka salah satu URL di atas
2. Klik tombol **Login** di pojok kanan atas navbar
3. Pilih tab **Pelanggan**
4. Klik **Masuk dengan Google** → pilih akun Google Anda
5. Setelah login, Anda dapat **menulis & mengirim ulasan produk**

#### 🛡️ Login sebagai Admin
1. Klik tombol **Login** di pojok kanan atas navbar
2. Pilih tab **Pengelola (Admin)**
3. Masukkan kredensial berikut:
   - **Email**: `admin@furniture.com`
   - **Password**: `admin12345`
4. Klik **Masuk Ke Dashboard**
5. Anda akan diarahkan ke **Dashboard Admin** dengan akses penuh:
   - ✏️ Kelola Produk (tambah, ubah, hapus)
   - 🏷️ Kelola Kategori
   - 🖼️ Kelola Portfolio
   - ⭐ Moderasi Ulasan
   - ❓ Kelola FAQ
   - 📬 Lihat Pesan Kontak

---

## 🛠️ Teknologi yang Digunakan

| Kategori | Teknologi |
|----------|-----------|
| **Frontend** | HTML5, Vanilla CSS3, JavaScript ES6+ |
| **Database** | Firebase Cloud Firestore (NoSQL) |
| **Autentikasi** | Firebase Authentication (Google OAuth + Email/Password) |
| **Hosting** | Firebase Hosting & Vercel |
| **UI Library** | Swiper.js (slider), AOS (animasi scroll), Lucide Icons |
| **Font** | Google Fonts (Poppins + Inter) |

---

## 🚀 Cara Menjalankan Proyek Secara Lokal

Karena proyek ini menggunakan **ES Modules** (`type="module"`), browser melarang pemuatan modul secara langsung dari protokol file lokal (`file:///`). Anda **harus** menjalankannya menggunakan web server lokal.

### Langkah 1: Kloning Repositori
```bash
git clone https://github.com/AnomRizqi/aruna-furniture.git
cd aruna-furniture
```

### Langkah 2: Jalankan Web Server Lokal
```bash
# Jalankan server langsung via npx (tanpa install)
npx http-server -p 8080
```
Setelah server berjalan, buka browser dan akses:
👉 **http://localhost:8080**

> **Catatan**: `firebase-config.json` sudah disertakan di repositori karena Firebase client key bersifat **publik** secara desain. Keamanan data sepenuhnya dijaga oleh **Firestore Security Rules** (`firestore.rules`).

---

## 📂 Struktur Folder Proyek

```text
aruna-furniture/
├── .agents/
│   └── AGENTS.md               # Aturan & panduan workspace
├── assets/
│   ├── css/
│   │   ├── admin.css           # Styling Dashboard Admin
│   │   └── style.css           # Styling Landing Page Utama
│   ├── images/                 # Aset Gambar Statis Lokal
│   │   ├── banners/            # Gambar banner hero & workshop
│   │   ├── logo/               # Logo Aruna
│   │   ├── portfolio/          # Foto proyek portfolio
│   │   ├── products/           # Gambar katalog produk
│   │   └── testimonials/       # Foto testimonial pelanggan
│   └── js/
│       ├── app.js              # Logika utama SPA & CRUD Firebase
│       └── firebase-config.js  # Inisialisasi & konfigurasi Firebase SDK
├── .gitignore                  # Pengabaian berkas lokal (cache, dll)
├── firebase-config.json        # Kredensial Firebase (key publik)
├── firebase.json               # Konfigurasi Firebase Hosting
├── .firebaserc                 # Binding ke proyek Firebase
├── firestore.rules             # Aturan keamanan database Firestore
├── vercel.json                 # Konfigurasi Vercel deployment
├── index.html                  # Berkas SPA tunggal (client + admin view)
└── README.md                   # Dokumentasi proyek ini
```

---

## 📊 Skema Database Firestore (ERD NoSQL)

```mermaid
erDiagram
    users {
        string uid PK
        string name
        string email
        string photoURL
        string role "admin | user"
        timestamp createdAt
    }

    categories {
        string slug PK "Document ID"
        string name
    }

    products {
        string id PK
        string name
        number price
        string category FK "Ref: categories.slug"
        string material
        string description
        string image "Path lokal / Base64 cache"
        timestamp createdAt
    }

    portfolio {
        string id PK
        string title
        string category
        string image "Path lokal / Base64 cache"
        timestamp createdAt
    }

    reviews {
        string id PK
        string name
        number rating "1 - 5"
        string comment
        string photoURL "Google Avatar"
        timestamp createdAt
    }

    faq {
        string id PK
        string question
        string answer
        number order
    }

    contacts {
        string id PK
        string name
        string email
        string phone
        string message
        timestamp createdAt
    }

    categories ||--o{ products : "Memiliki"
    users ||--o{ reviews : "Menulis (Google Account)"
```

### 🔐 Hak Akses (firestore.rules)

| Role | Hak Akses |
|------|-----------|
| **Admin** (`role: 'admin'`) | Read & Write penuh ke semua koleksi |
| **Pelanggan** (`role: 'user'`) | Read: produk, kategori, portfolio, reviews, faq. Create: contacts & reviews |
| **Tamu (tidak login)** | Read: produk, kategori, portfolio, reviews, faq. Create: contacts |

---

## ☁️ Deploy ke Firebase Hosting

Jika Anda ingin men-deploy ke akun Firebase Anda sendiri:

```bash
# Login ke Firebase
npx -y firebase-tools login

# Deploy hosting
npx -y firebase-tools deploy --only hosting
```

Aplikasi akan tersedia di: `https://[project-id].web.app`

---

## 📝 Catatan Penting

- **Login Google** hanya berfungsi pada protokol **HTTPS** (bukan `file:///` atau `http://`)
- Untuk **Vercel**: pastikan domain Vercel Anda terdaftar di Firebase Console → Authentication → Authorized Domains
- Gambar produk & portfolio disimpan **secara lokal** di folder `assets/images/`. Saat menambah produk baru dari admin, gambar di-cache sementara di `localStorage` browser
