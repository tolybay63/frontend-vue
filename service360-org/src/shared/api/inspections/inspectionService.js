import axios from 'axios'
import { getUserData } from '../common/userCache'

const API_BASE_URL = import.meta.env.VITE_INSPECTIONS_URL;

export async function loadInspections(date = "2025-07-30", periodType = 71) {
  const objLocation = localStorage.getItem("objLocation");

  if (!objLocation) {
    throw new Error("objLocation не найден в localStorage");
  }

  console.log('Вызов метода data/loadInspection', {
    date,
    periodType,
    objLocation: parseInt(objLocation)
  });

  const response = await axios.post(
    API_BASE_URL,
    {
      method: "data/loadInspection",
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

  return response.data.result?.records || [];
}

export async function loadSections() {
  try {
    const objLocation = localStorage.getItem("objLocation");

    if (!objLocation) {
      throw new Error("objLocation не найден в localStorage");
    }

    const response = await axios.post(
      API_BASE_URL,
      {
        method: "data/loadObjLocationSectionForSelect",
        params: [parseInt(objLocation)],
      },
      {
        withCredentials: true,
      }
    );

    return response.data.result?.records || [];
  } catch (error) {
    throw error;
  }
}

export async function loadWorkPlanDates(selectedSectionId, pv) {
  try {
    const response = await axios.post(
      API_BASE_URL,
      {
        method: "data/loadDateWorkPlanInspection",
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
}

export async function loadWorkPlanUnfinishedByDate(sectionId, pv, date) {
  try {
    const response = await axios.post(
      API_BASE_URL,
      {
        method: "data/loadObjClsWorkPlanInspectionUnfinishedByDate",
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
}

export async function loadInspectionEntriesForWorkPlan(workPlanId, workPlanPv) {
  try {
    const response = await axios.post(
      API_BASE_URL,
      {
        method: "data/loadInspectionEntriesForWorkPlan",
        params: [
          {
            id: workPlanId,
            pv: workPlanPv,
          }
        ]
      },
      {
        withCredentials: true,
      }
    );

    return response.data.result?.records || [];
  } catch (error) {
    throw error;
  }
}

export async function loadComponentsByTypObjectForSelect(objObject) {
  try {
    const response = await axios.post(
      API_BASE_URL,
      {
        method: "data/loadComponentsByTypObjectForSelect",
        params: [objObject],
      },
      {
        withCredentials: true,
      }
    );
    return response.data.result?.records || [];
  } catch (error) {
    throw error;
  }
}

export async function loadDefectsByComponentForSelect(objComponent) {
  try {
    const response = await axios.post(
      API_BASE_URL,
      {
        method: "data/loadDefectsByComponentForSelect",
        params: [objComponent],
      },
      {
        withCredentials: true,
      }
    );
    return response.data.result?.records || [];
  } catch (error) {
    throw error;
  }
}

export async function loadComponentParametersForSelect(objComponent) {
  try {
    const response = await axios.post(
      API_BASE_URL,
      {
        method: "data/loadComponentParametersForSelect",
        params: [objComponent],
      },
      {
        withCredentials: true,
      }
    );
    return response.data.result?.records || [];
  } catch (error) {
    throw error;
  }
}

export async function loadFaultEntriesForInspection(inspectionId) {
  try {
    const response = await axios.post(
      API_BASE_URL,
      {
        method: "data/loadFaultEntriesForInspection",
        params: [inspectionId],
      },
      {
        withCredentials: true,
      }
    );
    return response.data.result?.records || [];
  } catch (error) {
    console.error("Ошибка при загрузке записей о неисправностях:", error);
    throw error;
  }
}

export async function loadParameterEntriesForInspection(inspectionId) {
  try {
    const response = await axios.post(
      API_BASE_URL,
      {
        method: "data/loadParameterEntriesForInspection",
        params: [inspectionId],
      },
      {
        withCredentials: true,
      }
    );
    return response.data.result?.records || [];
  } catch (error) {
    console.error("Ошибка при загрузке записей о параметрах:", error);
    throw error;
  }
}

export async function saveInspectionInfo(payload) {
  try {
    const response = await axios.post(
      API_BASE_URL,
      {
        method: "data/saveInspection",
        params: ["ins", payload],
      },
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function saveFaultInfo(payload) {
  try {
    const response = await axios.post(
      API_BASE_URL,
      {
        method: "data/saveFault",
        params: ["ins", payload],
      },
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function saveParameterInfo(payload) {
  try {
    const response = await axios.post(
      API_BASE_URL,
      {
        method: "data/saveParameterLog",
        params: ["ins", payload],
      },
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}

export const fetchUserData = getUserData;
