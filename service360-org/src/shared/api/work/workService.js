import axios from 'axios'
import { getUserData } from '../common/userCache'
import { formatDateForBackend } from '../common/formatters'

const WORKS_API_URL = import.meta.env.VITE_OBJECT_URL;
const DATA_API_URL = import.meta.env.VITE_PLAN_URL;
const API_REPAIR_URL = import.meta.env.VITE_REPAIR_URL;
const API_PERSONAL = import.meta.env.VITE_PERSONAL_URL;

export async function fetchWorks() {
  try {
    const response = await axios.post(WORKS_API_URL, {
      method: 'data/loadObjList',
      params: ['Typ_Work', 'Prop_Work', 'nsidata']
    });

    if (!response.data || !response.data.result || !Array.isArray(response.data.result.records)) {
      console.error('Ошибка структуры ответа:', response.data);
      throw new Error('Некорректный ответ от сервера: нет records');
    }

    const records = response.data.result.records;

    const processedRecords = records.map(item => ({
      label: item.fullName,
      value: item.id,
      cls: item.cls,
      pv: item.pv,
      fullRecord: item
    }));

    return processedRecords;
  } catch (error) {
    console.error('Ошибка загрузки работ:', error);
    throw new Error(error.response?.data?.message || 'Не удалось загрузить работы');
  }
}

export async function fetchPlacesForWork(workId) {
  const response = await axios.post(DATA_API_URL, {
    method: 'data/loadObjectServedForSelect',
    params: [workId]
  });

  if (response.data && response.data.result && response.data.result.records) {
    return response.data.result.records.map(item => ({
      label: item.nameSection,
      value: item.objSection,
      fullRecord: item
    }));
  } else {
    throw new Error('Нет данных о местах для выбранной работы');
  }
}

export async function fetchObjectsForSelect(objWork) {
  const response = await axios.post(DATA_API_URL, {
    method: 'data/loadObjectServedForSelect',
    params: [objWork]
  });

  if (response.data && response.data.result && response.data.result.records) {
    return response.data.result.records;
  } else {
    throw new Error('Нет данных о объектах для выбранной работы');
  }
}

export async function fetchLocationByCoords(workId, startKm, finishKm, startPicket, finishPicket, startLink = 0, finishLink = 0) {
  const response = await axios.post(DATA_API_URL, {
    method: 'data/findLocationOfCoord',
    params: [
      {
        objWork: workId ?? 0,
        StartKm: startKm,
        FinishKm: finishKm,
        StartPicket: startPicket,
        FinishPicket: finishPicket,
        StartLink: startLink,
        FinishLink: finishLink
      }
    ]
  });

  if (response.data && response.data.result && response.data.result.records) {
    return response.data.result.records.map(item => ({
      label: item.name,
      value: item.id,
      pv: item.pv,
      fullRecord: item
    }));
  } else {
    throw new Error('Нет данных для координат');
  }
}

export async function loadTaskLog(date, periodType) {
  const objLocation = localStorage.getItem("objLocation");

  if (!objLocation) {
    throw new Error("objLocation не найден в localStorage");
  }

  const params = {
    date,
    periodType,
    objLocation: parseInt(objLocation),
    notResource: 1
  };

  console.log('Вызов метода data/loadTaskLog', params);

  const response = await axios.post(
    API_REPAIR_URL,
    {
      method: "data/loadTaskLog",
      params: [params]
    },
    {
      withCredentials: true
    }
  );

  const result = response.data.result;
  return result?.store?.records || result || [];
}

export async function loadObjTaskLog(taskLogId) {
  if (!taskLogId) {
    console.warn("loadObjTaskLog вызван без ID записи.");
    return null;
  }

  try {
    console.log('Вызов метода data/loadObjTaskLog с ID:', taskLogId);
    const response = await axios.post(
      API_REPAIR_URL,
      {
        method: "data/loadObjTaskLog",
        params: [taskLogId],
      },
      {
        withCredentials: true,
      }
    );
    return response.data.result;
  } catch (error) {
    console.error(`Ошибка при вызове loadObjTaskLog для ID ${taskLogId}:`, error);
    throw error;
  }
}

export async function loadPersonnalByPosition(pvPosition) {
  if (!pvPosition) {
    throw new Error("pvPosition обязателен для загрузки персонала");
  }

  try {
    console.log('Вызов метода data/loadPersonnalByPosition с pvPosition:', pvPosition);
    const response = await axios.post(
      API_PERSONAL,
      {
        method: "data/loadPersonnalByPosition",
        params: [pvPosition, "Prop_Personnel"]
      },
      {
        withCredentials: true
      }
    );

    const records = response.data?.result?.records || [];
    console.log('Получены записи персонала:', records);
    return records;
  } catch (error) {
    console.error('Ошибка при загрузке персонала по позиции:', error);
    throw error;
  }
}

