export interface OperationTool {
  id: number
  operationId: number
  toolId: number
  name: string
  quantity: number
  preStatus: 'Good' | 'Not Good' | null
  postStatus: 'Good' | 'Not Good' | null
  preNote: string | null
  postNote: string | null
}
    
export interface OperationActivity {
  id: number
  jobDescription: string
  documentationRequired: boolean
  status: 'Good' | 'Not Good' | null
  notes: string | null
  executedByName?: string | null
  documentations?: OperationDocumentation[]
}

export interface OperationDocumentation {
  id: number
  filePath: string
  fileName: string
  fileSize: number
  timestamp: string
}

export interface OperationModule {
  id: number
  name: string
  activities: OperationActivity[]
}

export interface OperationSection {
  id: number
  name: string
  modules: OperationModule[]
  isOpen?: boolean
}
