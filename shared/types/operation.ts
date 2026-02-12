export interface Operation {
  id: number
  company: string
  type: 'Installation' | 'Maintenance' | 'SAT/Commissioning' | 'Upgrade' | 'Uninstall'
  vesselName?: string | null
  location: string
  date: string
  status: 'Draft' | 'Active' | 'Complete' | 'Cancelled'
  createdAt: string
  
  assignedStaff?: number
  progress?: number
  supervisorName?: string | null
}

export interface OperationEnrollment {
  id: number
  userId: number
  operationId: number
  operationRole: 'SUPERVISOR' | 'STAFF'
  user?: {
    id: number
    name: string
    email: string
  }
}

export interface OperationWithDetails extends Operation {
  enrollments: OperationEnrollment[]
}