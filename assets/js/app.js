import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
  onSnapshot,
  serverTimestamp
} from './firebase-config.js?v=13';

// Global variables
let productsData = [];
let categoriesData = [];
let swiperInstance = null;
let currentRating = 5; // For reviews star selection
let editMode = false; // For admin CRUD operations
let categoriesCache = []; // Caching categories for product creation
let activeListeners = []; // Active Firestore onSnapshot listeners for admin

// Image Caching and Resolution Helpers
const resolveImageSrc = (path) => {
  if (!path) return '';
  const cached = localStorage.getItem('img_cache_' + path);
  if (cached) return cached;
  return path;
};

const cacheImageLocally = (path, file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        localStorage.setItem('img_cache_' + path, reader.result);
        resolve(reader.result);
      } catch (err) {
        console.warn("LocalStorage full, clearing old image cache to free space...", err);
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith('img_cache_')) {
            localStorage.removeItem(key);
          }
        }
        try {
          localStorage.setItem('img_cache_' + path, reader.result);
          resolve(reader.result);
        } catch (retryErr) {
          console.error("Failed to cache image in localStorage: ", retryErr);
          resolve(null);
        }
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

// ==========================================
// 1. DUMMY DATA SEEDING (Auto-runs if DB empty)
// ==========================================
const checkAndSeedDatabase = async () => {
  try {
    const pSnap = await getDocs(query(collection(db, 'products'), limit(1)));
    if (!pSnap.empty) {
      console.log("Database already has records, skipping auto-seed.");
      return;
    }
    
    console.log("Database empty! Initializing premium default dummy data...");

    // 1. Seed Categories
    const categories = [
      { id: 'chairs', name: 'Kursi', slug: 'chairs' },
      { id: 'tables', name: 'Meja', slug: 'tables' },
      { id: 'storage', name: 'Lemari & Rak', slug: 'storage' },
      { id: 'sofas', name: 'Sofa & Lounge', slug: 'sofas' }
    ];
    for (const cat of categories) {
      await setDoc(doc(db, 'categories', cat.id), { name: cat.name, slug: cat.slug });
    }

    // 2. Seed Products
    const products = [
      {
        name: 'Aruna Oak Dining Table',
        price: 4500000,
        category: 'tables',
        material: 'Solid Oak Wood',
        description: 'Meja makan Scandinavian minimalis dari bahan kayu ek solid dengan kapasitas hingga 6 orang. Rangka kokoh dengan garis desain bersih khas Nordik.',
        image: 'assets/images/products/dining-table.jpg',
        createdAt: serverTimestamp()
      },
      {
        name: 'Kaj Lounge Chair',
        price: 2250000,
        category: 'sofas',
        material: 'Ash Wood & Cream Linen',
        description: 'Kursi santai premium dengan rangka kayu abu (ash wood) solid bermutu tinggi dan dudukan busa tebal berlapis kain linen krem yang lembut dan estetis.',
        image: 'assets/images/products/lounge-chair.jpg',
        createdAt: serverTimestamp()
      },
      {
        name: 'Sven Minimalist Chair',
        price: 1100000,
        category: 'chairs',
        material: 'Teak Wood & Rattan',
        description: 'Kursi bersandar yang memadukan kekuatan kayu jati solid dan anyaman rotan alami pada sandaran, sangat cocok untuk ruang makan hangat minimalis.',
        image: 'assets/images/products/lounge-chair.jpg',
        createdAt: serverTimestamp()
      },
      {
        name: 'Nils Teak Credenza',
        price: 6800000,
        category: 'storage',
        material: 'Teak Wood Grade A',
        description: 'Sideboard premium multifungsi berbahan kayu jati perhutani berkualitas tinggi. Dilengkapi 3 laci besar dengan engsel push-to-open modern.',
        image: 'assets/images/products/dining-table.jpg',
        createdAt: serverTimestamp()
      }
    ];
    for (const prod of products) {
      await addDoc(collection(db, 'products'), prod);
    }

    // 3. Seed Portfolio
    const portfolios = [
      { title: 'Scandinavian Dining Room Design', category: 'Dining Room', image: 'assets/images/portfolio/project-1.jpg', createdAt: serverTimestamp() },
      { title: 'Minimalist Living Room Concept', category: 'Living Room', image: 'assets/images/portfolio/project-2.jpg', createdAt: serverTimestamp() },
      { title: 'Teak Furniture Showroom Exhibition', category: 'Showroom', image: 'assets/images/portfolio/project-3.jpg', createdAt: serverTimestamp() }
    ];
    for (const port of portfolios) {
      await addDoc(collection(db, 'portfolio'), port);
    }

    // 4. Seed Reviews
    const reviews = [
      { name: 'Budi Santoso', rating: 5, comment: 'Kualitas kayu jati mejanya luar biasa kokoh, finishing sangat rapi dan halus sekali. Sangat direkomendasikan!', photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', createdAt: serverTimestamp() },
      { name: 'Rina Wijaya', rating: 5, comment: 'Lounge chair super nyaman dan kain linennya sangat premium. Pengiriman dikemas tebal dan aman sampai di Jakarta.', photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', createdAt: serverTimestamp() },
      { name: 'Andi Pratama', rating: 4, comment: 'Sideboardnya mewah sekali, kayunya berat menandakan kualitas kayu tua. Kustom ukuran juga pas sesuai keinginan.', photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100', createdAt: serverTimestamp() }
    ];
    for (const rev of reviews) {
      await addDoc(collection(db, 'reviews'), rev);
    }

    // 5. Seed FAQ
    const faqs = [
      { question: 'Apakah furniture Aruna terbuat dari kayu asli?', answer: 'Ya, kami hanya menggunakan 100% kayu solid premium seperti Kayu Jati, Kayu Oak, dan Kayu Ash bersertifikat legalitas kayu (SVLK) yang di-oven kering.', order: 1 },
      { question: 'Apakah bisa memesan custom design?', answer: 'Tentu! Kami melayani pemesanan custom ukuran, bentuk, material, dan finishing warna sesuai dengan desain interior rumah atau kantor Anda.', order: 2 },
      { question: 'Berapa lama proses pembuatan furniture?', answer: 'Proses produksi barang custom berkisar antara 2-4 minggu tergantung tingkat kesulitan dan volume pengerjaan di workshop kami.', order: 3 },
      { question: 'Bagaimana cara perawatan produk kayu agar tahan lama?', answer: 'Cukup bersihkan berkala dengan kemoceng atau kain microfiber lembab. Hindari sinar matahari terik langsung atau paparan kelembaban yang berlebih.', order: 4 },
      { question: 'Apakah produk bergaransi?', answer: 'Ya, kami menjamin kualitas dengan garansi kekuatan struktur selama 1 tahun sejak produk diterima pelanggan.', order: 5 }
    ];
    for (const f of faqs) {
      await addDoc(collection(db, 'faq'), f);
    }

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database: ", error);
  }
};

// ==========================================
// 2. CLIENT WEB PAGE LAYOUT INITIALIZER
// ==========================================
const initUI = () => {
  // Initialize AOS
  AOS.init({
    duration: 800,
    easing: 'ease-out-cubic',
    once: true
  });

  // Sticky Navbar scroll trigger
  const navbar = document.getElementById('navbar');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('navbar-scrolled');
    } else {
      navbar.classList.remove('navbar-scrolled');
    }

    // Active link highlighting
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      if (window.scrollY >= sectionTop - 150) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href').substring(1) === current) {
        link.classList.add('active');
      }
    });
  });

  // Mobile drawer menu
  const mobileToggle = document.getElementById('mobileToggle');
  const navMenu = document.getElementById('navMenu');

  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });
  }

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('active');
    });
  });

  // Fade out preloader
  const preloader = document.getElementById('preloader');
  setTimeout(() => {
    preloader.style.opacity = 0;
    preloader.style.visibility = 'hidden';
  }, 1000);
};

