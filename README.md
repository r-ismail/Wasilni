# Uber Clone - Admin Panel Full Source Code

## 📦 Package Contents

This archive contains the complete source code for the Uber Clone Admin Panel with all features implemented.

### Included:
- ✅ Complete backend API (tRPC + Express)
- ✅ Admin frontend (React 19 + Vite + Tailwind 4)
- ✅ Database schema (Drizzle ORM)
- ✅ User management system
- ✅ Real-time notifications (Socket.IO)
- ✅ Bilingual support (English + Arabic)
- ✅ All configurations and dependencies

---

## 🏗️ Project Structure

```
uber-clone/
├── client/                      # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/              # Admin pages
│   │   │   ├── Home.tsx        # Landing page
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── AdminUsers.tsx  # User management
│   │   │   └── AdminCancellations.tsx
│   │   ├── components/         # Reusable components
│   │   │   ├── NotificationCenter.tsx
│   │   │   └── ui/            # shadcn/ui components
│   │   ├── i18n/              # Translations
│   │   │   ├── locales/
│   │   │   │   ├── en.json    # English
│   │   │   │   └── ar.json    # Arabic
│   │   │   └── index.ts
│   │   ├── lib/
│   │   │   └── trpc.ts        # tRPC client
│   │   ├── hooks/             # Custom hooks
│   │   ├── contexts/          # React contexts
│   │   ├── App.tsx            # Routes
│   │   └── main.tsx           # Entry point
│   ├── public/                # Static assets
│   └── index.html
│
├── server/                     # Backend (Express + tRPC)
│   ├── routers.ts             # All API endpoints
│   ├── db.ts                  # Database queries
│   ├── _core/                 # Core infrastructure
│   │   ├── socket.ts          # Socket.IO setup
│   │   ├── context.ts         # tRPC context
│   │   ├── env.ts             # Environment variables
│   │   └── notification.ts    # Push notifications
│   └── *.test.ts              # Unit tests
│
├── drizzle/                    # Database
│   ├── schema.ts              # Database schema
│   └── migrations/            # Migration files
│
├── shared/                     # Shared types
├── storage/                    # S3 helpers
├── package.json               # Dependencies
├── vite.config.ts             # Vite configuration
└── tsconfig.json              # TypeScript config
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- MySQL/TiDB database
- npm or pnpm package manager

### Installation Steps

1. **Extract the archive**
   ```bash
   tar -xzf uber-clone-admin-panel-full.tar.gz
   cd uber-clone
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Configure environment variables**
   
   The project uses Manus platform environment variables. If running locally, create a `.env` file:
   
   ```env
   DATABASE_URL=mysql://user:password@localhost:3306/uber_clone
   JWT_SECRET=your-secret-key-here
   VITE_APP_TITLE=Uber Clone Admin
   ```

4. **Push database schema**
   ```bash
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Access the admin panel**
   ```
   http://localhost:3000
   ```

---

## 🎯 Admin Panel Features

### 1. **Dashboard**
- Platform statistics (total rides, users, revenue)
- Active drivers and riders count
- Recent activity feed
- Real-time metrics

### 2. **User Management**
- View all users (riders, drivers, admins)
- Search and filter users
- Edit user information
- Delete users with confirmation
- Change user roles (rider → driver → admin)
- Verify/unverify drivers
- View user statistics (total rides, rating)

### 3. **Cancellation Management**
- View all cancelled rides
- Filter by cancellation reason
- Filter by who cancelled (rider/driver)
- Process refunds
- Track refund status
- Cancellation analytics

### 4. **Notification Center**
- Real-time notifications
- Unread count badge
- Mark as read functionality
- Notification history
- Socket.IO powered

### 5. **Language Support**
- English (default)
- Arabic (full translation)
- Language switcher in header
- All admin pages translated

---

## 🔧 Key Technologies

### Frontend
- **React 19** - Latest React with modern features
- **Vite** - Fast build tool
- **Tailwind CSS 4** - Utility-first CSS
- **shadcn/ui** - Beautiful UI components
- **tRPC** - End-to-end typesafe APIs
- **React Router** (wouter) - Client-side routing
- **i18next** - Internationalization
- **Socket.IO Client** - Real-time updates

### Backend
- **Express 4** - Web framework
- **tRPC 11** - TypeScript RPC framework
- **Drizzle ORM** - Type-safe database ORM
- **Socket.IO** - WebSocket server
- **Zod** - Schema validation
- **MySQL/TiDB** - Database

### Development
- **TypeScript** - Type safety
- **Vitest** - Unit testing
- **ESLint** - Code linting
- **Prettier** - Code formatting

---

## 📡 API Endpoints

### Admin Router (`/api/trpc/admin.*`)

```typescript
// Get all users with optional filters
admin.getAllUsers.useQuery({ 
  role?: 'rider' | 'driver' | 'admin' 
})

// Update user information
admin.updateUser.useMutation({
  userId: number,
  name?: string,
  email?: string,
  phone?: string
})

