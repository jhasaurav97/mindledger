# MindLedger

### Grounded AI Thought Partner & Personal Intelligence Workspace

> **Reflect → Remember → Understand → Decide**

MindLedger is a secure, user-authenticated AI journaling and personal intelligence workspace that turns everyday reflections into **evidence-backed insights, long-term memory, and clearer decisions**.

> Internally provisioned as the Cloud Run service `reflections-journal-with-gemini` via Google AI Studio, publicly branded and accessed as **MindLedger**.

Built with **Google AI Studio, Gemini, Firebase, Cloud Firestore, Google Maps Platform, Notion, Gmail, and Google Cloud Run**.

### Live Demo

**https://mindledger.ai.studio**

### Source Code

**https://github.com/jhasaurav97/mindledger**

---

## Why MindLedger?

Most AI journaling applications stop at:

> "Write something → get an AI response."

MindLedger goes further.

It creates a private personal intelligence layer where reflections can become:

- **Grounded conversations** with Gemini
- **Searchable evidence** from your own journal
- **Persistent personal memories** connected through a graph
- **Transparent decision analysis**
- **Location-aware reflections**
- **Structured knowledge exported to Notion**
- **User-selected Gmail insights**
- **Long-term personal context** without pretending to know what the journal does not contain

The core design principle is simple:

> **AI should reason from evidence, clearly separate facts from analysis, and never invent personal history.**

---

# Product Highlights

## 1. Reflection Canvas

A multi-turn reflective workspace powered by Gemini.

Users can choose different interaction modes:

- Deep Reflection
- Brainstorming
- Socratic Inquiry
- Action Plan

Each reflection can include:

- title
- category
- tags
- optional location
- multi-turn Gemini conversation
- AI synthesis and summary

---

## 2. Ask My Journal

A private, evidence-grounded question-answering layer over the user's own journal.

Users can ask questions such as:

> "What goals have I mentioned recently?"

MindLedger retrieves relevant private reflections and provides:

- grounded answers
- source citations
- reflection references
- direct source opening
- explicit insufficient-evidence responses

### Grounding behavior

If the requested information does not exist in the user's journal, MindLedger does **not** fabricate an answer.

Instead it returns an explicit:

**Insufficient Evidence in Journal**

This creates a clear epistemic boundary between:

**What the user recorded**  
and  
**What Gemini can infer.**

---

## 3. Personal Memory Graph

MindLedger transforms authentic reflections into an evolving personal knowledge graph.

### Memory types

- Goals
- Themes
- Challenges
- Decisions
- Actions
- Wins
- Habits

### Relationships

- supports
- relates to
- blocks
- leads to
- resolves
- reinforces
- part of

The graph supports:

- interactive node exploration
- drag / pan / zoom
- search and filtering
- confidence scores
- supporting reflections
- connected memories
- evidence inspection
- edit
- archive / unarchive
- delete

Every important memory is connected back to its underlying reflection evidence.

---

## 4. Decision Lab

A structured decision-support workspace that evaluates real choices instead of producing unexplained recommendations.

Users define:

- decision question
- background context
- options
- evaluation criteria
- priorities
- optional journal evidence

MindLedger produces:

- comparative analysis
- pros and cons
- trade-offs
- risks
- unknowns
- confidence
- concrete next steps

The analysis explicitly separates:

**Facts supplied by the user**  
**Assumptions**  
**Gemini analytical reasoning**

This prevents unsupported AI certainty from being presented as fact.

---

## 5. Location-Aware Reflections

MindLedger optionally connects reflections with meaningful places using **Google Maps Platform**.

Users can:

- search for a place
- select a place from Google Places
- use their current location after explicit permission
- view an interactive map
- attach a location to a reflection
- remove the location later

### Privacy-first behavior

- location is optional
- no background location tracking
- no `watchPosition()`
- current location is requested only after an explicit user action
- location is stored with the user's own reflection
- permission failures do not block journaling
- manual location entry remains available

---

## 6. Notion Knowledge Bridge

MindLedger supports a real **Notion Public Connection OAuth 2.0 integration**.

Users can:

