This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Roboflow AI Object Detection

This project integrates the **Mattel Object Detection** model via Roboflow's serverless inference API to verify vendor-uploaded evidence photos with AI confidence scoring.

### How It Works

1. Vendor uploads an evidence photo on the **Tasks** checklist page
2. Photo is stored in Supabase Storage and the checklist item status becomes **"AI Processing"**
3. The frontend calls `POST /api/classify` with the image URL
4. The API route fetches the image, converts to base64, and sends it to Roboflow
5. Roboflow returns object detection predictions with confidence scores
6. Based on the result:
   - **≥80% confidence + correct class** → Pass
   - **50-79% confidence** → Pass with warning (flagged for supervisor review)
   - **<50% confidence** → Error (vendor asked to re-upload)
   - **Wrong class detected** → Error

### Architecture

- **`src/lib/roboflow.ts`** — Reusable Roboflow client with retries, timeouts, and typed errors
- **`src/app/api/classify/route.ts`** — Next.js API route that wraps the client
- **`src/app/vendor/tasks/page.tsx`** — Frontend that triggers classification on photo upload

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
