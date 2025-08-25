# MiniMaker 🧩

an app to help create and share mini crossword puzzles. maybe I'll add support for bigger puzzles idk. the word list needs some work, the backend needs to be updated to store and share puzzles, but the creation logic is in a functional state. I'll get this up and hosted on my personal site once that exists.  





## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Python 3.8+ (for backend features)

### Installation

1. **Clone the repository**


2. **Install Frontend Dependencies**
   ```bash
   cd mini-Maker
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   cd ../backend
   pip install -r requirements.txt
   ```

### Running the Application

1. **Start the Backend Server**
   ```bash
   cd backend
   python app.py
   ```

2. **Start the Frontend Development Server**
   ```bash
   cd mini-Maker
   npm start
   ```

3. **Open your browser**
   Navigate to `http://localhost:4200`


### Navigation
The application features a clean, intuitive navigation bar with three main sections:
- **Home**: Welcome page with feature overview
- **Create**: Interactive puzzle creation interface
- **Solve**: Puzzle solving environment Not implemented currently 

### Grid Interface
- **Cell Interaction**: Click any cell to start editing
- **Direction Toggle**: Press Enter to switch between horizontal and vertical input
- **Visual Cues**: Active cells are highlighted, and the current word is emphasized
- **Status Indicators**: Loading states and progress feedback


### Frontend (Angular)
- **Framework**: Angular 20+ with standalone components
- **State Management**: Angular Signals for reactive state
- **Styling**: SCSS with responsive design
- **Testing**: Jasmine and Karma with comprehensive test coverage
- **Build System**: Angular CLI with esbuild

### Backend (Python)
- **Framework**: Flask with RESTful API design
- **Word Processing**: Advanced algorithms for word detection and validation
- **Pattern Matching**: Intelligent word suggestion system
- **Solution Generation**: AI-powered puzzle completion algorithms



The project includes comprehensive testing coverage:

### Running Tests
```bash
# Frontend tests
cd mini-Maker
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm test -- --include="**/puzzle-creator.component.spec.ts"
```

### Test Coverage
- **Unit Tests**: 160+ test cases covering all components
- **Integration Tests**: End-to-end workflow validation
- **Service Tests**: API integration and data handling
- **Component Tests**: UI interaction and state management

### Test Categories
- **Grid Interaction**: Cell editing, navigation, validation
- **Word Detection**: Pattern recognition and suggestion
- **Clue Management**: Creation, editing, numbering
- **Solution Finding**: Algorithm validation and performance
- **Error Handling**: Graceful failure and recovery
- **Performance**: Large grid handling and optimization



### Environment Variables
```bash
# Frontend (mini-Maker/.env)
NG_APP_API_URL=http://localhost:5000

# Backend (backend/.env)
FLASK_ENV=development
FLASK_DEBUG=true
WORD_DATABASE_PATH=./words_alpha.txt
```

### Customization
- **Grid Size**: Modify default grid dimensions in component settings
- **Word Database**: Replace `words_alpha.txt` with custom word lists
- **Styling**: Customize SCSS variables in `src/styles.css`
- **API Endpoints**: Configure backend URLs in `crossword.service.ts`

