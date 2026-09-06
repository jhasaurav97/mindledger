# Reflections & Journal with Gemini and Firestore

A production-grade, user-authenticated reflective journaling and AI thought-partner application built with React, Vite, Express, the **Gemini 3.6 Flash API**, **Firebase Authentication**, and **Cloud Firestore**.

---

## 🌟 Architecture & Key Features

- **User Identity (Firebase Auth)**: Secure Google Sign-In with popup/federated auth. Zero custom passwords collected or stored.
- **User-Isolated Database (Cloud Firestore)**: Every reflection session, journal entry, prompt, and AI response is securely saved to `/users/{userId}/interactions/{interactionId}` with owner-bound security rules preventing cross-user data access.
- **Location-Aware Reflections**: Optional, user-initiated place attachment using Google Maps Platform (Places Autocomplete and interactive map preview with AdvancedMarkerElement). Zero background GPS tracking; location data is isolated within the user's private reflection document.
- **Personal Memory Graph**: Evidence-backed interactive semantic graph extracting Goals, Themes, Challenges, Decisions, Actions, Wins, and Habits directly from authentic reflections.
- **Decision Lab**: Transparent, evidence-grounded decision analysis tool evaluating options, criteria, pros, cons, tradeoffs, and uncertainties without hallucinated facts.
- **Gemini 3.6 Flash Engine**: Provides multi-turn conversational reflection, lateral brainstorming, Socratic questioning, and automated executive summarization with structured insights.
- **Resilient Fallback Ladder**: Automated model fallback (`gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`) with error recovery handling (503, 429, 404, 500).
- **Zero-Hardcoding Hygiene**: All credentials and Gemini API keys are proxied server-side and managed via Secret Manager / environment variables.

---

## 🚀 Step-by-Step Google Cloud Deployment Guide

Follow these steps to deploy this application directly to **Google Cloud Run**.

### 1. Environment & Prerequisites

