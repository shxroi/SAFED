import { ref } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("vue-sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

import { toast } from "vue-sonner"
import { useOperationSave } from "../../app/composables/operation/useOperationSave"
import type {
  OperationActivity,
  OperationSection,
  OperationTool,
} from "../../shared/types/operation-execution"

const buildTool = (overrides: Partial<OperationTool> = {}): OperationTool => ({
  id: 1,
  operationId: 1,
  toolId: 1,
  name: "Wrench",
  quantity: 1,
  preStatus: "Good",
  postStatus: "Good",
  preNote: null,
  postNote: null,
  ...overrides,
})

const buildActivity = (
  overrides: Partial<OperationActivity> = {},
): OperationActivity => ({
  id: 10,
  jobDescription: "Check cable",
  documentationRequired: false,
  status: "Good",
  notes: null,
  documentations: [],
  ...overrides,
})

const buildOptions = (params?: {
  tools?: OperationTool[]
  sections?: OperationSection[]
}) => {
  const fetchOperationDetail = vi.fn().mockResolvedValue(undefined)

  return {
    operationId: ref(1),
    tools: ref(params?.tools ?? []),
    sections: ref(params?.sections ?? []),
    isReadOnly: ref(false),
    pendingDocumentationByTask: ref({}),
    deletedDocumentationByTask: ref({}),
    undoDocumentationDelete: vi.fn(),
    removePendingDocumentation: vi.fn(),
    clearTaskDocumentationDraft: vi.fn(),
    fetchOperationDetail,
  }
}

describe("useOperationSave", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("$fetch", vi.fn().mockResolvedValue({}))
  })

  it("blocks tools save when pre condition is missing", async () => {
    const options = buildOptions({
      tools: [buildTool({ preStatus: null })],
    })
    const save = useOperationSave(options)

    await save.saveTools()

    expect(global.$fetch).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith(
      "Please select pre condition for all tools before saving",
    )
  })

  it("saves tools when post condition is still nullable", async () => {
    const options = buildOptions({
      tools: [buildTool({ preStatus: "Good", postStatus: null })],
    })
    const save = useOperationSave(options)

    await save.saveTools()

    expect(global.$fetch).toHaveBeenCalledTimes(1)
    expect(global.$fetch).toHaveBeenCalledWith("/api/operations/1/tools", {
      method: "PUT",
      body: {
        tools: [
          {
            id: 1,
            preStatus: "Good",
            postStatus: null,
            preNote: null,
            postNote: null,
          },
        ],
      },
    })
    expect(options.fetchOperationDetail).toHaveBeenCalledTimes(1)
    expect(toast.success).toHaveBeenCalledWith("Tools checklist saved successfully")
  })

  it("blocks activity save when task condition is missing", async () => {
    const options = buildOptions()
    const save = useOperationSave(options)
    const activity = buildActivity({ status: null })

    await save.saveActivity(activity)

    expect(global.$fetch).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith(
      "Please select task condition before saving",
    )
  })

  it("allows activity save without documentation when not required", async () => {
    const options = buildOptions()
    const save = useOperationSave(options)
    const activity = buildActivity({ documentationRequired: false, status: "Good" })

    await save.saveActivity(activity)

    expect(global.$fetch).toHaveBeenCalledWith("/api/operations/1/tasks/10", {
      method: "PUT",
      body: { status: "Good", notes: null },
    })
    expect(options.fetchOperationDetail).toHaveBeenCalledTimes(1)
    expect(toast.success).toHaveBeenCalledWith("Activity saved successfully")
  })

  it("blocks activity save when documentation is required but missing", async () => {
    const options = buildOptions()
    const save = useOperationSave(options)
    const activity = buildActivity({
      documentationRequired: true,
      status: "Good",
      documentations: [],
    })

    await save.saveActivity(activity)

    expect(global.$fetch).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith(
      "Documentation photo is required for this task",
    )
  })
})