// ==========================================
// 3. UNIFIED AUTHENTICATION ROUTING SYSTEM
// ==========================================
const initAuth = () => {
  const loginBtn = document.getElementById('loginBtn');
  const loginPortalModal = document.getElementById('loginPortalModal');
  const closeLoginPortal = document.getElementById('closeLoginPortalModal');
  const tabButtons = document.querySelectorAll('.login-tab-btn');
  const tabPanes = document.querySelectorAll('.login-tab-pane');
  
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  const adminLoginForm = document.getElementById('adminLoginForm');

  // Resolve Google Redirect result on page load (required for Vercel/production environment)
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isFirebaseHost = window.location.hostname.endsWith('.firebaseapp.com') || window.location.hostname.endsWith('.web.app');
  if (!isLocalhost && !isFirebaseHost && sessionStorage.getItem('pendingGoogleRedirect') === 'true') {
    getRedirectResult(auth)
      .then((result) => {
        sessionStorage.removeItem('pendingGoogleRedirect');
        if (result && result.user) {
          console.log("Redirect login successful for: ", result.user.email);
          alert(`Selamat Datang, ${result.user.displayName || result.user.email}!`);
        }
      })
      .catch((err) => {
        sessionStorage.removeItem('pendingGoogleRedirect');
        console.error("Redirect Auth Error: ", err);
        alert("Gagal masuk dengan Google: " + err.message);
      });
  }

  // Open login portal modal
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      loginPortalModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  }

  // Close login portal modal
  const closeModal = () => {
    loginPortalModal.classList.remove('active');
    document.body.style.overflow = '';
  };
  
  if (closeLoginPortal) {
    closeLoginPortal.addEventListener('click', closeModal);
    loginPortalModal.addEventListener('click', (e) => {
      if (e.target === loginPortalModal) closeModal();
    });
  }

  // Login Modal tab switcher (User vs Admin tabs)
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-target');
      document.getElementById(targetId).classList.add('active');
    });
  });

  // Action 1: Google Login (User) - Hybrid Popup (localhost/Firebase) & Redirect (production/Vercel)
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isFirebaseHost = window.location.hostname.endsWith('.firebaseapp.com') || window.location.hostname.endsWith('.web.app');
      try {
        if (isLocalhost || isFirebaseHost) {
          const result = await signInWithPopup(auth, googleProvider);
          const user = result.user;
          alert(`Selamat Datang, ${user.displayName || user.email}!`);
          closeModal();
        } else {
          // Use redirect on production HTTPS (Vercel) to bypass Chrome's third-party cookie popup block
          sessionStorage.setItem('pendingGoogleRedirect', 'true');
          await signInWithRedirect(auth, googleProvider);
        }
      } catch (err) {
        console.error("Google Login Error: ", err);
        alert("Gagal masuk dengan Google. Silakan coba kembali.");
      }
    });
  }

  // Action 2: Email & Password Login (Admin)
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      const loginSubmitBtn = document.getElementById('loginSubmitBtn');

      loginSubmitBtn.disabled = true;
      loginSubmitBtn.textContent = 'Memverifikasi...';

      try {
        await signInWithEmailAndPassword(auth, email, password);
        closeModal();
      } catch (err) {
        console.error("Admin Login Error: ", err);
        let errorMsg = "Email atau Kata Sandi salah.";
        if (err.code === 'auth/user-not-found') errorMsg = "User admin tidak terdaftar.";
        if (err.code === 'auth/wrong-password') errorMsg = "Kata Sandi salah.";
        alert(errorMsg);
        loginSubmitBtn.disabled = false;
        loginSubmitBtn.textContent = 'Masuk Ke Dashboard';
      }
    });
  }



  // Auth State Listener
  onAuthStateChanged(auth, async (user) => {
    const navAuth = document.getElementById('navAuth');
    const addReviewBtn = document.getElementById('addReviewBtn');
    const loginToReviewTip = document.getElementById('loginToReviewTip');
    
    const clientView = document.getElementById('clientView');
    const adminView = document.getElementById('adminView');

    if (user) {
      // User is logged in. Now read role from Firestore users collection
      try {
        const userDocRef = doc(db, 'users', user.uid);
        let userDoc = await getDoc(userDocRef);

        // Auto-create user document in Firestore if it doesn't exist yet
        if (!userDoc.exists()) {
          const isAdmin = user.email === 'admin@furniture.com';
          await setDoc(userDocRef, {
            uid: user.uid,
            name: user.displayName || (isAdmin ? 'Administrator' : 'User'),
            email: user.email,
            photoURL: user.photoURL || '',
            role: isAdmin ? 'admin' : 'user',
            createdAt: serverTimestamp()
          });
          userDoc = await getDoc(userDocRef);
        }

        const userData = userDoc.exists() ? userDoc.data() : { role: 'user' };

        if (userData.role === 'admin') {
          // 1. If role is Admin, switch views to Admin Panel SPA layout
          clientView.style.display = 'none';
          adminView.style.display = 'block';

          // Update Admin profile header cards
          document.getElementById('adminUserName').textContent = user.displayName || user.email;
          document.getElementById('adminAvatarLetter').textContent = (user.displayName || user.email).charAt(0).toUpperCase();

          // Load Admin CRUD database listeners
          initAdminDashboardListeners();

        } else {
          // 2. If role is User, remain on Landing page client view
          clientView.style.display = 'block';
          adminView.style.display = 'none';

          // Render profile dropdown in client navbar
          navAuth.innerHTML = `
            <div class="user-profile-menu" id="profileDropdown">
              <img src="${user.photoURL || 'https://via.placeholder.com/38'}" alt="${user.displayName}" class="user-avatar">
              <div class="user-dropdown">
                <div class="dropdown-user-info">
                  <div class="dropdown-user-name">${user.displayName}</div>
                  <div class="dropdown-user-email">${user.email}</div>
                </div>
                <a href="#" class="dropdown-item logout-btn" id="clientLogoutBtn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                  Logout
                </a>
              </div>
            </div>
          `;

          // Bind client logout action
          document.getElementById('clientLogoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            handleUserLogout();
          });

          // Enable review comments panel
          if (addReviewBtn) addReviewBtn.style.display = 'inline-flex';
          if (loginToReviewTip) loginToReviewTip.style.display = 'none';
        }
      } catch (err) {
        console.error("Gagal memeriksa role user: ", err);
      }
    } else {
      // User is logged out. Return to client view
      clientView.style.display = 'block';
      adminView.style.display = 'none';

      // Reset navbar Auth panel to default login button
      navAuth.innerHTML = `
        <button class="btn-login" id="loginBtn">
          <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
          Login
        </button>
      `;

      // Re-bind login portal trigger
      document.getElementById('loginBtn').addEventListener('click', () => {
        loginPortalModal.classList.add('active');
        document.body.style.overflow = 'hidden';
      });

      // Clear review submission components
      if (addReviewBtn) addReviewBtn.style.display = 'none';
      if (loginToReviewTip) loginToReviewTip.style.display = 'block';

      // Clear any active admin listeners to free memory
      activeListeners.forEach(unsub => unsub());
      activeListeners = [];
    }
  });

  // Logout triggers
  const handleUserLogout = async () => {
    if (confirm("Apakah Anda yakin ingin keluar?")) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error("Logout Gagal: ", err);
      }
    }
  };

  // Bind Admin view sidebar logout button
  const adminLogoutBtn = document.getElementById('adminLogoutBtn');
  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (confirm("Keluar dari dashboard admin?")) {
        try {
          await signOut(auth);
        } catch (err) {
          console.error("Logout Gagal: ", err);
        }
      }
    });
  }

  // Bind admin view back to client button
  const backToClientBtn = document.getElementById('backToClientBtn');
  if (backToClientBtn) {
    backToClientBtn.addEventListener('click', () => {
      document.getElementById('adminView').style.display = 'none';
      document.getElementById('clientView').style.display = 'block';
    });
  }

  // Trigger login portal from reviews login tip
  if (loginToReviewTip) {
    loginToReviewTip.addEventListener('click', (e) => {
      if (e.target.classList.contains('auth-trigger')) {
        e.preventDefault();
        loginPortalModal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    });
  }
};

