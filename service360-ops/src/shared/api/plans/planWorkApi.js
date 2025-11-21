import axios from 'axios';

const WORKS_API_URL = import.meta.env.VITE_OBJECT_URL;
const DATA_API_URL = import.meta.env.VITE_PLAN_URL;

const fetchWorks = async () => {
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
};

const fetchPlacesForWork = async (workId) => {
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
};

const fetchLocationByCoords = async (workId, startKm, finishKm, startPicket, finishPicket) => {
  const response = await axios.post(DATA_API_URL, { 
    method: 'data/findLocationOfCoord',
    params: [
      {
        objWork: workId ?? 0, // Если workId не передан, используем 0
        StartKm: startKm,
        FinishKm: finishKm,
        StartPicket: startPicket,
        FinishPicket: finishPicket
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
};

const fetchObjectsForSelect = async (objWork) => {
  const response = await axios.post(DATA_API_URL, {
    method: 'data/loadObjectServedForSelect',
    params: [objWork]
  });

  if (response.data && response.data.result && response.data.result.records) {
    return response.data.result.records;
  } else {
    throw new Error('Нет данных о объектах для выбранной работы');
  }
};

// Обновленная функция для завершения работы
const completeThePlanWork = async (id, date) => {
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
};

export { fetchWorks, fetchPlacesForWork, fetchLocationByCoords, fetchObjectsForSelect, completeThePlanWork };