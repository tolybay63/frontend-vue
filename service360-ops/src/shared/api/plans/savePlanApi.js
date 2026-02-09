import axios from 'axios';
import { getUserData } from '../common/userCache';

const API_BASE_URL = import.meta.env.VITE_PLAN_URL;

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

const savePlan = async (workData, formData) => {
  try {
    const user = await getUserData();

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
          StartLink: formData.coordStartZv || 0,
          FinishLink: formData.coordEndZv || 0,
          PlanDateEnd: formattedPlannedDate,
          Description: formData.description || '',
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
