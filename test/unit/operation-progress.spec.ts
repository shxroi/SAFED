import { computed, ref } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useOperationProgress } from "../../app/composables/operation/useOperationProgress"
import type { OperationSection, OperationTool } from "../../shared/types/operation-execution"

describe("useOperationProgress", () => {
  beforeEach(() => {
    vi.stubGlobal("computed", computed)
  })

  it("returns 0 when no checklist items exist", () => {
    const tools = ref<OperationTool[]>([])
    const sections = ref<OperationSection[]>([])

    const { progress } = useOperationProgress(tools, sections)
    expect(progress.value).toBe(0)
  })

  it("calculates combined tools and jobdesk completion percentage", () => {
    const tools = ref<OperationTool[]>([
      {
        id: 1,
        operationId: 1,
        toolId: 1,
        name: "Torque Wrench",
        quantity: 1,
        preStatus: "Good",
        postStatus: null,
        preNote: null,
        postNote: null,
      },
    ])

    const sections = ref<OperationSection[]>([
      {
        id: 1,
        name: "Main",
        modules: [
          {
            id: 1,
            name: "Module",
            activities: [
              {
                id: 1,
                jobDescription: "Task 1",
                documentationRequired: false,
                status: "Good",
                notes: null,
              },
              {
                id: 2,
                jobDescription: "Task 2",
                documentationRequired: false,
                status: null,
                notes: null,
              },
            ],
          },
        ],
      },
    ])

    const { progress } = useOperationProgress(tools, sections)
    // total = 2 (tool pre/post) + 2 (activities) = 4
    // done = 1 (tool pre) + 1 (activity status) = 2 -> 50%
    expect(progress.value).toBe(50)
  })
})
