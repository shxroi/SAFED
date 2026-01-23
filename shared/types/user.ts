enum Role {
    Observer = 'OBSERVER',
    ImplementationManager = 'IM',
    Staff = 'STAFF'
}

export interface User {
    id: number
    name: string
    username: string
    email: string
    password?: string
    roles: Role 
    isActive: boolean
}

export interface UserForm {
    name: string, 
    username: string, 
    email: string,
    password?: string,
    roles: Role | undefined,
    isActive: boolean
}