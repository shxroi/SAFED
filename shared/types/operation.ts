export const OPERATION_TYPES = ['Installation','Maintenance','SAT/Commissioning','Upgrade','Uninstall'] as const

export type OperationType = (typeof OPERATION_TYPES)[number]

export const OPERATION_STATUSES = ['Draft', 'Active', 'Complete', 'Cancelled'] as const

export type OperationStatus = (typeof OPERATION_STATUSES)[number]

export type OperationRole = 'SUPERVISOR' | 'STAFF'

export interface Operation {
  id: number
  company: string
  type: OperationType
  vesselName?: string | null
  location: string
  date: string
  status: OperationStatus
  createdAt: string

  assignedStaff?: number
  progress?: number
  supervisorName?: string | null
  staffNames?: string[]
  isEnrolled?: boolean
  enrollments?: OperationEnrollment[]
  reportPdfPath?: string | null
}

export interface OperationEnrollment {
  id: number
  userId: number
  operationId: number
  operationRole: OperationRole
  user?: {
    id: number
    name: string
    email: string
  } | null
}

export interface OperationWithDetails extends Operation {
  enrollments: OperationEnrollment[]
}
