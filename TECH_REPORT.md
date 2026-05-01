# HopeConnect — Technology & AI Usage Report

## Project Overview

HopeConnect is a web-based child protection case management platform built for Sri Lanka. It connects government administrators, NGOs, and social workers on a single secure platform to manage child welfare cases, handle public reports of child abuse, and provide citizens with accessible information through an AI-powered assistant.

---

## Technologies Used

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **React** | 18.3 | Core UI framework — component-based SPA architecture |
| **Vite** | 8.x | Build tool and development server |
| **React Router DOM** | 6.x | Client-side routing and protected route management |
| **Recharts** | 3.x | Data visualisation — case statistics charts and dashboards |
| **React Leaflet + Leaflet** | 4.2 / 1.9 | Interactive map showing case distribution across Sri Lanka's 25 districts |
| **Axios** | 1.7 | HTTP client for API communication between frontend and backend |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | 20.x | Server-side JavaScript runtime |
| **Express.js** | 4.x | REST API framework — routing, middleware, request handling |
| **Multer** | 2.x | Multipart form-data handling for document and evidence file uploads |
| **dotenv** | 16.x | Environment variable management |
| **CORS** | 2.x | Cross-Origin Resource Sharing configuration |
| **Nodemon** | 3.x | Development auto-restart on file changes |

### Database & Backend-as-a-Service

| Service | Purpose |
|---|---|
| **Supabase (PostgreSQL)** | Primary relational database — stores all cases, children profiles, public reports, case updates, user profiles, and documents metadata |
| **Supabase Auth** | JWT-based authentication with role-based access control (Admin, NGO, Social Worker) |
| **Supabase Row Level Security (RLS)** | Database-level security policies ensuring each role only accesses data they are authorised to see |
| **Supabase Storage** | File storage bucket for uploaded documents and evidence (birth certificates, medical reports, police reports, images) |

---

## External APIs

### Google Gemini API
- **Model used:** `gemini-2.5-flash`
- **SDK:** `@google/generative-ai`
- **Purpose:** Powers the HopeConnect AI chatbot assistant
- **How it works:** User questions are sent to Gemini along with a curated knowledge base covering Sri Lankan child protection laws, the 1929 ChildLine hotline, HopeConnect platform usage, and the 25 districts. Gemini automatically detects whether the user is writing in **English or Sinhala** and responds in the same language.
- **Cost:** Free tier (Gemini Flash free quota)

### OpenStreetMap / Leaflet Tiles
- **Purpose:** Map tile provider for the interactive case map on the admin dashboard
- **Cost:** Free, open data

### Supabase REST & Realtime APIs
- **Purpose:** All database reads/writes are performed through Supabase's auto-generated REST API, authenticated with JWT tokens

---

## Architecture Summary

```
Browser (React + Vite)
        │
        ▼
  Express.js API (Node.js)
        │
        ├── Supabase JS SDK ──► Supabase (PostgreSQL + Auth + Storage)
        │
        └── Google Gemini API ──► AI Chatbot responses
```

- The frontend communicates with the Express backend via Axios
- The backend uses the Supabase JS SDK for all database and storage operations
- Role-based access is enforced at both the API middleware level and the Supabase RLS policy level
- The chatbot route sends the full knowledge base as context to Gemini on each request (RAG-lite approach — no vector database required due to the small knowledge base size)

---

## Key Features Built

- **Role-based dashboards** — separate portals for Admin, NGO, and Social Worker roles
- **Case management** — full lifecycle tracking (New → Under Review → Assigned → Resolved)
- **Public anonymous reporting** — citizens can submit child abuse reports without an account
- **Document upload & management** — file uploads stored in Supabase Storage
- **AI-powered chatbot** — multilingual (English + Sinhala) assistant answering questions about child protection and platform usage
- **Interactive district map** — visualises case locations across Sri Lanka using Leaflet
- **Admin analytics dashboard** — charts showing case status breakdown, trends, and NGO assignments
- **AI document verification** — document authenticity checking integrated into the case workflow

---

## How AI Was Used in Development

AI tools were used as a **development assistant** during certain phases of building HopeConnect — providing partial support on specific technical challenges while the core architecture, feature decisions, and domain logic were driven by the developer.

### Areas where AI assistance was used:

**1. Code Debugging & Error Resolution**
When encountering library compatibility issues (such as `react-leaflet` v5 requiring React 19, or missing peer dependencies), AI was consulted to quickly diagnose the root cause and suggest the correct fix — saving time that would otherwise be spent reading through library changelogs and GitHub issues.

**2. UI Component Structuring**
For complex UI components like the admin dashboard (which combines charts, a live map, case tables, and a slide-in case detail drawer), AI helped structure the React component layout and suggested approaches for handling z-index stacking issues between Leaflet map layers and fixed-position drawers.

**3. Chatbot Integration**
The Gemini API integration and the RAG (Retrieval-Augmented Generation) architecture for the chatbot was prototyped with AI assistance — specifically around how to structure the knowledge base prompt and handle bilingual language detection within a single API call.

**4. CSS Animations & Styling Refinements**
Minor styling work — such as the floating chat icon animation, dark/light mode theming, and CSS keyframe animations — was refined using AI suggestions.

**5. SQL & Supabase Policy Guidance**
When writing Supabase Row Level Security (RLS) policies and storage bucket access rules, AI was used to validate the SQL syntax and logic for role-based data access.

### What was NOT AI-generated:
- The overall system architecture and role model (Admin / NGO / Social Worker)
- The feature set and product decisions
- The Supabase schema design and relationships
- The knowledge base content for the chatbot (domain research done by the developer)
- Integration and testing of all components end-to-end

---

## Development Environment

| Tool | Purpose |
|---|---|
| **VS Code** | Primary code editor |
| **Git** | Version control |
| **Vite Dev Server** | Local frontend development |
| **Nodemon** | Local backend hot-reload |
| **Supabase Dashboard** | Database management and policy configuration |

---

*HopeConnect — Built for the protection of children across Sri Lanka.*