1. Connect their Notion workspace
2. Authorize specific pages
3. Choose a destination page
4. Export a selected MindLedger reflection
5. Open the resulting Notion page

Exported pages can contain:

- reflection title
- date
- category
- location
- original reflection
- Gemini executive summary
- key insights
- identified patterns
- next action steps
- relevant Decision Lab context
- relevant Memory Graph references
- MindLedger source attribution

User content and Gemini-generated analysis are clearly separated.

---

## 7. Gmail Intelligence Bridge

MindLedger also supports an explicit, user-authorized Gmail integration.

### Privacy model

- read-only Gmail access
- no automatic inbox synchronization
- no background inbox monitoring
- user chooses which email to inspect
- Gmail credentials are handled server-side
- integration can be disconnected

This allows MindLedger to use selected email context as an input to personal reflection and decision workflows without turning the application into an always-running inbox scanner.

---

# Security by Design

MindLedger was developed with production-oriented security directives and threat modeling across five major zones:

| Threat Zone | Protection |
|---|---|
| **Input Surfaces** | Validation, sanitization, bounded payloads, safe rendering |
| **Planning & Reasoning** | Prompt-injection boundaries and data/instruction separation |
| **Tool Execution** | Authenticated APIs, server-side external API calls, least privilege |
| **Memory & State** | Firebase UID ownership boundaries and user-scoped persistence |
| **Inter-System Communication** | OAuth protection, token isolation, restricted API access |

## Authentication

MindLedger uses **Firebase Authentication with Google Sign-In**.

No custom application password database is maintained.

Backend APIs independently verify Firebase ID tokens before allowing protected operations.

---

## Firestore Isolation

Personal data is stored under authenticated user boundaries such as:

```text
/users/{userId}/interactions/{interactionId}
```

and user-owned integration state is kept under user-specific paths such as:

```text
/users/{userId}/integrations/{integration}
```