// ==========================================
// 4. CLIENT FIRESTORE DATA LOADERS
// ==========================================

const formatCurrency = (number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(number);
};

// Categories loader
const loadCategories = async () => {
  const filterContainer = document.getElementById('categoryFilters');
  if (!filterContainer) return;

  try {
    const querySnapshot = await getDocs(collection(db, 'categories'));
    categoriesData = [];
    
    // Clear all except 'Semua' (first pill)
    while (filterContainer.children.length > 1) {
      filterContainer.removeChild(filterContainer.lastChild);
    }

    querySnapshot.forEach((doc) => {
      const cat = { id: doc.id, ...doc.data() };
      categoriesData.push(cat);
      
      const button = document.createElement('button');
      button.className = 'category-pill';
      button.dataset.category = cat.id;
      button.textContent = cat.name;
      filterContainer.appendChild(button);
    });

    initCategoryFilterEvents();
  } catch (error) {
    console.error("Error loading categories: ", error);
  }
};

// Products loader
const loadProducts = async () => {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  try {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    productsData = [];
    
    querySnapshot.forEach((doc) => {
      productsData.push({ id: doc.id, ...doc.data() });
    });

    renderProducts(productsData);
  } catch (error) {
    console.error("Error loading products: ", error);
    renderProductsOfflineFallback();
  }
};

