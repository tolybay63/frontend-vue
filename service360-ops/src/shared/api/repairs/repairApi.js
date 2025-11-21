import axios from "axios";

const API_REPAIR_URL = import.meta.env.VITE_REPAIR_URL;
const API_OBJECT_URL = import.meta.env.VITE_OBJECT_URL;
const API_NSI_URL = import.meta.env.VITE_NSI_URL;

export async function loadPlanCorrectional(date = "2025-07-30", periodType = 11) {
  const objLocation = localStorage.getItem("objLocation");

  if (!objLocation) {
    throw new Error("objLocation не найден в localStorage");
  }

  const response = await axios.post(
    API_REPAIR_URL,
    {
      method: "data/loadTaskLog",
      params: [
        {
          date,
          periodType,
          objLocation: parseInt(objLocation),
        }
      ]
    },
    {
      withCredentials: true
    }
  );

  const result = response.data.result;

  return result || { store: { records: [] }, resource: { records: [] } };
}

export async function loadDateWorkPlanCorrectional(selectedSectionId, pv) {
  try {
    const response = await axios.post(
      API_REPAIR_URL,
      {
        method: "data/loadDateWorkPlanCorrectional",
        params: [
          {
            id: selectedSectionId,
            pv: pv,
          }
        ]
      },
      {
        withCredentials: true
      }
    );

    return response.data.result || [];
  } catch (error) {
    throw error;
  }
};

export async function loadTasks() {
  try {
    const response = await axios.post(
      API_OBJECT_URL,
      {
        method: "data/loadObjList",
        params: ["Cls_Task", "Prop_Task", "nsidata"],
      },
      {
        withCredentials: true,
      }
    );

    const records = response.data.result?.records || [];
    return records.map((record) => ({
      label: record.fullName,
      value: record.id,
      cls: record.cls,
      pv: record.pv,
    }));
  } catch (error) {
    console.error("Ошибка при загрузке задач:", error);
    throw error;
  }
}

export async function loadTaskLogEntriesForWorkPlan(workPlanId, workPlanPv) {
  try {
    const response = await axios.post(
      API_REPAIR_URL,
      {
        method: "data/loadTaskLogEntriesForWorkPlan",
        params: [{ id: workPlanId, pv: workPlanPv }],
      },
      {
        withCredentials: true,
      }
    );
    return response.data.result?.records || [];
  } catch (error) {
    console.error("Ошибка при загрузке записей журнала работ:", error);
    throw error;
  }
}


export async function loadObjClsWorkPlanCorrectionalUnfinishedByDate(sectionId, pv, date) {
  try {
    const response = await axios.post(
      API_REPAIR_URL,
      {
        method: "data/loadObjClsWorkPlanCorrectionalUnfinishedByDate",
        params: [
          {
            id: sectionId,
            pv: pv,
            date: date,
          }
        ]
      },
      {
        withCredentials: true
      }
    );

    return response.data.result?.records || [];
  } catch (error) {
    throw error;
  }
};

