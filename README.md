# MicroPage Backend

A well-organized Node.js backend for the MicroPage website builder application.

## Project Structure

```
backend/
├── config/
│   ├── config.js          # General configuration (PORT, JWT_SECRET, etc.)
│   └── database.js        # Database connection and configuration
├── controllers/
│   ├── authController.js  # Authentication logic (register, login, profile)
│   └── websiteController.js # Website CRUD operations
├── middleware/
│   └── auth.js           # JWT authentication middleware
├── models/
│   ├── User.js           # User mongoose schema
│   └── Website.js        # Website mongoose schema
├── routes/
│   ├── auth.js           # Authentication routes
│   └── websites.js       # Website routes
├── utils/
│   └── storage.js        # Storage utility helpers
├── server.js             # Main server file
└── package.json
```

## Features

- **MongoDB Integration**: Full MongoDB support with fallback to in-memory storage
- **JWT Authentication**: Secure token-based authentication
- **Modular Architecture**: Clean separation of concerns
- **Error Handling**: Comprehensive error handling throughout
- **CORS Support**: Cross-origin resource sharing enabled

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile (protected)

### Websites
- `POST /api/websites` - Save website (protected)
- `GET /api/websites` - Get user's websites (protected)
- `GET /api/websites/:id` - Get single website (protected)
- `PUT /api/websites/:id` - Update website (protected)
- `DELETE /api/websites/:id` - Delete website (protected)
- `POST /api/websites/:id/publish` - Publish website (protected)
- `GET /api/websites/published/:id` - Get published website (public)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file:
   ```
   PORT=5000
   JWT_SECRET=your-secret-key-change-in-production
   MONGODB_URI=mongodb://localhost:27017/micropage
   ```

3. Start the server:
   ```bash
   npm start
   ```

## Database

The application supports both MongoDB and in-memory storage:

- **MongoDB**: Primary database (recommended for production)
- **In-Memory**: Fallback storage for development when MongoDB is not available

## Development

- **Hot Reload**: Use `npm run dev` for development with nodemon
- **Environment**: Set `NODE_ENV=development` for additional logging
- **Debug**: Check console logs for detailed error information
