import { 
  users, type User, type InsertUser,
  brokers, type Broker, type InsertBroker,
  leads, type Lead, type InsertLead,
  activities, type Activity, type InsertActivity,
  broker_points, type BrokerPoints, type InsertBrokerPoints,
  kommo_config, type KommoConfig, type InsertKommoConfig
} from "@shared/schema";

// Define additional types for performance data
interface BrokerPerformance {
  monthlyData: {
    month: string;
    salesAmount: number;
    propertiesSold: number;
    points: number;
  }[];
  propertyTypes: {
    type: string;
    percentage: number;
    count: number;
  }[];
}

// Define data for heatmap
interface HeatmapData {
  dias: string[];
  horarios: string[];
  dados: number[][];
}

// Define data for alerts
interface BrokerAlert {
  tipo: string;
  mensagem: string;
  quantidade: number;
}

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Kommo API configuration
  getKommoConfig(): Promise<KommoConfig | undefined>;
  updateKommoConfig(config: InsertKommoConfig): Promise<KommoConfig>;
  
  // Dashboard methods
  getBrokerRankings(): Promise<BrokerPoints[]>;
  getBrokerById(id: number): Promise<Broker | undefined>;
  getBrokerPoints(id: number): Promise<BrokerPoints | undefined>;
  getBrokerLeads(id: number): Promise<Lead[]>;
  getBrokerActivities(id: number): Promise<Activity[]>;
  
  // Analytics methods
  getBrokerPerformance(id: number): Promise<BrokerPerformance>;
  getActivityHeatmap(id: number): Promise<HeatmapData>;
  getBrokerAlerts(id: number): Promise<BrokerAlert[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private brokerData: Map<number, Broker>;
  private leadData: Map<number, Lead>;
  private activityData: Map<string, Activity>;
  private brokerPointsData: Map<number, BrokerPoints>;
  private kommoConfigData: KommoConfig | undefined;
  private brokerPerformance: Map<number, BrokerPerformance>;
  private brokerHeatmap: Map<number, HeatmapData>;
  private brokerAlerts: Map<number, BrokerAlert[]>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.brokerData = new Map();
    this.leadData = new Map();
    this.activityData = new Map();
    this.brokerPointsData = new Map();
    this.brokerPerformance = new Map();
    this.brokerHeatmap = new Map();
    this.brokerAlerts = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getKommoConfig(): Promise<KommoConfig | undefined> {
    return this.kommoConfigData;
  }

  async updateKommoConfig(config: InsertKommoConfig): Promise<KommoConfig> {
    this.kommoConfigData = {
      id: 1,
      ...config,
      created_at: new Date(),
      updated_at: new Date()
    };
    return this.kommoConfigData;
  }

  async getBrokerRankings(): Promise<BrokerPoints[]> {
    return Array.from(this.brokerPointsData.values())
      .sort((a, b) => b.pontos - a.pontos);
  }

  async getBrokerById(id: number): Promise<Broker | undefined> {
    return this.brokerData.get(id);
  }

  async getBrokerPoints(id: number): Promise<BrokerPoints | undefined> {
    return this.brokerPointsData.get(id);
  }

  async getBrokerLeads(id: number): Promise<Lead[]> {
    return Array.from(this.leadData.values())
      .filter(lead => lead.responsavel_id === id);
  }

  async getBrokerActivities(id: number): Promise<Activity[]> {
    return Array.from(this.activityData.values())
      .filter(activity => activity.user_id === id);
  }

  async getBrokerPerformance(id: number): Promise<BrokerPerformance> {
    return this.brokerPerformance.get(id) || {
      monthlyData: [],
      propertyTypes: []
    };
  }

  async getActivityHeatmap(id: number): Promise<HeatmapData> {
    return this.brokerHeatmap.get(id) || {
      dias: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"],
      horarios: ["08h - 10h", "10h - 12h", "12h - 14h", "14h - 16h", "16h - 18h", "18h - 20h", "20h - 22h"],
      dados: []
    };
  }

  async getBrokerAlerts(id: number): Promise<BrokerAlert[]> {
    return this.brokerAlerts.get(id) || [];
  }
}

export const storage = new MemStorage();
