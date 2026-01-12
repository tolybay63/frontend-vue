import axios from "axios";
import { getUserData } from "../common/userCache";


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

export async function getPeriodInfo(date, periodType) {
  try {
    const response = await axios.post(
      API_BASE_URL,
      {
        method: "data/getPeriodInfo",
        params: [date, periodType]
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
    console.error('Ошибка получения информации о периоде:', error);
    throw error;
  }
}

export async function copyPlan(idsWorkPlan, dbegCopy, dendCopy, dbegPlan, dendPlan) {
  try {
    const user = await getUserData();
    const today = new Date().toISOString().split('T')[0];

    const payload = {
      idsWorkPlan: idsWorkPlan, // Массив ID работ для копирования
      dbegCopy: dbegCopy,        // Начало копируемого периода (формат: "YYYY-MM-DD")
      dendCopy: dendCopy,        // Конец копируемого периода
      dbegPlan: dbegPlan,        // Начало планируемого периода
      dendPlan: dendPlan,        // Конец планируемого периода
      pvUser: user.pv,
      objUser: user.id,
      CreatedAt: today,
      UpdatedAt: today
    };

    console.log('Вызов метода data/copyPlan с данными:', payload);

    const response = await axios.post(
      API_BASE_URL,
      {
        method: "data/copyPlan",
        params: [payload]
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
    console.error('Ошибка копирования плана работ:', error);
    throw error;
  }
}
