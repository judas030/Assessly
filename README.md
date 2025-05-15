# Assessly - Feature Evaluation Dashboard (Full Codebase for Vercel)

This package contains the full source code for the Assessly application, ready for deployment to Vercel or a similar modern hosting platform that supports Node.js/React applications.

## Project Overview

Assessly is a web application designed to help users define features, assign Key Performance Indicators (KPIs), input pre-change and post-change data, compare performance, and view a summary of evaluations. It allows for tracking the impact of changes or new features on defined metrics.

## Included in this Export:

*   `public/`: Contains static assets like `index.html`, `favicon.ico`, `manifest.json`, and images.
*   `src/`: Contains all React components, JavaScript logic, CSS files, and other source files for the application.
*   `package.json`: Lists project dependencies and scripts.
*   `package-lock.json`: Records the exact versions of dependencies.
*   `.env.example`: An example file for environment variables. Copy this to `.env.local` for local development or set these variables directly in your Vercel project settings.
*   `.vercelignore`: Specifies files and directories that Vercel should ignore during the build and deployment process.
*   This `README.md` file.

## Setup and Local Development

1.  **Prerequisites**:
    *   Node.js (version 16.x or later recommended)
    *   npm (usually comes with Node.js)

2.  **Install Dependencies**:
    Navigate to the root directory of the unzipped project and run:
    ```bash
    npm install
    ```

3.  **Configure Environment Variables (Optional - for GA4)**:
    If you plan to use the Google Analytics 4 integration, copy `.env.example` to a new file named `.env.local` in the project root:
    ```bash
    cp .env.example .env.local
    ```
    Then, update `.env.local` with your actual GA4 credentials:
    ```
    REACT_APP_GA_MEASUREMENT_ID=G-YOUR_MEASUREMENT_ID
    REACT_APP_GA_API_SECRET=YOUR_GA_API_SECRET
    REACT_APP_GA_CLIENT_ID=YOUR_GA_CLIENT_ID.apps.googleusercontent.com
    ```
    **Important Security Note**: For production deployments on Vercel, do **not** commit your `.env.local` file or actual secrets to your Git repository. Instead, set these environment variables directly in your Vercel project settings dashboard.

4.  **Run Development Server**:
    To start the local development server (usually on `http://localhost:3000`):
    ```bash
    npm start
    ```

5.  **Build for Production**:
    To create an optimized production build (typically in a `build/` folder, though Vercel handles this automatically when deploying from source):
    ```bash
    npm run build
    ```

## Deployment to Vercel

Vercel offers several ways to deploy your application. The recommended method is to connect your Git repository.

1.  **Push to a Git Repository**: Push this codebase to a GitHub, GitLab, or Bitbucket repository.
2.  **Import Project on Vercel**:
    *   Log in to your Vercel account.
    *   Click "Add New..." > "Project".
    *   Import your Git repository.
3.  **Configure Project Settings**:
    *   Vercel should automatically detect that it is a Create React App project and configure the build settings correctly (Framework Preset: Create React App).
    *   **Build Command**: Should default to `npm run build` or `react-scripts build`.
    *   **Output Directory**: Should default to `build`.
    *   **Install Command**: Should default to `npm install`.
    *   **Environment Variables**: Go to your project settings on Vercel and add the environment variables listed in `.env.example` (e.g., `REACT_APP_GA_MEASUREMENT_ID`, etc.) with their actual values. This is the secure way to handle secrets.
4.  **Deploy**: Click the "Deploy" button.

Vercel will then build and deploy your application. Subsequent pushes to your connected Git branch will trigger automatic redeployments.

Alternatively, you can use the Vercel CLI for deployments from your local machine after installing it (`npm install -g vercel`) and logging in (`vercel login`). Navigate to your project directory and run `vercel` to deploy.

---
This codebase is now ready for your development and deployment workflows.

