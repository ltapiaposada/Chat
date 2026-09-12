import axios from 'axios'
import { getAuthHeaders } from './authHeaders'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export interface AdminChannel {
  id: number
  name: string
  slug: string
  type: string
  publicKey: string
  allowedOrigins: string[]
  authenticationMode: 'anonymous' | 'authenticated' | 'mixed'
  status: 'active' | 'disabled'
  assertionIssuer: string
  credentialVersion: number
  assignedAgents: number
  onlineAgents: number
  lastActivityAt: string | null
  whatsappConnection: WhatsAppConnection | null
}

export interface WhatsAppConnection {
  id: number
  provider: 'meta_cloud'
  phoneNumberId: string
  businessAccountId: string | null
  displayPhoneNumber: string | null
  webhookKey: string
  webhookPath: string
  webhookUrl: string | null
  graphVersion: string
  status: 'pending' | 'active' | 'disabled' | 'error'
  lastWebhookAt: string | null
  lastError: string | null
  hasAppSecret: boolean
}

export interface AdminAgent {
  id: number
  name: string
  email: string | null
  role: 'agent' | 'supervisor' | 'admin'
  isOnline: boolean
  isActive: boolean
  channelIds: number[]
}

const config = () => ({ headers: getAuthHeaders() })

export const adminChannelsApi = {
  async list() {
    return (await axios.get<AdminChannel[]>(`${API_URL}/api/admin/channels`, config())).data
  },
  async agents() {
    return (await axios.get<AdminAgent[]>(`${API_URL}/api/admin/agents`, config())).data
  },
  async createAgent(payload: Record<string, unknown>) {
    return (await axios.post(`${API_URL}/api/admin/agents`, payload, config())).data
  },
  async updateAgent(id: number, payload: Record<string, unknown>) {
    return (await axios.patch(`${API_URL}/api/admin/agents/${id}`, payload, config())).data
  },
  async audit() {
    return (await axios.get(`${API_URL}/api/admin/audit`, config())).data
  },
  async create(payload: Record<string, unknown>) {
    return (await axios.post(`${API_URL}/api/admin/channels`, payload, config())).data
  },
  async update(id: number, payload: Record<string, unknown>) {
    return (await axios.patch(`${API_URL}/api/admin/channels/${id}`, payload, config())).data
  },
  async remove(id: number) {
    await axios.delete(`${API_URL}/api/admin/channels/${id}`, config())
  },
  async assignAgents(id: number, agentIds: number[]) {
    return (await axios.put(`${API_URL}/api/admin/channels/${id}/agents`, { agentIds }, config())).data
  },
  async rotate(id: number) {
    return (await axios.post(`${API_URL}/api/admin/channels/${id}/rotate-credentials`, {}, config())).data
  },
  async configureWhatsApp(id: number, payload: Record<string, unknown>) {
    return (await axios.put(`${API_URL}/api/admin/channels/${id}/whatsapp`, payload, config())).data
  },
  async disconnectWhatsApp(id: number) {
    return (await axios.post(`${API_URL}/api/admin/channels/${id}/whatsapp/disconnect`, {}, config())).data
  }
}