const renderProducts = (products) => {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="no-data-message">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <p>Tidak ada produk furniture yang cocok dengan pencarian Anda.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = '';
  products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.setAttribute('data-aos', 'fade-up');
    
    const catName = categoriesData.find(c => c.id === p.category)?.name || 'Furniture';

    card.innerHTML = `
      <div class="product-image-box">
        <img src="${resolveImageSrc(p.image) || 'https://via.placeholder.com/300x280?text=Premium+Furniture'}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/300x280?text=Premium+Furniture'">
        <span class="product-badge">${p.material.split(' ')[0]}</span>
      </div>
      <div class="product-info">
        <div class="product-meta">
          <span>${catName}</span>
          <span>${p.material}</span>
        </div>
        <h3 class="product-name">${p.name}</h3>
        <p class="product-price">${formatCurrency(p.price)}</p>
        <div class="product-actions">
          <button class="btn btn-outline-dark btn-detail" data-id="${p.id}">Detail Produk</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  const detailButtons = grid.querySelectorAll('.btn-detail');
  detailButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const productId = e.target.getAttribute('data-id');
      showProductDetails(productId);
    });
  });
};

const renderProductsOfflineFallback = () => {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  const mockProducts = [
    { id: '1', name: 'Aruna Oak Dining Table', price: 4500000, material: 'Solid Oak Wood', category: 'tables', image: 'assets/images/products/dining-table.jpg', description: 'Scandinavian dining table.' },
    { id: '2', name: 'Kaj Lounge Chair', price: 2250000, material: 'Ash Wood & Linen', category: 'sofas', image: 'assets/images/products/lounge-chair.jpg', description: 'Premium cozy armchair.' }
  ];
  productsData = mockProducts;
  renderProducts(mockProducts);
};

// Portfolio Loader
const loadPortfolio = async () => {
  const grid = document.getElementById('portfolioGrid');
  if (!grid) return;

  try {
    const q = query(collection(db, 'portfolio'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    grid.innerHTML = '';
    let index = 0;
    querySnapshot.forEach((doc) => {
      const p = doc.data();
      const item = document.createElement('div');
      const isWide = index % 3 === 0;
      item.className = `portfolio-item ${isWide ? 'wide' : ''}`;
      item.setAttribute('data-aos', 'fade-up');
      item.innerHTML = `
        <img src="${resolveImageSrc(p.image)}" alt="${p.title}" onerror="this.src='https://via.placeholder.com/600x400?text=Interior+Showcase'">
        <div class="portfolio-overlay">
          <span class="portfolio-cat">${p.category}</span>
          <h3 class="portfolio-title">${p.title}</h3>
        </div>
      `;
      grid.appendChild(item);
      index++;
    });
  } catch (error) {
    console.error("Error loading portfolio: ", error);
  }
};

// Customer Reviews Loader (Testimonial Swiper)
const loadReviews = async () => {
  const wrapper = document.getElementById('reviewsWrapper');
  if (!wrapper) return;

  try {
    const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    wrapper.innerHTML = '';
    querySnapshot.forEach((doc) => {
      const r = doc.data();
      const slide = document.createElement('div');
      slide.className = 'swiper-slide';
      
      let starsHtml = '';
      for (let i = 1; i <= 5; i++) {
        starsHtml += `
          <svg class="star-icon" fill="${i <= r.rating ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        `;
      }

      slide.innerHTML = `
        <div class="review-card">
          <div class="review-stars">${starsHtml}</div>
          <p class="review-text">"${r.comment}"</p>
          <div class="review-user">
            <img src="${r.photoURL || 'https://via.placeholder.com/48'}" alt="${r.name}" class="review-user-avatar">
            <div>
              <h4 class="review-user-name">${r.name}</h4>
              <span class="review-user-role">Customer Terverifikasi</span>
            </div>
          </div>
        </div>
      `;
      wrapper.appendChild(slide);
    });

    if (swiperInstance) swiperInstance.destroy();
    swiperInstance = new Swiper('.swiper', {
      slidesPerView: 1,
      spaceBetween: 30,
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
      },
      breakpoints: {
        768: { slidesPerView: 2 },
        1024: { slidesPerView: 3 }
      },
      autoplay: { delay: 5000, disableOnInteraction: false }
    });

  } catch (error) {
    console.error("Error loading reviews: ", error);
  }
};

// FAQ Accordion Loader
const loadFAQ = async () => {
  const container = document.getElementById('faqContainer');
  if (!container) return;

  try {
    const q = query(collection(db, 'faq'), orderBy('order', 'asc'));
    const querySnapshot = await getDocs(q);
    
    container.innerHTML = '';
    querySnapshot.forEach((doc) => {
      const f = doc.data();
      const item = document.createElement('div');
      item.className = 'faq-item';
      item.innerHTML = `
        <div class="faq-header">
          <h3 class="faq-question">${f.question}</h3>
          <svg class="faq-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </div>
        <div class="faq-body">
          <div class="faq-content">${f.answer}</div>
        </div>
      `;
      container.appendChild(item);
    });

    initFAQAccordionEvents();
  } catch (error) {
    console.error("Error loading FAQs: ", error);
  }
};

// ==========================================
// 5. INTERACTION & FILTERING EVENTS
// ==========================================
const initSearch = () => {
  const searchInput = document.getElementById('productSearch');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const activePill = document.querySelector('.category-pill.active');
    const category = activePill ? activePill.dataset.category : 'all';

    const filtered = productsData.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(query) || p.material.toLowerCase().includes(query);
      const matchesCategory = category === 'all' || p.category === category;
      return matchesSearch && matchesCategory;
    });

    renderProducts(filtered);
  });
};

const initCategoryFilterEvents = () => {
  const pills = document.querySelectorAll('.category-pill');
  const searchInput = document.getElementById('productSearch');

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const category = pill.dataset.category;
      const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';

      const filtered = productsData.filter(p => {
        const matchesCategory = category === 'all' || p.category === category;
        const matchesSearch = p.name.toLowerCase().includes(searchQuery) || p.material.toLowerCase().includes(searchQuery);
        return matchesCategory && matchesSearch;
      });

      renderProducts(filtered);
    });
  });
};

const initFAQAccordionEvents = () => {
  const faqHeaders = document.querySelectorAll('.faq-header');

  faqHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      const body = header.nextElementSibling;
      const isActive = item.classList.contains('active');

      document.querySelectorAll('.faq-item').forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.classList.remove('active');
          otherItem.querySelector('.faq-body').style.maxHeight = null;
        }
      });

      if (isActive) {
        item.classList.remove('active');
        body.style.maxHeight = null;
      } else {
        item.classList.add('active');
        body.style.maxHeight = body.scrollHeight + "px";
      }
    });
  });
};

const initContactForm = () => {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('contactSubmitBtn');
    btn.disabled = true;
    btn.innerHTML = 'Mengirim Pesan...';

    const name = document.getElementById('contactName').value;
    const email = document.getElementById('contactEmail').value;
    const phone = document.getElementById('contactPhone').value;
    const message = document.getElementById('contactMessage').value;

    try {
      await addDoc(collection(db, 'contacts'), {
        name, email, phone, message,
        createdAt: serverTimestamp()
      });
      alert("Terima kasih! Pesan Anda terkirim. Admin akan segera menghubungi Anda.");
      form.reset();
    } catch (err) {
      console.error(err);
      alert("Gagal mengirim pesan.");
    } finally {
      btn.disabled = false;
      btn.innerHTML = `Kirim Pesan <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`;
    }
  });
};

