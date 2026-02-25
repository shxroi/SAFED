import type { OperationStatus, OperationType } from '../../shared/types/operation'

export const OPERATION_TYPE_OPTIONS: Array<{ value: OperationType; label: string }> = [
  { value: 'Installation', label: 'Installation' },
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'SAT/Commissioning', label: 'SAT/Commissioning' },
  { value: 'Upgrade', label: 'Upgrade' },
  { value: 'Uninstall', label: 'Uninstall' },
]

export const OPERATION_STATUS_OPTIONS: Array<{ value: OperationStatus; label: string }> = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Active', label: 'Active' },
  { value: 'Complete', label: 'Complete' },
  { value: 'Cancelled', label: 'Cancelled' },
]

export const OPERATION_STATUS_BADGE_CLASS: Record<OperationStatus, string> = {
  Draft: 'bg-secondary text-primary',
  Active: 'bg-blue-100 text-blue-950',
  Complete: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-600',
}

export const OPERATION_TYPE_BADGE_CLASS: Record<OperationType, string> = {
  Installation: 'bg-blue-200 text-blue-900',
  Maintenance: 'bg-amber-100 text-amber-900',
  'SAT/Commissioning': 'bg-cyan-100 text-cyan-800',
  Upgrade: 'bg-pink-100 text-pink-800',
  Uninstall: 'bg-red-100 text-red-800',
}
