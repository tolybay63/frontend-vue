import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_IMPORTXML_URL;

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