// ==========================================
// 6. CLIENT VIEW DETAIL MODALS
// ==========================================
const showProductDetails = (productId) => {
  const modal = document.getElementById('productDetailModal');
  const content = document.getElementById('productModalContent');
  if (!modal || !content) return;

  const p = productsData.find(prod => prod.id === productId);
  if (!p) return;

  const catName = categoriesData.find(c => c.id === p.category)?.name || 'Furniture';
  const whatsappLink = `https://wa.me/6281234567890?text=Halo%20Aruna%20Furniture,%20saya%20tertarik%20dengan%20produk%20*${encodeURIComponent(p.name)}*%20(${formatCurrency(p.price)}).%20Bisa%20tolong%20jelaskan%20cara%20pemesanannya?`;

  content.innerHTML = `
    <div class="product-modal-image">
      <img src="${resolveImageSrc(p.image)}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/400x400?text=Premium+Furniture'">
    </div>
    <div class="product-modal-details">
      <span class="product-modal-cat">${catName}</span>
      <h3 class="product-modal-name">${p.name}</h3>
      <p class="product-modal-price">${formatCurrency(p.price)}</p>
      
      <div class="product-modal-info-row">
        <div>
          <div class="product-info-item-label">Material</div>
          <div class="product-info-item-val">${p.material}</div>
        </div>
        <div>
          <div class="product-info-item-label">Garansi</div>
          <div class="product-info-item-val">1 Tahun Struktur</div>
        </div>
      </div>
      
      <p class="product-modal-description">${p.description}</p>
      
      <a href="${whatsappLink}" target="_blank" class="btn btn-dark">
        Pesan Via WhatsApp
      </a>
    </div>
  `;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
};

const initModals = () => {
  const detailModal = document.getElementById('productDetailModal');
  const closeDetail = document.getElementById('closeDetailModal');
  
  if (closeDetail && detailModal) {
    const closeModal = () => {
      detailModal.classList.remove('active');
      document.body.style.overflow = '';
    };
    closeDetail.addEventListener('click', closeModal);
    detailModal.addEventListener('click', (e) => {
      if (e.target === detailModal) closeModal();
    });
  }

  // Client Review submission modal
  const reviewModal = document.getElementById('reviewModal');
  const addReviewBtn = document.getElementById('addReviewBtn');
  const closeReview = document.getElementById('closeReviewModal');

  if (addReviewBtn && reviewModal && closeReview) {
    const openRevModal = () => {
      reviewModal.classList.add('active');
      document.body.style.overflow = 'hidden';
      resetReviewForm();
    };

    const closeRevModal = () => {
      reviewModal.classList.remove('active');
      document.body.style.overflow = '';
    };

    addReviewBtn.addEventListener('click', openRevModal);
    closeReview.addEventListener('click', closeRevModal);
    reviewModal.addEventListener('click', (e) => {
      if (e.target === reviewModal) closeRevModal();
    });

    const stars = document.querySelectorAll('#starSelector .star-icon');
    stars.forEach((star, index) => {
      star.addEventListener('mouseover', () => {
        stars.forEach((s, idx) => {
          if (idx <= index) s.classList.add('hovered');
          else s.classList.remove('hovered');
        });
      });
      star.addEventListener('mouseleave', () => {
        stars.forEach(s => s.classList.remove('hovered'));
      });
      star.addEventListener('click', () => {
        currentRating = index + 1;
        stars.forEach((s, idx) => {
          if (idx <= index) s.classList.add('selected');
          else s.classList.remove('selected');
        });
      });
    });

    const reviewForm = document.getElementById('reviewForm');
    reviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = auth.currentUser;
      if (!user) return;

      const comment = document.getElementById('reviewComment').value;
      const submitBtn = document.getElementById('submitReviewBtn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Mengirim Ulasan...';

      try {
        await addDoc(collection(db, 'reviews'), {
          name: user.displayName,
          photoURL: user.photoURL,
          rating: currentRating,
          comment: comment,
          createdAt: serverTimestamp()
        });
        alert("Terima kasih atas ulasan Anda!");
        closeRevModal();
        loadReviews();
      } catch (err) {
        console.error(err);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Kirim Ulasan';
      }
    });
  }
};

const resetReviewForm = () => {
  const form = document.getElementById('reviewForm');
  if (form) form.reset();
  currentRating = 5;
  const stars = document.querySelectorAll('#starSelector .star-icon');
  stars.forEach(s => s.classList.add('selected'));
};

// ==========================================
// 7. ADMIN DASHBOARD SPA CONTROLLERS
// ==========================================
const initAdminSidebarNavigation = () => {
  const links = document.querySelectorAll('.sidebar-link[data-tab]');
  const panels = document.querySelectorAll('.dashboard-panel');
  const headerTitle = document.getElementById('headerTitle');
  const headerDesc = document.getElementById('headerDesc');

  const tabDetails = {
    dashboard: { title: 'Dashboard Utama', desc: 'Selamat datang kembali di panel administrasi Aruna Furniture.' },
    products: { title: 'Manajemen Katalog Produk', desc: 'Kelola daftar item produk showroom, material, harga, dan gambar katalog.' },
    categories: { title: 'Manajemen Kategori', desc: 'Atur kategori pembagian furniture untuk menu pencarian di website.' },
    portfolio: { title: 'Galeri Portofolio Interior', desc: 'Tambah atau ubah koleksi dokumentasi pengerjaan interior pelanggan.' },
    testimonials: { title: 'Manajemen Testimonial', desc: 'Tinjau ulasan pembeli atau tambahkan ulasan secara manual.' },
    faq: { title: 'Pusat Tanya Jawab (FAQ)', desc: 'Edit pertanyaan umum beserta penjelasan lengkap untuk pelanggan Anda.' },
    contacts: { title: 'Formulir Kontak Masuk', desc: 'Periksa seluruh pesan saran dan pesanan custom dari halaman Hubungi Kami.' }
  };

  links.forEach(link => {
    link.addEventListener('click', () => {
      const tab = link.getAttribute('data-tab');
      
      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      panels.forEach(p => p.classList.remove('active'));
      document.getElementById(`panel-${tab}`).classList.add('active');

      if (tabDetails[tab]) {
        headerTitle.textContent = tabDetails[tab].title;
        headerDesc.textContent = tabDetails[tab].desc;
      }
    });
  });
};

