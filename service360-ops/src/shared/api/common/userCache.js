import axios from 'axios'

const AUTH_API_URL = import.meta.env.VITE_OBJECT_URL;
let userDataCache = null;

/**
 * Получить данные текущего авторизованного пользователя
 * Использует кэширование для избежания повторных запросов
 * @returns {Promise<Object>} Объект с данными пользователя { id, pv, name, fullName, cls }
 */
export async function getUserData() {
  if (userDataCache) return userDataCache;

  try {
    // Получаем ID из localStorage (сохранен при логине через getPersonnalInfo)
    const currentUserId = localStorage.getItem('userId');

    if (!currentUserId) {
      throw new Error('ID пользователя не найден. Пожалуйста, войдите в систему заново.');
    }

    // Загружаем список всех пользователей
    const response = await axios.post(AUTH_API_URL, {
      method: 'data/loadObjList',
      params: ['Typ_Personnel', 'Prop_User', 'personnaldata']
    });

    const records = response.data?.result?.records || [];

    // Находим конкретного пользователя по ID
    const user = records.find(record => record.id === parseInt(currentUserId));

    if (!user) {
      throw new Error(`Пользователь с ID ${currentUserId} не найден в списке`);
    }

    userDataCache = user;
    return user;
  } catch (error) {
    console.error('Ошибка при загрузке данных пользователя:', error);
    throw error;
  }
}

/**
 * Очистить кэш данных пользователя
 * Используется при логауте или смене пользователя
 */
export function clearUserCache() {
  userDataCache = null;
}
