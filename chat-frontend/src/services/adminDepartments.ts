import axios from 'axios'
import { getAuthHeaders } from './authHeaders'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const config = () => ({ headers: getAuthHeaders() })

export interface AdminDepartment {
  id: number
  name: string
  slug: string
  status: 'active' | 'disabled'
  routingStrategy: 'broadcast' | 'least_busy' | 'direct'
  fallbackStrategy: 'channel_queue' | 'department_queue'
  defaultAgentId: number | null
  channelIds: number[]
  agentIds: number[]
}

export const adminDepartmentsApi = {
  async list() { return (await axios.get<AdminDepartment[]>(`${API_URL}/api/admin/departments`, config())).data },
  async create(payload: Record<string, unknown>) { return (await axios.post(`${API_URL}/api/admin/departments`, payload, config())).data },
  async update(id: number, payload: Record<string, unknown>) { return (await axios.patch(`${API_URL}/api/admin/departments/${id}`, payload, config())).data },
  async remove(id: number) { await axios.delete(`${API_URL}/api/admin/departments/${id}`, config()) },
  async assignments(id: number, agentIds: number[], channelIds: number[]) {
    return (await axios.put(`${API_URL}/api/admin/departments/${id}/assignments`, { agentIds, channelIds }, config())).data
  }
}