// Admin CRUD listeners & counters
const initAdminDashboardListeners = () => {
  activeListeners.forEach(unsubscribe => unsubscribe());
  activeListeners = [];

  const collections = ['products', 'categories', 'portfolio', 'reviews', 'faq', 'contacts'];
  
  // Update dashboard counters
  collections.forEach(colName => {
    const unsub = onSnapshot(collection(db, colName), (snapshot) => {
      const counterEl = document.getElementById(`count-${colName === 'reviews' ? 'testimonials' : colName}`);
      if (counterEl) counterEl.textContent = snapshot.size;
    });
    activeListeners.push(unsub);
  });

  // 1. Categories CRUD Snapshot Listener
  const unsubCategories = onSnapshot(query(collection(db, 'categories'), orderBy('name', 'asc')), (snapshot) => {
    const tableBody = document.getElementById('categoriesTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    categoriesCache = [];
    
    const prodCategoryDropdown = document.getElementById('prodCategory');
    prodCategoryDropdown.innerHTML = '<option value="">-- Pilih Kategori --</option>';

    snapshot.forEach(docSnap => {
      const cat = { id: docSnap.id, ...docSnap.data() };
      categoriesCache.push(cat);

      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${cat.slug}</strong></td>
        <td>${cat.name}</td>
        <td class="table-actions">
          <button class="btn btn-secondary btn-sm edit-cat-btn" data-id="${cat.id}"><i data-lucide="edit"></i> Edit</button>
          <button class="btn btn-danger btn-sm delete-cat-btn" data-id="${cat.id}"><i data-lucide="trash"></i> Hapus</button>
        </td>
      `;
      tableBody.appendChild(row);

      const option = document.createElement('option');
      option.value = cat.slug;
      option.textContent = cat.name;
      prodCategoryDropdown.appendChild(option);
    });

    attachCategoryActionHandlers();
    lucide.createIcons();
  });
  activeListeners.push(unsubCategories);

  // 2. Products CRUD Snapshot Listener
  const unsubProducts = onSnapshot(query(collection(db, 'products'), orderBy('createdAt', 'desc')), (snapshot) => {
    const tableBody = document.getElementById('productsTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    snapshot.forEach(docSnap => {
      const prod = { id: docSnap.id, ...docSnap.data() };
      const catName = categoriesCache.find(c => c.slug === prod.category)?.name || prod.category;
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><img src="${resolveImageSrc(prod.image)}" alt="${prod.name}" class="table-img" onerror="this.src='https://via.placeholder.com/44x44'"></td>
        <td><strong>${prod.name}</strong></td>
        <td><span class="badge-category">${catName}</span></td>
        <td>${prod.material}</td>
        <td>${formatCurrency(prod.price)}</td>
        <td class="table-actions">
          <button class="btn btn-secondary btn-sm edit-prod-btn" data-id="${prod.id}"><i data-lucide="edit"></i> Edit</button>
          <button class="btn btn-danger btn-sm delete-prod-btn" data-id="${prod.id}"><i data-lucide="trash"></i> Hapus</button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    attachProductActionHandlers();
    lucide.createIcons();
  });
  activeListeners.push(unsubProducts);

  // 3. Portfolio CRUD Snapshot Listener
  const unsubPortfolio = onSnapshot(query(collection(db, 'portfolio'), orderBy('createdAt', 'desc')), (snapshot) => {
    const tableBody = document.getElementById('portfolioTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    snapshot.forEach(docSnap => {
      const port = { id: docSnap.id, ...docSnap.data() };
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><img src="${resolveImageSrc(port.image)}" alt="${port.title}" class="table-img" onerror="this.src='https://via.placeholder.com/44x44'"></td>
        <td><strong>${port.title}</strong></td>
        <td><span class="badge-category">${port.category}</span></td>
        <td class="table-actions">
          <button class="btn btn-secondary btn-sm edit-port-btn" data-id="${port.id}"><i data-lucide="edit"></i> Edit</button>
          <button class="btn btn-danger btn-sm delete-port-btn" data-id="${port.id}"><i data-lucide="trash"></i> Hapus</button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    attachPortfolioActionHandlers();
    lucide.createIcons();
  });
  activeListeners.push(unsubPortfolio);

  // 4. Testimonials CRUD Snapshot Listener
  const unsubReviews = onSnapshot(query(collection(db, 'reviews'), orderBy('createdAt', 'desc')), (snapshot) => {
    const tableBody = document.getElementById('testimonialsTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    snapshot.forEach(docSnap => {
      const rev = { id: docSnap.id, ...docSnap.data() };
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><img src="${rev.photoURL || 'https://via.placeholder.com/44'}" alt="${rev.name}" class="table-img" style="border-radius:50%"></td>
        <td><strong>${rev.name}</strong></td>
        <td><span class="badge-rating"><i data-lucide="star"></i> ${rev.rating}.0</span></td>
        <td><div class="message-text">"${rev.comment}"</div></td>
        <td class="table-actions">
          <button class="btn btn-secondary btn-sm edit-test-btn" data-id="${rev.id}"><i data-lucide="edit"></i> Edit</button>
          <button class="btn btn-danger btn-sm delete-test-btn" data-id="${rev.id}"><i data-lucide="trash"></i> Hapus</button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    attachTestimonialActionHandlers();
    lucide.createIcons();
  });
  activeListeners.push(unsubReviews);

  // 5. FAQ CRUD Snapshot Listener
  const unsubFaq = onSnapshot(query(collection(db, 'faq'), orderBy('order', 'asc')), (snapshot) => {
    const tableBody = document.getElementById('faqTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    snapshot.forEach(docSnap => {
      const f = { id: docSnap.id, ...docSnap.data() };
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>#${f.order}</strong></td>
        <td><strong>${f.question}</strong></td>
        <td><div class="message-text">${f.answer}</div></td>
        <td class="table-actions">
          <button class="btn btn-secondary btn-sm edit-faq-btn" data-id="${f.id}"><i data-lucide="edit"></i> Edit</button>
          <button class="btn btn-danger btn-sm delete-faq-btn" data-id="${f.id}"><i data-lucide="trash"></i> Hapus</button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    attachFaqActionHandlers();
    lucide.createIcons();
  });
  activeListeners.push(unsubFaq);

  // 6. Contacts Snapshot Listener
  const unsubContacts = onSnapshot(query(collection(db, 'contacts'), orderBy('createdAt', 'desc')), (snapshot) => {
    const tableBody = document.getElementById('contactsTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    snapshot.forEach(docSnap => {
      const msg = { id: docSnap.id, ...docSnap.data() };
      const dateStr = msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleString('id-ID') : 'Sesaat lalu';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <div style="font-weight:600;">${msg.name}</div>
          <div style="font-size:0.8rem; color:var(--text-muted);">${msg.email}</div>
        </td>
        <td><a href="https://wa.me/${msg.phone.replace(/^0/, '62')}" target="_blank" style="color:var(--primary); font-weight:600;">${msg.phone}</a></td>
        <td><div class="message-text">${msg.message}</div></td>
        <td><span class="message-meta">${dateStr}</span></td>
        <td><button class="btn btn-danger btn-sm delete-msg-btn" data-id="${msg.id}"><i data-lucide="trash-2"></i> Hapus</button></td>
      `;
      tableBody.appendChild(row);
    });

    attachContactActionHandlers();
    lucide.createIcons();
  });
  activeListeners.push(unsubContacts);
};

// ==========================================
// 8. ADMIN CRUD FORM HANDLERS
// ==========================================

// Products CRUD
const initProductCrud = () => {
  const form = document.getElementById('productCrudForm');
  const addBtn = document.getElementById('addProductBtn');

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      editMode = false;
      document.getElementById('productModalTitle').textContent = 'Tambah Produk Baru';
      document.getElementById('crudProductId').value = '';
      document.getElementById('crudProductImage').value = '';
      form.reset();
      openAdminModal('productFormModal');
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('crudProductId').value;
      const name = document.getElementById('prodName').value;
      const price = Number(document.getElementById('prodPrice').value);
      const category = document.getElementById('prodCategory').value;
      const material = document.getElementById('prodMaterial').value;
      const description = document.getElementById('prodDesc').value;

      const imageFileInput = document.getElementById('prodImageFile');
      let imagePath = document.getElementById('crudProductImage').value;

      if (imageFileInput.files && imageFileInput.files[0]) {
        const file = imageFileInput.files[0];
        const filename = file.name;
        imagePath = `assets/images/products/${filename}`;
        await cacheImageLocally(imagePath, file);
      }

      if (!imagePath) {
        alert("Silakan pilih gambar produk terlebih dahulu.");
        return;
      }

      const data = { name, price, category, material, image: imagePath, description };

      try {
        if (editMode && id) {
          await updateDoc(doc(db, 'products', id), data);
          alert("Produk berhasil diperbarui!");
        } else {
          await addDoc(collection(db, 'products'), { ...data, createdAt: serverTimestamp() });
          alert("Produk baru berhasil ditambahkan!");
        }
        closeAdminModal('productFormModal');
      } catch (err) {
        console.error(err);
      }
    });
  }
};

