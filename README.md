# SAFED - System Automation for Field

SAFED is a comprehensive safety supervision application built with **Nuxt 4**, designed to manage operations, safety checklists, staff assignments, and reporting.

## 🚀 Tech Stack

- **Framework:** [Nuxt 4](https://nuxt.com/) (Vue 3)
- **Database ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Database:** PostgreSQL (via NuxtHub/pg)
- **UI Components:** [Shadcn Vue](https://www.shadcn-vue.com/) & [Tailwind CSS](https://tailwindcss.com/)
- **Testing:** [Playwright](https://playwright.dev/) (E2E) & [Vitest](https://vitest.dev/) (Unit)

## 🛠️ Project Setup

### Prerequisites

- Node.js (v18+ recommended)
- PostgreSQL Database

### Installation

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd SAFED
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Configuration**
    Create a `.env` file in the root directory based on `.env.example`:
    ```ini
    # Database Connection String
    DATABASE_URL="postgresql://user:password@localhost:5432/safed_db"
    
    # Auth Secret (generate a random string)
    NUXT_AUTH_SECRET="your-secret-key"
    ```

4.  **Database Setup**
    Run migrations to set up the schema:
    ```bash
    npx drizzle-kit push
    ```
    
    *Optional: Seed the database with initial data (users, tools, etc.)*
    ```bash
    # (If seeding scripts are configured in package.json)
    npm run db:seed
    ```

## 💻 Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## 🗄️ Database Management

We use Drizzle Kit for database management.

- **Push Schema Changes:** `npx drizzle-kit push`
- **Open Drizzle Studio (GUI):**
  ```bash
  npx drizzle-kit studio
  ```

## 🧪 Testing

### Unit Tests (Vitest)
Runs unit tests for utility functions and components.
```bash
npm run test:unit
```

### End-to-End Tests (Playwright)
Runs E2E tests to simulate user flows.
```bash
npm run test:e2e
```
To view the report:
```bash
npx playwright show-report
```

## 📂 Project Structure

- `app/components`: Reusable Vue components (UI library in `ui/`).
- `app/pages`: Application routes (File-based routing).
    - `operations/`: Operation management (Create, Edit, List).
    - `users/`: User management.
    - `tools/`: Tool checklist items.
- `server/api`: Backend API routes (RESTful).
- `server/db`: Database schema (`schema.ts`) and connection setup.
- `shared/types`: TypeScript interfaces shared between frontend and backend.

## ✨ Key Features

1.  **User Management:** Role-based access (Admin, Observer, Staff).
2.  **Operation Management:**
    - Create operations with specific Time, Area, and assigned Staff (Inspection Leaders, Members).
    - Define Job Safety Analysis (JSA) and tools required.
3.  **Checklists (Dynamic):**
    - **Tools Checklist:** Manage tool requests and returns.
    - **Job Checklist:** Dynamic sections with activities (Preparation, Execution, Closing).
4.  **Staff Assignment:** Drag-and-drop or selection interface for assigning teams to operations.

## 📝 License

[MIT](LICENSE)
