# Frontend Base

## Purpose

The frontend is the user-facing layer of the platform. It provides the interface between users and the backend API, allowing users to interact with the system without dealing with backend implementation details.

The frontend connects users with the AI-assisted product discovery system while providing normal marketplace functionality.

---

## Frontend Responsibility

The frontend is responsible for:

- Rendering user interfaces
- Collecting user input
- Managing user interaction
- Displaying backend data
- Managing UI state
- Handling navigation
- Providing loading, error, success, and empty states
- Presenting backend and AI-generated information

The frontend is not responsible for:

- Business logic
- Product filtering rules
- Ranking algorithms
- Price calculations
- Database logic
- Permission enforcement
- Core validation rules

---

## Frontend Boundaries

The backend is the source of truth.

The frontend should:
- request data
- display data
- collect user actions
- provide user feedback

The frontend should not recreate backend business rules.

Frontend role awareness exists only for user experience purposes. The backend remains responsible for authentication and authorization.

---

## User Roles

The frontend recognizes:

- Guest
- Customer
- Store
- Admin

Roles affect:

- available navigation
- accessible pages
- dashboards
- visible features

Backend remains the final authority for permissions.

---

## User Experience Philosophy

The platform provides a hybrid AI-assisted marketplace experience.

Users should be able to:

- describe their needs naturally
- discover products
- browse normally
- compare options
- view store offers
- make purchasing decisions

The detailed AI search experience is defined separately.

---

## Core Principles

### Feature-oriented structure

The frontend should be organized around business features and user flows rather than isolated UI elements.

### Backend-driven data

Frontend consumes backend APIs and does not duplicate backend logic.

### Clear user experience

User actions should always provide clear feedback:

- loading
- success
- failure
- empty states

### Reusable components

Common UI elements should be reusable where appropriate.

### Scalability

The structure should allow future features without major rewrites.

---

## Communication With Backend

- Frontend communicates through the public backend API.
- Frontend does not depend on backend implementation details.
- Backend is the source of truth.
- User experience drives frontend requirements.
- Missing API capabilities become backend requirements.

---

## State Philosophy

Frontend state is divided into:

### Server State

Data received from backend APIs.

Examples:

- products
- offers
- orders
- user information

### UI State

Temporary interface state.

Examples:

- modal visibility
- selected tabs
- form states
- loading indicators

### Shared Client State

State that genuinely needs to be shared across multiple frontend areas.

Global state should be used only when necessary.