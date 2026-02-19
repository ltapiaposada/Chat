import { io, Socket } from 'socket.io-client'

class SocketService {
  private socket: Socket | null = null
  private connected = false

  connect() {
    if (this.socket?.connected) {
      console.log('Socket ya conectado')
      return this.socket
    }

    const url = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'
    
    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      autoConnect: true
    })

    this.socket.on('connect', () => {
      console.log('Conectado al servidor Socket.IO:', this.socket?.id)
      this.connected = true
    })

    this.socket.on('disconnect', () => {
      console.log('Desconectado del servidor Socket.IO')
      this.connected = false
    })

    this.socket.on('connect_error', (error) => {
      console.error('Error de conexión:', error)
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.connected = false
    }
  }

  authenticate(userId: number) {
    this.socket?.emit('authenticate', userId)
  }

  joinRoom(roomId: number) {
    this.socket?.emit('join:room', roomId)
  }

  leaveRoom(roomId: number) {
    this.socket?.emit('leave:room', roomId)
  }

  sendMessage(roomId: number, userId: number, content: string) {
    this.socket?.emit('message:send', { roomId, userId, content })
  }

  startTyping(roomId: number, userId: number) {
    this.socket?.emit('typing:start', { roomId, userId })
  }

  stopTyping(roomId: number, userId: number) {
    this.socket?.emit('typing:stop', { roomId, userId })
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback)
  }

  off(event: string, callback?: (...args: any[]) => void) {
    this.socket?.off(event, callback)
  }

  emit(event: string, data?: any) {
    this.socket?.emit(event, data)
  }

  isConnected(): boolean {
    return this.connected && this.socket?.connected === true
  }

  getSocket(): Socket | null {
    return this.socket
  }
}

export default new SocketService()


