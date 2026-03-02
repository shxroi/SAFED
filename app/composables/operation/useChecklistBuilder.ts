import { ref } from "vue";

export interface ChecklistToolInput {
  toolId: number | null;
  quantity: number;
}

export interface ChecklistActivityInput {
  id?: number;
  description: string;
  documentationRequired: boolean;
}

export interface ChecklistModuleInput {
  id?: number;
  name: string;
  activities: ChecklistActivityInput[];
}

export interface ChecklistSectionInput {
  id?: number;
  name: string;
  modules: ChecklistModuleInput[];
}

export interface ChecklistResponse {
  tools?: Array<{
    id: number;
    toolId: number;
    name: string;
    quantity: number;
  }>;
  sections?: Array<{
    id: number;
    name: string;
    modules?: Array<{
      id: number;
      name: string;
      activities?: Array<{
        id: number;
        jobDescription?: string;
        description?: string;
        documentationRequired?: boolean;
      }>;
    }>;
  }>;
}

export const useChecklistBuilder = () => {
  const createEmptyActivity = (): ChecklistActivityInput => ({
    description: "",
    documentationRequired: false,
  });

  const createEmptyModule = (): ChecklistModuleInput => ({
    name: "Module",
    activities: [createEmptyActivity()],
  });

  const createEmptySection = (): ChecklistSectionInput => ({
    name: "Section",
    modules: [createEmptyModule()],
  });

  const sectionsList = ref<ChecklistSectionInput[]>([createEmptySection()]);
  const toolsList = ref<ChecklistToolInput[]>([]);
  const checklistView = ref<"tools" | "operation">("tools");
  const selectedSection = ref<number | null>(0);

  const mapChecklistSections = (
    sections: ChecklistResponse["sections"] = [],
  ): ChecklistSectionInput[] => {
    return sections.map((section) => ({
      id: section.id,
      name: section.name,
      modules: (section.modules ?? []).map((module) => ({
        id: module.id,
        name: module.name || "Module",
        activities: (module.activities ?? []).map((activity) => ({
          id: activity.id,
          description: activity.jobDescription || activity.description || "",
          documentationRequired: activity.documentationRequired ?? false,
        })),
      })),
    }));
  };

  const addTool = () => {
    toolsList.value.push({ toolId: null, quantity: 1 });
  };

  const toggleToolSelection = (toolId: number, checked: boolean) => {
    const index = toolsList.value.findIndex((tool) => tool.toolId === toolId);

    if (checked) {
      if (index === -1) {
        toolsList.value.push({ toolId, quantity: 1 });
      }
      return;
    }

    if (index > -1) {
      toolsList.value.splice(index, 1);
    }
  };

  const removeTool = (index: number) => {
    toolsList.value.splice(index, 1);
  };

  const incrementQuantity = (index: number) => {
    const tool = toolsList.value[index];
    if (tool) tool.quantity += 1;
  };

  const decrementQuantity = (index: number) => {
    const tool = toolsList.value[index];
    if (tool && tool.quantity > 1) tool.quantity -= 1;
  };

  const incrementToolById = (toolId: number) => {
    const index = toolsList.value.findIndex((tool) => tool.toolId === toolId);
    if (index === -1) return;
    incrementQuantity(index);
  };

  const decrementToolById = (toolId: number) => {
    const index = toolsList.value.findIndex((tool) => tool.toolId === toolId);
    if (index === -1) return;
    decrementQuantity(index);
  };

  const addSection = () => {
    sectionsList.value.push(createEmptySection());
    selectedSection.value = sectionsList.value.length - 1;
  };

  const removeSection = (index: number) => {
    sectionsList.value.splice(index, 1);

    if (sectionsList.value.length === 0) {
      selectedSection.value = null;
      return;
    }

    if (selectedSection.value === null) return;
    if (selectedSection.value === index) {
      selectedSection.value = Math.max(0, index - 1);
    } else if (selectedSection.value > index) {
      selectedSection.value -= 1;
    }
  };

  const selectSection = (index: number) => {
    selectedSection.value = index;
  };

  const addModule = (sectionIndex: number) => {
    const section = sectionsList.value[sectionIndex];
    if (!section) return;
    section.modules.push(createEmptyModule());
  };

  const removeModule = (sectionIndex: number, moduleIndex: number) => {
    const section = sectionsList.value[sectionIndex];
    if (!section) return;
    section.modules.splice(moduleIndex, 1);
  };

  const addActivity = (sectionIndex: number, moduleIndex: number) => {
    const section = sectionsList.value[sectionIndex];
    const module = section?.modules[moduleIndex];
    if (!module) return;
    module.activities.push(createEmptyActivity());
  };

  const removeActivity = (
    sectionIndex: number,
    moduleIndex: number,
    activityIndex: number,
  ) => {
    const section = sectionsList.value[sectionIndex];
    const module = section?.modules[moduleIndex];
    if (!module) return;
    module.activities.splice(activityIndex, 1);
  };

  return {
    sectionsList,
    toolsList,
    checklistView,
    selectedSection,
    createEmptySection,
    mapChecklistSections,
    addTool,
    toggleToolSelection,
    removeTool,
    incrementQuantity,
    decrementQuantity,
    incrementToolById,
    decrementToolById,
    addSection,
    removeSection,
    selectSection,
    addModule,
    removeModule,
    addActivity,
    removeActivity,
  };
};
