# IndiVar

A modern, full-stack individual difference research platform built with Node.js, Express, SQLite, and vanilla JavaScript. Users can explore personality science through articles, take validated assessments, and interact with AI-powered chatbots.

## Project Structure

The project is organized into clear frontend and backend directories for better maintainability:

```
indivar/
├── backend/                    # Backend server code
│   ├── config/                 # Configuration files
│   │   └── database.js         # Database setup and initialization
│   ├── controllers/            # Request handlers
│   │   ├── userController.js   # User authentication and management
│   │   └── articleController.js # Article-related operations
│   ├── middleware/             # Express middleware
│   │   └── auth.js             # JWT authentication middleware
│   ├── models/                 # Data models (future use)
│   ├── routes/                 # API route definitions
│   │   ├── auth.js             # Authentication routes
│   │   └── articles.js         # Article routes
│   ├── utils/                  # Utility functions
│   ├── package.json            # Backend dependencies
│   └── server.js               # Main server file
├── frontend/                   # Frontend client code
│   ├── assets/                 # Static assets (images, etc.)
│   ├── components/             # Reusable UI components (future use)
│   ├── pages/                  # HTML pages
│   │   ├── index.html          # Homepage
│   │   ├── articles.html       # Articles listing
│   │   ├── article.html        # Article detail page
│   │   ├── tests.html          # Tests page
│   │   ├── chatbots.html       # Chatbots page
│   │   ├── login.html          # Login page
│   │   └── register.html       # Registration page
│   ├── styles/                 # CSS stylesheets
│   │   └── styles.css          # Main stylesheet
│   └── utils/                  # JavaScript utilities
│       ├── api.js              # API communication functions
│       ├── auth.js             # Authentication utilities
│       ├── articles.js         # Article-related functions
│       └── main.js             # Main application logic
├── indivar.db                  # SQLite database
├── package.json                # Root package.json with scripts
└── README.md                   # This file
```

## Installation & Setup

### Prerequisites
- Node.js (version 14 or higher)
- npm (comes with Node.js)

### Quick Start

1. **Clone or download the project**
   ```bash
   cd indivar
   ```

2. **Install all dependencies**
   ```bash
   npm run install-all
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Access the application**
   Open your browser and navigate to `http://localhost:3001`

### Manual Installation

If you prefer to install dependencies separately:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies (if any)
cd ../frontend
npm install

# Start the server
cd ../backend
npm run dev
```

## Backend Structure

### Configuration (`backend/config/`)
- **database.js**: SQLite database setup, table creation, and sample data insertion

### Controllers (`backend/controllers/`)
- **userController.js**: User registration, login, logout, and profile management
- **articleController.js**: Article CRUD operations, category management, and reading progress

### Middleware (`backend/middleware/`)
- **auth.js**: JWT token verification and optional authentication

### Routes (`backend/routes/`)
- **auth.js**: Authentication endpoints (`/api/auth/*`)
- **articles.js**: Article endpoints (`/api/articles/*`)

## Frontend Structure

### Pages (`frontend/pages/`)
All HTML pages with consistent navigation and responsive design.

### Styles (`frontend/styles/`)
- **styles.css**: Comprehensive CSS with modern design patterns

### Utilities (`frontend/utils/`)
- **api.js**: Centralized API communication with error handling
- **auth.js**: Authentication state management and UI updates
- **articles.js**: Article loading, filtering, and interaction logic
- **main.js**: Application initialization and event handling

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info

### Articles
- `GET /api/articles` - Get all articles (with optional filters)
- `GET /api/articles/:id` - Get specific article
- `GET /api/articles/primary-categories` - Get primary categories
- `GET /api/articles/secondary-categories` - Get secondary categories
- `POST /api/articles/:id/read` - Mark article as read
- `GET /api/articles/:id/read` - Check if article is read
- `GET /api/articles/user/read-articles` - Get user's read articles

## Article Categories

The platform features a comprehensive category system:

### Primary Categories
- 📚 Personality Inventory
- 🧾 Item Measurements
- 🧠 Beyond Item Measurements
- 📝 Introduction to Personality Science (Personality 101)
- 🔬 Personality Constructs & Taxonomies
- 🧭 Trait Taxonomies
- 🔍 Facets & Nuances
- 🧑‍🤝‍🧑 Group Differences
- 📖 Life Narratives
- ⚖️ Nomothetic vs. Idiographic Approaches
- 👥 Personality Profiles
- 🔁 Personality Processes & Development
- 📈 Dynamics
- 🎓 Development
- 💡 Interventions
- 🔮 Predictability of Personality
- 🎯 Criteria & Outcomes
- 📐 Differences in Measurement
- 🧬 Behavioral Genetics of Personality
- 🧪 Novel Methods

## Development

### Backend Development
```bash
cd backend
npm run dev  # Start with nodemon for auto-restart
```

### Frontend Development
The frontend uses vanilla JavaScript with ES6 modules. No build step is required.

### Adding New Features

#### Adding New Articles
Articles are stored in the SQLite database. Add them through the database or extend the API:

```sql
INSERT INTO articles (title, excerpt, content, primary_category, secondary_category, author) 
VALUES ('Your Title', 'Your Excerpt', 'Your Content', 'Primary Category', 'Secondary Category', 'Author Name');
```

#### Adding New API Endpoints
1. Create a new controller in `backend/controllers/`
2. Create a new route file in `backend/routes/`
3. Register the route in `backend/server.js`

#### Adding New Frontend Pages
1. Create HTML file in `frontend/pages/`
2. Add route in `backend/server.js`
3. Update navigation if needed


## 📄 License

This project is licensed under the MIT License.

## Support

For support or questions:
- Check the troubleshooting section above
- Review the code comments for implementation details
- Create an issue in the project repository

---

**IndiVar** - Get to know individual difference research and test yourself! :) 