Firestore rules enforce owner-based access:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{userId}/interactions/{interactionId} {
      allow read, write:
        if request.auth != null
        && request.auth.uid == userId;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

The backend never trusts a client-supplied UID as the authorization source.

---

## Secret Management

Sensitive credentials are never committed to source control.

Examples include:

```text
GEMINI_API_KEY
NOTION_CLIENT_ID
NOTION_CLIENT_SECRET
NOTION_ENCRYPTION_KEY
```

Secrets are supplied through protected server-side configuration.

The browser does not receive:

- Gemini server credentials
- Notion client secrets
- Notion access tokens
- Notion refresh tokens
- encryption keys

Google Maps uses a separate browser API key protected through application/API restrictions.

---

# Resilient Gemini Architecture

MindLedger uses a model fallback strategy instead of depending on a single Gemini model.

```text
gemini-3.6-flash
        ↓
gemini-3.1-flash-lite
        ↓
gemini-flash-latest
        ↓
gemini-3.7-flash
```

Recoverable API failures such as:

- `429`
- `404`
- `500`
- `503`

can trigger fallback behavior before an error is surfaced to the user.

This improves application resilience during model availability or quota issues.

---

# Notion OAuth Security

The Notion integration uses a production-oriented OAuth flow:

```text
MindLedger
    ↓
Firebase-authenticated user
    ↓
Notion OAuth authorization
    ↓
Protected OAuth state
    ↓
Server-side token exchange
    ↓
Encrypted user-scoped credential storage
    ↓
Authorized Notion destination
    ↓
Explicit reflection export
```

Important protections include:

- cryptographic OAuth state
- expiration
- replay protection
- authenticated UID binding
- server-side token exchange
- encrypted credential storage
- no token exposure through the frontend
- user-specific integration state
- graceful disconnect and failure handling

---

# Gmail Integration Security

The Gmail integration follows the same least-privilege philosophy:

- explicit user authorization
- read-only access
- no background synchronization
- server-side credential handling
- user-scoped integration state
- disconnect support
- selected-message workflow rather than unrestricted inbox processing

---

# Technology Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Responsive desktop/mobile UI
- Light / Dark themes

### Backend

- Node.js
- Express
- TypeScript

### AI

- Google Gemini API
- Multi-turn conversations
- Evidence-grounded retrieval
- Structured decision analysis
- Memory extraction
- Summarization

### Google Cloud

- Google AI Studio
- Cloud Run
- Cloud Firestore
- Firebase Authentication
- Secret Manager
- Google Maps Platform
- Places API
- Geocoding

### External Integrations

- Notion OAuth 2.0
- Gmail OAuth / read-only Gmail access

---

# Architecture

```text
                         ┌──────────────────────┐
                         │    MindLedger UI      │
                         │ React + TypeScript    │
                         └──────────┬───────────┘
                                    │
                           Firebase Authentication
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   Express Backend     │
                         │     Cloud Run         │
                         └───────┬───────┬──────┘
                                 │       │
                 ┌───────────────┘       └─────────────────┐
                 ▼                                         ▼
        ┌─────────────────┐                       ┌─────────────────┐
        │   Gemini API    │                       │  Cloud Firestore │
        │ AI reasoning    │                       │ User-isolated    │
        └─────────────────┘                       │ persistence      │
                                                  └─────────────────┘
                 │
      ┌──────────┼───────────┬──────────────┐
      ▼          ▼           ▼              ▼
   Maps       Notion       Gmail        Secret Manager
```

---

# Production Deployment

## Verified Cloud Run Deployment

MindLedger is deployed as the Cloud Run service `reflections-journal-with-gemini` (region `us-west1`), provisioned directly through Google AI Studio's deployment pipeline and mapped to the public domain `mindledger.ai.studio`.

<img width="800" height="381" alt="cloud-run-yaml-redacted" src="https://github.com/user-attachments/assets/cb8664a8-6e01-4234-9429-caf5e71ea284" />
<img width="800" height="379" alt="cloud-run-metrics-redacted" src="https://github.com/user-attachments/assets/4c30f3eb-b2b0-4840-b7db-9ea231296919" />

The required challenge label is applied at the service level:

## Prerequisites

Install and authenticate:

- Google Cloud CLI
- Firebase CLI
- Git

Configure your project:

```bash
gcloud init
gcloud config set project YOUR_PROJECT_ID
```

Enable the required services:

```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com
```

---

## Environment Variables

Configure sensitive values through your deployment environment.

Example:

```env
GEMINI_API_KEY=your_gemini_key

NOTION_CLIENT_ID=your_notion_client_id
NOTION_CLIENT_SECRET=your_notion_client_secret
NOTION_REDIRECT_URI=https://mindledger.ai.studio/api/integrations/notion/callback
NOTION_ENCRYPTION_KEY=your_application_encryption_key

VITE_GOOGLE_MAPS_API_KEY=your_restricted_maps_browser_key
```

**Never commit actual secret values.**

---

## Cloud Run Deployment

Example:

```bash
gcloud run deploy reflections-journal-with-gemini \
  --source . \
  --region us-west1 \
  --platform managed \
  --allow-unauthenticated
```

Configure the required secrets/environment variables in the Cloud Run service configuration.

The application itself performs user authentication before exposing protected journal and integration functionality.

---

# Challenge Verification Label

The Google Cloud Run challenge requires the following service label:

```text
dev-tutorial=cloud-run-ai-challenge
```

Apply it with:

```bash
gcloud run services update reflections-journal-with-gemini \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-west1
```

---

# Development

Install dependencies:

```bash
npm install
```

Run the application locally:

```bash
npm run dev
```

Type-check:

```bash
npx tsc --noEmit
```

Production build:

```bash
npm run build
```

---

# Functional Verification

MindLedger has been tested across the major product flows.

### Authentication

- Google Sign-In
- session persistence
- sign-out
- re-authentication
- protected backend endpoints
- owner-bound Firestore access

### Journal

- create reflection
- multi-turn Gemini interaction
- save and restore
- history
- summaries
- evidence-grounded queries

### Ask My Journal

- journal questions
- evidence citations
- source opening
- insufficient-evidence behavior

### Memory Graph

- extraction
- graph rendering
- search/filter
- evidence inspection
- editing
- archive/unarchive
- delete

### Decision Lab

- structured decision creation
- criteria
- journal grounding
- analysis
- saved decisions
- deletion

### Maps

- place search
- interactive map
- current location
- permission handling
- location persistence
- location removal

### Notion

- OAuth connection
- authorized destination selection
- connection persistence
- reflection export
- structured Notion page generation
- disconnect

### Gmail

- OAuth connection
- read-only email access
- explicit email selection
- no background synchronization
- disconnect

---

# Privacy & Data Principles

MindLedger is designed around explicit user control.

### Core principles

**Private by default**  
Personal reflections belong to the authenticated user.

**Evidence over invention**  
Gemini should distinguish recorded facts from analytical interpretation.

**Explicit external access**  
Notion and Gmail require user authorization.

**Least privilege**  
Integrations request only the access required for their intended workflow.

**No silent tracking**  
Location is optional and user initiated.

**Graceful degradation**  
External integrations should not prevent the core journaling experience from working.

---

# Project Structure

```text
mindledger/
├── public/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   ├── legal/
│   │   ├── AskJournalView.tsx
│   │   ├── DecisionLabView.tsx
│   │   ├── EntryEditor.tsx
│   │   ├── GmailSettingsModal.tsx
│   │   ├── LocationPickerModal.tsx
│   │   ├── MemoryGraphView.tsx
│   │   ├── NotionSettingsModal.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── firebase.ts
│   │   ├── gmail.ts
│   │   ├── notion.ts
│   │   └── theme.tsx
│   ├── server/
│   │   ├── gmailRouter.ts
│   │   └── notionRouter.ts
│   ├── utils/
│   ├── App.tsx
│   └── index.css
├── firestore.rules
├── metadata.json
├── package.json
├── server.ts
├── tsconfig.json
└── vite.config.ts
```

---

# Demo Flow

For a quick product walkthrough:

```text
1. Sign in with Google
        ↓
2. Create a reflection
        ↓
3. Continue a multi-turn Gemini conversation
        ↓
4. Open Ask My Journal
        ↓
5. Ask a grounded question and inspect citations
        ↓
6. Open Memory Graph
        ↓
7. Inspect evidence-backed memories
        ↓
8. Open Decision Lab
        ↓
9. Analyze a real decision using journal evidence
        ↓
10. Attach a location
        ↓
11. Save a reflection to Notion
        ↓
12. Inspect selected Gmail intelligence
```

This demonstrates that MindLedger is more than a chatbot or simple journal.

---

# Google AI Studio & Custom Instructions

MindLedger was developed using **Google AI Studio** with production-oriented custom instructions covering:

- agentic threat modeling
- secure coding
- Firebase/Firestore isolation
- secret management
- authentication boundaries
- prompt-injection defense
- model fallback
- functional verification
- deployment guidance
- README generation

The challenge specifically encourages using AI Studio to expand the starter application with custom capabilities and secure external integrations.

---

# Why This Project Goes Beyond the Starter

The starter application establishes:

- Firebase authentication
- Gemini interaction
- Firestore persistence

MindLedger expands that foundation into a broader personal intelligence product through:

**Grounded journal retrieval**  
+ **Personal Memory Graph**  
+ **Decision Lab**  
+ **Location-aware reflections**  
+ **Notion knowledge export**  
+ **Gmail intelligence**  
+ **production-oriented security boundaries**

The goal is not to add features for the sake of feature count.

The goal is to create one coherent product where personal information can move through a secure pipeline:

```text
Reflect
   ↓
Remember
   ↓
Retrieve evidence
   ↓
Understand patterns
   ↓
Evaluate decisions
   ↓
Turn insight into action
```

---

# License

This project was created as a Google Cloud / Google AI Studio challenge project.

See the repository for the current source and implementation.

---

# Showcase

**Live App:**  
https://mindledger.ai.studio

**GitHub:**  
https://github.com/jhasaurav97/mindledger

**Challenge:**  
Google Cloud Run Build & Deploy Social Challenge

**Hashtag:**  
`#AccelerateAIwithCloudRun`

---
