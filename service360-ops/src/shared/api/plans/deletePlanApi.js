import axios from 'axios';

const API_URL = import.meta.env.VITE_PLAN_URL;


export const deletePlan = async (planId) => {
  if (!planId) {
    throw new Error('ID плана не указан');
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'data/deleteObjWithProperties',
        params: [planId]
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    // Проверяем на наличие ошибок в ответе
    if (result.error) {
      throw new Error(result.error.message || 'Ошибка при удалении плана');
    }

    return result;
  } catch (error) {
    console.error('❌ Ошибка при удалении плана:', error);
    throw new Error(`Не удалось удалить план: ${error.message}`);
  }
};