// schema.ts
import {
  pgTable,
  pgSchema,
  text,
  uuid,
  integer,
  boolean,
  timestamp,
  numeric,
  jsonb,
  bigint,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

//
// =======================
// 📦 SCHEMAS
// =======================
//
export const cfCompanies = pgSchema("cf_companies");
export const cfKommo = pgSchema("cf_kommo");

//
// =======================
// 🏢 COMPANIES (cf_companies)
// =======================
//
export const companies = cfCompanies.table("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  subdomain: text("subdomain").notNull().unique(),
  created_at: timestamp("created_at").defaultNow(),
});

//
// =======================
// 👤 USERS
// =======================
//
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

//
// =======================
// 🧑‍💼 BROKERS
// =======================
//
export const brokers = pgTable("brokers", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  nome: text("nome").notNull(),
  email: text("email"),
  foto_url: text("foto_url"),
  cargo: text("cargo"),
  active: boolean("active").default(true),
  company_id: uuid("company_id").references(() => companies.id, {
    onDelete: "set null",
  }),
  criado_em: timestamp("criado_em"),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const insertBrokerSchema = createInsertSchema(brokers).omit({
  updated_at: true,
});

//
// =======================
// 🎯 LEADS
// =======================
//
export const leads = pgTable("leads", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  nome: text("nome").notNull(),
  responsavel_id: bigint("responsavel_id", { mode: "number" }).references(
    () => brokers.id,
    { onDelete: "set null" },
  ),
  contato_nome: text("contato_nome"),
  valor: numeric("valor", { precision: 12, scale: 2 }),
  status_id: bigint("status_id", { mode: "number" }),
  pipeline_id: bigint("pipeline_id", { mode: "number" }),
  etapa: text("etapa"),
  criado_em: timestamp("criado_em"),
  atualizado_em: timestamp("atualizado_em"),
  fechado: boolean("fechado").default(false),
  status: text("status"),
  custom_fields_values: jsonb("custom_fields_values"),
  updated_at: timestamp("updated_at").defaultNow(),
  company_id: uuid("company_id").references(() => companies.id, {
    onDelete: "set null",
  }),
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  updated_at: true,
});

//
// =======================
// 🔄 ACTIVITIES
// =======================
//
export const activities = pgTable("activities", {
  id: text("id").primaryKey(),
  lead_id: bigint("lead_id", { mode: "number" }).references(() => leads.id, {
    onDelete: "cascade",
  }),
  user_id: bigint("user_id", { mode: "number" }).references(() => brokers.id, {
    onDelete: "set null",
  }),
  tipo: text("tipo"),
  valor_anterior: text("valor_anterior"),
  valor_novo: text("valor_novo"),
  criado_em: timestamp("criado_em"),
  dia_semana: text("dia_semana"),
  hora: integer("hora"),
  updated_at: timestamp("updated_at").defaultNow(),
  company_id: uuid("company_id").references(() => companies.id, {
    onDelete: "set null",
  }),
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  updated_at: true,
});

