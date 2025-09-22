# Overview

This is a multi-tenant real estate broker ranking system that provides real-time performance analytics and competitive insights for real estate companies. The system displays broker rankings based on a sophisticated points system, individual broker profiles with detailed metrics, and automatic page rotation for TV displays. Each company has isolated data, custom branding, and configurable sales pipelines integrated with Kommo/AmoCRM.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React + TypeScript** with Vite for build tooling
- **Tailwind CSS** with shadcn/ui components for consistent, responsive design
- **Multi-resolution support** with custom breakpoints (HD, FHD, QHD, UHD) optimized for TV displays
- **Automatic page rotation** system for unattended TV mode cycling through main ranking and top 3 broker profiles
- **Real-time data updates** using React Query with polling intervals
- **Company-specific branding** system with customizable colors, logos, and themes applied via CSS custom properties

## Backend Architecture
- **Express.js** server with TypeScript
- **Multi-tenant architecture** using company IDs for data isolation
- **Middleware-based company context** extraction from subdomains
- **RESTful API** structure with company-scoped endpoints
- **CORS configuration** supporting multiple allowed domains including development and production environments

## Data Storage Solutions
- **Primary Database**: PostgreSQL via Supabase with Prisma ORM
- **Schema Design**: 
  - Companies table for tenant isolation
  - Brokers, leads, activities for core business data
  - Broker_points for calculated performance metrics
  - Component_filters for per-component filter persistence
  - Company_branding for customizable themes
- **Database Functions**: Custom PostgreSQL functions for complex analytics queries like lost leads funnel analysis

## Authentication and Authorization
- **Simple password-based auth** per company with expiration dates
- **Session management** via localStorage with expiration checking
- **Protected routes** using React context and route guards
- **Company-scoped access** ensuring data isolation between tenants

## External Dependencies

### Third-Party Services
- **Supabase**: PostgreSQL database hosting and real-time subscriptions
- **Kommo/AmoCRM Integration**: CRM pipeline synchronization for lead and sales data
- **Rate Limiting**: Built-in request throttling for external API calls

### Key Libraries and Frameworks
- **React Query**: Data fetching, caching, and synchronization
- **Wouter**: Lightweight client-side routing
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon system
- **Date-fns**: Date manipulation utilities
- **Prisma**: Type-safe database ORM and query builder
- **Drizzle ORM**: Alternative ORM configuration for schema management

### Development and Build Tools
- **Vite**: Fast development server and build tool
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Backend bundling for production
- **Tailwind CSS**: Utility-first styling framework
- **PostCSS**: CSS processing and autoprefixing