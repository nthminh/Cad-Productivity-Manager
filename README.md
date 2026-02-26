<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/aef98ee4-e1dc-4faa-a109-b16cdb83bdda

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to Firebase Hosting

**Prerequisites:** [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)

1. Authenticate with Firebase:
   `firebase login`
2. Replace `your-firebase-project-id` in [.firebaserc](.firebaserc) with your actual Firebase project ID.
3. Set your Firebase environment variables in `.env.local` (see [.env.example](.env.example)).
4. Build the app:
   `npm run build`
5. Deploy to Firebase Hosting:
   `firebase deploy --only hosting`