//
// =======================
// 🏆 BROKER POINTS
// =======================
//
export const brokerPoints = pgTable("broker_points", {
  id: bigint("id", { mode: "number" })
    .primaryKey()
    .references(() => brokers.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  pontos: integer("pontos").default(0),
  leads_visitados: integer("leads_visitados").default(0),
  propostas_enviadas: integer("propostas_enviadas").default(0),
  vendas_realizadas: integer("vendas_realizadas").default(0),
  leads_perdidos: integer("leads_perdidos").default(0),
  updated_at: timestamp("updated_at").defaultNow(),
  company_id: uuid("company_id").references(() => companies.id),
});

export const insertBrokerPointsSchema =
  createInsertSchema(brokerPoints).omit({
    updated_at: true,
  });

//
// =======================
// 🔌 KOMMO CONFIG (cf_kommo)
// =======================
//
export const kommoConfig = cfKommo.table("kommo_config", {
  id: integer("id").primaryKey(),
  company_id: uuid("company_id").references(() => companies.id),
  api_url: text("api_url").notNull(),
  access_token: text("access_token").notNull(),
  refresh_token: text("refresh_token"),
  custom_endpoint: text("custom_endpoint"),
  pipeline_id: jsonb("pipeline_id").$type<number[]>(),
  last_sync: timestamp("last_sync"),
  next_sync: timestamp("next_sync"),
  active: boolean("active").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const insertKommoConfigSchema =
  createInsertSchema(kommoConfig).omit({
    id: true,
    created_at: true,
    updated_at: true,
  });

//
// =======================
// 🎨 COMPANY BRANDING
// =======================
//
export const companyBranding = pgTable("company_branding", {
  id: integer("id").primaryKey(),
  company_id: uuid("company_id")
    .references(() => companies.id)
    .notNull()
    .unique(),
  primary_color: text("primary_color").default("#3b82f6"),
  secondary_color: text("secondary_color").default("#1e40af"),
  accent_color: text("accent_color").default("#22c55e"),
  logo_url: text("logo_url"),
  favicon_url: text("favicon_url"),
  company_name_display: text("company_name_display"),
  dashboard_title: text("dashboard_title").default("Ranking de Corretores"),
  theme_mode: text("theme_mode").default("light"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const insertCompanyBrandingSchema =
  createInsertSchema(companyBranding).omit({
    id: true,
    created_at: true,
    updated_at: true,
  });

//
// =======================
// 📏 RULES
// =======================
//
export const rules = pgTable("rules", {
  id: integer("id").primaryKey(),
  nome: text("nome").notNull(),
  coluna_nome: text("coluna_nome").notNull().unique(),
  pontos: integer("pontos").notNull(),
  descricao: text("descricao"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const companyRules = pgTable("company_rules", {
  id: integer("id").primaryKey(),
  company_id: uuid("company_id").references(() => companies.id).notNull(),
  rule_id: integer("rule_id").references(() => rules.id).notNull(),
  pontos: integer("pontos").notNull(),
  active: boolean("active").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const customRules = pgTable("custom_rules", {
  id: integer("id").primaryKey(),
  company_id: uuid("company_id").references(() => companies.id).notNull(),
  nome: text("nome").notNull(),
  coluna_nome: text("coluna_nome").notNull(),
  pontos: integer("pontos").notNull(),
  descricao: text("descricao"),
  active: boolean("active").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

//
// =======================
// 📊 DYNAMIC METRICS
// =======================
//
export const dynamicMetrics = pgTable("dynamic_metrics", {
  id: integer("id").primaryKey(),
  company_id: uuid("company_id").references(() => companies.id).notNull(),
  nome: text("nome").notNull(),
  pipeline_stage_id: integer("pipeline_stage_id").notNull(),
  pipeline_stage_name: text("pipeline_stage_name").notNull(),
  valor_minimo: integer("valor_minimo").notNull(),
  cor_sucesso: text("cor_sucesso").default("#22c55e"),
  cor_alerta: text("cor_alerta").default("#ef4444"),
  active: boolean("active").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const metricResults = pgTable("metric_results", {
  id: integer("id").primaryKey(),
  dynamic_metric_id: integer("dynamic_metric_id")
    .references(() => dynamicMetrics.id)
    .notNull(),
  company_id: uuid("company_id").references(() => companies.id).notNull(),
  valor_atual: integer("valor_atual").notNull(),
  status: text("status").notNull(),
  periodo_referencia: text("periodo_referencia"),
  leads_count: integer("leads_count").default(0).notNull(),
  atingiu_meta: boolean("atingiu_meta").default(false).notNull(),
  calculado_em: timestamp("calculado_em").defaultNow(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

//
// =======================
// 🔔 NOTIFICATIONS / ALERTS
// =======================
//
export const notifications = pgTable("notifications", {
  id: integer("id").primaryKey(),
  company_id: uuid("company_id").references(() => companies.id).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(),
  priority: text("priority").default("normal").notNull(),
  category: text("category").notNull(),
  read: boolean("read").default(false),
  action_url: text("action_url"),
  metadata: jsonb("metadata"),
  expires_at: timestamp("expires_at"),
  created_at: timestamp("created_at").defaultNow(),
});

export const alertSettings = pgTable("alert_settings", {
  id: integer("id").primaryKey(),
  company_id: uuid("company_id")
    .references(() => companies.id)
    .notNull()
    .unique(),
  email_alerts: boolean("email_alerts").default(true),
  browser_notifications: boolean("browser_notifications").default(true),
  daily_summary: boolean("daily_summary").default(true),
  sync_failure_alerts: boolean("sync_failure_alerts").default(true),
  ranking_change_alerts: boolean("ranking_change_alerts").default(false),
  metric_threshold_alerts: boolean("metric_threshold_alerts").default(true),
  admin_email: text("admin_email"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

//
// =======================
// 📑 REPORTS
// =======================
//
export const automaticReports = pgTable("automatic_reports", {
  id: integer("id").primaryKey(),
  company_id: uuid("company_id").references(() => companies.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  frequency: text("frequency").notNull(),
  report_type: text("report_type").notNull(),
  email_recipients: text("email_recipients").array(),
  include_charts: boolean("include_charts").default(true),
  include_comparisons: boolean("include_comparisons").default(true),
  active: boolean("active").default(true),
  last_generated: timestamp("last_generated"),
  next_generation: timestamp("next_generation"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

//
// =======================
// 🔐 AUTH SYSTEM
// =======================
//
export const authSystem = pgTable("auth_system", {
  id: integer("id").primaryKey(),
  company_id: uuid("company_id")
    .references(() => companies.id)
    .notNull()
    .unique(),
  password: text("password").notNull(),
  expire_at: timestamp("expire_at").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});