export async function saveResourceFact(materialData) {
  if (!materialData || !materialData.id) {
    throw new Error("Для сохранения факта по материалу необходимо передать данные с ID.");
  }

  try {
    const user = await getUserData();
    const today = formatDateForBackend(new Date());

    const payload = {
      id: materialData.id,
      idValue: materialData.idValue,
      Value: Number(materialData.Value),
      idUser: materialData.idUser,
      objUser: user.id,
      pvUser: user.pv,
      idUpdatedAt: materialData.idUpdatedAt,
      UpdatedAt: today,
    };

    console.log('Отправка data/saveResourceFact с данными:', payload);

    const response = await axios.post(
      API_REPAIR_URL,
      {
        method: "data/saveResourceFact",
        params: [payload],
      },
      {
        withCredentials: true,
      }
    );

    console.log('Ответ от data/saveResourceFact:', response.data);
    return response.data.result;
  } catch (error) {
    console.error(`Ошибка при вызове saveResourceFact для ID ${materialData.id}:`, error);
    console.error('Детали ошибки (ответ сервера):', error.response?.data);
    throw error;
  }
}

export async function saveServiceFact(serviceData) {
  if (!serviceData || !serviceData.id) {
    throw new Error("Для сохранения факта по услуге необходимо передать данные с ID.");
  }

  try {
    const user = await getUserData();
    const today = formatDateForBackend(new Date());

    const payload = {
      id: serviceData.id,
      idValue: serviceData.idValue,
      Value: Number(serviceData.Value),
      idUser: serviceData.idUser,
      objUser: user.id,
      pvUser: user.pv,
      idUpdatedAt: serviceData.idUpdatedAt,
      UpdatedAt: today,
    };

    console.log('Отправка data/saveResourceFact (услуга) с данными:', payload);

    const response = await axios.post(
      API_REPAIR_URL,
      {
        method: "data/saveResourceFact",
        params: [payload],
      },
      {
        withCredentials: true,
      }
    );

    console.log('Ответ от data/saveResourceFact (услуга):', response.data);
    return response.data.result;
  } catch (error) {
    console.error(`Ошибка при вызове saveServiceFact для ID ${serviceData.id}:`, error);
    console.error('Детали ошибки (ответ сервера):', error.response?.data);
    throw error;
  }
}

export async function addResourceMaterial(materialData, taskLogId, taskLogCls) {
  if (!materialData || !taskLogId || !taskLogCls) {
    throw new Error("Необходимо передать данные материала, ID и PV задачи.");
  }

  try {
    const user = await getUserData();
    const today = formatDateForBackend(new Date());

    const payload = {
      name: `${taskLogId}-${materialData.objMaterial}-${today}`,
      objMaterial: materialData.objMaterial,
      pvMaterial: materialData.pvMaterial,
      meaMeasure: materialData.meaMeasure,
      pvMeasure: materialData.pvMeasure,
      Value: Number(materialData.Value),
      objTaskLog: taskLogId,
      linkCls: taskLogCls,
      CreatedAt: today,
      UpdatedAt: today,
      objUser: user.id,
      pvUser: user.pv,
      status: "fact"
    };

    console.log('Вызов метода data/saveResourceMaterial (добавление) с данными:', payload);

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

    console.log('Ответ от data/saveResourceMaterial (добавление):', response.data);
    return response.data.result;
  } catch (error) {
    console.error('Ошибка при вызове addResourceMaterial:', error);
    console.error('Детали ошибки (ответ сервера):', error.response?.data);
    throw error;
  }
}

export async function addResourceTpService(serviceData, taskLogId, taskLogCls) {
  if (!serviceData || !taskLogId || !taskLogCls) {
    throw new Error("Необходимо передать данные услуги, ID и CLS задачи.");
  }

  try {
    const user = await getUserData();
    const today = formatDateForBackend(new Date());

    const payload = {
      name: `${taskLogId}-${serviceData.objTpService}-${today}`,
      objTpService: serviceData.objTpService,
      pvTpService: serviceData.pvTpService,
      Value: Number(serviceData.Value),
      objTaskLog: taskLogId,
      linkCls: taskLogCls,
      CreatedAt: today,
      UpdatedAt: today,
      objUser: user.id,
      pvUser: user.pv,
      status: "fact"
    };

    console.log('Вызов метода data/saveResourceTpService (добавление) с данными:', payload);

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

    console.log('Ответ от data/saveResourceTpService (добавление):', response.data);
    return response.data.result;
  } catch (error) {
    console.error('Ошибка при вызове addResourceTpService:', error);
    console.error('Детали ошибки (ответ сервера):', error.response?.data);
    throw error;
  }
}