const attachProductActionHandlers = () => {
  document.querySelectorAll('.edit-prod-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const docSnap = await getDoc(doc(db, 'products', id));
      if (docSnap.exists()) {
        const prod = docSnap.data();
        editMode = true;
        document.getElementById('productModalTitle').textContent = 'Ubah Detail Produk';
        document.getElementById('crudProductId').value = id;
        document.getElementById('crudProductImage').value = prod.image;
        document.getElementById('prodName').value = prod.name;
        document.getElementById('prodPrice').value = prod.price;
        document.getElementById('prodCategory').value = prod.category;
        document.getElementById('prodMaterial').value = prod.material;
        document.getElementById('prodImageFile').value = '';
        document.getElementById('prodDesc').value = prod.description;
        openAdminModal('productFormModal');
      }
    });
  });

  document.querySelectorAll('.delete-prod-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm("Hapus produk ini?")) {
        await deleteDoc(doc(db, 'products', id));
      }
    });
  });
};

// Categories CRUD
const initCategoryCrud = () => {
  const form = document.getElementById('categoryCrudForm');
  const addBtn = document.getElementById('addCategoryBtn');

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      editMode = false;
      document.getElementById('categoryModalTitle').textContent = 'Tambah Kategori Baru';
      document.getElementById('crudCategoryId').value = '';
      form.reset();
      document.getElementById('catSlug').disabled = false;
      openAdminModal('categoryFormModal');
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('crudCategoryId').value;
      const name = document.getElementById('catName').value;
      const slug = document.getElementById('catSlug').value.toLowerCase().replace(/\s+/g, '-').trim();

      try {
        if (editMode && id) {
          await updateDoc(doc(db, 'categories', id), { name });
          alert("Kategori berhasil diperbarui!");
        } else {
          await setDoc(doc(db, 'categories', slug), { name, slug });
          alert("Kategori baru berhasil ditambahkan!");
        }
        closeAdminModal('categoryFormModal');
      } catch (err) {
        console.error(err);
      }
    });
  }
};

const attachCategoryActionHandlers = () => {
  document.querySelectorAll('.edit-cat-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const docSnap = await getDoc(doc(db, 'categories', id));
      if (docSnap.exists()) {
        const cat = docSnap.data();
        editMode = true;
        document.getElementById('categoryModalTitle').textContent = 'Ubah Kategori';
        document.getElementById('crudCategoryId').value = id;
        document.getElementById('catName').value = cat.name;
        document.getElementById('catSlug').value = cat.slug;
        document.getElementById('catSlug').disabled = true;
        openAdminModal('categoryFormModal');
      }
    });
  });

  document.querySelectorAll('.delete-cat-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm("Hapus kategori ini?")) {
        await deleteDoc(doc(db, 'categories', id));
      }
    });
  });
};

