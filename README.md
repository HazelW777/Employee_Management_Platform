# Employee Management Platform

A full-stack HR management platform for employee onboarding, visa status tracking, and document management.

## Tech Stack

| Layer    | Technology                                              |
| -------- | ------------------------------------------------------- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Redux Toolkit |
| Backend  | Node.js, Express, TypeScript                            |
| Database | MongoDB (Mongoose)                                      |
| Monorepo | pnpm workspaces                                         |
| Shared   | Zod schemas + TypeScript types (`packages/shared`)      |

## Project Structure

```
.
├── apps/
│   ├── server/          # Express API
│   └── web/             # React SPA
└── packages/
    └── shared/          # Zod schemas and TypeScript types shared between apps
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 10+
- MongoDB instance (local or Atlas)

### Installation

```bash
pnpm install
```

### Development

Run both apps concurrently from the root:

```bash
# Start the backend
pnpm --filter server dev

# Start the frontend
pnpm --filter web dev
```

## Features

### Employee

- Onboarding application with document upload (profile photo, driver's license, OPT receipt)
- Visa status tracking with OPT chain progression (OPT Receipt → OPT EAD → I-983 → I-20)
- Profile management

### HR

- Invitation management (send, resend, revoke)
- Application review (approve / reject with feedback)
- Employee directory with search
- Visa status monitoring with document review and employee notifications

## API Overview

| Prefix                | Description                             |
| --------------------- | --------------------------------------- |
| `/api/auth`           | Register, login, logout, password reset |
| `/api/hr/invites`     | Invitation CRUD (HR only)               |
| `/api/onboarding`     | Application submit and review           |
| `/api/documents`      | Document upload, serving, and review    |
| `/api/profiles`       | Employee profile read and update        |
| `/api/hr/visa-status` | OPT chain status and notifications      |