1. Install and initialize the [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (`gcloud` CLI):
   ```bash
   gcloud init
   ```

2. Set your Google Cloud Project ID and default region:
   ```bash
   export PROJECT_ID="YOUR_PROJECT_ID"
   export REGION="us-central1"
   gcloud config set project $PROJECT_ID
   ```

3. Enable the required Google Cloud APIs:
   ```bash
   gcloud services enable \
     run.googleapis.com \
     secretmanager.googleapis.com \
     firestore.googleapis.com \
     artifactregistry.googleapis.com \
     cloudbuild.googleapis.com
   ```

---

### 2. Secret Management Setup

Store your Gemini API key securely in Google Cloud Secret Manager so it is never hardcoded:

```bash
# 1. Create the secret in Secret Manager
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# 2. Add your secret version
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 3. Retrieve your project number
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

# 4. Grant the default Cloud Run runtime service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

### 3. Database Security Configuration (Cloud Firestore)

Deploy the owner-bound security rules to ensure user data isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Deploy rules using the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

### 4. Cloud Run Deployment Flow

Deploy the containerized full-stack application to Cloud Run with automatic secret injection:

```bash
gcloud run deploy reflections-app \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

---

### 5. Required Campaign Labeling

Apply the mandatory verification label to your Cloud Run service:

```bash
gcloud run services update reflections-app \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=$REGION
```

---

### 6. Google Maps Platform Setup (Location-Aware Reflections)

For optional interactive Google Maps and Places search:

1. Enable **Maps JavaScript API**, **Places API**, and **Geocoding API** in your Google Cloud project:
   ```bash
   gcloud services enable \
     maps-backend.googleapis.com \
     places-backend.googleapis.com \
     geocoding-backend.googleapis.com
   ```
2. Create an API key restricted to **HTTP referrers** (your app's domain) and designated APIs (Maps JavaScript API, Places API, Geocoding API):
   [API Key Restrictions Guide](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys)
3. Set the environment variable `VITE_GOOGLE_MAPS_API_KEY`:
   ```bash
   # In local development:
   echo 'VITE_GOOGLE_MAPS_API_KEY="AIzaSy..."' >> .env.local
   ```
4. *Graceful Fallback:* If no API key is provided, the application automatically enables a non-map fallback where users can type any location manually or select from curated reflective presets.

---

## 🔒 Security Threat Model Summary

| Threat Zone | Risk Mitigated | Countermeasure |
| :--- | :--- | :--- |
| **Input Surfaces** | Prompt Injection / XSS / Malformed Coordinates | Strict schema validation (`validateReflectionLocation`, coordinate range checks in `[-90, 90]`, `[-180, 180]`), string truncation, prompt delimiters (`<entry>`), zero raw HTML injection. |
| **Tool / Execution** | Unauthorized API usage / Secret Exfiltration | Server-side proxying for Gemini; Gemini API keys are never exposed to the client. Restrict Google Maps API keys via HTTP referrers. |
| **Memory & State** | Cross-tenant data leakage | Strict owner-bound Firestore security rules (`request.auth.uid == userId`). Location data is stored only inside the authenticated user's private interaction document. |
| **Authentication** | Session hijacking / Password theft | Federated Google Sign-In via Firebase Auth. Zero passwords collected or stored. Server-side token verification on API endpoints. |
| **Location Privacy** | Continuous tracking / Surveillance | No background or continuous GPS monitoring. Location is attached solely through explicit user selection for an individual reflection. Users can view or remove location at any time. |

---

## 🧪 Functional Walkthrough & Test Guide

### Test Suite 1: Authentication & Data Isolation
1. **Google Sign-In**: Open the application, click "Sign in with Google", complete authentication. Verify user profile card appears in top navigation.
2. **Session Persistence**: Refresh the browser; confirm the user session and loaded reflections persist without re-prompting login.
3. **Owner-Bound Path Isolation**: Check Firestore console; verify user documents are isolated under `/users/{uid}/interactions/`.

### Test Suite 2: Location-Aware Reflections
1. **Open Location Picker**: In the Reflection Canvas, locate and click the "Add Location" button. Verify the modal opens with the privacy guarantee banner: *"Location is optional and saved only with this reflection. MindLedger does not track your live location."*
2. **Search Place or Pick Curated Setting**:
   - With Google Maps API key: Type in the Places search input and select a place. Verify the interactive map centers with an AdvancedMarker pin.
   - Without API key: Notice the informative fallback banner. Select a curated preset (e.g. "Cozy Neighborhood Cafe") or enter a custom place name and address.
3. **Use My Current Location**:
   - Click the "Use My Current Location" button located directly next to the Places search field (or in the fallback banner).
   - Verify the button enters a loading state (`Locating...` with spinner) while requesting position.
   - Confirm your browser prompts for location permission (never prompted automatically before clicking).
   - Upon granting permission, verify latitude and longitude are retrieved, reverse-geocoded to a human-readable place/address, the interactive map pans to the coordinates, and the place details card displays the location details with the "Attached" status badge.
   - If permission is denied in browser settings, verify a friendly, dismissible warning banner appears explaining that location permission was denied and manual search remains available.
4. **Attach Location**: Click "Attach Location". Verify the modal closes and an active location badge appears in the reflection header showing the place name and address.
5. **Interactive Reflection**: Enter reflection thoughts and click Send. Verify Gemini responds mindfully with location context taken into account as background setting.
6. **Restoration & Persistence**: Switch to History tab; verify the reflection card displays the location badge. Click to re-open the entry in the canvas; verify the location badge is restored.
7. **Location Removal**: Click the "X" button on the location badge or click "Remove Location" in the modal. Verify the location is removed and the changes are auto-saved to Firestore without modifying or deleting messages or the title.

### Test Suite 3: Personal Memory Graph
1. **View Graph**: Click "Memory Graph" in the navigation. Verify interactive canvas renders extracted nodes (Goals, Themes, Wins, Habits, etc.).
2. **Inspect Supporting Reflection**: Click on a node to view details in the sidebar. Locate "Supporting Reflections"; if a supporting reflection has an attached location, verify the location indicator is displayed alongside its date and title.
3. **Node Filtering & Semantic Search**: Use the search bar or type filters (e.g., "Goals") to filter the graph in real-time.

### Test Suite 4: Decision Lab
1. **Create Decision**: Navigate to "Decision Lab", click "New Analysis".
2. **Enter Context & Options**: Enter a decision question, description, options (e.g. "Option A", "Option B"), and criteria.
3. **Evidence-Grounded Analysis**: Toggle "Use My Journal Reflections as Evidence", click "Analyze Decision". Verify structured evaluation with pros, cons, tradeoffs, and uncertainties.

### Test Suite 5: Ask My Journal
1. **Evidence-Grounded Inquiry**: Go to "Ask My Journal", ask a question about your previous reflections.
2. **Grounding Verification**: Verify Gemini cites specific journal entries and includes location context if relevant.
3. **Insufficient Evidence Guard**: Ask about an unrelated topic never mentioned in your journal; verify it explicitly states there is not enough evidence in your journal.

---

## 9. Notion Knowledge Bridge (Multi-User SaaS Integration)

MindLedger integrates with Notion via Notion Public Connection OAuth 2.0 to export structured reflections with Gemini synthesis.

### OAuth Architecture & Security Boundaries
- **Backend Token Exchange**: Browser never handles `NOTION_CLIENT_SECRET`, Notion access tokens, or refresh tokens.
- **AES-256-GCM Vault Encryption**: Tokens are stored encrypted in server-side storage keyed to the authenticated Firebase UID.
- **State Token Validation**: 10-minute expiring cryptographic state tokens prevent OAuth CSRF.
- **Configured Redirect URI**: `https://mindledger.ai.studio/api/integrations/notion/callback`
- **Structured Notion Page Hierarchy**:
  - Reflection title & date
  - Category badge & location context (when attached)
  - Original user reflection text (clearly separated from AI)
  - Gemini-generated Executive Summary, Key Insights, Identified Patterns, and Next Action Steps
  - Decision Lab context and Memory Graph references
  - MindLedger source attribution and interaction ID

### Environment Configuration
```env
NOTION_CLIENT_ID=your_notion_client_id
NOTION_CLIENT_SECRET=your_notion_client_secret
NOTION_REDIRECT_URI=https://mindledger.ai.studio/api/integrations/notion/callback
NOTION_ENCRYPTION_KEY=your_32_byte_aes_key
```

---

## 10. Geolocation Diagnostic & Verification Walkthrough

### Test Case 1: Geolocation Trigger Isolation
- **Action**: Load the application, open an entry, and open the Location Picker Modal.
- **Verification**: `navigator.geolocation.getCurrentPosition()` is **NOT** executed on modal open, map load, or page refresh. Network/console logs confirm zero geolocation requests.

### Test Case 2: User-Initiated Detection & Map Centering
- **Action**: Click the "Use My Current Location" button.
- **Verification**: Geolocation is triggered only upon click. On success, the map centers on the coordinates, the pin marker updates, reverse geocoding populates the place name/address, and "Attach Location" is enabled.

### Test Case 3: Error Code Differentiation & Iframe Sandbox Detection
- **Action**: Test in browser environments with permissions denied or within an embedded iframe preview.
- **Verification**:
  - If inside an iframe and blocked, the UI detects iframe status and displays clear guidance with an **"Open in New Tab"** button and quick fallback to **"Use Mindful Preset"** or manual entry.
  - Distinct messages are displayed for `PERMISSION_DENIED` (code 1), `POSITION_UNAVAILABLE` (code 2), and `TIMEOUT` (code 3).

---

## 11. Public Legal Documentation Routes (`/privacy` & `/terms`)

MindLedger provides standalone, public-facing legal information pages accessible directly without requiring authentication or redirects:

- **`/privacy`**: Comprehensive MindLedger Privacy Policy detailing data collection (Google identity, reflections, optional location, Notion/Gmail credentials), Gemini AI model processing terms, Firestore owner-bound isolation, user data rights, and transparent security disclosures.
- **`/terms`**: MindLedger Terms of Service defining the personal intelligence workspace, acceptable use policies, user ownership of thoughts/reflections, AI disclaimer (Gemini is an assistant, not medical/legal/financial advice), third-party integration terms, and liability limits.

### Architectural & Security Guarantees:
1. **Public Zero-Auth Access**: Immediate access without Firebase sign-in or session loading spinners.
2. **Zero Insecure Redirects**: Navigating directly to `https://mindledger.ai.studio/privacy` or `https://mindledger.ai.studio/terms` loads the legal document directly.
3. **Seamless Navigation**: Users can jump back to the landing page or active journal session with one click without resetting state.
4. **Theme Responsive**: Full support for both light and dark modes with typographic hierarchy and jump-to-section navigation.



