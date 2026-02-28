import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      workspaceId: string | null
      email?: string | null
      name?: string | null
      image?: string | null
    }
  }

  interface User {
    id: string
    workspaceId?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string
    workspaceId?: string | null
  }
}