// Portfolio CRUD
const initPortfolioCrud = () => {
  const form = document.getElementById('portfolioCrudForm');
  const addBtn = document.getElementById('addPortfolioBtn');

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      editMode = false;
      document.getElementById('portfolioModalTitle').textContent = 'Tambah Portofolio Baru';
      document.getElementById('crudPortfolioId').value = '';
      document.getElementById('crudPortfolioImage').value = '';
      form.reset();
      openAdminModal('portfolioFormModal');
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('crudPortfolioId').value;
      const title = document.getElementById('portTitle').value;
      const category = document.getElementById('portCategory').value;

      const imageFileInput = document.getElementById('portImageFile');
      let imagePath = document.getElementById('crudPortfolioImage').value;

      if (imageFileInput.files && imageFileInput.files[0]) {
        const file = imageFileInput.files[0];
        const filename = file.name;
        imagePath = `assets/images/portfolio/${filename}`;
        await cacheImageLocally(imagePath, file);
      }

      if (!imagePath) {
        alert("Silakan pilih gambar portofolio terlebih dahulu.");
        return;
      }

      const data = { title, category, image: imagePath };

      try {
        if (editMode && id) {
          await updateDoc(doc(db, 'portfolio', id), data);
        } else {
          await addDoc(collection(db, 'portfolio'), { ...data, createdAt: serverTimestamp() });
        }
        closeAdminModal('portfolioFormModal');
      } catch (err) {
        console.error(err);
      }
    });
  }
};

const attachPortfolioActionHandlers = () => {
  document.querySelectorAll('.edit-port-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const docSnap = await getDoc(doc(db, 'portfolio', id));
      if (docSnap.exists()) {
        const port = docSnap.data();
        editMode = true;
        document.getElementById('portfolioModalTitle').textContent = 'Ubah Portofolio';
        document.getElementById('crudPortfolioId').value = id;
        document.getElementById('crudPortfolioImage').value = port.image;
        document.getElementById('portTitle').value = port.title;
        document.getElementById('portCategory').value = port.category;
        document.getElementById('portImageFile').value = '';
        openAdminModal('portfolioFormModal');
      }
    });
  });

  document.querySelectorAll('.delete-port-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm("Hapus portofolio ini?")) {
        await deleteDoc(doc(db, 'portfolio', id));
      }
    });
  });
};

// Testimonials CRUD
const initTestimonialCrud = () => {
  const form = document.getElementById('testimonialCrudForm');
  const addBtn = document.getElementById('addTestimonialBtn');

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      editMode = false;
      document.getElementById('testimonialModalTitle').textContent = 'Tambah Testimonial Baru';
      document.getElementById('crudTestimonialId').value = '';
      form.reset();
      openAdminModal('testimonialFormModal');
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('crudTestimonialId').value;
      const name = document.getElementById('testName').value;
      const rating = Number(document.getElementById('testRating').value);
      const photoURL = document.getElementById('testAvatar').value;
      const comment = document.getElementById('testComment').value;

      const data = { name, rating, photoURL, comment };

      try {
        if (editMode && id) {
          await updateDoc(doc(db, 'reviews', id), data);
        } else {
          await addDoc(collection(db, 'reviews'), { ...data, createdAt: serverTimestamp() });
        }
        closeAdminModal('testimonialFormModal');
      } catch (err) {
        console.error(err);
      }
    });
  }
};

const attachTestimonialActionHandlers = () => {
  document.querySelectorAll('.edit-test-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const docSnap = await getDoc(doc(db, 'reviews', id));
      if (docSnap.exists()) {
        const rev = docSnap.data();
        editMode = true;
        document.getElementById('testimonialModalTitle').textContent = 'Ubah Testimonial';
        document.getElementById('crudTestimonialId').value = id;
        document.getElementById('testName').value = rev.name;
        document.getElementById('testRating').value = rev.rating;
        document.getElementById('testAvatar').value = rev.photoURL || 'https://via.placeholder.com/100';
        document.getElementById('testComment').value = rev.comment;
        openAdminModal('testimonialFormModal');
      }
    });
  });

  document.querySelectorAll('.delete-test-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm("Hapus ulasan ini?")) {
        await deleteDoc(doc(db, 'reviews', id));
      }
    });
  });
};

// FAQ CRUD
const initFaqCrud = () => {
  const form = document.getElementById('faqCrudForm');
  const addBtn = document.getElementById('addFaqBtn');

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      editMode = false;
      document.getElementById('faqModalTitle').textContent = 'Tambah FAQ Baru';
      document.getElementById('crudFaqId').value = '';
      form.reset();
      openAdminModal('faqFormModal');
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('crudFaqId').value;
      const order = Number(document.getElementById('faqOrder').value);
      const question = document.getElementById('faqQuestion').value;
      const answer = document.getElementById('faqAnswer').value;

      const data = { order, question, answer };

      try {
        if (editMode && id) {
          await updateDoc(doc(db, 'faq', id), data);
        } else {
          await addDoc(collection(db, 'faq'), data);
        }
        closeAdminModal('faqFormModal');
      } catch (err) {
        console.error(err);
      }
    });
  }
};

const attachFaqActionHandlers = () => {
  document.querySelectorAll('.edit-faq-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const docSnap = await getDoc(doc(db, 'faq', id));
      if (docSnap.exists()) {
        const f = docSnap.data();
        editMode = true;
        document.getElementById('faqModalTitle').textContent = 'Ubah FAQ';
        document.getElementById('crudFaqId').value = id;
        document.getElementById('faqOrder').value = f.order;
        document.getElementById('faqQuestion').value = f.question;
        document.getElementById('faqAnswer').value = f.answer;
        openAdminModal('faqFormModal');
      }
    });
  });

  document.querySelectorAll('.delete-faq-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm("Hapus FAQ ini?")) {
        await deleteDoc(doc(db, 'faq', id));
      }
    });
  });
};

// Contacts Deletion
const attachContactActionHandlers = () => {
  document.querySelectorAll('.delete-msg-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm("Hapus pesan kontak ini?")) {
        await deleteDoc(doc(db, 'contacts', id));
      }
    });
  });
};

const openAdminModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
};

// ==========================================
// 9. INITIALIZER ENTRYPOINT
// ==========================================
const initApp = async () => {
  // 1. Init landing layout components
  initUI();
  
  // 2. Setup auth routing hooks
  initAuth();

  // 3. Auto-seed Firestore dummy data if empty
  await checkAndSeedDatabase();

  // 4. Load public collections
  await loadCategories();
  await loadProducts();
  await loadPortfolio();
  await loadReviews();
  await loadFAQ();

  // 5. Connect UI search, forms, and modals
  initSearch();
  initContactForm();
  initModals();

  // 6. Connect Admin SPA CRUD controllers
  initAdminSidebarNavigation();
  initProductCrud();
  initCategoryCrud();
  initPortfolioCrud();
  initTestimonialCrud();
  initFaqCrud();

  // Bind Lucide vector icons
  lucide.createIcons();
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
