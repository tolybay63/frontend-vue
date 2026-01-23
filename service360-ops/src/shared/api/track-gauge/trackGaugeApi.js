import axios from "axios";
import { getUserData } from "../common/userCache";

const API_BASE_URL = import.meta.env.VITE_IMPORTXML_URL;
const API_INSPECTIONS_URL = import.meta.env.VITE_INSPECTIONS_URL;

export async function analyzeTrackGaugeFile(filename, file) {
  const objLocation = localStorage.getItem("objLocation");

  if (!objLocation) {
    throw new Error("objLocation не найден в localStorage");
  }

  console.log('Вызов метода analyzeTrackGaugeFile', {
    filename,
    fileSize: file.size,
    objLocation: parseInt(objLocation)
  });

  const formData = new FormData();
  formData.append('filename', filename);
  formData.append('file', file, filename);

  const response = await axios.post(
    API_BASE_URL,
    formData,
    {
      withCredentials: true
    }
  );

  console.log('Полный ответ от сервера:', response.data);

  // Проверяем разные возможные структуры ответа
  if (response.data.result?.records) {
    return response.data.result.records;
  } else if (response.data.result) {
    return response.data.result;
  } else if (Array.isArray(response.data)) {
    return response.data;
  }

  console.warn('Неожиданная структура ответа:', response.data);
  return [];
}

export async function loadImportLog(filename) {
  console.log('Вызов метода import/loadLog', {
    filename
  });

  const response = await axios.post(
    API_INSPECTIONS_URL,
    {
      method: "import/loadLog",
      params: [filename]
    },
    {
      withCredentials: true
    }
  );

  console.log('Ответ от import/loadLog:', response.data);

  return response.data.result?.records?.[0] || response.data.result || null;
}

export async function loadAssignData(codes) {
  console.log('Вызов метода import/loadAssign', {
    codes
  });

  const response = await axios.post(
    API_INSPECTIONS_URL,
    {
      method: "import/loadAssign",
      params: [codes]
    },
    {
      withCredentials: true
    }
  );

  console.log('Ответ от import/loadAssign:', response.data);

  return response.data.result?.records || response.data.result || [];
}

export async function loadRelObjForSelect(code) {
  console.log('Вызов метода import/loadRelObjForSelect', {
    code
  });

  const response = await axios.post(
    API_INSPECTIONS_URL,
    {
      method: "import/loadRelObjForSelect",
      params: [code]
    },
    {
      withCredentials: true
    }
  );

  console.log('Ответ от import/loadRelObjForSelect:', response.data);

  return response.data.result?.records || response.data.result || [];
}

export async function loadObjForSelect(code) {
  console.log('Вызов метода import/loadObjForSelect', {
    code
  });

  const response = await axios.post(
    API_INSPECTIONS_URL,
    {
      method: "import/loadObjForSelect",
      params: [code]
    },
    {
      withCredentials: true
    }
  );

  console.log('Ответ от import/loadObjForSelect:', response.data);

  return response.data.result?.records || response.data.result || [];
}

export async function saveAssign(assignData) {
  console.log('Вызов метода import/saveAssign', {
    assignData
  });

  const response = await axios.post(
    API_INSPECTIONS_URL,
    {
      method: "import/saveAssign",
      params: [assignData]
    },
    {
      withCredentials: true
    }
  );

  console.log('Ответ от import/saveAssign:', response.data);

  return response.data.result || response.data;
}

export async function uploadTrackGaugeData(records) {
  try {
    const user = await getUserData();
    const today = new Date().toISOString().split('T')[0];

    // Определяем тип данных: если в первой записи есть kod_otstup, то "Otstup", иначе "Ball"
    const dataType = records.length > 0 && records[0].kod_otstup !== undefined ? "Otstup" : "Ball";

    const payload = {
      objUser: user.id,
      pvUser: user.pv,
      CreatedAt: today,
      UpdatedAt: today,
      store: records
    };

    console.log('Вызов метода data/saveBallAndOtstupXml', {
      dataType,
      payload
    });

    const response = await axios.post(
      API_INSPECTIONS_URL,
      {
        method: "data/saveBallAndOtstupXml",
        params: [dataType, payload]
      },
      {
        withCredentials: true
      }
    );

    console.log('Ответ от data/saveBallAndOtstupXml:', response.data);

    if (response.data && response.data.result) {
      return response.data.result;
    } else if (response.data && response.data.error) {
      throw new Error(response.data.error);
    } else {
      return response.data;
    }
  } catch (error) {
    console.error('Ошибка при заливке данных:', error);
    throw error;
  }
}
