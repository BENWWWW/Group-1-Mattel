# Maintain.AI - PM Verification System

Maintain.AI is a modern, real-time Preventive Maintenance (PM) Verification System designed to streamline maintenance workflows across administrative, supervisory, and field (vendor) roles.

## Key Features

*   **Role-Based Access Control (RBAC):** Tailored dashboards and strict data permissions for Admins, Supervisors, and Vendors.
*   **AI Image Quality Detection:** Embedded AI via SightEngine API to verify that vendor-uploaded evidence photos meet quality standards (sharpness, exposure, blur detection) directly on the field.
*   **Real-time Collaboration:** Embedded Live Chat widget and Notification Bell for instant, cross-role communication (Powered by Supabase Realtime).
*   **Digital Signatures Integration:** Secure, dynamically loaded e-signature implementation for report submission (Vendor) and final approval workflows (Supervisor).
*   **Advanced Data Management:** Soft-delete mechanisms for assets (ensuring historical PM integrity), dynamic filtering, and robust user management.
*   **Enterprise-Ready UI:** Fully localized English interface, modernized styling, and strict server-client hydration handling.

## Tech Stack

*   **Frontend:** Next.js (App Router), React, Tailwind CSS, TypeScript
*   **Backend / Database:** Supabase (PostgreSQL, Storage, Authentication)
*   **Real-time engine:** Supabase Realtime
*   **AI Service:** SightEngine

## Project Structure

*   `apps/web/` - The core Next.js web application.
    *   `src/app/admin/` - Administrator operations and master data management.
    *   `src/app/supervisor/` - Supervisor task tracking, live chat, and report approvals.
    *   `src/app/vendor/` - Field execution, AI-assisted checklist reports, and digital signatures.
    *   `src/components/` - Global components including `ChatWidget` and `NotificationBell`.
    *   `src/lib/` - Shared utilities, Database schema types, SightEngine API module, and Signature handling.
    *   `src/app/api/` - Next.js Serverless API routes.
*   `supabase/` - Database schema definitions, edge migrations, and RLS policies.

## Getting Started

### Prerequisites
*   Node.js (v18+)
*   npm or yarn
*   Supabase Account & Project configuration
*   SightEngine Account & API Keys (for AI quality detection features)

### Installation
1. Clone the repository and install dependencies:
   ```bash
   cd apps/web
   npm install
   ```
2. Configure Environment Variables:
   Create a `.env.local` file inside `apps/web/` using your Supabase and SightEngine credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=supabase_anon_key
   SIGHTENGINE_API_USER=sightengine_api_user
   SIGHTENGINE_API_SECRET=sightengine_api_secret
   OPEN_AI_API_KEY=openai_api_key
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## License
Confidential. Internal Enterprise Use Only.
