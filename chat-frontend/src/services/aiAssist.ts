import axios from 'axios'
import { getAuthHeaders } from './authHeaders'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export async function assistText(action: string, text: string) {
  try {
    const response = await axios.post(
      `${apiUrl}/api/ai/assist`,
      { action, text },
      {
        headers: getAuthHeaders(),
        timeout: 20000
      }
    )

    return response.data?.text || ''
  } catch (error: any) {
    if (error?.code === 'ECONNABORTED') {
      throw new Error('La IA tardó demasiado en responder. Intenta de nuevo.')
    }
    throw new Error(error?.response?.data?.error || 'No se pudo procesar el texto con IA.')
  }
}
