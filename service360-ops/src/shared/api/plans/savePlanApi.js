import axios from 'axios';


const API_BASE_URL = import.meta.env.VITE_PLAN_URL;
const AUTH_API_URL = import.meta.env.VITE_OBJECT_URL;

let userDataCache = null;

const formatDateForBackend = (date) => {
  if (!date) return null;

  let d;
  if (typeof date === 'string' && date.length >= 10) {
    d = new Date(date);
  } else if (typeof date === 'number' || date instanceof Date) {
    d = new Date(date);
  } else {
    return null;
  }

  if (isNaN(d.getTime())) return null;

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fetchUserData = async () => {
  if (userDataCache) return userDataCache;

  try {
    const response = await axios.post(AUTH_API_URL, {
      method: 'data/loadObjList',
      params: ['Typ_Personnel', 'Prop_User', 'personnaldata']
    });

    const user = response.data?.result?.records?.[0];
    if (!user) throw new Error('Данные пользователя не найдены');

    userDataCache = user;
    return user;
  } catch (error) {
    console.error('Ошибка при загрузке данных пользователя:', error);
    throw error;
  }
};

const savePlan = async (workData, formData) => {
  try {
    const user = await fetchUserData();

    const section = formData.section || {};

    const formattedPlannedDate = formatDateForBackend(formData.plannedDate);
    const today = formatDateForBackend(new Date());

    const planName = `${workData.value}_${formattedPlannedDate || today}`;

    const payload = {
      method: 'data/savePlan',
      params: [
        'ins',
        {
          name: planName,
          linkCls: workData.cls,
          objLocationClsSection: section.value || null,
          pvLocationClsSection: section.pv || null,
          objWork: workData.value,
          pvWork: workData.pv || null,
          objObject: formData.object?.value || null,
          pvObject: formData.object?.fullRecord?.pvObject || null,
          objUser: user.id,
          pvUser: user.pv,
          StartKm: formData.coordStartKm || 0,
          FinishKm: formData.coordEndKm || 0,
          StartPicket: formData.coordStartPk || 0,
          FinishPicket: formData.coordEndPk || 0,
          PlanDateEnd: formattedPlannedDate,
          CreatedAt: today,
          UpdatedAt: today
        }
      ]
    };

    console.log('Отправка плана:', payload);
    const response = await axios.post(API_BASE_URL, payload);

    if (response.data?.result) {
      return response.data.result;
    }
    throw new Error('Ошибка сохранения: нет результата');
  } catch (error) {
    console.error('Ошибка при сохранении плана:', error);
    throw error;
  }
};

const saveAllPlans = async (workData, forms) => {
  const results = [];
  for (const form of forms) {
    try {
      const result = await savePlan(workData, form);
      results.push({ success: true, result });
    } catch (error) {
      results.push({ success: false, error: error.message });
    }
  }
  return results;
};

export { savePlan, saveAllPlans };
