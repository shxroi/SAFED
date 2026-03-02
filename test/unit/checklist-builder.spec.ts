import { describe, expect, it } from "vitest"
import { useChecklistBuilder } from "../../app/composables/operation/useChecklistBuilder"

describe("useChecklistBuilder", () => {
  it("initializes with one section, module, and activity", () => {
    const builder = useChecklistBuilder()

    expect(builder.sectionsList.value).toHaveLength(1)
    expect(builder.sectionsList.value[0]?.modules).toHaveLength(1)
    expect(builder.sectionsList.value[0]?.modules[0]?.activities).toHaveLength(1)
    expect(builder.selectedSection.value).toBe(0)
  })

  it("manages tools checklist quantity and removal", () => {
    const builder = useChecklistBuilder()

    builder.addTool()
    builder.addTool()
    expect(builder.toolsList.value).toHaveLength(2)

    builder.incrementQuantity(0)
    expect(builder.toolsList.value[0]?.quantity).toBe(2)

    builder.decrementQuantity(0)
    builder.decrementQuantity(0)
    expect(builder.toolsList.value[0]?.quantity).toBe(1)

    builder.removeTool(1)
    expect(builder.toolsList.value).toHaveLength(1)
  })

  it("toggles tools by id and updates quantity by id", () => {
    const builder = useChecklistBuilder()

    builder.toggleToolSelection(10, true)
    builder.toggleToolSelection(20, true)

    expect(builder.toolsList.value).toEqual([
      { toolId: 10, quantity: 1 },
      { toolId: 20, quantity: 1 },
    ])

    builder.incrementToolById(10)
    builder.incrementToolById(999)
    expect(builder.toolsList.value[0]?.quantity).toBe(2)

    builder.decrementToolById(10)
    builder.decrementToolById(10)
    expect(builder.toolsList.value[0]?.quantity).toBe(1)

    builder.toggleToolSelection(20, false)
    expect(builder.toolsList.value).toEqual([{ toolId: 10, quantity: 1 }])
  })

  it("manages operation sections, modules, and activities", () => {
    const builder = useChecklistBuilder()

    builder.addSection()
    expect(builder.sectionsList.value).toHaveLength(2)
    expect(builder.selectedSection.value).toBe(1)

    builder.addModule(1)
    expect(builder.sectionsList.value[1]?.modules).toHaveLength(2)

    builder.addActivity(1, 0)
    expect(builder.sectionsList.value[1]?.modules[0]?.activities).toHaveLength(2)

    builder.removeActivity(1, 0, 1)
    expect(builder.sectionsList.value[1]?.modules[0]?.activities).toHaveLength(1)

    builder.removeModule(1, 1)
    expect(builder.sectionsList.value[1]?.modules).toHaveLength(1)
  })

  it("maps checklist response data correctly", () => {
    const builder = useChecklistBuilder()

    const mapped = builder.mapChecklistSections([
      {
        id: 7,
        name: "Section A",
        modules: [
          {
            id: 11,
            name: "Module A",
            activities: [
              {
                id: 101,
                jobDescription: "Check pressure",
                documentationRequired: true,
              },
            ],
          },
        ],
      },
    ])

    expect(mapped).toEqual([
      {
        id: 7,
        name: "Section A",
        modules: [
          {
            id: 11,
            name: "Module A",
            activities: [
              {
                id: 101,
                description: "Check pressure",
                documentationRequired: true,
              },
            ],
          },
        ],
      },
    ])
  })
})
