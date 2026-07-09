# Maintain.AI - PM Verification System

Maintain.AI is a modern, real-time Preventive Maintenance (PM) Verification System designed to streamline maintenance workflows across administrative, supervisory, and field (vendor) roles.

## 🚀 Key Features

*   **Role-Based Access Control (RBAC):** Tailored dashboards and strict data permissions for Admins, Supervisors, and Vendors.
*   **AI Computer Vision Integration:** Embedded AI via Roboflow API to assist vendors with automated image classification and anomaly detection directly on the field.
*   **Real-time Collaboration:** Embedded Live Chat widget and Notification Bell for instant, cross-role communication (Powered by Supabase Realtime).
*   **Digital Signatures Integration:** Secure, dynamically loaded e-signature implementation for report submission (Vendor) and final approval workflows (Supervisor).
*   **Advanced Data Management:** Soft-delete mechanisms for assets (ensuring historical PM integrity), dynamic filtering, and robust user management.
*   **Enterprise-Ready UI:** Fully localized English interface, modernized styling, and strict server-client hydration handling.

## 🛠 Tech Stack

*   **Frontend:** Next.js (App Router), React, Tailwind CSS, TypeScript
*   **Backend / Database:** Supabase (PostgreSQL, Storage, Authentication)
*   **Real-time engine:** Supabase Realtime
*   **AI Service:** Roboflow

## 📂 Project Structure

*   `apps/web/` - The core Next.js web application.
    *   `src/app/admin/` - Administrator operations and master data management.
    *   `src/app/supervisor/` - Supervisor task tracking, live chat, and report approvals.
    *   `src/app/vendor/` - Field execution, AI-assisted checklist reports, and digital signatures.
    *   `src/components/` - Global components including `ChatWidget` and `NotificationBell`.
    *   `src/lib/` - Shared utilities, Database schema types, Roboflow API module, and Signature handling.
    *   `src/app/api/` - Next.js Serverless API routes.
*   `supabase/` - Database schema definitions, edge migrations, and RLS policies.

## ⚙️ Getting Started

### Prerequisites
*   Node.js (v18+)
*   npm or yarn
*   Supabase Account & Project configuration
*   Roboflow API Key (for AI features)

### Installation
1. Clone the repository and install dependencies:
   ```bash
   cd apps/web
   npm install
   ```
2. Configure Environment Variables:
   Create a `.env.local` file inside `apps/web/` using your Supabase and Roboflow credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ROBOFLOW_API_KEY=your_roboflow_key
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## 🛡 License
Confidential. Internal Enterprise Use Only.
