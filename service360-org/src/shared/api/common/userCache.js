let userDataCache = null;

export async function getUserData() {
  if (userDataCache) return userDataCache;

  try {
    // Получаем данные пользователя из localStorage (сохранены при логине через getPersonnalInfo)
    const personnalInfoStr = localStorage.getItem('personnalInfo');

    if (!personnalInfoStr) {
      throw new Error('Данные пользователя не найдены. Пожалуйста, войдите в систему заново.');
    }

    const personnalInfo = JSON.parse(personnalInfoStr);

    // В personnalInfo уже есть все необходимые данные:
    // - id (objUser)
    // - pv (pvUser)
    // - все остальные поля пользователя

    userDataCache = personnalInfo;
    return personnalInfo;
  } catch (error) {
    console.error('Ошибка при загрузке данных пользователя:', error);
    throw error;
  }
}

export function clearUserCache() {
  userDataCache = null;
}
