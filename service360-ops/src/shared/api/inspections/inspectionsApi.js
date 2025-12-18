import axios from 'axios';
import { getUserData } from '../common/userCache';

const API_BASE_URL = import.meta.env.VITE_INSPECTIONS_URL;

const loadWorkPlanInspectionUnfinished = async () => {
  try {
    const objLocation = localStorage.getItem("objLocation");

    if (!objLocation) {
      throw new Error("objLocation не найден в localStorage");
    }

    const response = await axios.post(
      API_BASE_URL,
      {
        method: "data/loadWorkPlanUnfinished",
        params: [parseInt(objLocation), "Cls_WorkPlanInspection"],
      },
      {
        withCredentials: true,
      }
    );

    return response.data.result?.records || [];
  } catch (error) {
    throw error;
  }
};

const loadSections = async () => {
  try {
    const objLocation = localStorage.getItem("objLocation");

    if (!objLocation) {
      throw new Error("objLocation не найден в localStorage");
    }

    const response = await axios.post(
      API_BASE_URL,
      {
        method: "data/loadWorkPlanInspectionUnfinished",
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
};

const loadWorkPlanDates = async (selectedSectionId, pv) => {
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
};

const loadWorkPlanUnfinishedByDate = async (sectionId, pv, date) => {
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
};

const loadInspectionEntriesForWorkPlan = async (workPlanId, workPlanPv) => {
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
};

const saveInspectionInfo = async (payload) => {
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
};

const saveFaultInfo = async (payload) => {
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
};

const loadComponentsByTypObjectForSelect = async (objObject) => {
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
};

const loadDefectsByComponentForSelect = async (objComponent) => {
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
};

const loadComponentParametersForSelect = async (objComponent) => {
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
};

const loadFaultEntriesForInspection = async (inspectionId) => {
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
};

const loadParameterEntriesForInspection = async (inspectionId) => {
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
};

const saveParameterInfo = async (payload) => {
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
};

export {
  loadSections,
  loadWorkPlanInspectionUnfinished,
  loadWorkPlanDates,
  loadWorkPlanUnfinishedByDate,
  loadInspectionEntriesForWorkPlan,
  saveInspectionInfo,
  saveFaultInfo,
  saveParameterInfo,
  getUserData,
  loadComponentsByTypObjectForSelect,
  loadDefectsByComponentForSelect,
  loadComponentParametersForSelect,
  loadFaultEntriesForInspection,
  loadParameterEntriesForInspection,
};