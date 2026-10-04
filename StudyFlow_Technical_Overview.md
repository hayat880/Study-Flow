# StudyFlow: Technical Overview

## 1. Project Architecture
StudyFlow utilizes a modern **Three-Tier Layered Architecture** adapted for client-side React applications. 

- **Presentation Layer (`src/presentation`):** Contains React components and hooks. Solely responsible for rendering UI and capturing user interactions. It never queries the database directly.
- **Business Logic Layer (`src/business`):** Contains services (e.g., `taskService`, `authService`) and pure logic functions (`taskLogic`). It handles data transformation, date math, and coordinates API calls.
- **Data Access Layer (`src/data`):** Contains repositories (`subjectRepository`). This is the only layer that directly communicates with the Supabase PostgreSQL database.

## 2. Core Technologies
- **Frontend Framework:** React 18, utilizing functional components and hooks (`useState`, `useEffect`, `useMemo`).
- **Language:** TypeScript for strict type-safety and robust entity interfaces.
- **Build Tool:** Vite for fast local development and optimized production builds.
- **Backend Services:** Supabase (Database, Authentication, Row Level Security).
- **Styling:** Vanilla CSS with custom CSS Variables for dynamic Dark/Light theme switching.
- **Third-Party Integrations:** Google Gemini AI API for generating study quizzes.

## 3. Database Structure
The application relies on a highly relational PostgreSQL database hosted on Supabase.
All tables enforce strict **Row Level Security (RLS)** ensuring users only have access to records where `user_id = auth.uid()`.

### Key Tables:
- **`subjects`**: Core entity representing academic courses (id, user_id, name, color).
- **`tasks`**: Represents assignments and exams. Relates to `subjects`. Includes due dates, priority, and completion status.
- **`attendance_records`**: Logs daily presence/absence per subject.
- **`timetable_classes`**: Stores recurring weekly class schedules.
- **`notes`**: Markdown-based study notes linked to subjects.
- **`study_sessions`**: Records completed Pomodoro focus sessions.

## 4. Current Implementation Status
The project is currently in a highly functional state.

**Fully Implemented Features:**
- Secure User Authentication and Password Recovery.
- Dynamic Dark/Light mode theme engine.
- Complete CRUD operations for Subjects, Tasks, and Timetable.
- Algorithmic dashboard tracking (completion percentages, upcoming exams).
- Interactive Pomodoro Focus timer.
- AI Quiz generation based on user notes.
- Global Unified Search (spanning tasks, subjects, and notes).

**Known Limitations:**
- Requires an active internet connection to function (no offline IndexedDB syncing yet).
- Push notifications are limited to visual UI indicators rather than OS-level notifications.