export async function addResourcePersonnel(personnelData, taskLogId, taskLogCls) {
  if (!personnelData || !taskLogId || !taskLogCls) {
    throw new Error("Необходимо передать данные исполнителя, ID и CLS задачи.");
  }

  try {
    const user = await getUserData();
    const today = formatDateForBackend(new Date());

    const payload = {
      name: `${taskLogId}-${personnelData.id}-${today}`,
      fvPosition: personnelData.fvPosition,
      pvPosition: personnelData.pvPosition,
      objPersonnel: personnelData.id,
      pvPersonnel: personnelData.pv,
      Value: personnelData.time || 0, // Часы работы
      objTaskLog: taskLogId,
      linkCls: taskLogCls,
      CreatedAt: today,
      UpdatedAt: today,
      objUser: user.id,
      pvUser: user.pv,
      status: "fact"
    };

    console.log('Вызов метода data/saveResourcePersonnel (добавление) с данными:', payload);

    const response = await axios.post(
      API_REPAIR_URL,
      {
        method: "data/saveResourcePersonnel",
        params: ["ins", payload],
      },
      { withCredentials: true }
    );

    console.log('Ответ от data/saveResourcePersonnel (добавление):', response.data);
    return response.data.result;
  } catch (error) {
    console.error('Ошибка при вызове addResourcePersonnel:', error);
    throw error;
  }
}

export async function saveComplexPersonnel(personnelId, performerData) {
  if (!personnelId || !performerData) {
    throw new Error("Необходимо передать ID personnel и данные исполнителя.");
  }

  try {
    const operation = performerData.isNew ? "ins" : "upd";

    const payload = {
      id: personnelId,
      objPerformer: performerData.objPerformer,
      pvPerformer: performerData.pvPerformer,
      PerformerValue: Number(performerData.PerformerValue)
    };

    if (!performerData.isNew) {
      payload.idPerformer = performerData.idPerformer;
      payload.idPerformerValue = performerData.idPerformerValue;
    }

    console.log(`Вызов метода data/saveComplexPersonnel (${operation}) с данными:`, payload);

    const response = await axios.post(
      API_REPAIR_URL,
      {
        method: "data/saveComplexPersonnel",
        params: [operation, payload],
      },
      {
        withCredentials: true,
      }
    );

    console.log('Ответ от data/saveComplexPersonnel:', response.data);
    return response.data.result;
  } catch (error) {
    console.error(`Ошибка при вызове saveComplexPersonnel для ID ${personnelId}:`, error);
    console.error('Детали ошибки (ответ сервера):', error.response?.data);
    throw error;
  }
}

export async function saveTaskLogFact(payload) {
  if (!payload || !payload.id) {
    throw new Error("Payload должен содержать ID записи.");
  }

  try {
    console.log('Вызов метода data/saveTaskLogFact с данными:', payload);
    const response = await axios.post(
      API_REPAIR_URL,
      {
        method: "data/saveTaskLogFact",
        params: [payload],
      },
      {
        withCredentials: true,
      }
    );
    return response.data.result;
  } catch (error) {
    console.error(`Ошибка при вызове saveTaskLogFact для ID ${payload.id}:`, error);
    throw error;
  }
}

export async function completeThePlanWork(id, date) {
  try {
    const response = await axios.post(DATA_API_URL, {
      method: 'data/completeThePlanWork',
      params: [
        {
          id: id,
          date: date
        }
      ]
    });

    if (response.data && response.data.result) {
      return response.data.result;
    } else if (response.data && response.data.error) {
      throw new Error(response.data.error);
    } else {
      return response.data;
    }
  } catch (error) {
    console.error('Ошибка завершения работы:', error);
    throw new Error(error.response?.data?.message || error.message || 'Не удалось завершить работу');
  }
}

// ============================================
// DELETE методы (удаление)
// ============================================


export async function deleteComplexPersonnel(complexId) {
  if (!complexId) {
    throw new Error("Необходимо передать ID комплекса для удаления.");
  }

  try {
    console.log('Вызов метода data/deleteComplexData с ID:', complexId);

    const response = await axios.post(
      API_REPAIR_URL,
      {
        method: "data/deleteComplexData",
        params: [complexId],
      },
      {
        withCredentials: true,
      }
    );

    console.log('Ответ от data/deleteComplexData:', response.data);
    return response.data.result;
  } catch (error) {
    console.error(`Ошибка при вызове deleteComplexData для ID ${complexId}:`, error);
    console.error('Детали ошибки (ответ сервера):', error.response?.data);
    throw error;
  }
}
