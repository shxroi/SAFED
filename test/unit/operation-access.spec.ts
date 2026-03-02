import { computed, ref } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useOperationAccess } from "../../app/composables/operation/useOperationAccess"
import type { Operation } from "../../shared/types/operation"

const buildOperation = (overrides: Partial<Operation> = {}): Operation => ({
  id: 1,
  company: "Acme",
  type: "Installation",
  location: "Dock A",
  date: "2026-02-20",
  status: "Active",
  createdAt: "2026-02-19T00:00:00.000Z",
  enrollments: [
    {
      id: 1,
      userId: 10,
      operationId: 1,
      operationRole: "SUPERVISOR",
      user: null,
    },
  ],
  ...overrides,
})

describe("useOperationAccess", () => {
  beforeEach(() => {
    vi.stubGlobal("computed", computed)
  })

  it("allows supervisor edit access on active operation", () => {
    const operation = ref<Operation | null>(buildOperation())
    const sessionUser = ref({ id: 10, roles: "STAFF" })

    const access = useOperationAccess(operation, sessionUser)

    expect(access.canAccess.value).toBe(true)
    expect(access.isSupervisor.value).toBe(true)
    expect(access.isReadOnly.value).toBe(false)
  })

  it("enforces read-only when operation is not active", () => {
    const operation = ref<Operation | null>(buildOperation({ status: "Draft" }))
    const sessionUser = ref({ id: 10, roles: "STAFF" })

    const access = useOperationAccess(operation, sessionUser)

    expect(access.canAccess.value).toBe(true)
    expect(access.isReadOnly.value).toBe(true)
  })

  it("grants observer access but keeps read-only", () => {
    const operation = ref<Operation | null>(buildOperation({ enrollments: [] }))
    const sessionUser = ref({ id: 77, roles: "OBSERVER" })

    const access = useOperationAccess(operation, sessionUser)

    expect(access.canAccess.value).toBe(true)
    expect(access.isReadOnly.value).toBe(true)
    expect(access.isSupervisor.value).toBe(false)
  })
})
