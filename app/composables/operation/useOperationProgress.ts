import type { Ref } from 'vue'
import type { OperationSection, OperationTool } from '../../../shared/types/operation-execution'

export const useOperationProgress = (
  tools: Ref<OperationTool[]>,
  sections: Ref<OperationSection[]>
) => {
  const progress = computed(() => {
    let total = 0
    let done = 0

    for (const tool of tools.value) {
      total += 2
      if (tool.preStatus) done += 1
      if (tool.postStatus) done += 1
    }

    for (const section of sections.value) {
      for (const module of section.modules) {
        total += module.activities.length

        for (const activity of module.activities) {
          if (activity.status) done += 1
        }
      }
    }

    if (total === 0) return 0
    return Math.round((done / total) * 100)
  })

  return { progress }
}
