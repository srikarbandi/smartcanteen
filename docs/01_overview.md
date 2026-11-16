# 1. Project Overview

## 1.1 Problem Statement
During peak lunch hours, college canteens face long queues and congestion. Students
waste time waiting, popular items sell out unpredictably, and vendors struggle to
plan preparation and manage stock. There is no reliable system to pre-order meals,
guarantee availability, or spread demand across time.

## 1.2 Objectives
- Let students **pre-order meals** and **reserve a pickup slot** to avoid queues.
- Keep **inventory and pickup-slot capacity consistent** even under concurrent orders.
- Give vendors tools to **manage menus, stock and orders** and see daily performance.
- Maintain **reliable, auditable order records** across a relational + NoSQL design.
- Demonstrate practical DBMS concepts through a real, working application.

## 1.3 Scope
**In scope:** student ordering (browse, search, cart, slot selection, place, track,
cancel, rate), vendor management (menu, inventory, incoming orders, status updates,
feedback analytics), authentication with two roles, and the full database layer.

**Out of scope (deliberately):** online payments, delivery, AI recommendations,
email/SMS, multiple campuses, and any third role beyond Student/Vendor. `payment_status`
is modelled as an order attribute (from the Lab 4 design) but no payment gateway is integrated.

## 1.4 Functional Requirements
| # | Requirement |
|---|---|
| FR1 | Student can register and log in; vendor can log in. |
| FR2 | Student can browse, search and filter available food items per canteen. |
| FR3 | Student can add items to a cart and choose quantities (bounded by stock). |
| FR4 | Student can select an available pickup slot and place an order. |
| FR5 | Placing an order deducts inventory and reserves slot capacity atomically. |
| FR6 | Student can view order status, history, and cancel eligible orders. |
| FR7 | Cancelling restores inventory and releases slot capacity exactly once. |
| FR8 | Student can rate a collected order (stored in MongoDB). |
| FR9 | Vendor can add/edit food items and set prices/availability. |
| FR10 | Vendor can update inventory levels. |
| FR11 | Vendor can view incoming orders and advance their status through a valid lifecycle. |
| FR12 | Vendor dashboard shows daily orders/sales, low stock, and average feedback rating. |

## 1.5 Non-Functional Requirements
- **Integrity:** data validated at frontend, backend (zod) and database (constraints).
- **Concurrency safety:** no negative stock, no slot overbooking, no duplicate deductions.
- **Security:** bcrypt-hashed passwords, signed HTTP-only session cookies, parameterized SQL, credentials only in env vars.
- **Usability:** clean, responsive interface; works on phone widths.
- **Maintainability:** typed TypeScript, clear separation of MySQL vs MongoDB responsibilities.

## 1.6 Technology Stack
| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend/API | Next.js Route Handlers (server-side) |
| Relational DB | MySQL 8+ (InnoDB) via `mysql2` |
| NoSQL DB | MongoDB via official driver |
| Auth | bcrypt (bcryptjs), signed HTTP-only cookies |
| Validation | zod |
| Version control | Git + GitHub |

## 1.7 Team
| Member | Reg. No. | Primary ownership |
|---|---|---|
| Sreekar Bandi | PES1UG24AM282 | MySQL schema, transactions/concurrency, procedures/triggers/views, student ordering workflow |
| Soha Rafiq | PES1UG24AM278 | MongoDB implementation, activity logging & feedback, auth/authorization, vendor dashboard & management |

See [`06_team_contributions.md`](06_team_contributions.md) for the detailed matrix.
