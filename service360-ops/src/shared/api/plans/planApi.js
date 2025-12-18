import axios from "axios";


const API_BASE_URL = import.meta.env.VITE_PLAN_URL;

export async function loadWorkPlan(date = "2025-07-30", periodType = 11) {
  const objLocation = localStorage.getItem("objLocation");

  if (!objLocation) {
    throw new Error("objLocation не найден в localStorage");
  }

  const response = await axios.post(
    API_BASE_URL,
    {
      method: "data/loadPlan",
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

export async function completeThePlanWork(id, cls, date) {
  try {
    const response = await axios.post(
      API_BASE_URL,
      {
        method: "data/completeThePlanWork",
        params: [
          {
            id: id,
            cls: cls,
            date: date
          }
        ]
      },
      {
        withCredentials: true
      }
    );

    if (response.data && response.data.result) {
      return response.data.result;
    } else if (response.data && response.data.error) {
      throw new Error(response.data.error);
    } else {
      return response.data;
    }
  } catch (error) {
    console.error('Ошибка завершения работы:', error);
    // Пробрасываем оригинальную ошибку, чтобы сохранить response.data
    throw error;
  }
}
