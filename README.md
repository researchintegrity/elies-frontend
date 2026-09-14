# ELIES Platform - Frontend

Frontend for the ELIES platform, developed with React + Vite. The application provides a modern and responsive interface for PDF document management, image analysis, and AI-assisted annotations.

## Main Features

*   **Authentication**: User Login and Registration with JWT (stored in LocalStorage).
*   **Document Management (PDF)**:
    *   Upload multiple PDF files (Drag & Drop).
    *   View documents in list or grid mode.
    *   Integrated PDF Viewer (Modal).
    *   Delete and Download documents.
*   **Image Analysis**:
    *   Upload images for integrity detection.
    *   Image gallery with filters (name) and sorting (date, size, name).
    *   Lightbox for detailed viewing.
    *   Delete images.
*   **Annotations**: Interface for document annotation (under development).
*   **UI/UX**:
    *   Modern and responsive design.
    *   Visual feedback with **SweetAlert2** (Toasts and Alerts).
    *   Skeleton Loaders for better performance perception.
    *   Dark/Light mode (initial support).

## Tech Stack

*   **Core**: [React](https://react.dev/) (v18), [Vite](https://vitejs.dev/).
*   **Routing**: [React Router DOM](https://reactrouter.com/).
*   **Styling**: Pure CSS (Vanilla) with CSS Variables for Design System.
*   **HTTP Client**: Fetch API with Centralized Wrapper (`src/services/api.js`).
*   **Utilities**:
    *   `sweetalert2`: Beautiful Alerts and Modals.
    *   `react-dropzone`: File uploads.
    *   `react-icons`: Vector icons.

## Architecture

The project recently underwent a refactoring to decouple API logic from UI components.

### 1. Service Layer (`src/services`)
*   **`api.js`**: Centralized wrapper for `fetch`.
    *   Manages base URL (`API_BASE_URL`).
    *   Automatically injects authentication token (`Authorization: Bearer ...`).
    *   Handles global errors (e.g., 401 Unauthorized).
    *   Helper methods: `get`, `post`, `put`, `delete`, `download`.

### 2. Custom Hooks (`src/hooks`)
Encapsulate business logic and state, keeping components clean.
*   **`useAuth`**: Manages authentication context (login, logout, token).
*   **`useDocuments`**: Manages document state and operations (fetch, upload, delete).
*   **`useImages`**: Manages image state and operations (fetch, upload, delete).
*   **`useTheme`**: Manages theme (light/dark).

### 3. Components (`src/pages`)
Focused only on rendering and user interaction. They delegate heavy logic to hooks.
*   `ViewPDFPage.jsx`: Document gallery.
*   `UploadPDFPage.jsx`: Document upload.
*   `ViewImagesPage.jsx`: Image gallery.
*   `UploadImagePage.jsx`: Image upload.

## Folder Structure

```
src/
├── assets/         # Images and static resources
├── components/     # Reusable components (Header, Sidebar, etc.)
├── config/         # Global configurations (api.js)
├── context/        # React Contexts (AuthContext, ThemeContext)
├── hooks/          # Custom Hooks (API Logic and State)
├── pages/          # Page Components (Views)
├── services/       # API Services (api.js)
├── utils/          # Utility functions (alert.js, formatters)
├── App.jsx         # Root Component and Routes
└── main.jsx        # Entry point
```

## How to Run the Project

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Configure Environment Variables**:
    Create a `.env` file in the root (based on `.env.example`) if necessary.
    ```env
    VITE_API_URL=http://localhost:8000
    ```

3.  **Run the development server**:
    ```bash
    npm run dev
    # or
    npx vite --port=4000
    ```

4.  **Access**:
    Open `http://localhost:4000` (or the indicated port) in your browser.

