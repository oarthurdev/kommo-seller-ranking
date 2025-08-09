import {
  pgTable,
  text,
  uuid,
  integer,
  boolean,
  timestamp,
  numeric,
  json,
  bigint,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Tabela de usuários do sistema
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  subdomain: text("subdomain").notNull().unique(),
  created_at: timestamp("created_at").defaultNow(),
});

// Tabela de corretores
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

// Tabela de leads
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
  updated_at: timestamp("updated_at").defaultNow(),
  company_id: uuid("company_id").references(() => companies.id, {
    onDelete: "set null",
  }),
});

// Tipo para múltiplos pipelines
export interface PipelineConfig {
  pipelines: Array<{
    id: number;
    name: string;
    description?: string;
  }>;
}

// Tipo para lead com pipeline específico
export interface LeadWithPipeline extends Lead {
  pipeline_name?: string;
}

export const insertLeadSchema = createInsertSchema(leads).omit({
  updated_at: true,
});

// Tabela de atividades
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

// Tabela de pontuação dos corretores
export const broker_points = pgTable("broker_points", {
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
  company_id: uuid("company_id").references(() => companies.id, {
    onDelete: "set null",
  }),
});

export const insertBrokerPointsSchema = createInsertSchema(broker_points).omit({
  updated_at: true,
});

// Tabela para configuração da API Kommo
export const kommo_config = pgTable("kommo_config", {
  id: integer("id").primaryKey(),
  api_url: text("api_url").notNull(),
  access_token: text("access_token").notNull(),
  refresh_token: text("refresh_token"),
  sync_interval: integer("sync_interval").default(60), // em minutos
  last_sync: timestamp("last_sync"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  company_id: uuid("company_id").references(() => companies.id, {
    onDelete: "set null",
  }),
});

export const insertKommoConfigSchema = createInsertSchema(kommo_config).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Types para TypeScript
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Broker = typeof brokers.$inferSelect;
export type InsertBroker = z.infer<typeof insertBrokerSchema>;

export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

// export type BrokerPoints = typeof broker_points.$inferSelect;
export interface BrokerPoints {
  id: number;
  nome: string;
  pontos: number;
  // Métricas positivas
  leads_visitados: number;
  propostas_enviadas: number;
  vendas_realizadas: number;
  // Métricas negativas
  leads_perdidos: number;
  // Outras métricas gerais
  total_leads?: number;
  ticket_medio?: number;
  vgv_mes?: number;
  vendas_fechadas?: number;
  tempo_primeira_interacao?: string;
  taxa_conversao?: number;
}
export type InsertBrokerPoints = z.infer<typeof insertBrokerPointsSchema>;

export type KommoConfig = typeof kommo_config.$inferSelect;
export type InsertKommoConfig = z.infer<typeof insertKommoConfigSchema>;
```export type BrokerPoints = typeof broker_points.$inferSelect;
export type InsertBrokerPoints = z.infer<typeof insertBrokerPointsSchema>;

export type KommoConfig = typeof kommo_config.$inferSelect;
export type InsertKommoConfig = z.infer<typeof insertKommoConfigSchema>;