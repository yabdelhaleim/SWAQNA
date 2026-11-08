#  منصة حواديت (Hawadeet Platform)

> السوق الإلكتروني المصري التفاعلي الأول لاكتشاف الطعام والمنتجات عبر الفيديوهات القصيرة (Reels).
> يجمع بين **المطاعم**، و**المحلات التجارية**، و**المطابخ المنزلية (الأكل البيتي)** في تجربة موحدة.

---

## 🏗️ الهيكل العام للمشروع (Monorepo Architecture)

```
hawadeet/
├── apps/
│   ├── backend/              # سيرفر الـ Core API (NestJS + TypeScript + PostGIS)
│   ├── merchant-dashboard/   # لوحة تحكم التاجر (Next.js / React)
│   ├── admin-dashboard/      # لوحة تحكم إدارة المنصة (Next.js / RBAC)
│   ├── customer-app/         # تطبيق العميل (Flutter / Mobile)
│   └── delivery-app/         # تطبيق المندوب (Flutter / Mobile)
│
├── packages/
│   ├── database/             # كود تهيئة قاعدة البيانات والـ Migrations (PostgreSQL)
│   └── common/               # الأنواع المشتركة (Enums, Types, Constants) بين الواجهات والسيرفر
│
├── docker/
│   └── docker-compose.yml    # حاويات PostgreSQL 16 مع PostGIS و Redis
│
└── docs/
    └── architecture/         # التوثيق المعماري، الرسوم التوضيحية، ومخططات الـ ERD
```

---

## 🚀 البدء السريع (Quick Start)

### 1. المتطلبات الأساسية
- **Node.js**: v20+ أو v22+
- **Docker & Docker Compose**: لتشغيل قاعدة البيانات و Redis محلياً

### 2. تشغيل بيئة البيانات المحلية (Database & Cache)
```bash
npm run docker:up
```

---

## 🏛️ الأنظمة الأربعة للمنصة

| النظام | المستخدم المستهدف | التقنية المعتمدة |
|---|---|---|
| **Customer App** | العميل النهائي | Flutter (iOS & Android) |
| **Delivery App** | مناديب التوصيل | Flutter (iOS & Android) |
| **Merchant Dashboard** | أصحاب المطاعم، المحلات، والمطابخ | Next.js 14+ / Tailwind CSS |
| **Admin Dashboard** | إدارة العمليات والمالية | Next.js 14+ / Shadcn UI |
| **Core Backend** | محرك المنظومة والأمان | NestJS / PostgreSQL / PostGIS / Redis |