// Delete user
admin.deleteUser.useMutation({
  userId: number
})

// Update user role
admin.updateUserRole.useMutation({
  userId: number,
  role: 'rider' | 'driver' | 'admin'
})

// Verify driver
admin.verifyDriver.useMutation({
  userId: number,
  isVerified: boolean
})

// Get platform statistics
admin.getStats.useQuery()

// Get recent rides
admin.getRecentRides.useQuery({ limit?: number })

// Get cancelled rides
admin.getCancelledRides.useQuery()

// Process refund
admin.processRefund.useMutation({
  rideId: number,
  refundAmount: number,
  status: 'processed' | 'rejected'
})
```

### Notification Router (`/api/trpc/notifications.*`)

```typescript
// Get user notifications
notifications.getNotifications.useQuery()

// Mark notification as read
notifications.markAsRead.useMutation({ 
  notificationId: number 
})

// Mark all as read
notifications.markAllAsRead.useMutation()
```

---

## 🗄️ Database Schema

### Key Tables

**users**
- id, openId, name, email, phone
- role (rider/driver/admin)
- driverStatus, isVerified
- totalRides, averageRating
- Timestamps

**rides**
- id, riderId, driverId
- pickupLocation, dropoffLocation
- status, fare, distance, duration
- Timestamps

**notifications**
- id, userId, type, title, message
- isRead, createdAt

**vehicles**
- id, driverId
- make, model, year, color
- vehicleType, licensePlate

**payments**
- id, rideId, riderId, driverId
- amount, paymentMethod, status

---

## 🧪 Testing

Run all tests:
```bash
npm test
```

Run specific test file:
```bash
npm test notifications.test.ts
```

Test coverage includes:
- User management operations
- Notification system
- Ride flow constraints
- Vehicle management
- Location tracking

---

## 🌍 Internationalization

### Adding New Languages

1. Create new locale file:
   ```bash
   cp client/src/i18n/locales/en.json client/src/i18n/locales/fr.json
   ```

2. Translate all keys in the new file

3. Import in `client/src/i18n/index.ts`:
   ```typescript
   import fr from './locales/fr.json';
   
   resources: {
     en: { translation: en },
     ar: { translation: ar },
     fr: { translation: fr }  // Add new language
   }
   ```

### Using Translations

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return <h1>{t('admin.dashboard')}</h1>;
}
```

---

## 🔐 Authentication

The admin panel uses Manus OAuth for authentication. When deployed on Manus platform, authentication is automatic.

For local development:
- Admin role is required to access admin pages
- Role check happens in tRPC context
- Protected procedures use `protectedProcedure`

---

## 📱 Mobile Apps

This package includes only the **admin panel**. For the mobile apps (iOS/Android), see the separate `uber-clone-mobile-v2.tar.gz` archive which includes:
- React Native + Expo
- Rider app features
- Driver app features
- Native camera, maps, push notifications

---

## 🚢 Deployment

### Manus Platform (Recommended)
The project is already configured for Manus platform deployment:
1. Push code to repository
2. Click "Publish" in Manus UI
3. Custom domain support available

### Manual Deployment
For other platforms:

1. **Build frontend**
   ```bash
   npm run build
   ```

2. **Set environment variables** on your hosting platform

3. **Start production server**
   ```bash
   npm run start
   ```

4. **Database migration**
   ```bash
   npm run db:push
   ```

---

## 📊 Admin Panel Screenshots

### Dashboard
- Platform metrics and statistics
- Recent activity feed
- Quick action cards

### User Management
- Searchable user list
- Edit/delete operations
- Role management
- Driver verification

### Cancellation Management
- Cancelled rides list
- Refund processing
- Analytics and filters

---

## 🛠️ Development Tips

### Hot Module Replacement
Vite provides instant HMR. Changes reflect immediately without full reload.

### Database Changes
After modifying `drizzle/schema.ts`:
```bash
npm run db:push
```

### Adding New Admin Features
1. Add tRPC procedure in `server/routers.ts`
2. Add database query in `server/db.ts`
3. Create React page in `client/src/pages/`
4. Add route in `client/src/App.tsx`
5. Add translations in `client/src/i18n/locales/`

### Code Style
- Use TypeScript for type safety
- Follow existing patterns
- Write unit tests for new features
- Use shadcn/ui components for consistency

---

## 📞 Support

For issues or questions:
- Check existing tests for usage examples
- Review tRPC router definitions
- Inspect database schema in `drizzle/schema.ts`

---

## 📄 License

This is a demonstration project. Modify and use as needed for your requirements.

---

## 🎉 What's Included

✅ Complete admin panel with all features
✅ User management (CRUD operations)
✅ Real-time notifications
✅ Bilingual support (English + Arabic)
✅ Dashboard with analytics
✅ Cancellation management
✅ Ride monitoring
✅ Driver verification
✅ Search and filtering
✅ Responsive design
✅ Type-safe APIs
✅ Unit tests
✅ Production-ready code

---

**Happy coding! 🚀**
