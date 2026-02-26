# az-handy.berlin

MERN Stack Application with SCSS and Best Practices

## Tech Stack

- **Frontend**: React, SCSS
- **Backend**: Node.js, Express
- **Database**: PostgreSQL (oder In-Memory für Tests)
- **Build Tool**: Vite

## Project Structure

```
az-handy.berlin/
├── client/          # React frontend application
├── server/          # Express backend API
├── package.json     # Root package.json for scripts
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (oder In-Memory-Modus ohne Datenbank)
- npm or yarn

### Installation

1. Install all dependencies:
```bash
npm run install-all
```

2. Set up environment variables:
```bash
cp server/.env.example server/.env
# Edit server/.env with your PostgreSQL connection string (or USE_MEMORY_DB=true for testing)
```

3. Start development servers:
```bash
npm run dev
```

This will start both the backend server (port 5000) and frontend dev server (port 3000).

### Available Scripts

- `npm run dev` - Start both client and server in development mode
- `npm run server` - Start only the backend server
- `npm run client` - Start only the frontend client
- `npm run build` - Build the frontend for production
- `npm start` - Start production server

## Environment Variables

Create a `.env` file in the `server` directory:

```
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/az_handy_berlin
# Oder ohne Datenbank: USE_MEMORY_DB=true
JWT_SECRET=your-secret-key-here
CLIENT_URL=http://localhost:3000
```

## Admin User Setup

To create an admin user for testing and development:

```bash
cd server
npm run create-admin
```

This will create an admin user with the following credentials:

- **Email**: `admin@az-handy.berlin`
- **Password**: `Admin123!`
- **Role**: `admin`

⚠️ **Important**: Change the password after first login!

For more details, see [ADMIN_CREDENTIALS.md](./ADMIN_CREDENTIALS.md)

## License

ISC
