# Rules for Aruna Furniture Project

This workspace is a premium, Scandinavian-inspired Single Page Application (SPA) for **Aruna Furniture**. Any agent or developer modifying this project MUST follow these guidelines.

## Technology Stack Constraints
- **Core**: Plain HTML5, Vanilla CSS3, and modern JavaScript (ES6+).
- **Frameworks**: DO NOT use React, Next.js, Vue, Angular, Laravel, or any other compilation-heavy frameworks. Keep the application lightweight and served via CDN imports.
- **Firebase**: Use Firebase Modular SDK (v10+) imported directly via standard browser ES Modules from `https://www.gstatic.com/firebasejs/...` (no bundler).
- **External UI Libraries**: AOS (Animate on Scroll) for scroll animation effects, Swiper.js for testimonial sliders, and Lucide Icons for vector symbols.

## Styling & Theme Guide
- **Concept**: Scandinavian Minimalist, Premium Furniture Showroom, Elegant, Luxury.
- **Color Palette**:
  - Background: `#F8F6F3` (Soft warm beige)
  - Primary Accent: `#A67C52` (Teak wood gold)
  - Secondary Accent: `#6F4E37` (Dark coffee brown)
  - Dark: `#1F1F1F` (Charcoal grey)
  - White: `#FFFFFF`
- **Typography**:
  - Headings: `Poppins` (Bold, 600, 700)
  - Body Text: `Inter` (Regular, Medium, 400, 500)
- **Visuals**: Large spacing (whitespace), smooth hover transitions (`transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1)`), subtle shadows, rounded borders (`border-radius: 12px` to `20px`), and a transparent-to-white responsive navbar on scroll.

## Media Asset Policy
- **NO Firebase Storage**: Images must be stored locally under `/assets/images/...` inside respective subfolders:
  - `/assets/images/logo/`
  - `/assets/images/banners/`
  - `/assets/images/products/`
  - `/assets/images/portfolio/`
  - `/assets/images/testimonials/`
- **Firestore Schema**: Firestore documents only store text paths (e.g. `'assets/images/products/dining-table.jpg'`) as attributes, which are fed into `<img>` tags dynamically. Do not implement any storage upload UI.

## Database Collection Schema & Authorization Rules
- **Firestore Collections**: `users`, `products`, `categories`, `portfolio`, `reviews`, `faq`, `contacts`.
- **User Roles**: Registered users have `role: 'user'` in their `users` document. Administrators have `role: 'admin'`.
- **Permissions**:
  - Admins have full read/write access to all collections.
  - Public/Unauthenticated users can read `products`, `categories`, `portfolio`, `reviews`, `faq` and create records in `contacts` (contact form) and `reviews` (if authenticated via Google).
  - Regular users cannot access `admin.html` dashboard panels.