export async function saveTaskLog(payload) {
  try {
    const response = await axios.post(
      API_REPAIR_URL,
      {
        method: "data/saveTaskLog",
        params: ["ins", payload],
      },
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Ошибка при сохранении записи в журнал работ:", error);
    throw error;
  }
}

export async function loadMaterials() {
  try {
    const response = await axios.post(
      API_OBJECT_URL,
      {
        method: "data/loadObjList",
        params: ["Cls_Material", "Prop_Material", "resourcedata"],
      },
      {
        withCredentials: true,
      }
    );

    const records = response.data.result?.records || [];
    return records.map((record) => ({
      label: record.name, 
      value: record.id,      
      cls: record.cls,      
      pv: record.pv,        
    }));
  } catch (error) {
    console.error("Ошибка при загрузке материалов:", error);
    throw error;
  }
}

export async function loadUnits() {
  try {
    const response = await axios.post(
      API_NSI_URL,
      {
        method: "data/loadMeasure",
        params: ["Prop_Measure"],
      },
      {
        withCredentials: true,
      }
    );

    const records = response.data.result?.records || [];
    return records.map((record) => ({
      label: record.name,
      value: record.id,
      pv: record.pv,
    }));
  } catch (error) {
    console.error("Ошибка при загрузке единиц измерения:", error);
    throw error;
  }
}

export async function saveTaskLogPlan(payload) {
  try {
    const response = await axios.post(
      API_REPAIR_URL,
      {
        method: "data/saveTaskLogPlan",
        params: ["ins", payload],
      },
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Ошибка при сохранении записи в журнал задач:", error);
    throw error;
  }
}

export async function loadTaskLog(workPlanId, workPlanPv) {
  try {
    const response = await axios.post(
      API_REPAIR_URL,
      {
        method: "data/loadTaskLogForWorkPlan",
        params: [{ id: workPlanId, pv: workPlanPv }],
      },
      {
        withCredentials: true,
      }
    );
    return response.data.result?.records || [];
  } catch (error) {
    console.error("Ошибка при загрузке журнала работ:", error);
    throw error;
  }
}

export async function saveResourceMaterial(payload) {
  try {
    const response = await axios.post(
      API_REPAIR_URL,
      {
        method: "data/saveResourceMaterial",
        params: ["ins", payload],
      },
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Ошибка при сохранении материала для задачи:", error);
    throw error;
  }
}

export async function loadResourceMaterialsForTaskLog(taskLogId) {
  if (!taskLogId) {
    console.warn("loadResourceMaterialsForTaskLog вызван без taskLogId");
    return [];
  }
  try {
    const response = await axios.post(
      API_REPAIR_URL,
      {
        method: "data/loadResourceMaterial",
        params: [taskLogId],
      },
      {
        withCredentials: true,
      }
    );
    return response.data.result?.records || [];
  } catch (error) {
    console.error("Ошибка при загрузке материалов для записи журнала задач:", error);
    throw error;
  }
}

export async function loadExternalServices() {
  try {
    const response = await axios.post(
      API_OBJECT_URL,
      {
        method: "data/loadObjList",
        params: ["Cls_TpService", "Prop_TpService", "resourcedata"],
      },
      {
        withCredentials: true,
      }
    );

    const records = response.data.result?.records || [];
    return records.map((record) => ({
      label: record.fullName,
      value: record.id,      
      cls: record.cls,      
      pv: record.pv,        
    }));
  } catch (error) {
    console.error("Ошибка при загрузке услуг сторонних организаций:", error);
    throw error;
  }
}

export async function saveResourceExternalService(payload) {
  try {
    const response = await axios.post(
      API_REPAIR_URL,
      {
        method: "data/saveResourceTpService",
        params: ["ins", payload],
      },
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Ошибка при сохранении услуги для задачи:", error);
    throw error;
  }
}

export async function loadResourceExternalServicesForTaskLog(taskLogId) {
  if (!taskLogId) {
    console.warn("loadResourceExternalServicesForTaskLog вызван без taskLogId");
    return [];
  }
  try {
    const response = await axios.post(
      API_REPAIR_URL,
      {
        method: "data/loadResourceTpService",
        params: [taskLogId],
      },
      {
        withCredentials: true,
      }
    );
    return response.data.result?.records || [];
  } catch (error) {
    console.error("Ошибка при загрузке услуг для записи журнала задач:", error);
    throw error;
  }
}

export async function loadPositions() {
  try {
    const response = await axios.post(
      API_OBJECT_URL,
      {
        method: "data/loadFactorValForSelect",
        params: ["Prop_Position"],
      },
      {
        withCredentials: true,
      }
    );

    const records = response.data.result?.records || [];
    return records.map((record) => ({
      label: record.name,
      value: record.id,
      pv: record.pv,
    }));
  } catch (error) {
    console.error("Ошибка при загрузке должностей:", error);
    throw error;
  }
}

export async function loadEquipmentTypes() {
  try {
    const response = await axios.post(
      API_OBJECT_URL,
      {
        method: "data/loadFactorValForSelect",
        params: ["Prop_TypEquipment"],
      },
      {
        withCredentials: true,
      }
    );

    const records = response.data.result?.records || [];
    return records.map((record) => ({
      label: record.name,
      value: record.id,
      pv: record.pv,
    }));
  } catch (error) {
    console.error("Ошибка при загрузке типов техники:", error);
    throw error;
  }
}

export async function loadToolTypes() {
  try {
    const response = await axios.post(
      API_OBJECT_URL,
      {
        method: "data/loadFactorValForSelect",
        params: ["Prop_TypTool"],
      },
      {
        withCredentials: true,
      }
    );

    const records = response.data.result?.records || [];
    return records.map((record) => ({
      label: record.name,
      value: record.id,
      pv: record.pv,
    }));
  } catch (error) {
    console.error("Ошибка при загрузке типов инструментов:", error);
    throw error;
  }
}

export async function saveResourceTool(payload) {
  try {
    const response = await axios.post(
      API_REPAIR_URL,
      {
        method: "data/saveResourceTool",
        params: ["ins", payload],
      },
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Ошибка при сохранении инструмента для задачи:", error);
    throw error;
  }
}

export async function saveResourcePersonnel(payload) {
  try {
    const response = await axios.post(
      API_REPAIR_URL,
      {
        method: "data/saveResourcePersonnel",
        params: ["ins", payload],
      },
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Ошибка при сохранении исполнителя для задачи:", error);
    throw error;
  }
}

export async function loadResourceToolsForTaskLog(taskLogId) {
  if (!taskLogId) {
    return [];
  }
  try {
    const response = await axios.post(
      API_REPAIR_URL,
      {
        method: "data/loadResourceTool",
        params: [taskLogId],
      },
      {
        withCredentials: true,
      }
    );
    const records = response.data.result?.records || [];
    return records.map(record => ({
      ...record,
      Quantity: record.Value, // Map Value to Quantity for consistency in the UI
    }));
  } catch (error) {
    console.error("Ошибка при загрузке инструментов для задачи:", error);
    throw error;
  }
}


export async function saveResourceEquipment(payload) {
  try {
    const response = await axios.post(
      API_REPAIR_URL,
      {
        method: "data/saveResourceEquipment",
        params: ["ins", payload],
      },
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Ошибка при сохранении техники для задачи:", error);
    throw error;
  }
}

export async function loadResourcePersonnelForTaskLog(taskLogId) {
  if (!taskLogId) {
    return [];
  }
  try {
    const response = await axios.post(
      API_REPAIR_URL,
      {
        method: "data/loadResourcePersonnel",
        params: [taskLogId],
      },
      {
        withCredentials: true,
      }
    );
    const records = response.data.result?.records || [];
    return records.map(record => ({
      namePosition: record.namePosition,
      Quantity: record.Quantity,
      Value: record.Value,
    }));
  } catch (error) {
    console.error("Ошибка при загрузке исполнителей для задачи:", error);
    throw error;
  }
}

export async function loadResourceEquipmentForTaskLog(taskLogId) {
  if (!taskLogId) {
    return [];
  }
  try {
    const response = await axios.post(
      API_REPAIR_URL,
      {
        method: "data/loadResourceEquipment",
        params: [taskLogId],
      },
      {
        withCredentials: true,
      }
    );
    const records = response.data.result?.records || [];
    return records.map(record => ({
      nameTypEquipment: record.nameTypEquipment,
      Quantity: record.Quantity,
      Value: record.Value,
    }));
  } catch (error) {
    console.error("Ошибка при загрузке техники для задачи:", error);
    throw error;
  }
}