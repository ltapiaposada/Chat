import axios from 'axios'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export async function assistText(action: string, text: string) {
  const response = await axios.post(`${apiUrl}/api/ai/assist`, {
    action,
    text
  })

  return response.data?.text || ''
}
